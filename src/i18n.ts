/**
 * 多言語対応
 */

export type Language = 'en' | 'ja';

interface Translations {
  // Header
  networkRequests: string;
  requestDetails: string;
  
  // Spec info
  specNotLoaded: string;
  specLoaded: string;
  
  // Filter
  matchedOnly: string;
  
  // Empty states
  noRequestsTitle: string;
  noRequestsDesc: string;
  noMatchedRequestsTitle: string;
  noMatchedRequestsDesc: string;
  selectRequestPrompt: string;
  
  // Request info
  method: string;
  url: string;
  status: string;
  time: string;
  
  // Detail sections
  requestInformation: string;
  matchedPath: string;
  requestBody: string;
  responseBody: string;
  
  // Validation
  notMatched: string;
  notMatchedDesc: string;
  pathPattern: string;
  valid: string;
  invalid: string;
  
  // Buttons
  clear: string;
  uploadSpec: string;
  
  // Messages
  errorPrefix: string;
  uploadError: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Header
    networkRequests: 'Network Requests',
    requestDetails: 'Request Details',
    
    // Spec info
    specNotLoaded: 'OpenAPI specification not loaded',
    specLoaded: 'Specification',
    
    // Filter
    matchedOnly: 'Show matched only',
    
    // Empty states
    noRequestsTitle: 'No network requests',
    noRequestsDesc: 'Interact with the page to generate requests',
    noMatchedRequestsTitle: 'No matched requests',
    noMatchedRequestsDesc: 'Disable filter or check your specification',
    selectRequestPrompt: 'Select a request from the list',
    
    // Request info
    method: 'Method',
    url: 'URL',
    status: 'Status',
    time: 'Time',
    
    // Detail sections
    requestInformation: 'Request Information',
    matchedPath: '✓ Matched Path',
    requestBody: 'Request Body',
    responseBody: 'Response Body',
    
    // Validation
    notMatched: '⚠️ Not matched with OpenAPI specification',
    notMatchedDesc: 'This request is not defined in the specification.',
    pathPattern: 'Path Pattern',
    valid: 'Valid',
    invalid: 'Invalid',
    
    // Buttons
    clear: 'Clear',
    uploadSpec: 'Upload Spec',
    
    // Messages
    errorPrefix: 'Error',
    uploadError: 'Failed to load specification'
  },
  ja: {
    // Header
    networkRequests: 'ネットワークリクエスト',
    requestDetails: 'リクエスト詳細',
    
    // Spec info
    specNotLoaded: '仕様書が読み込まれていません',
    specLoaded: '仕様書',
    
    // Filter
    matchedOnly: '仕様書にマッチするもののみ',
    
    // Empty states
    noRequestsTitle: 'ネットワークリクエストが表示されます',
    noRequestsDesc: 'ページを操作してリクエストを生成してください',
    noMatchedRequestsTitle: '仕様書にマッチするリクエストがありません',
    noMatchedRequestsDesc: 'フィルターを解除するか、仕様書を確認してください',
    selectRequestPrompt: '左側からリクエストを選択してください',
    
    // Request info
    method: 'メソッド',
    url: 'URL',
    status: 'ステータス',
    time: '時刻',
    
    // Detail sections
    requestInformation: 'リクエスト情報',
    matchedPath: '✓ マッチしたパス',
    requestBody: 'リクエストボディ',
    responseBody: 'レスポンスボディ',
    
    // Validation
    notMatched: '⚠️ OpenAPI仕様書とマッチしませんでした',
    notMatchedDesc: 'このリクエストは仕様書に定義されていません。',
    pathPattern: 'パスパターン',
    valid: '有効',
    invalid: '無効',
    
    // Buttons
    clear: 'クリア',
    uploadSpec: '仕様書を読み込む',
    
    // Messages
    errorPrefix: 'エラー',
    uploadError: '仕様書の読み込みに失敗しました'
  }
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function t(key: keyof Translations): string {
  return translations[currentLanguage][key] || key;
}

