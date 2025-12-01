import { loadSpecFromFile } from './fileLoader';
import { saveSpec, loadSpec } from './chromeStorage';
import { matchPath } from './pathMatcher';
import { validateRequestBody, validateResponseBody } from './validator';
import { NetworkRequest, OpenAPISpec, ValidationResult } from './types';
import { setLanguage, getCurrentLanguage, t, type Language } from './i18n';

let currentSpec: OpenAPISpec | null = null;
let requests: NetworkRequest[] = [];
let selectedRequestId: string | null = null;
let filterMatchedOnly = false;

const FILTER_STORAGE_KEY = 'filter_matched_only';
const LANGUAGE_STORAGE_KEY = 'language';

/**
 * 初期化
 */
async function init(): Promise<void> {
  // 言語設定を復元
  await restoreLanguage();
  
  // 保存された仕様書を読み込み
  currentSpec = await loadSpec();
  updateSpecInfo();

  // フィルター状態を復元
  await restoreFilterState();

  // イベントリスナーの設定
  setupEventListeners();

  // ネットワーク監視を開始
  startNetworkMonitoring();
  
  // UIを更新
  updateAllTexts();
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners(): void {
  // 言語選択
  const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
  if (languageSelect) {
    languageSelect.addEventListener('change', async (e) => {
      const lang = (e.target as HTMLSelectElement).value as Language;
      setLanguage(lang);
      await saveLanguage(lang);
      updateAllTexts();
      updateRequestList();
      if (selectedRequestId) {
        const selected = requests.find(r => r.id === selectedRequestId);
        if (selected) {
          showRequestDetail(selected);
        }
      }
    });
  }

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

  // フィルターチェックボックス
  const filterCheckbox = document.getElementById('filter-matched-only') as HTMLInputElement;
  if (filterCheckbox) {
    filterCheckbox.addEventListener('change', async (e) => {
      filterMatchedOnly = (e.target as HTMLInputElement).checked;
      await saveFilterState();
      updateRequestList();
    });
  }
}

/**
 * フィルター状態を保存
 */
async function saveFilterState(): Promise<void> {
  try {
    await chrome.storage.local.set({ [FILTER_STORAGE_KEY]: filterMatchedOnly });
  } catch (error) {
    console.error('Failed to save filter state:', error);
  }
}

/**
 * フィルター状態を復元
 */
async function restoreFilterState(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(FILTER_STORAGE_KEY);
    if (result[FILTER_STORAGE_KEY] !== undefined) {
      filterMatchedOnly = result[FILTER_STORAGE_KEY] as boolean;
      
      // チェックボックスの状態を復元
      const filterCheckbox = document.getElementById('filter-matched-only') as HTMLInputElement;
      if (filterCheckbox) {
        filterCheckbox.checked = filterMatchedOnly;
      }
    }
  } catch (error) {
    console.error('Failed to restore filter state:', error);
  }
}

/**
 * 言語設定を保存
 */
async function saveLanguage(lang: Language): Promise<void> {
  try {
    await chrome.storage.local.set({ [LANGUAGE_STORAGE_KEY]: lang });
  } catch (error) {
    console.error('Failed to save language:', error);
  }
}

/**
 * 言語設定を復元
 */
async function restoreLanguage(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(LANGUAGE_STORAGE_KEY);
    const lang = (result[LANGUAGE_STORAGE_KEY] as Language) || 'en';
    setLanguage(lang);
    
    // セレクトボックスの状態を復元
    const languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    if (languageSelect) {
      languageSelect.value = lang;
    }
  } catch (error) {
    console.error('Failed to restore language:', error);
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
    specInfo.textContent = `${t('specLoaded')}: ${currentSpec.info.title} (v${currentSpec.info.version})`;
    specInfo.className = 'spec-info loaded';
  } else {
    specInfo.textContent = t('specNotLoaded');
    specInfo.className = 'spec-info';
  }
}

/**
 * すべてのテキストを更新
 */
function updateAllTexts(): void {
  // Header
  const headerAppTitle = document.getElementById('header-app-title');
  if (headerAppTitle) {
    headerAppTitle.textContent = t('appTitle');
  }
  
  const headerRequestDetails = document.getElementById('header-request-details');
  if (headerRequestDetails) {
    headerRequestDetails.textContent = t('requestDetails');
  }
  
  // Filter label
  const filterLabel = document.getElementById('filter-label');
  if (filterLabel) {
    filterLabel.textContent = t('matchedOnly');
  }
  
  // Buttons
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.title = t('clear');
  }
  
  const uploadBtn = document.getElementById('upload-spec-btn');
  if (uploadBtn) {
    uploadBtn.title = t('uploadSpec');
  }
  
  // Spec info
  updateSpecInfo();
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

  // フィルタリング
  const filteredRequests = filterMatchedOnly 
    ? requests.filter(r => r.matched)
    : requests;

  if (filteredRequests.length === 0) {
    if (requests.length > 0 && filterMatchedOnly) {
      listElement.innerHTML = `
        <div class="empty-state">
          <p>${t('noMatchedRequestsTitle')}</p>
          <p class="small">${t('noMatchedRequestsDesc')}</p>
        </div>
      `;
    } else {
      listElement.innerHTML = `
        <div class="empty-state">
          <p>${t('noRequestsTitle')}</p>
          <p class="small">${t('noRequestsDesc')}</p>
        </div>
      `;
    }
    return;
  }

  listElement.innerHTML = '';
  filteredRequests.forEach(request => {
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

  // スキーマ違反のビックリマークSVG
  const schemaViolationIcon = request.hasSchemaViolation ? `
    <div class="schema-violation-indicator">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 20h20L12 2z" fill="#ffc107" stroke="#f57c00" stroke-width="1.5"/>
        <path d="M12 9v5" stroke="#000" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="#000"/>
      </svg>
    </div>
  ` : '<div class="schema-violation-indicator"></div>';

  // APIステータスの判定
  let statusClass = '';
  if (request.status) {
    statusClass = request.status >= 200 && request.status < 300 ? 'success' : 'error';
  }

  const time = new Date(request.timestamp).toLocaleTimeString('ja-JP');

  item.innerHTML = `
    ${schemaViolationIcon}
    <div class="request-info">
      <div>
        <span class="request-method ${request.method}">${request.method.toUpperCase()}</span>
        <span class="request-url">${request.path}</span>
      </div>
      <div class="request-meta">
        <span class="request-status ${statusClass}">Status: ${request.status || '-'}</span>
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

  const locale = getCurrentLanguage() === 'ja' ? 'ja-JP' : 'en-US';
  
  let html = `
    <div class="detail-section">
      <h3>${t('requestInformation')}</h3>
      <div class="detail-row">
        <span class="detail-label">${t('method')}:</span>
        <span class="detail-value">${request.method.toUpperCase()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t('url')}:</span>
        <span class="detail-value">${request.url}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t('status')}:</span>
        <span class="detail-value">${request.status} ${request.statusText}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${t('time')}:</span>
        <span class="detail-value">${new Date(request.timestamp).toLocaleString(locale)}</span>
      </div>
    </div>
  `;

  // マッチング情報
  if (!request.matched) {
    html += `
      <div class="no-match-warning">
        <h4>${t('notMatched')}</h4>
        <p>${t('notMatchedDesc')}</p>
      </div>
    `;
  } else {
    html += `
      <div class="detail-section">
        <h3>${t('matchedPath')}</h3>
        <div class="detail-row">
          <span class="detail-label">${t('pathPattern')}:</span>
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
      const validText = reqResult.valid ? `✓ ${t('valid')}` : `✗ ${t('invalid')}`;
      
      html += `
        <div class="validation-result ${validClass}">
          <h4>${t('requestBody')}: ${validText}</h4>
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
      const validText = resResult.valid ? `✓ ${t('valid')}` : `✗ ${t('invalid')}`;
      
      html += `
        <div class="validation-result ${validClass}">
          <h4>${t('responseBody')}: ${validText}</h4>
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
    const requestErrors = request.validationResult?.request?.errors.map(e => e.path) || [];
    html += `
      <div class="detail-section">
        <h3>${t('requestBody')}</h3>
        <div class="json-viewer"><pre>${highlightJson(request.requestBody, requestErrors)}</pre></div>
      </div>
    `;
  }

  // レスポンスボディ
  if (request.responseBody) {
    const responseErrors = request.validationResult?.response?.errors.map(e => e.path) || [];
    html += `
      <div class="detail-section">
        <h3>${t('responseBody')}</h3>
        <div class="json-viewer"><pre>${highlightJson(request.responseBody, responseErrors)}</pre></div>
      </div>
    `;
  }

  detailContent.innerHTML = html;
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
 * JSONをシンタックスハイライト付きで表示
 */
function highlightJson(json: string, errorPaths: string[] = []): string {
  try {
    const parsed = JSON.parse(json);
    const formatted = JSON.stringify(parsed, null, 2);
    
    // エラーパスを解析
    const errorKeys = new Set<string>();
    errorPaths.forEach(path => {
      // "requestBody.name" -> ["name"]
      // "responseBody.user.email" -> ["user", "email"]
      const parts = path.replace(/^(requestBody|responseBody)\./, '').split('.');
      parts.forEach(part => {
        // 配列インデックスも処理 "items[0]" -> "items", "0"
        const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);
        if (arrayMatch) {
          errorKeys.add(arrayMatch[1]);
        } else {
          errorKeys.add(part);
        }
      });
    });
    
    // JSONをトークンに分解してハイライト
    let result = '';
    let inString = false;
    let currentToken = '';
    let escapeNext = false;
    
    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];
      
      if (escapeNext) {
        currentToken += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        currentToken += char;
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        if (inString) {
          currentToken += char;
          // 文字列の終わり - キーか値かを判定
          const nextNonSpace = formatted.slice(i + 1).match(/^\s*:/);
          const isKey = nextNonSpace !== null;
          
          const tokenContent = currentToken.slice(1, -1); // クォートを除去
          const isError = errorKeys.has(tokenContent);
          
          if (isKey) {
            result += `<span class="json-key${isError ? ' json-error' : ''}">${escapeHtml(currentToken)}</span>`;
          } else {
            result += `<span class="json-string">${escapeHtml(currentToken)}</span>`;
          }
          currentToken = '';
          inString = false;
        } else {
          inString = true;
          currentToken = char;
        }
      } else if (inString) {
        currentToken += char;
      } else if (/[{}[\],:]/.test(char)) {
        // 直前のトークンを処理
        if (currentToken.trim()) {
          result += highlightToken(currentToken.trim());
          currentToken = '';
        }
        result += `<span class="json-punctuation">${escapeHtml(char)}</span>`;
      } else if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
        // 直前のトークンを処理
        if (currentToken.trim()) {
          result += highlightToken(currentToken.trim());
          currentToken = '';
        }
        result += escapeHtml(char);
      } else {
        currentToken += char;
      }
    }
    
    // 残りのトークンを処理
    if (currentToken.trim()) {
      result += highlightToken(currentToken.trim());
    }
    
    return result;
  } catch {
    return escapeHtml(json);
  }
}

/**
 * トークンをハイライト
 */
function highlightToken(token: string): string {
  if (token === 'true' || token === 'false') {
    return `<span class="json-boolean">${escapeHtml(token)}</span>`;
  } else if (token === 'null') {
    return `<span class="json-null">${escapeHtml(token)}</span>`;
  } else if (/^-?\d+\.?\d*$/.test(token)) {
    return `<span class="json-number">${escapeHtml(token)}</span>`;
  } else {
    return escapeHtml(token);
  }
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
        <p>${t('selectRequestPrompt')}</p>
      </div>
    `;
  }
}

// 初期化実行
init();
