/**
 * OpenAPI仕様書の型定義
 */
export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
  };
  paths: {
    [path: string]: {
      [method: string]: Operation;
    };
  };
  components?: {
    schemas?: {
      [key: string]: Schema;
    };
  };
}

export interface Operation {
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: {
    [statusCode: string]: Response;
  };
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required?: boolean;
  schema: Schema;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: {
    [mediaType: string]: {
      schema: Schema;
    };
  };
}

export interface Response {
  description: string;
  content?: {
    [mediaType: string]: {
      schema: Schema;
    };
  };
}

export interface Schema {
  type?: string;
  properties?: {
    [key: string]: Schema;
  };
  items?: Schema;
  required?: string[];
  enum?: unknown[];
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  [key: string]: unknown;
}

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  errorCode?: string;
}

/**
 * マッチしたパス情報
 */
export interface MatchedPath {
  path: string;
  method: string;
  operation: Operation;
  pathParams: { [key: string]: string };
}

/**
 * ネットワークリクエスト情報
 */
export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  path: string;
  timestamp: number;
  status?: number;
  statusText?: string;
  requestBody?: string;
  responseBody?: string;
  requestHeaders?: { [key: string]: string };
  responseHeaders?: { [key: string]: string };
  matched: boolean;
  matchedPath?: string;
  validationResult?: {
    request: ValidationResult | null;
    response: ValidationResult | null;
    parameters: ValidationResult | null;
  };
  queryParams?: { [key: string]: string };
  pathParams?: { [key: string]: string };
  hasSchemaViolation: boolean;
}
