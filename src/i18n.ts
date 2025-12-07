/**
 * 国際化（i18n）対応
 */

import type { Language } from './types';

/** 翻訳キー */
export type TranslationKey =
  | 'title'
  | 'loadSpec'
  | 'clearTraffic'
  | 'noTraffic'
  | 'request'
  | 'response'
  | 'headers'
  | 'body'
  | 'path'
  | 'queryParams'
  | 'validation'
  | 'validationOk'
  | 'validationError'
  | 'requestValidation'
  | 'responseValidation'
  | 'selectTraffic'
  | 'specLoaded'
  | 'specLoadError'
  | 'noSpec'
  | 'status'
  | 'errors'
  | 'importSpec'
  | 'importFile'
  | 'import'
  | 'clearSpec'
  | 'close'
  | 'specCleared'
  | 'expected'
  | 'actualType'
  | 'actualValue'
  | 'filterMatchSpec'
  | 'filterErrorOnly'
  | 'noMatchingTraffic';

/** 翻訳データ */
const translations: Record<Language, Record<TranslationKey, string>> = {
  ja: {
    title: 'ばりっどーぬ - ValidDog',
    loadSpec: '仕様書',
    clearTraffic: '履歴削除',
    noTraffic: 'トラフィックがありません',
    request: 'リクエスト',
    response: 'レスポンス',
    headers: 'ヘッダー',
    body: 'ボディ',
    path: 'パス',
    queryParams: 'クエリパラメータ',
    validation: 'バリデーション',
    validationOk: '✓ OK',
    validationError: '✗ エラー',
    requestValidation: 'リクエスト検証',
    responseValidation: 'レスポンス検証',
    selectTraffic: '左側からトラフィックを選択してください',
    specLoaded: '仕様書を読み込みました',
    specLoadError: '仕様書の読み込みに失敗しました',
    noSpec: '仕様書未読込',
    status: 'ステータス',
    errors: 'エラー',
    importSpec: 'OpenAPI仕様書をインポート',
    importFile: 'ファイルを選択 (YAML/JSON):',
    import: 'インポート',
    clearSpec: '仕様書を削除',
    close: '閉じる',
    specCleared: '仕様書を削除しました',
    expected: '期待',
    actualType: '実際の型',
    actualValue: '実際の値',
    filterMatchSpec: '仕様書にマッチするもののみ',
    filterErrorOnly: 'エラーのもののみ',
    noMatchingTraffic: 'フィルタに一致するトラフィックがありません'
  },
  en: {
    title: 'ValidDog',
    loadSpec: 'Spec',
    clearTraffic: 'Clear',
    noTraffic: 'No traffic',
    request: 'Request',
    response: 'Response',
    headers: 'Headers',
    body: 'Body',
    path: 'Path',
    queryParams: 'Query Params',
    validation: 'Validation',
    validationOk: '✓ OK',
    validationError: '✗ Error',
    requestValidation: 'Request Validation',
    responseValidation: 'Response Validation',
    selectTraffic: 'Select traffic from the left panel',
    specLoaded: 'Spec loaded successfully',
    specLoadError: 'Failed to load spec',
    noSpec: 'No spec loaded',
    status: 'Status',
    errors: 'Errors',
    importSpec: 'Import OpenAPI Spec',
    importFile: 'Select file (YAML/JSON):',
    import: 'Import',
    clearSpec: 'Clear Spec',
    close: 'Close',
    specCleared: 'Spec cleared',
    expected: 'Expected',
    actualType: 'Actual type',
    actualValue: 'Actual value',
    filterMatchSpec: 'Spec matches only',
    filterErrorOnly: 'Errors only',
    noMatchingTraffic: 'No traffic matching filters'
  }
};

/** 現在の言語 */
let currentLanguage: Language = 'ja';

/**
 * 言語を設定
 */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

/**
 * 現在の言語を取得
 */
export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * 翻訳を取得
 */
export function t(key: TranslationKey): string {
  return translations[currentLanguage][key] || key;
}

/**
 * 言語を切り替え
 */
export function toggleLanguage(): Language {
  currentLanguage = currentLanguage === 'ja' ? 'en' : 'ja';
  return currentLanguage;
}

