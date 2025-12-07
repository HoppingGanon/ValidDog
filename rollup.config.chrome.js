import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

/**
 * srcフォルダ内の静的ファイルをdistにコピーするプラグイン
 */
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    buildEnd() {
      // distディレクトリを作成（存在しない場合）
      try {
        mkdirSync('dist', { recursive: true });
      } catch (e) {
        // ディレクトリが既に存在する場合は無視
      }

      // HTMLファイルをコピー
      const htmlFiles = ['test-validator.html'];
      htmlFiles.forEach(file => {
        const srcPath = `src/${file}`;
        if (existsSync(srcPath)) {
          copyFileSync(srcPath, `dist/${file}`);
          console.log(`Copied: ${srcPath} -> dist/${file}`);
        }
      });

      // iconsフォルダをコピー
      try {
        mkdirSync('dist/icons', { recursive: true });
        const iconFiles = readdirSync('src/icons');
        iconFiles.forEach(file => {
          copyFileSync(`src/icons/${file}`, `dist/icons/${file}`);
          console.log(`Copied: src/icons/${file} -> dist/icons/${file}`);
        });
      } catch (e) {
        console.error('Failed to copy icons:', e.message);
      }
    }
  };
}

/**
 * validator スクリプトのビルド設定
 * ブラウザ環境で動作するIIFE形式でビルド
 */
const validatorConfig = {
  input: 'src/validator.ts',
  output: {
    file: 'dist/validator.js',
    format: 'iife',
    sourcemap: true,
    name: 'ValidatorModule',
    // グローバル変数を公開
    footer: `
// グローバル変数として公開
if (typeof window !== 'undefined') {
  window.OpenAPIValidator = ValidatorModule.OpenAPIValidator;
  window.parseOpenAPISpec = ValidatorModule.parseOpenAPISpec;
  window.matchPath = ValidatorModule.matchPath;
  window.parseQueryString = ValidatorModule.parseQueryString;
}
`
  },
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      declarationMap: false,
      compilerOptions: {
        declaration: false,
        declarationMap: false
      }
    }),
    copyStaticFiles()
  ]
};

export default [validatorConfig];
