import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

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

      // コピーするファイルのリスト
      const filesToCopy = [
        { src: 'src/manifest.json', dest: 'dist/manifest.json' },
        { src: 'src/devtools.html', dest: 'dist/devtools.html' },
        { src: 'src/panel.html', dest: 'dist/panel.html' },
        { src: 'src/styles-panel.css', dest: 'dist/styles-panel.css' }
      ];

      // ファイルをコピー
      filesToCopy.forEach(({ src, dest }) => {
        try {
          copyFileSync(src, dest);
          console.log(`Copied: ${src} -> ${dest}`);
        } catch (e) {
          console.error(`Failed to copy ${src}:`, e.message);
        }
      });

      // iconsフォルダをコピー
      try {
        mkdirSync('dist/icons', { recursive: true });
        const iconFiles = readdirSync('src/icons');
        iconFiles.forEach(file => {
          copyFileSync(join('src/icons', file), join('dist/icons', file));
          console.log(`Copied: src/icons/${file} -> dist/icons/${file}`);
        });
      } catch (e) {
        console.error('Failed to copy icons:', e.message);
      }
    }
  };
}

const config = [
  // Background script
  {
    input: 'src/background.ts',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      sourcemap: true,
      name: 'Background'
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
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
  },
  
  // DevTools script
  {
    input: 'src/devtools.ts',
    output: {
      file: 'dist/devtools.js',
      format: 'iife',
      sourcemap: true,
      name: 'DevTools'
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        compilerOptions: {
          declaration: false,
          declarationMap: false
        }
      })
    ]
  },
  
  // Panel script
  {
    input: 'src/panel.ts',
    output: {
      file: 'dist/panel.js',
      format: 'iife',
      sourcemap: true,
      name: 'Panel'
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
        compilerOptions: {
          declaration: false,
          declarationMap: false
        }
      })
    ]
  }
];

export default config;

