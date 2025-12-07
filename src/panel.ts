/**
 * DevToolsパネルのメインスクリプト
 */

import type { TrafficEntry, ExtensionMessage, Language, ValidationResult } from './types';
import { t, setLanguage, toggleLanguage, type TranslationKey } from './i18n';
import { OpenAPIValidator } from './validator';

// =============================================================================
// 状態管理
// =============================================================================

let trafficList: TrafficEntry[] = [];
let selectedEntryId: string | null = null;
let validator: OpenAPIValidator | null = null;
let port: chrome.runtime.Port | null = null;

// =============================================================================
// DOM要素
// =============================================================================

const elements = {
  trafficList: document.getElementById('trafficList') as HTMLDivElement,
  detailPlaceholder: document.getElementById('detailPlaceholder') as HTMLDivElement,
  detailContent: document.getElementById('detailContent') as HTMLDivElement,
  specStatus: document.getElementById('specStatus') as HTMLDivElement,
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
  specUrl: document.getElementById('specUrl') as HTMLInputElement,
  specContent: document.getElementById('specContent') as HTMLTextAreaElement
};

// =============================================================================
// 初期化
// =============================================================================

async function initialize(): Promise<void> {
  // 言語設定を読み込み
  const stored = await chrome.storage.local.get(['language', 'openApiSpec']);
  if (stored.language) {
    setLanguage(stored.language as Language);
  }
  
  // 仕様書があれば読み込み
  if (stored.openApiSpec) {
    try {
      validator = OpenAPIValidator.fromString(stored.openApiSpec);
      updateSpecStatus(true);
    } catch (e) {
      console.error('Failed to load stored spec:', e);
    }
  }
  
  // UIを更新
  updateUI();
  
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
}

function updateSpecStatus(loaded: boolean): void {
  if (loaded) {
    elements.specStatus.textContent = t('specLoaded');
    elements.specStatus.classList.add('loaded');
  } else {
    elements.specStatus.textContent = t('noSpec');
    elements.specStatus.classList.remove('loaded');
  }
}

function renderTrafficList(): void {
  if (trafficList.length === 0) {
    elements.trafficList.innerHTML = `<div class="empty-state">${t('noTraffic')}</div>`;
    return;
  }
  
  const html = trafficList.slice().reverse().map(entry => {
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
    elements.requestErrors.innerHTML = validation.requestErrors.map(err => `
      <div class="validation-error-item">
        ${err.path ? `<div class="validation-error-path">${err.path}</div>` : ''}
        <div class="validation-error-message">${err.message}</div>
      </div>
    `).join('');
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
    elements.responseErrors.innerHTML = validation.responseErrors.map(err => `
      <div class="validation-error-item">
        ${err.path ? `<div class="validation-error-path">${err.path}</div>` : ''}
        <div class="validation-error-message">${err.message}</div>
      </div>
    `).join('');
  } else {
    elements.responseErrors.innerHTML = '';
  }
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
  
  // URLから読み込み
  document.getElementById('loadFromUrlBtn')?.addEventListener('click', async () => {
    const url = elements.specUrl.value.trim();
    if (!url) return;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const content = await response.text();
      loadSpec(content);
    } catch (e) {
      alert(`${t('specLoadError')}: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  
  // テキストから読み込み
  document.getElementById('loadFromTextBtn')?.addEventListener('click', () => {
    const content = elements.specContent.value.trim();
    if (!content) return;
    loadSpec(content);
  });
  
  // モーダル外クリックで閉じる
  elements.specModal.addEventListener('click', (e) => {
    if (e.target === elements.specModal) {
      elements.specModal.style.display = 'none';
    }
  });
}

async function loadSpec(content: string): Promise<void> {
  try {
    validator = OpenAPIValidator.fromString(content);
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

// =============================================================================
// 起動
// =============================================================================

initialize();

