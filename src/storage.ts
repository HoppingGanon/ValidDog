import { OpenAPISpec } from './types';

const STORAGE_KEY = 'openapi_spec';

/**
 * OpenAPI仕様書をLocalStorageに保存
 */
export function saveSpec(spec: OpenAPISpec): void {
  try {
    const specString = JSON.stringify(spec);
    localStorage.setItem(STORAGE_KEY, specString);
  } catch (error) {
    console.error('Failed to save spec to localStorage:', error);
    throw new Error('仕様書の保存に失敗しました');
  }
}

/**
 * LocalStorageからOpenAPI仕様書を読み込み
 */
export function loadSpec(): OpenAPISpec | null {
  try {
    const specString = localStorage.getItem(STORAGE_KEY);
    if (!specString) {
      return null;
    }
    return JSON.parse(specString) as OpenAPISpec;
  } catch (error) {
    console.error('Failed to load spec from localStorage:', error);
    return null;
  }
}

/**
 * LocalStorageから仕様書を削除
 */
export function clearSpec(): void {
  localStorage.removeItem(STORAGE_KEY);
}

