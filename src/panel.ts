/**
 * DevToolsパネルのメインスクリプト
 */

import type { TrafficEntry, ExtensionMessage, Language, ValidationResult } from './types';
import { t, setLanguage, getLanguage, toggleLanguage, type TranslationKey } from './i18n';
import { OpenAPIValidator, type ValidationError } from './validator';

// =============================================================================
// 状態管理
// =============================================================================

let trafficList: TrafficEntry[] = [];
let selectedEntryId: string | null = null;
let validator: OpenAPIValidator | null = null;
let port: chrome.runtime.Port | null = null;

// フィルタ状態
let filterMatchSpec = false;
let filterErrorOnly = false;

// =============================================================================
// DOM要素
// =============================================================================

const elements = {
  trafficList: document.getElementById('trafficList') as HTMLDivElement,
  detailPlaceholder: document.getElementById('detailPlaceholder') as HTMLDivElement,
  detailContent: document.getElementById('detailContent') as HTMLDivElement,
  specStatus: document.getElementById('specStatus') as HTMLDivElement,
  specInfo: document.getElementById('specInfo') as HTMLDivElement,
  specTitle: document.getElementById('specTitle') as HTMLDivElement,
  specDescription: document.getElementById('specDescription') as HTMLDivElement,
  specModal: document.getElementById('specModal') as HTMLDivElement,
  
  // リクエスト詳細
  requestPath: document.getElementById('requestPath') as HTMLDivElement,
  requestQuery: document.getElementById('requestQuery') as HTMLPreElement,
  requestHeaders: document.getElementById('requestHeaders') as HTMLPreElement,
  requestBody: document.getElementById('requestBody') as HTMLPreElement,
  
  // レスポンス詳細
  responseStatus: document.getElementById('responseStatus') as HTMLDivElement,
  responseHeaders: document.getElementById('responseHeaders') as HTMLPreElement,
  responseBody: document.getElementById('responseBody') as HTMLPreElement,
  
  // バリデーション
  requestValidation: document.getElementById('requestValidation') as HTMLDivElement,
  requestErrors: document.getElementById('requestErrors') as HTMLDivElement,
  responseValidation: document.getElementById('responseValidation') as HTMLDivElement,
  responseErrors: document.getElementById('responseErrors') as HTMLDivElement,
  
  // モーダル
  specFile: document.getElementById('specFile') as HTMLInputElement,
  
  // フィルタ
  filterMatchSpec: document.getElementById('filterMatchSpec') as HTMLInputElement,
  filterErrorOnly: document.getElementById('filterErrorOnly') as HTMLInputElement
};

// =============================================================================
// 初期化
// =============================================================================

async function initialize(): Promise<void> {
  // 設定を読み込み
  const stored = await chrome.storage.local.get([
    'language', 
    'openApiSpec',
    'filterMatchSpec',
    'filterErrorOnly'
  ]);
  
  if (stored.language) {
    setLanguage(stored.language as Language);
  }
  
  // フィルタ設定を復元
  filterMatchSpec = stored.filterMatchSpec ?? false;
  filterErrorOnly = stored.filterErrorOnly ?? false;
  elements.filterMatchSpec.checked = filterMatchSpec;
  elements.filterErrorOnly.checked = filterErrorOnly;
  
  // filterErrorOnlyはfilterMatchSpecがONの時のみ有効
  updateFilterErrorOnlyState();
  
  // 仕様書があれば読み込み
  if (stored.openApiSpec) {
    try {
      validator = OpenAPIValidator.fromFile(stored.openApiSpec);
    } catch (e) {
      console.error('Failed to load stored spec:', e);
    }
  }
  
  // UIを更新（updateSpecStatusより先に呼ぶ）
  updateUI();
  
  // 仕様書のステータスを更新（updateUIの後に呼ぶことで上書きを防ぐ）
  updateSpecStatus(validator !== null);
  
  // イベントリスナーを設定
  setupEventListeners();
  
  // バックグラウンドに接続
  connectToBackground();
  
  // DevTools Network APIを監視
  setupNetworkListener();
}

// =============================================================================
// バックグラウンド接続
// =============================================================================

function connectToBackground(): void {
  const tabId = chrome.devtools.inspectedWindow.tabId;
  port = chrome.runtime.connect({ name: `devtools-panel-${tabId}` });
  
  port.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'TRAFFIC_UPDATE') {
      trafficList = message.payload as TrafficEntry[];
      renderTrafficList();
    }
  });
  
  // 既存のトラフィックを取得
  port.postMessage({ type: 'GET_TRAFFIC' });
}

// =============================================================================
// Network監視
// =============================================================================

function setupNetworkListener(): void {
  chrome.devtools.network.onRequestFinished.addListener((request) => {
    processNetworkRequest(request);
  });
}

async function processNetworkRequest(request: chrome.devtools.network.Request): Promise<void> {
  try {
    const url = new URL(request.request.url);
    
    // HTTPリクエストのみ処理
    if (!url.protocol.startsWith('http')) {
      return;
    }
    
    // リクエストヘッダーを取得
    const requestHeaders: Record<string, string> = {};
    request.request.headers.forEach(h => {
      requestHeaders[h.name] = h.value;
    });
    
    // レスポンスヘッダーを取得
    const responseHeaders: Record<string, string> = {};
    request.response.headers.forEach(h => {
      responseHeaders[h.name] = h.value;
    });
    
    // クエリパラメータを取得
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // リクエストボディを取得
    let requestBody: unknown = undefined;
    if (request.request.postData?.text) {
      try {
        requestBody = JSON.parse(request.request.postData.text);
      } catch {
        requestBody = request.request.postData.text;
      }
    }
    
    // レスポンスボディを取得
    const responseBody = await new Promise<unknown>((resolve) => {
      request.getContent((content, _encoding) => {
        if (content) {
          try {
            resolve(JSON.parse(content));
          } catch {
            resolve(content);
          }
        } else {
          resolve(undefined);
        }
      });
    });
    
    // トラフィックエントリを作成
    const entry: TrafficEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      method: request.request.method as TrafficEntry['method'],
      url: request.request.url,
      path: url.pathname + url.search,
      request: {
        headers: requestHeaders,
        body: requestBody,
        queryParams
      },
      response: {
        status: request.response.status,
        statusText: request.response.statusText,
        headers: responseHeaders,
        body: responseBody
      }
    };
    
    // バリデーション実行
    if (validator) {
      entry.validation = validateEntry(entry);
    }
    
    // リストに追加
    trafficList.push(entry);
    if (trafficList.length > 1000) {
      trafficList.shift();
    }
    
    // UIを更新
    renderTrafficList();
    
  } catch (e) {
    console.error('Error processing network request:', e);
  }
}

// =============================================================================
// バリデーション
// =============================================================================

function validateEntry(entry: TrafficEntry): ValidationResult {
  if (!validator) {
    return {
      requestValid: true,
      responseValid: true,
      requestErrors: [],
      responseErrors: []
    };
  }
  
  const url = new URL(entry.url);
  const path = url.pathname;
  
  // リクエストバリデーション
  const requestResult = validator.validateRequest({
    method: entry.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: path + url.search,
    headers: entry.request.headers,
    body: entry.request.body
  });
  
  // レスポンスバリデーション
  const responseResult = validator.validateResponse(
    {
      method: entry.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
      path: path
    },
    {
      statusCode: entry.response.status,
      headers: entry.response.headers,
      body: entry.response.body
    }
  );
  
  return {
    requestValid: requestResult.valid,
    responseValid: responseResult.valid,
    requestErrors: requestResult.errors,
    responseErrors: responseResult.errors
  };
}

// =============================================================================
// UI更新
// =============================================================================

function updateUI(): void {
  // 全ての翻訳対象要素を更新
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n') as TranslationKey;
    if (key) {
      el.textContent = t(key);
    }
  });
  
  // 言語切り替えボタンのラベルを更新
  const langLabel = document.getElementById('langLabel');
  if (langLabel) {
    const currentLang = getLanguage();
    langLabel.textContent = currentLang === 'ja' ? '🇯🇵日本語' : '🇺🇸English';
  }
}

function updateSpecStatus(loaded: boolean): void {
  if (loaded && validator) {
    const spec = validator.getSpec();
    elements.specStatus.textContent = t('specLoaded');
    elements.specStatus.classList.add('loaded');
    
    // 仕様書のtitleとdescriptionを表示
    elements.specInfo.style.display = 'block';
    elements.specTitle.textContent = spec.info.title || '';
    elements.specDescription.textContent = spec.info.description || '';
  } else {
    elements.specStatus.textContent = t('noSpec');
    elements.specStatus.classList.remove('loaded');
    elements.specInfo.style.display = 'none';
    elements.specTitle.textContent = '';
    elements.specDescription.textContent = '';
  }
}

function renderTrafficList(): void {
  // フィルタを適用
  const filteredList = getFilteredTrafficList();
  
  // スクロール位置が一番下かどうかを記録
  const wasAtBottom = isScrolledToBottom(elements.trafficList);
  
  if (filteredList.length === 0) {
    const message = trafficList.length === 0 
      ? t('noTraffic') 
      : t('noMatchingTraffic');
    elements.trafficList.innerHTML = `<div class="empty-state">${message}</div>`;
    return;
  }
  
  // 新しいものが下に表示されるように（reverseを削除）
  const html = filteredList.map(entry => {
    const isSelected = entry.id === selectedEntryId;
    const statusClass = entry.response.status >= 400 ? 'error' : 'success';
    
    let validationHtml = '';
    if (entry.validation) {
      const isValid = entry.validation.requestValid && entry.validation.responseValid;
      validationHtml = `<span class="traffic-validation ${isValid ? 'valid' : 'invalid'}">${isValid ? '✓' : '✗'}</span>`;
    }
    
    return `
      <div class="traffic-item ${isSelected ? 'selected' : ''}" data-id="${entry.id}">
        <span class="traffic-method ${entry.method}">${entry.method}</span>
        <span class="traffic-path">${entry.path}</span>
        <span class="traffic-status ${statusClass}">${entry.response.status}</span>
        ${validationHtml}
      </div>
    `;
  }).join('');
  
  elements.trafficList.innerHTML = html;
  
  // スクロール位置が一番下だった場合、下にスクロール
  if (wasAtBottom) {
    scrollToBottom(elements.trafficList);
  }
  
  // クリックイベントを追加
  elements.trafficList.querySelectorAll('.traffic-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      if (id) {
        selectEntry(id);
      }
    });
  });
}

/**
 * 要素が一番下までスクロールされているかチェック
 */
function isScrolledToBottom(element: HTMLElement): boolean {
  // 許容誤差（ピクセル）
  const threshold = 5;
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

/**
 * 要素を一番下までスクロール
 */
function scrollToBottom(element: HTMLElement): void {
  element.scrollTop = element.scrollHeight;
}

/**
 * フィルタを適用したトラフィックリストを取得
 */
function getFilteredTrafficList(): TrafficEntry[] {
  return trafficList.filter(entry => {
    // 仕様書マッチフィルタ（パス+メソッド）
    if (filterMatchSpec && validator) {
      if (!matchesOpenAPISpec(entry.url, entry.method)) {
        return false;
      }
    }
    
    // エラーのみフィルタ
    if (filterErrorOnly) {
      if (!entry.validation) {
        return false;
      }
      if (entry.validation.requestValid && entry.validation.responseValid) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * パス+メソッドがOpenAPI仕様書にマッチするかチェック
 * バリデーション側と同じロジックを使用して整合性を保つ
 */
function matchesOpenAPISpec(url: string, method: TrafficEntry['method']): boolean {
  if (!validator) return false;
  
  // URLからパス部分を抽出
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  
  // バリデーション側と同じロジックでパス+メソッドの存在を確認
  return validator.hasOperation(path, method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head');
}

function selectEntry(id: string): void {
  selectedEntryId = id;
  const entry = trafficList.find(e => e.id === id);
  
  if (!entry) {
    return;
  }
  
  // 選択状態を更新
  elements.trafficList.querySelectorAll('.traffic-item').forEach(item => {
    item.classList.toggle('selected', item.getAttribute('data-id') === id);
  });
  
  // 詳細を表示
  elements.detailPlaceholder.style.display = 'none';
  elements.detailContent.style.display = 'block';
  
  // リクエスト情報
  elements.requestPath.textContent = entry.path;
  elements.requestQuery.textContent = Object.keys(entry.request.queryParams || {}).length > 0
    ? JSON.stringify(entry.request.queryParams, null, 2)
    : '(なし)';
  elements.requestHeaders.textContent = JSON.stringify(entry.request.headers, null, 2);
  elements.requestBody.textContent = entry.request.body
    ? JSON.stringify(entry.request.body, null, 2)
    : '(なし)';
  
  // レスポンス情報
  elements.responseStatus.textContent = `${entry.response.status} ${entry.response.statusText}`;
  elements.responseHeaders.textContent = JSON.stringify(entry.response.headers, null, 2);
  elements.responseBody.textContent = entry.response.body
    ? JSON.stringify(entry.response.body, null, 2)
    : '(なし)';
  
  // バリデーション結果
  if (entry.validation) {
    renderValidation(entry.validation);
  } else {
    elements.requestValidation.innerHTML = `<span class="validation-status">${t('noSpec')}</span>`;
    elements.requestErrors.innerHTML = '';
    elements.responseValidation.innerHTML = `<span class="validation-status">${t('noSpec')}</span>`;
    elements.responseErrors.innerHTML = '';
  }
}

function renderValidation(validation: ValidationResult): void {
  // リクエストバリデーション
  elements.requestValidation.innerHTML = `
    <span class="validation-status ${validation.requestValid ? 'valid' : 'invalid'}">
      ${validation.requestValid ? t('validationOk') : t('validationError')}
    </span>
  `;
  
  if (validation.requestErrors.length > 0) {
    elements.requestErrors.innerHTML = validation.requestErrors.map(err => 
      formatValidationError(err)
    ).join('');
  } else {
    elements.requestErrors.innerHTML = '';
  }
  
  // レスポンスバリデーション
  elements.responseValidation.innerHTML = `
    <span class="validation-status ${validation.responseValid ? 'valid' : 'invalid'}">
      ${validation.responseValid ? t('validationOk') : t('validationError')}
    </span>
  `;
  
  if (validation.responseErrors.length > 0) {
    elements.responseErrors.innerHTML = validation.responseErrors.map(err => 
      formatValidationError(err)
    ).join('');
  } else {
    elements.responseErrors.innerHTML = '';
  }
}

/**
 * バリデーションエラーを整形して表示
 */
function formatValidationError(err: ValidationError): string {
  const pathHtml = err.path ? `<div class="validation-error-path">${escapeHtml(err.path)}</div>` : '';
  
  // エラーコードに基づいて翻訳されたメッセージを生成
  const translatedMessage = translateErrorMessage(err);
  const messageHtml = `<div class="validation-error-message">${escapeHtml(translatedMessage)}</div>`;
  
  // 詳細情報を構築
  const details: string[] = [];
  
  if (err.expected) {
    details.push(`<span class="error-detail-label">${t('expected')}:</span> <span class="error-detail-expected">${escapeHtml(err.expected)}</span>`);
  }
  
  if (err.actualType) {
    details.push(`<span class="error-detail-label">${t('actualType')}:</span> <span class="error-detail-actual">${escapeHtml(err.actualType)}</span>`);
  }
  
  if (err.actualValue !== undefined) {
    const valueStr = formatValue(err.actualValue);
    details.push(`<span class="error-detail-label">${t('actualValue')}:</span> <span class="error-detail-actual">${escapeHtml(valueStr)}</span>`);
  }
  
  const detailsHtml = details.length > 0 
    ? `<div class="validation-error-details">${details.join('<br>')}</div>` 
    : '';
  
  return `
    <div class="validation-error-item">
      ${pathHtml}
      ${messageHtml}
      ${detailsHtml}
    </div>
  `;
}

/**
 * エラーコードに基づいて翻訳されたエラーメッセージを取得
 */
function translateErrorMessage(err: ValidationError): string {
  const params = err.params || {};
  
  // エラーコードに対応する翻訳キーのマッピング
  const errorCodeToKey: Record<string, TranslationKey> = {
    'PATH_NOT_FOUND': 'errorPathNotFound',
    'METHOD_NOT_ALLOWED': 'errorMethodNotAllowed',
    'UNEXPECTED_STATUS_CODE': 'errorUnexpectedStatusCode',
    'UNEXPECTED_BODY': 'errorUnexpectedBody'
  };
  
  const translationKey = err.errorCode ? errorCodeToKey[err.errorCode] : undefined;
  
  if (translationKey) {
    // 翻訳テンプレートを取得し、パラメータを置換
    let message = t(translationKey);
    for (const [key, value] of Object.entries(params)) {
      message = message.replace(`{${key}}`, String(value));
    }
    return message;
  }
  
  // 翻訳キーがない場合は元のメッセージを返す
  return err.message;
}

/**
 * 値を表示用に整形
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    // 長すぎる場合は省略
    return value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`;
  }
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > 100 ? str.substring(0, 100) + '...' : str;
  }
  return String(value);
}

/**
 * HTMLエスケープ
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================================================
// イベントリスナー
// =============================================================================

function setupEventListeners(): void {
  // 言語切り替え
  document.getElementById('langToggle')?.addEventListener('click', async () => {
    const newLang = toggleLanguage();
    await chrome.storage.local.set({ language: newLang });
    updateUI();
    renderTrafficList();
    if (selectedEntryId) {
      selectEntry(selectedEntryId);
    }
  });
  
  // 仕様書読み込みボタン
  document.getElementById('loadSpecBtn')?.addEventListener('click', () => {
    elements.specModal.style.display = 'flex';
  });
  
  // 履歴削除ボタン
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    trafficList = [];
    selectedEntryId = null;
    renderTrafficList();
    elements.detailPlaceholder.style.display = 'flex';
    elements.detailContent.style.display = 'none';
    
    if (port) {
      port.postMessage({ type: 'CLEAR_TRAFFIC' });
    }
  });
  
  // モーダル閉じる
  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    elements.specModal.style.display = 'none';
  });
  
  // ファイルからインポート
  elements.specFile?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    try {
      const content = await file.text();
      await loadSpec(content);
      // ファイル入力をリセット
      elements.specFile.value = '';
    } catch (err) {
      alert(`${t('specLoadError')}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
  
  // 仕様書を削除
  document.getElementById('clearSpecBtn')?.addEventListener('click', async () => {
    await clearSpec();
  });
  
  // モーダル外クリックで閉じる
  elements.specModal.addEventListener('click', (e) => {
    if (e.target === elements.specModal) {
      elements.specModal.style.display = 'none';
    }
  });
  
  // フィルタ: 仕様書にマッチするもののみ
  elements.filterMatchSpec?.addEventListener('change', async (e) => {
    filterMatchSpec = (e.target as HTMLInputElement).checked;
    await chrome.storage.local.set({ filterMatchSpec });
    
    // filterMatchSpecがOFFになったらfilterErrorOnlyも無効化
    updateFilterErrorOnlyState();
    
    renderTrafficList();
  });
  
  // フィルタ: バリデーションエラーのもののみ
  elements.filterErrorOnly?.addEventListener('change', async (e) => {
    filterErrorOnly = (e.target as HTMLInputElement).checked;
    await chrome.storage.local.set({ filterErrorOnly });
    renderTrafficList();
  });
}

/**
 * filterErrorOnlyチェックボックスの状態を更新
 * filterMatchSpecがONの時のみ有効
 */
function updateFilterErrorOnlyState(): void {
  if (!elements.filterErrorOnly) return;
  
  if (filterMatchSpec) {
    // filterMatchSpecがONなら有効化
    elements.filterErrorOnly.disabled = false;
    elements.filterErrorOnly.parentElement?.classList.remove('disabled');
  } else {
    // filterMatchSpecがOFFなら無効化してOFFにする
    elements.filterErrorOnly.disabled = true;
    elements.filterErrorOnly.checked = false;
    filterErrorOnly = false;
    elements.filterErrorOnly.parentElement?.classList.add('disabled');
    // ストレージも更新
    chrome.storage.local.set({ filterErrorOnly: false });
  }
}

async function loadSpec(content: string): Promise<void> {
  try {
    validator = OpenAPIValidator.fromFile(content);
    await chrome.storage.local.set({ openApiSpec: content });
    updateSpecStatus(true);
    elements.specModal.style.display = 'none';
    
    // 既存のトラフィックを再バリデーション
    trafficList = trafficList.map(entry => ({
      ...entry,
      validation: validateEntry(entry)
    }));
    renderTrafficList();
    
    if (selectedEntryId) {
      selectEntry(selectedEntryId);
    }
    
    alert(t('specLoaded'));
  } catch (e) {
    alert(`${t('specLoadError')}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function clearSpec(): Promise<void> {
  validator = null;
  await chrome.storage.local.remove('openApiSpec');
  updateSpecStatus(false);
  
  // トラフィックのバリデーション結果をクリア
  trafficList = trafficList.map(entry => ({
    ...entry,
    validation: undefined
  }));
  renderTrafficList();
  
  if (selectedEntryId) {
    selectEntry(selectedEntryId);
  }
  
  elements.specModal.style.display = 'none';
  alert(t('specCleared'));
}

// =============================================================================
// 起動
// =============================================================================

initialize();
