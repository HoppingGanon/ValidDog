/**
 * OpenAPI バリデーター
 *
 * OpenAPI仕様書を読み込んでリクエスト・レスポンスの内容を検証し、
 * スキーマ違反がないか確認するモジュール。
 *
 * Chrome拡張機能での使用を想定（evalを使用しない）
 */

import yaml from 'js-yaml';
import { Validator as JsonSchemaValidator } from 'jsonschema';

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
  /** 実際の値 */
  actualValue?: unknown;
  /** 実際の型 */
  actualType?: string;
  /** 期待される型/値 */
  expected?: string;
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
 * evalを使用しないjsonschemaライブラリを使用
 */
export class OpenAPIValidator {
  private spec: OpenAPISpec;
  private resolvedSpec: OpenAPISpec;
  private jsonValidator: JsonSchemaValidator;

  /**
   * コンストラクタ
   * @param spec - パース済みのOpenAPI仕様書
   */
  constructor(spec: OpenAPISpec) {
    this.spec = spec;
    // $ref解決 → スキーマ変換（nullable対応など）の順で処理
    const resolved = this.resolveRefs(spec);
    this.resolvedSpec = this.convertSchemaForJsonSchema(resolved);
    this.jsonValidator = new JsonSchemaValidator();
    
    // コンポーネントスキーマを登録
    if (this.resolvedSpec.components?.schemas) {
      for (const [name, schema] of Object.entries(this.resolvedSpec.components.schemas)) {
        this.jsonValidator.addSchema(schema, `/components/schemas/${name}`);
      }
    }
  }

  /**
   * ファイル内容からOpenAPIValidatorを作成
   * @param content - ファイル内容（JSONまたはYAML）
   * @returns OpenAPIValidator インスタンス
   */
  static fromFile(content: string): OpenAPIValidator {
    const spec = parseOpenAPISpec(content);
    return new OpenAPIValidator(spec);
  }

  /**
   * $ref を再帰的に解決する
   */
  private resolveRefs(spec: OpenAPISpec): OpenAPISpec {
    const resolved = JSON.parse(JSON.stringify(spec)) as OpenAPISpec;

    const resolveRef = (obj: unknown, depth = 0): unknown => {
      // 循環参照を防ぐため深さ制限
      if (depth > 20) return obj;
      
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => resolveRef(item, depth + 1));
      }

      const record = obj as Record<string, unknown>;

      // $ref を解決
      if ('$ref' in record && typeof record.$ref === 'string') {
        const refPath = record.$ref;
        if (refPath.startsWith('#/components/schemas/')) {
          const schemaName = refPath.replace('#/components/schemas/', '');
          const schema = resolved.components?.schemas?.[schemaName];
          if (schema) {
            return resolveRef({ ...schema }, depth + 1);
          }
        }
        return record;
      }

      // 再帰的に処理
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(record)) {
        result[key] = resolveRef(value, depth + 1);
      }
      return result;
    };

    return resolveRef(resolved) as OpenAPISpec;
  }

  /**
   * OpenAPIスキーマをJSON Schema互換に変換
   * - nullable: true を type: ["original_type", "null"] に変換
   * - additionalProperties のデフォルト値を設定
   */
  private convertSchemaForJsonSchema(spec: OpenAPISpec): OpenAPISpec {
    const converted = JSON.parse(JSON.stringify(spec)) as OpenAPISpec;

    const convertSchema = (obj: unknown, _parentRequired: string[] = []): unknown => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => convertSchema(item, []));
      }

      const record = obj as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      // プロパティを処理
      for (const [key, value] of Object.entries(record)) {
        if (key === 'properties' && typeof value === 'object' && value !== null) {
          // properties 内のスキーマを変換（親の required 情報を渡す）
          const requiredProps = (record.required as string[]) || [];
          const convertedProps: Record<string, unknown> = {};
          for (const [propName, propSchema] of Object.entries(value as Record<string, unknown>)) {
            convertedProps[propName] = convertSchema(propSchema, requiredProps);
          }
          result[key] = convertedProps;
        } else if (key === 'items' && typeof value === 'object') {
          // 配列のアイテムスキーマを変換
          result[key] = convertSchema(value, []);
        } else if (key === 'allOf' || key === 'oneOf' || key === 'anyOf') {
          // 複合スキーマを変換
          if (Array.isArray(value)) {
            result[key] = value.map(item => convertSchema(item, []));
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }

      // nullable: true の処理
      if (record.nullable === true && record.type) {
        const originalType = record.type;
        if (Array.isArray(originalType)) {
          // 既に配列の場合は null を追加
          if (!originalType.includes('null')) {
            result.type = [...originalType, 'null'];
          }
        } else {
          // 単一型の場合は配列に変換
          result.type = [originalType, 'null'];
        }
        // nullable プロパティを削除（JSON Schemaには不要）
        delete result.nullable;
      }

      // OpenAPI 固有のプロパティを削除
      delete result.example;
      delete result.examples;
      delete result.xml;
      delete result.externalDocs;
      delete result.deprecated;
      delete result.discriminator;

      return result;
    };

    // paths 内のスキーマを変換
    if (converted.paths) {
      for (const pathItem of Object.values(converted.paths)) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const) {
          const operation = pathItem[method];
          if (operation) {
            // パラメータのスキーマを変換
            if (operation.parameters) {
              operation.parameters = operation.parameters.map((param: any) => {
                if (param.schema) {
                  param.schema = convertSchema(param.schema, []);
                }
                return param;
              });
            }
            // リクエストボディのスキーマを変換
            if (operation.requestBody?.content) {
              for (const contentType of Object.keys(operation.requestBody.content)) {
                const content = operation.requestBody.content[contentType];
                if (content.schema) {
                  content.schema = convertSchema(content.schema, []);
                }
              }
            }
            // レスポンスのスキーマを変換
            if (operation.responses) {
              for (const responseCode of Object.keys(operation.responses)) {
                const response = operation.responses[responseCode];
                if (response?.content) {
                  for (const contentType of Object.keys(response.content)) {
                    const content = response.content[contentType];
                    if (content.schema) {
                      content.schema = convertSchema(content.schema, []);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // components/schemas を変換
    if (converted.components?.schemas) {
      for (const schemaName of Object.keys(converted.components.schemas)) {
        converted.components.schemas[schemaName] = convertSchema(
          converted.components.schemas[schemaName],
          []
        );
      }
    }

    return converted;
  }

  /**
   * パス文字列からOpenAPI仕様書のパスパターンにマッチするものを検索
   */
  findMatchingPath(actualPath: string): { pattern: string; params: Record<string, string> } | null {
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
   */
  validateRequest(request: RequestInfo): ValidationResult {
    const errors: ValidationError[] = [];

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

    // パラメータをマージ
    const allParameters = [
      ...(pathItem.parameters || []),
      ...(operation.parameters || [])
    ];

    // クエリパラメータを抽出
    const queryString = request.path.split('?')[1] || '';
    const queryParams = parseQueryString(queryString);

    // パスパラメータの検証
    this.validateParameters(allParameters, 'path', params, errors);

    // クエリパラメータの検証
    this.validateParameters(allParameters, 'query', { ...queryParams, ...request.query }, errors);

    // リクエストボディの検証
    if (operation.requestBody) {
      const contentType = 'application/json';
      const bodySchema = operation.requestBody?.content?.[contentType]?.schema;
      
      if (bodySchema) {
        if (operation.requestBody.required && (request.body === undefined || request.body === null)) {
          errors.push({
            path: 'body',
            message: 'リクエストボディは必須です',
            errorCode: 'REQUIRED',
            location: 'body'
          });
        } else if (request.body !== undefined && request.body !== null) {
          this.validateSchema(request.body, bodySchema, 'body', errors);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * レスポンスを検証
   */
  validateResponse(request: RequestInfo, response: ResponseInfo): ValidationResult {
    const errors: ValidationError[] = [];

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

    // 204 No Content の場合
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

    if (responseContent?.schema && response.body !== undefined) {
      this.validateSchema(response.body, responseContent.schema, 'response', errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * パラメータを検証
   */
  private validateParameters(
    parameters: any[],
    location: 'path' | 'query' | 'header',
    values: Record<string, any>,
    errors: ValidationError[]
  ): void {
    const locationParams = parameters.filter(p => p.in === location);

    for (const param of locationParams) {
      const value = values[param.name];

      // 必須チェック
      if (param.required && (value === undefined || value === '')) {
        errors.push({
          path: param.name,
          message: `必須パラメータ "${param.name}" がありません`,
          errorCode: 'REQUIRED',
          location
        });
        continue;
      }

      // スキーマチェック
      if (value !== undefined && value !== '' && param.schema) {
        // 型変換（クエリパラメータは文字列で来るため）
        let convertedValue = value;
        if (param.schema.type === 'integer' || param.schema.type === 'number') {
          const num = Number(value);
          if (!isNaN(num)) {
            convertedValue = num;
          }
        } else if (param.schema.type === 'boolean') {
          convertedValue = value === 'true' || value === true;
        }

        this.validateSchema(convertedValue, param.schema, param.name, errors);
      }
    }
  }

  /**
   * JSONスキーマでバリデーション
   */
  private validateSchema(
    value: unknown,
    schema: any,
    path: string,
    errors: ValidationError[]
  ): void {
    try {
      const result = this.jsonValidator.validate(value, schema);
      
      if (!result.valid) {
        for (const error of result.errors) {
          // 期待される型/値を取得
          let expected = '';
          if (error.argument) {
            if (Array.isArray(error.argument)) {
              expected = error.argument.join(', ');
            } else {
              expected = String(error.argument);
            }
          } else if (error.schema && typeof error.schema === 'object') {
            const schema = error.schema as Record<string, unknown>;
            if (schema.type) {
              expected = Array.isArray(schema.type) 
                ? schema.type.join(' | ') 
                : String(schema.type);
            } else if (schema.enum && Array.isArray(schema.enum)) {
              expected = schema.enum.join(' | ');
            }
          }
          
          errors.push({
            path: error.property ? `${path}.${error.property.replace('instance.', '')}` : path,
            message: error.message,
            errorCode: error.name,
            location: path,
            actualValue: error.instance,
            actualType: this.getTypeName(error.instance),
            expected: expected || undefined
          });
        }
      }
    } catch (e) {
      errors.push({
        path,
        message: `スキーマ検証中にエラー: ${e instanceof Error ? e.message : String(e)}`,
        errorCode: 'VALIDATION_ERROR'
      });
    }
  }

  /**
   * 値の型名を取得
   */
  private getTypeName(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
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

  /**
   * 仕様書に定義されているパスパターンの一覧を取得
   */
  getPathPatterns(): string[] {
    return Object.keys(this.resolvedSpec.paths);
  }
}

// =============================================================================
// ユーティリティ関数
// =============================================================================

/**
 * OpenAPI仕様書の文字列をパースする
 */
export function parseOpenAPISpec(content: string): OpenAPISpec {
  const trimmed = content.trim();

  if (trimmed.startsWith('{')) {
    return JSON.parse(content) as OpenAPISpec;
  } else {
    return yaml.load(content) as OpenAPISpec;
  }
}

/**
 * パスパターンと実際のパスをマッチング
 */
export function matchPath(pattern: string, actualPath: string): Record<string, string> | null {
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

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = match[i + 1];
  }

  return params;
}

/**
 * クエリ文字列をパース
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
 */
export function extractMediaType(contentType: string | undefined): string {
  if (!contentType) {
    return 'application/json';
  }
  return contentType.split(';')[0].trim();
}

// =============================================================================
// ブラウザ向けエクスポート
// =============================================================================

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).OpenAPIValidator = OpenAPIValidator;
  (window as unknown as Record<string, unknown>).parseOpenAPISpec = parseOpenAPISpec;
  (window as unknown as Record<string, unknown>).matchPath = matchPath;
  (window as unknown as Record<string, unknown>).parseQueryString = parseQueryString;
}
