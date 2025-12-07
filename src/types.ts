/**
 * 型定義
 */

/** サポートする言語 */
export type Language = 'ja' | 'en';

/** HTTPメソッド */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

/** トラフィックエントリ */
export interface TrafficEntry {
  id: string;
  timestamp: number;
  method: HttpMethod;
  url: string;
  path: string;
  request: {
    headers: Record<string, string>;
    body?: unknown;
    queryParams?: Record<string, string>;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  validation?: ValidationResult;
}

/** バリデーション結果 */
export interface ValidationResult {
  requestValid: boolean;
  responseValid: boolean;
  requestErrors: ValidationError[];
  responseErrors: ValidationError[];
}

/** バリデーションエラー */
export interface ValidationError {
  path: string;
  message: string;
  errorCode?: string;
  location?: string;
}

/** メッセージタイプ */
export type MessageType = 
  | 'TRAFFIC_UPDATE'
  | 'CLEAR_TRAFFIC'
  | 'GET_TRAFFIC'
  | 'SPEC_LOADED'
  | 'GET_SPEC';

/** 拡張機能間のメッセージ */
export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

/** ストレージに保存するデータ */
export interface StorageData {
  language: Language;
  openApiSpec?: string;
}

