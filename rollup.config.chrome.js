import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

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
      })
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

