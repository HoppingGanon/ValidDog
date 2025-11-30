/**
 * バックグラウンドスクリプト
 * ネットワークリクエストを監視し、バリデーションを実行
 */

import { loadSpec } from './chromeStorage';
import { saveTraffic, TrafficEntry } from './trafficStorage';
import { matchPath } from './pathMatcher';
import { validateRequestBody, validateResponseBody } from './validator';

// タブごとのネットワーク監視
const tabRequests = new Map<string, {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: string;
}>();

// ネットワークリクエストの監視
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId === -1) return;
    
    const requestId = `${details.tabId}-${details.requestId}`;
    let requestBody: string | undefined;
    
    // POSTデータを取得
    if (details.requestBody) {
      if (details.requestBody.raw) {
        const decoder = new TextDecoder('utf-8');
        requestBody = details.requestBody.raw
          .map(part => decoder.decode(part.bytes))
          .join('');
      } else if (details.requestBody.formData) {
        requestBody = JSON.stringify(details.requestBody.formData);
      }
    }
    
    tabRequests.set(requestId, {
      url: details.url,
      method: details.method,
      requestHeaders: {},
      requestBody
    });
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// リクエストヘッダーの監視
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    if (details.tabId === -1) return;
    
    const requestId = `${details.tabId}-${details.requestId}`;
    const request = tabRequests.get(requestId);
    
    if (request && details.requestHeaders) {
      const headers: Record<string, string> = {};
      details.requestHeaders.forEach(header => {
        headers[header.name] = header.value || '';
      });
      request.requestHeaders = headers;
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// レスポンスの監視と検証
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.tabId === -1) return;
    
    const requestId = `${details.tabId}-${details.requestId}`;
    const request = tabRequests.get(requestId);
    
    if (!request) return;
    
    try {
      // レスポンスヘッダーの取得
      const responseHeaders: Record<string, string> = {};
      if (details.responseHeaders) {
        details.responseHeaders.forEach(header => {
          responseHeaders[header.name] = header.value || '';
        });
      }
      
      // レスポンスボディの取得（制限あり）
      let responseBody: string | undefined;
      const contentType = responseHeaders['content-type'] || responseHeaders['Content-Type'] || '';
      
      // JSONレスポンスのみ処理
      if (contentType.includes('application/json')) {
        // 注: webRequestではレスポンスボディを直接取得できないため、
        // 実際の実装ではdevtools.network APIを使用する必要があります
        // ここではプレースホルダーとして記載
        responseBody = undefined;
      }
      
      // OpenAPI仕様書を取得
      const spec = await loadSpec();
      
      let validationResult;
      let matchedPath: string | undefined;
      
      if (spec) {
        // パスマッチングを試行
        const matched = matchPath(spec, request.url, request.method);
        
        if (matched) {
          matchedPath = `${request.method.toUpperCase()} ${matched.path}`;
          
          // バリデーション実行
          const requestValidation = validateRequestBody(matched, request.requestBody || '');
          const responseValidation = validateResponseBody(
            matched,
            responseBody || '{}',
            details.statusCode
          );
          
          validationResult = {
            requestValid: requestValidation.valid,
            responseValid: responseValidation.valid,
            requestErrors: requestValidation.errors,
            responseErrors: responseValidation.errors
          };
        }
      }
      
      // トラフィックエントリを作成
      const entry: TrafficEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        method: request.method,
        url: request.url,
        requestHeaders: request.requestHeaders,
        requestBody: request.requestBody,
        responseStatus: details.statusCode,
        responseHeaders,
        responseBody,
        matchedPath,
        validationResult
      };
      
      // 履歴に保存
      await saveTraffic(entry);
    } catch (error) {
      console.error('Failed to process request:', error);
    } finally {
      // リクエスト情報をクリア
      tabRequests.delete(requestId);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

console.log('ValidKun background script loaded');

