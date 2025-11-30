import { OpenAPISpec, MatchedPath } from './types';

/**
 * URLからパス部分を抽出
 * フルURL、パス+クエリ、パスのみのいずれにも対応
 */
function extractPathFromUrl(input: string): string {
  // クエリパラメータを除去
  const withoutQuery = input.split('?')[0];
  
  // フラグメントを除去
  const withoutFragment = withoutQuery.split('#')[0];
  
  // フルURLの場合、パス部分のみを抽出
  try {
    // http:// または https:// で始まる場合
    if (withoutFragment.match(/^https?:\/\//)) {
      const url = new URL(withoutFragment);
      return url.pathname;
    }
  } catch {
    // URLのパースに失敗した場合は、そのまま使用
  }
  
  // パスのみの場合はそのまま返す
  return withoutFragment;
}

/**
 * リクエストURLとHTTPメソッドに一致するOpenAPIパスを検索
 */
export function matchPath(
  spec: OpenAPISpec,
  requestUrl: string,
  method: string
): MatchedPath | null {
  const normalizedMethod = method.toLowerCase();
  
  // フルURLからパス部分を抽出
  const path = extractPathFromUrl(requestUrl);
  
  // パスパラメータを抽出するための正規表現を生成
  for (const [pathPattern, pathItem] of Object.entries(spec.paths)) {
    const operation = pathItem[normalizedMethod];
    if (!operation) {
      continue;
    }

    // パスパターンを正規表現に変換
    const pathRegex = pathPatternToRegex(pathPattern);
    const match = path.match(pathRegex);

    if (match) {
      // パスパラメータを抽出
      const pathParams = extractPathParams(pathPattern, path);
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
 * OpenAPIのパスパターンを正規表現に変換（後方一致）
 * 例: /users/{userId} -> /users/([^/]+)
 * /bbb/auth は /auth にマッチする
 */
function pathPatternToRegex(pathPattern: string): RegExp {
  const regexPattern = pathPattern
    .replace(/\{[^}]+\}/g, '([^/]+)')
    .replace(/\//g, '\\/');
  // 後方一致にするため、先頭の ^ を削除
  return new RegExp(`${regexPattern}$`);
}

/**
 * パスパラメータを抽出（後方一致対応）
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
    // 後方一致の場合、キャプチャグループのインデックスは変わらない
    paramNames.forEach((name, index) => {
      params[name] = urlMatch[index + 1];
    });
  }

  return params;
}

