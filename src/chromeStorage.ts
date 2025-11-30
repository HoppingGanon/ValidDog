import { OpenAPISpec } from './types';

const STORAGE_KEY = 'openapi_spec';

/**
 * OpenAPI仕様書をChrome Storageに保存
 */
export async function saveSpec(spec: OpenAPISpec): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: spec });
  } catch (error) {
    console.error('Failed to save spec to chrome.storage:', error);
    throw new Error('仕様書の保存に失敗しました');
  }
}

/**
 * Chrome StorageからOpenAPI仕様書を読み込み
 */
export async function loadSpec(): Promise<OpenAPISpec | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as OpenAPISpec) || null;
  } catch (error) {
    console.error('Failed to load spec from chrome.storage:', error);
    return null;
  }
}

/**
 * Chrome Storageから仕様書を削除
 */
export async function clearSpec(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
