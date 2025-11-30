import { loadSpecFromFile } from './fileLoader';
import { saveSpec, loadSpec } from './chromeStorage';
import { matchPath } from './pathMatcher';
import { validateRequestBody, validateResponseBody } from './validator';
import { NetworkRequest, OpenAPISpec, ValidationResult } from './types';

let currentSpec: OpenAPISpec | null = null;
let requests: NetworkRequest[] = [];
let selectedRequestId: string | null = null;

/**
 * 初期化
 */
async function init(): Promise<void> {
  // 保存された仕様書を読み込み
  currentSpec = await loadSpec();
  updateSpecInfo();

  // イベントリスナーの設定
  setupEventListeners();

  // ネットワーク監視を開始
  startNetworkMonitoring();
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners(): void {
  // 仕様書アップロードボタン
  const uploadBtn = document.getElementById('upload-spec-btn');
  const fileInput = document.getElementById('spec-file-input') as HTMLInputElement;

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', handleFileUpload);
  }

  // クリアボタン
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearRequests);
  }
}

/**
 * ファイルアップロード処理
 */
async function handleFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  try {
    currentSpec = await loadSpecFromFile(file);
    await saveSpec(currentSpec);
    updateSpecInfo();
    
    // 既存のリクエストを再バリデーション
    revalidateAllRequests();
  } catch (error) {
    alert(`エラー: ${(error as Error).message}`);
  }
}

/**
 * 仕様書情報の表示更新
 */
function updateSpecInfo(): void {
  const specInfo = document.getElementById('spec-info');
  if (!specInfo) return;

  if (currentSpec) {
    specInfo.textContent = `仕様書: ${currentSpec.info.title} (v${currentSpec.info.version})`;
    specInfo.className = 'spec-info loaded';
  } else {
    specInfo.textContent = '仕様書が読み込まれていません';
    specInfo.className = 'spec-info';
  }
}

/**
 * ネットワーク監視を開始
 */
function startNetworkMonitoring(): void {
  chrome.devtools.network.onRequestFinished.addListener((request) => {
    handleNetworkRequest(request);
  });
}

/**
 * ネットワークリクエストの処理
 */
async function handleNetworkRequest(har: chrome.devtools.network.Request): Promise<void> {
  try {
    const url = new URL(har.request.url);
    const method = har.request.method.toLowerCase();
    const path = url.pathname;

    // リクエストボディを取得
    let requestBody = '';
    if (har.request.postData) {
      requestBody = har.request.postData.text || '';
    }

    // レスポンスボディを取得
    let responseBody = '';
    try {
      const content = await getResponseBody(har);
      responseBody = content;
    } catch (error) {
      console.error('Failed to get response body:', error);
    }

    // リクエスト情報を作成
    const networkRequest: NetworkRequest = {
      id: `${Date.now()}-${Math.random()}`,
      method: method,
      url: har.request.url,
      path: path,
      timestamp: new Date(har.startedDateTime).getTime(),
      status: har.response.status,
      statusText: har.response.statusText,
      requestBody: requestBody,
      responseBody: responseBody,
      requestHeaders: convertHeaders(har.request.headers as NetworkHeader[]),
      responseHeaders: convertHeaders(har.response.headers as NetworkHeader[]),
      matched: false,
      hasSchemaViolation: false
    };

    // バリデーション実行
    if (currentSpec) {
      validateNetworkRequest(networkRequest);
    }

    // リクエストを追加
    requests.unshift(networkRequest); // 新しいものを先頭に
    updateRequestList();
  } catch (error) {
    console.error('Error handling network request:', error);
  }
}

/**
 * レスポンスボディを取得
 */
function getResponseBody(request: chrome.devtools.network.Request): Promise<string> {
  return new Promise((resolve) => {
    request.getContent((content, encoding) => {
      if (encoding === 'base64') {
        try {
          resolve(atob(content));
        } catch {
          resolve(content);
        }
      } else {
        resolve(content);
      }
    });
  });
}

/**
 * ヘッダーの型定義
 */
interface NetworkHeader {
  name: string;
  value: string;
}

/**
 * ヘッダーを変換
 */
function convertHeaders(headers: NetworkHeader[]): { [key: string]: string } {
  const result: { [key: string]: string } = {};
  headers.forEach(header => {
    result[header.name] = header.value;
  });
  return result;
}

/**
 * ネットワークリクエストのバリデーション
 */
function validateNetworkRequest(request: NetworkRequest): void {
  if (!currentSpec) {
    return;
  }

  // パスマッチング
  const matched = matchPath(currentSpec, request.url, request.method);

  if (!matched) {
    request.matched = false;
    return;
  }

  request.matched = true;
  request.matchedPath = matched.path;

  // リクエストボディのバリデーション
  let requestResult: ValidationResult | null = null;
  if (request.requestBody) {
    try {
      requestResult = validateRequestBody(matched, request.requestBody);
    } catch (error) {
      console.error('Request validation error:', error);
    }
  }

  // レスポンスボディのバリデーション
  let responseResult: ValidationResult | null = null;
  if (request.responseBody && request.status) {
    try {
      responseResult = validateResponseBody(matched, request.responseBody, request.status);
    } catch (error) {
      console.error('Response validation error:', error);
    }
  }

  request.validationResult = {
    request: requestResult,
    response: responseResult
  };

  // スキーマ違反のチェック
  request.hasSchemaViolation = 
    (requestResult && !requestResult.valid) || 
    (responseResult && !responseResult.valid) || 
    false;
}

/**
 * すべてのリクエストを再バリデーション
 */
function revalidateAllRequests(): void {
  requests.forEach(request => {
    validateNetworkRequest(request);
  });
  updateRequestList();
  if (selectedRequestId) {
    const selected = requests.find(r => r.id === selectedRequestId);
    if (selected) {
      showRequestDetail(selected);
    }
  }
}

/**
 * リクエスト一覧の更新
 */
function updateRequestList(): void {
  const listElement = document.getElementById('request-list');
  if (!listElement) return;

  if (requests.length === 0) {
    listElement.innerHTML = `
      <div class="empty-state">
        <p>ネットワークリクエストが表示されます</p>
        <p class="small">ページを操作してリクエストを生成してください</p>
      </div>
    `;
    return;
  }

  listElement.innerHTML = '';
  requests.forEach(request => {
    const item = createRequestItem(request);
    listElement.appendChild(item);
  });
}

/**
 * リクエストアイテムを作成
 */
function createRequestItem(request: NetworkRequest): HTMLElement {
  const item = document.createElement('div');
  item.className = 'request-item';
  if (selectedRequestId === request.id) {
    item.classList.add('selected');
  }

  // ステータス判定
  let statusClass = 'warning';
  if (request.hasSchemaViolation) {
    statusClass = 'error';
  } else if (request.status && request.status >= 200 && request.status < 300) {
    statusClass = 'success';
  }

  const time = new Date(request.timestamp).toLocaleTimeString('ja-JP');

  item.innerHTML = `
    <div class="status-indicator ${statusClass}"></div>
    <div class="request-info">
      <div>
        <span class="request-method ${request.method}">${request.method.toUpperCase()}</span>
        <span class="request-url">${request.path}</span>
      </div>
      <div class="request-meta">
        <span class="request-status">Status: ${request.status || '-'}</span>
        <span class="request-time">${time}</span>
      </div>
    </div>
  `;

  item.addEventListener('click', () => {
    selectedRequestId = request.id;
    updateRequestList();
    showRequestDetail(request);
  });

  return item;
}

/**
 * リクエスト詳細を表示
 */
function showRequestDetail(request: NetworkRequest): void {
  const detailContent = document.getElementById('detail-content');
  if (!detailContent) return;

  let html = `
    <div class="detail-section">
      <h3>Request Information</h3>
      <div class="detail-row">
        <span class="detail-label">Method:</span>
        <span class="detail-value">${request.method.toUpperCase()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">URL:</span>
        <span class="detail-value">${request.url}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status:</span>
        <span class="detail-value">${request.status} ${request.statusText}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time:</span>
        <span class="detail-value">${new Date(request.timestamp).toLocaleString('ja-JP')}</span>
      </div>
    </div>
  `;

  // マッチング情報
  if (!request.matched) {
    html += `
      <div class="no-match-warning">
        <h4>⚠️ OpenAPI仕様書とマッチしませんでした</h4>
        <p>このリクエストは仕様書に定義されていません。</p>
      </div>
    `;
  } else {
    html += `
      <div class="detail-section">
        <h3>✓ Matched Path</h3>
        <div class="detail-row">
          <span class="detail-label">Path Pattern:</span>
          <span class="detail-value"><code>${request.matchedPath}</code></span>
        </div>
      </div>
    `;
  }

  // バリデーション結果
  if (request.validationResult) {
    const { request: reqResult, response: resResult } = request.validationResult;

    if (reqResult) {
      const validClass = reqResult.valid ? 'success' : 'error';
      const validText = reqResult.valid ? '✓ Valid' : '✗ Invalid';
      
      html += `
        <div class="validation-result ${validClass}">
          <h4>Request Body: ${validText}</h4>
      `;
      
      if (reqResult.errors.length > 0) {
        html += '<ul class="error-list">';
        reqResult.errors.forEach(error => {
          html += `<li><span class="error-path">${error.path}</span>: ${error.message}</li>`;
        });
        html += '</ul>';
      }
      
      html += '</div>';
    }

    if (resResult) {
      const validClass = resResult.valid ? 'success' : 'error';
      const validText = resResult.valid ? '✓ Valid' : '✗ Invalid';
      
      html += `
        <div class="validation-result ${validClass}">
          <h4>Response Body: ${validText}</h4>
      `;
      
      if (resResult.errors.length > 0) {
        html += '<ul class="error-list">';
        resResult.errors.forEach(error => {
          html += `<li><span class="error-path">${error.path}</span>: ${error.message}</li>`;
        });
        html += '</ul>';
      }
      
      html += '</div>';
    }
  }

  // リクエストボディ
  if (request.requestBody) {
    html += `
      <div class="detail-section">
        <h3>Request Body</h3>
        <div class="code-block">${escapeHtml(formatJson(request.requestBody))}</div>
      </div>
    `;
  }

  // レスポンスボディ
  if (request.responseBody) {
    html += `
      <div class="detail-section">
        <h3>Response Body</h3>
        <div class="code-block">${escapeHtml(formatJson(request.responseBody))}</div>
      </div>
    `;
  }

  detailContent.innerHTML = html;
}

/**
 * JSONを整形
 */
function formatJson(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * リクエストをクリア
 */
function clearRequests(): void {
  requests = [];
  selectedRequestId = null;
  updateRequestList();
  
  const detailContent = document.getElementById('detail-content');
  if (detailContent) {
    detailContent.innerHTML = `
      <div class="empty-state">
        <p>左側からリクエストを選択してください</p>
      </div>
    `;
  }
}

// 初期化実行
init();
