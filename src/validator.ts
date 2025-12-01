import { MatchedPath, ValidationResult, ValidationError, Schema } from './types';

/**
 * リクエストボディのバリデーション
 */
export function validateRequestBody(
  matchedPath: MatchedPath,
  requestBody: string
): ValidationResult {
  const errors: ValidationError[] = [];

  // リクエストボディが定義されているか確認
  if (!matchedPath.operation.requestBody) {
    if (requestBody.trim() !== '') {
      errors.push({
        path: 'requestBody',
        message: 'このエンドポイントはリクエストボディを受け付けません'
      });
    }
    return { valid: errors.length === 0, errors };
  }

  // JSONのパース
  let parsedBody: unknown;
  try {
    parsedBody = requestBody.trim() === '' ? undefined : JSON.parse(requestBody);
  } catch (error) {
    errors.push({
      path: 'requestBody',
      message: '不正なJSON形式です'
    });
    return { valid: false, errors };
  }

  // リクエストボディが必須かチェック
  if (matchedPath.operation.requestBody.required && !parsedBody) {
    errors.push({
      path: 'requestBody',
      message: 'リクエストボディは必須です'
    });
    return { valid: false, errors };
  }

  // スキーマの取得
  const content = matchedPath.operation.requestBody.content;
  const jsonContent = content['application/json'];
  
  if (!jsonContent || !jsonContent.schema) {
    return { valid: true, errors };
  }

  // スキーマバリデーション
  const schemaErrors = validateAgainstSchema(
    parsedBody,
    jsonContent.schema,
    'requestBody'
  );
  errors.push(...schemaErrors);

  return { valid: errors.length === 0, errors };
}

/**
 * レスポンスボディのバリデーション
 */
export function validateResponseBody(
  matchedPath: MatchedPath,
  responseBody: string,
  statusCode: number
): ValidationResult {
  const errors: ValidationError[] = [];

  // ステータスコードに対応するレスポンス定義を取得
  const statusCodeStr = statusCode.toString();
  let response = matchedPath.operation.responses[statusCodeStr];
  
  // 完全一致しない場合、ワイルドカード(2XX, 3XX等)を試す
  if (!response) {
    const wildcardKey = `${statusCodeStr[0]}XX`;
    response = matchedPath.operation.responses[wildcardKey];
  }

  // defaultレスポンスを試す
  if (!response) {
    response = matchedPath.operation.responses['default'];
  }

  if (!response) {
    errors.push({
      path: 'response',
      message: `ステータスコード ${statusCode} は仕様書に定義されていません`
    });
    return { valid: false, errors };
  }

  // レスポンスボディのパース
  let parsedBody: unknown;
  try {
    parsedBody = responseBody.trim() === '' ? undefined : JSON.parse(responseBody);
  } catch (error) {
    errors.push({
      path: 'responseBody',
      message: '不正なJSON形式です'
    });
    return { valid: false, errors };
  }

  // スキーマの取得
  if (!response.content) {
    if (parsedBody !== undefined) {
      errors.push({
        path: 'responseBody',
        message: 'このレスポンスはボディを含みません'
      });
    }
    return { valid: errors.length === 0, errors };
  }

  const jsonContent = response.content['application/json'];
  if (!jsonContent || !jsonContent.schema) {
    return { valid: true, errors };
  }

  // スキーマバリデーション
  const schemaErrors = validateAgainstSchema(
    parsedBody,
    jsonContent.schema,
    'responseBody'
  );
  errors.push(...schemaErrors);

  return { valid: errors.length === 0, errors };
}

/**
 * スキーマに対するバリデーション
 */
function validateAgainstSchema(
  value: unknown,
  schema: Schema,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value === null || value === undefined) {
    errors.push({
      path,
      message: '値が必要です'
    });
    return errors;
  }

  // 型チェック
  if (schema.type) {
    const actualType = getJsonType(value);
    const schemaType = schema.type;
    
    // 型の一致判定
    let typesMatch = schemaType === actualType;
    
    // number型の場合は、integerも許容する
    if (schemaType === 'number' && (actualType === 'integer' || actualType === 'number')) {
      typesMatch = true;
    }
    
    // float型の場合も、integerとnumberを許容する
    if (schemaType === 'float' && (actualType === 'integer' || actualType === 'number')) {
      typesMatch = true;
    }
    
    if (!typesMatch) {
      errors.push({
        path,
        message: `型が一致しません。期待: ${schema.type}, 実際: ${actualType}`
      });
      return errors;
    }
  }

  // オブジェクトのプロパティチェック
  if (schema.type === 'object' && typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    
    // 必須プロパティのチェック
    if (schema.required) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in obj)) {
          errors.push({
            path: `${path}.${requiredProp}`,
            message: `必須プロパティ "${requiredProp}" が存在しません`
          });
        }
      }
    }

    // 各プロパティのバリデーション
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in obj) {
          const propErrors = validateAgainstSchema(
            obj[propName],
            propSchema,
            `${path}.${propName}`
          );
          errors.push(...propErrors);
        }
      }
    }
  }

  // 配列のアイテムチェック
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, index) => {
        const itemErrors = validateAgainstSchema(
          item,
          schema.items as Schema,
          `${path}[${index}]`
        );
        errors.push(...itemErrors);
      });
    }
  }

  // 文字列の長さチェック
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: `文字列が短すぎます。最小長: ${schema.minLength}`
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `文字列が長すぎます。最大長: ${schema.maxLength}`
      });
    }
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          path,
          message: `パターンに一致しません: ${schema.pattern}`
        });
      }
    }
  }

  // 数値の範囲チェック（integer, number, floatはすべて対象）
  if (schema.type === 'number' || schema.type === 'integer' || schema.type === 'float') {
    const num = value as number;
    if (schema.minimum !== undefined && num < schema.minimum) {
      errors.push({
        path,
        message: `値が小さすぎます。最小値: ${schema.minimum}`
      });
    }
    if (schema.maximum !== undefined && num > schema.maximum) {
      errors.push({
        path,
        message: `値が大きすぎます。最大値: ${schema.maximum}`
      });
    }
  }

  // enumチェック
  if (schema.enum) {
    if (!schema.enum.includes(value)) {
      errors.push({
        path,
        message: `許可された値ではありません。許可値: ${schema.enum.join(', ')}`
      });
    }
  }

  return errors;
}

/**
 * 値のJSON型を取得
 */
function getJsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') {
    // 整数と小数を区別
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  return typeof value;
}

