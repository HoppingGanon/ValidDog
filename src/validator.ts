/**
 * OpenAPI バリデーター
 *
 * OpenAPI仕様書を読み込んでリクエスト・レスポンスの内容を検証し、
 * スキーマ違反がないか確認するモジュール。
 *
 * Chrome拡張機能での使用を想定しています。
 */

import yaml from 'js-yaml';
import OpenAPIRequestValidator from 'openapi-request-validator';
import OpenAPIResponseValidator from 'openapi-response-validator';

// =============================================================================
// 型定義
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/** OpenAPI仕様書の基本構造 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, any>;
    parameters?: Record<string, any>;
    responses?: Record<string, any>;
  };
}

/** パスアイテム */
export interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  parameters?: any[];
}

/** オペレーション */
export interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
}

/** バリデーション結果 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** バリデーションエラー */
export interface ValidationError {
  path: string;
  message: string;
  errorCode?: string;
  location?: string;
}

/** HTTPメソッドの型 */
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/** リクエスト情報 */
export interface RequestInfo {
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  query?: Record<string, string | string[]>;
  body?: unknown;
}

/** レスポンス情報 */
export interface ResponseInfo {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
}

// =============================================================================
// OpenAPIバリデータークラス
// =============================================================================

/**
 * OpenAPI仕様書に基づいてリクエスト・レスポンスを検証するクラス
 */
export class OpenAPIValidator {
  private spec: OpenAPISpec;
  private resolvedSpec: OpenAPISpec;

  /**
   * コンストラクタ
   * @param spec - パース済みのOpenAPI仕様書
   */
  constructor(spec: OpenAPISpec) {
    this.spec = spec;
    // $ref を解決した仕様書を作成
    this.resolvedSpec = this.resolveRefs(spec);
  }

  /**
   * 仕様書の文字列からOpenAPIValidatorを作成
   * @param content - 仕様書の文字列（JSONまたはYAML）
   * @returns OpenAPIValidator インスタンス
   */
  static fromString(content: string): OpenAPIValidator {
    const spec = parseOpenAPISpec(content);
    return new OpenAPIValidator(spec);
  }

  /**
   * $ref を再帰的に解決する
   */
  private resolveRefs(spec: OpenAPISpec): OpenAPISpec {
    const resolved = JSON.parse(JSON.stringify(spec)) as OpenAPISpec;

    const resolveRef = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(resolveRef);
      }

      const record = obj as Record<string, unknown>;

      // $ref を解決
      if ('$ref' in record && typeof record.$ref === 'string') {
        const refPath = record.$ref;
        if (refPath.startsWith('#/components/schemas/')) {
          const schemaName = refPath.replace('#/components/schemas/', '');
          const schema = resolved.components?.schemas?.[schemaName];
          if (schema) {
            // スキーマを展開（循環参照を避けるため、1レベルのみ）
            return resolveRef({ ...schema });
          }
        }
        return record;
      }

      // 再帰的に処理
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(record)) {
        result[key] = resolveRef(value);
      }
      return result;
    };

    return resolveRef(resolved) as OpenAPISpec;
  }

  /**
   * パス文字列からOpenAPI仕様書のパスパターンにマッチするものを検索
   * @param actualPath - 実際のパス（例: /users/123）
   * @returns マッチしたパスパターンとパスパラメータ
   */
  findMatchingPath(actualPath: string): { pattern: string; params: Record<string, string> } | null {
    // クエリパラメータを除去
    const pathWithoutQuery = actualPath.split('?')[0];

    for (const pattern of Object.keys(this.resolvedSpec.paths)) {
      const params = matchPath(pattern, pathWithoutQuery);
      if (params !== null) {
        return { pattern, params };
      }
    }
    return null;
  }

  /**
   * リクエストを検証
   * @param request - リクエスト情報
   * @returns バリデーション結果
   */
  validateRequest(request: RequestInfo): ValidationResult {
    const errors: ValidationError[] = [];

    // パスのマッチング
    const matched = this.findMatchingPath(request.path);
    if (!matched) {
      return {
        valid: false,
        errors: [{
          path: request.path,
          message: `パス "${request.path}" はOpenAPI仕様書に定義されていません`,
          errorCode: 'PATH_NOT_FOUND'
        }]
      };
    }

    const { pattern, params } = matched;
    const pathItem = this.resolvedSpec.paths[pattern];
    const operation = pathItem[request.method];

    if (!operation) {
      return {
        valid: false,
        errors: [{
          path: request.path,
          message: `メソッド "${request.method.toUpperCase()}" はパス "${pattern}" に定義されていません`,
          errorCode: 'METHOD_NOT_ALLOWED'
        }]
      };
    }

    // パラメータをマージ（パスレベル + オペレーションレベル）
    const allParameters = [
      ...(pathItem.parameters || []),
      ...(operation.parameters || [])
    ];

    // クエリパラメータを抽出
    const queryString = request.path.split('?')[1] || '';
    const queryParams = parseQueryString(queryString);

    // openapi-request-validator を使用
    try {
      const validator = new OpenAPIRequestValidator({
        parameters: allParameters as any,
        requestBody: operation.requestBody as any
      });

      const validationResult = validator.validateRequest({
        headers: request.headers || {},
        params,
        query: { ...queryParams, ...request.query },
        body: request.body
      });

      if (validationResult && validationResult.errors && validationResult.errors.length > 0) {
        for (const error of validationResult.errors) {
          errors.push({
            path: (error as any).path || request.path,
            message: error.message || '不明なエラー',
            errorCode: (error as any).errorCode,
            location: (error as any).location
          });
        }
      }
    } catch (e) {
      errors.push({
        path: request.path,
        message: `リクエストバリデーション中にエラーが発生: ${e instanceof Error ? e.message : String(e)}`,
        errorCode: 'VALIDATION_ERROR'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * レスポンスを検証
   * @param request - リクエスト情報（パスとメソッドの特定に使用）
   * @param response - レスポンス情報
   * @returns バリデーション結果
   */
  validateResponse(request: RequestInfo, response: ResponseInfo): ValidationResult {
    const errors: ValidationError[] = [];

    // パスのマッチング
    const matched = this.findMatchingPath(request.path);
    if (!matched) {
      return {
        valid: false,
        errors: [{
          path: request.path,
          message: `パス "${request.path}" はOpenAPI仕様書に定義されていません`,
          errorCode: 'PATH_NOT_FOUND'
        }]
      };
    }

    const { pattern } = matched;
    const pathItem = this.resolvedSpec.paths[pattern];
    const operation = pathItem[request.method];

    if (!operation) {
      return {
        valid: false,
        errors: [{
          path: request.path,
          message: `メソッド "${request.method.toUpperCase()}" はパス "${pattern}" に定義されていません`,
          errorCode: 'METHOD_NOT_ALLOWED'
        }]
      };
    }

    // ステータスコードに対応するレスポンス定義を取得
    const statusCode = String(response.statusCode);
    const responseSpec = operation.responses[statusCode] ||
      operation.responses[`${statusCode[0]}XX`] ||
      operation.responses['default'];

    if (!responseSpec) {
      errors.push({
        path: request.path,
        message: `ステータスコード ${response.statusCode} は "${pattern}" の "${request.method.toUpperCase()}" に定義されていません`,
        errorCode: 'UNEXPECTED_STATUS_CODE'
      });
      return { valid: false, errors };
    }

    // 204 No Content の場合はボディがないことを確認
    if (response.statusCode === 204) {
      if (response.body !== undefined && response.body !== null && response.body !== '') {
        errors.push({
          path: request.path,
          message: '204 No Content レスポンスにはボディを含めるべきではありません',
          errorCode: 'UNEXPECTED_BODY'
        });
      }
      return { valid: errors.length === 0, errors };
    }

    // レスポンスボディのスキーマを取得
    const contentType = 'application/json';
    const responseContent = responseSpec.content?.[contentType];

    if (!responseContent || !responseContent.schema) {
      // スキーマが定義されていない場合はスキップ
      return { valid: true, errors: [] };
    }

    // openapi-response-validator を使用
    // レスポンス定義をライブラリ形式に変換
    const responsesForValidator: Record<string, { schema: any }> = {};
    for (const [code, respDef] of Object.entries(operation.responses)) {
      const respDefTyped = respDef as any;
      if (respDefTyped.content?.['application/json']?.schema) {
        responsesForValidator[code] = {
          schema: respDefTyped.content['application/json'].schema
        };
      }
    }

    try {
      const validator = new OpenAPIResponseValidator({
        responses: responsesForValidator,
        components: this.resolvedSpec.components as any
      });

      const validationResult = validator.validateResponse(
        statusCode,
        response.body
      );

      if (validationResult && validationResult.errors && validationResult.errors.length > 0) {
        for (const error of validationResult.errors) {
          errors.push({
            path: (error as any).path || request.path,
            message: error.message || '不明なエラー',
            errorCode: (error as any).errorCode,
            location: 'response'
          });
        }
      }
    } catch (e) {
      errors.push({
        path: request.path,
        message: `レスポンスバリデーション中にエラーが発生: ${e instanceof Error ? e.message : String(e)}`,
        errorCode: 'VALIDATION_ERROR'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 読み込んだ仕様書を取得
   */
  getSpec(): OpenAPISpec {
    return this.spec;
  }

  /**
   * $ref解決済みの仕様書を取得
   */
  getResolvedSpec(): OpenAPISpec {
    return this.resolvedSpec;
  }
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * OpenAPI仕様書の文字列をパースする
 * @param content - JSONまたはYAML形式の文字列
 * @returns パース済みのOpenAPI仕様書
 */
export function parseOpenAPISpec(content: string): OpenAPISpec {
  // JSONかYAMLかを判定
  const trimmed = content.trim();

  if (trimmed.startsWith('{')) {
    // JSON形式
    return JSON.parse(content) as OpenAPISpec;
  } else {
    // YAML形式
    return yaml.load(content) as OpenAPISpec;
  }
}

/**
 * パスパターンと実際のパスをマッチング
 * @param pattern - パスパターン（例: /users/{userId}）
 * @param actualPath - 実際のパス（例: /users/123）
 * @returns パスパラメータのオブジェクト、マッチしない場合はnull
 */
export function matchPath(pattern: string, actualPath: string): Record<string, string> | null {
  // パターンを正規表現に変換
  const paramNames: string[] = [];
  const regexPattern = pattern.replace(/\{([^}]+)\}/g, (_, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });

  const regex = new RegExp(`^${regexPattern}$`);
  const match = actualPath.match(regex);

  if (!match) {
    return null;
  }

  // パスパラメータを抽出
  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = match[i + 1];
  }

  return params;
}

/**
 * クエリ文字列をパース
 * @param queryString - クエリ文字列（?を除く）
 * @returns パースされたクエリパラメータ
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};

  if (!queryString) {
    return params;
  }

  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  }

  return params;
}

/**
 * Content-Typeヘッダーからメディアタイプを抽出
 * @param contentType - Content-Typeヘッダーの値
 * @returns メディアタイプ（例: application/json）
 */
export function extractMediaType(contentType: string | undefined): string {
  if (!contentType) {
    return 'application/json';
  }
  // charset などのパラメータを除去
  return contentType.split(';')[0].trim();
}

// =============================================================================
// ブラウザ向けエクスポート（グローバル変数として公開）
// =============================================================================

// ブラウザ環境でグローバルに公開
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).OpenAPIValidator = OpenAPIValidator;
  (window as unknown as Record<string, unknown>).parseOpenAPISpec = parseOpenAPISpec;
  (window as unknown as Record<string, unknown>).matchPath = matchPath;
  (window as unknown as Record<string, unknown>).parseQueryString = parseQueryString;
}
