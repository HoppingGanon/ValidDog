import { loadSpecFromFile } from './fileLoader';
import { saveSpec, loadSpec } from './storage';
import { matchPath } from './pathMatcher';
import { validateRequestBody, validateResponseBody } from './validator';
import {
  showSuccess,
  showError,
  clearMessage,
  displayValidationResults,
  setButtonEnabled,
  getInputValue,
  getSelectValue,
  displayFileName
} from './ui';
import { OpenAPISpec } from './types';

let currentSpec: OpenAPISpec | null = null;

/**
 * アプリケーションの初期化
 */
function init(): void {
  // LocalStorageから仕様書を読み込み
  currentSpec = loadSpec();
  
  if (currentSpec) {
    showSuccess('spec-status', '仕様書が読み込まれています');
    setButtonEnabled('validate-btn', true);
  } else {
    setButtonEnabled('validate-btn', false);
  }

  // イベントリスナーの設定
  setupEventListeners();
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners(): void {
  // ファイル選択
  const fileInput = document.getElementById('openapi-file') as HTMLInputElement;
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // 検証ボタン
  const validateBtn = document.getElementById('validate-btn');
  if (validateBtn) {
    validateBtn.addEventListener('click', handleValidate);
  }
}

/**
 * ファイル選択時の処理
 */
async function handleFileSelect(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) {
    return;
  }

  displayFileName(file.name);
  clearMessage('spec-status');

  try {
    // ファイルから仕様書を読み込み
    currentSpec = await loadSpecFromFile(file);
    
    // LocalStorageに保存
    saveSpec(currentSpec);
    
    showSuccess('spec-status', `仕様書を読み込みました: ${currentSpec.info.title} (v${currentSpec.info.version})`);
    setButtonEnabled('validate-btn', true);
    
    // 結果セクションを非表示
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) {
      resultsSection.style.display = 'none';
    }
  } catch (error) {
    showError('spec-status', `エラー: ${(error as Error).message}`);
    currentSpec = null;
    setButtonEnabled('validate-btn', false);
  }
}

/**
 * 検証ボタンクリック時の処理
 */
function handleValidate(): void {
  if (!currentSpec) {
    showError('spec-status', '仕様書が読み込まれていません');
    return;
  }

  // 入力値を取得
  const requestUrl = getInputValue('request-url').trim();
  const httpMethod = getSelectValue('http-method');
  const requestBody = getInputValue('request-body').trim();
  const responseBody = getInputValue('response-body').trim();
  const statusCodeStr = getInputValue('status-code');
  const statusCode = parseInt(statusCodeStr, 10);

  // 入力チェック
  if (!requestUrl) {
    alert('リクエストURLを入力してください');
    return;
  }

  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    alert('有効なステータスコードを入力してください (100-599)');
    return;
  }

  // パスマッチング
  const matched = matchPath(currentSpec, requestUrl, httpMethod);
  
  if (!matched) {
    displayValidationResults(
      null,
      null,
      requestUrl,
      httpMethod
    );
    
    const resultsContent = document.getElementById('validation-results');
    if (resultsContent) {
      resultsContent.innerHTML = `
        <div class="result-item error">
          <h3>エラー</h3>
          <p>指定されたURL (<code>${httpMethod.toUpperCase()} ${requestUrl}</code>) に一致するパスが見つかりませんでした。</p>
          <p>仕様書に定義されているパスを確認してください。</p>
        </div>
      `;
    }
    return;
  }

  // バリデーション実行
  const requestResult = validateRequestBody(matched, requestBody);
  const responseResult = validateResponseBody(matched, responseBody, statusCode);

  // 結果を表示
  displayValidationResults(
    requestResult,
    responseResult,
    matched.path,
    matched.method
  );
}

// DOMの読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

