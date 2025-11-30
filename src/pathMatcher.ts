import { OpenAPISpec, MatchedPath } from './types';

/**
 * リクエストURLとHTTPメソッドに一致するOpenAPIパスを検索
 */
export function matchPath(
  spec: OpenAPISpec,
  requestUrl: string,
  method: string
): MatchedPath | null {
  const normalizedMethod = method.toLowerCase();
  
  // パスパラメータを抽出するための正規表現を生成
  for (const [pathPattern, pathItem] of Object.entries(spec.paths)) {
    const operation = pathItem[normalizedMethod];
    if (!operation) {
      continue;
    }

    // パスパターンを正規表現に変換
    const pathRegex = pathPatternToRegex(pathPattern);
    const match = requestUrl.match(pathRegex);

    if (match) {
      // パスパラメータを抽出
      const pathParams = extractPathParams(pathPattern, requestUrl);
      return {
        path: pathPattern,
        method: normalizedMethod,
        operation,
        pathParams
      };
    }
  }

  return null;
}

/**
 * OpenAPIのパスパターンを正規表現に変換
 * 例: /users/{userId} -> /users/([^/]+)
 */
function pathPatternToRegex(pathPattern: string): RegExp {
  const regexPattern = pathPattern
    .replace(/\{[^}]+\}/g, '([^/]+)')
    .replace(/\//g, '\\/');
  return new RegExp(`^${regexPattern}$`);
}

/**
 * パスパラメータを抽出
 */
function extractPathParams(
  pathPattern: string,
  requestUrl: string
): { [key: string]: string } {
  const params: { [key: string]: string } = {};
  
  // パスパターンからパラメータ名を抽出
  const paramNames: string[] = [];
  const paramRegex = /\{([^}]+)\}/g;
  let match;
  
  while ((match = paramRegex.exec(pathPattern)) !== null) {
    paramNames.push(match[1]);
  }

  // パスパターンを正規表現に変換して値を抽出
  const pathRegex = pathPatternToRegex(pathPattern);
  const urlMatch = requestUrl.match(pathRegex);

  if (urlMatch && paramNames.length > 0) {
    paramNames.forEach((name, index) => {
      params[name] = urlMatch[index + 1];
    });
  }

  return params;
}

