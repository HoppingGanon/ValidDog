import * as yaml from 'js-yaml';
import { OpenAPISpec } from './types';

/**
 * ファイルからOpenAPI仕様書を読み込む
 */
export async function loadSpecFromFile(file: File): Promise<OpenAPISpec> {
  const text = await readFileAsText(file);
  
  // ファイル拡張子で判定
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.json')) {
    return parseJson(text);
  } else if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
    return parseYaml(text);
  } else {
    // 拡張子が不明な場合、まずJSONとして試す
    try {
      return parseJson(text);
    } catch {
      return parseYaml(text);
    }
  }
}

/**
 * Fileオブジェクトをテキストとして読み込む
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event): void => {
      if (event.target && typeof event.target.result === 'string') {
        resolve(event.target.result);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました'));
      }
    };
    
    reader.onerror = (): void => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * JSON文字列をパース
 */
function parseJson(text: string): OpenAPISpec {
  try {
    const spec = JSON.parse(text) as OpenAPISpec;
    validateSpec(spec);
    return spec;
  } catch (error) {
    throw new Error(`JSONのパースに失敗しました: ${(error as Error).message}`);
  }
}

/**
 * YAML文字列をパース
 */
function parseYaml(text: string): OpenAPISpec {
  try {
    const spec = yaml.load(text) as OpenAPISpec;
    validateSpec(spec);
    return spec;
  } catch (error) {
    throw new Error(`YAMLのパースに失敗しました: ${(error as Error).message}`);
  }
}

/**
 * OpenAPI仕様書の基本的な構造を検証
 */
function validateSpec(spec: OpenAPISpec): void {
  if (!spec) {
    throw new Error('仕様書が空です');
  }
  
  if (!spec.openapi && !spec.swagger) {
    throw new Error('OpenAPIまたはSwaggerのバージョンが指定されていません');
  }
  
  if (!spec.info) {
    throw new Error('info フィールドが存在しません');
  }
  
  if (!spec.paths) {
    throw new Error('paths フィールドが存在しません');
  }
  
  if (Object.keys(spec.paths).length === 0) {
    throw new Error('パスが定義されていません');
  }
}

