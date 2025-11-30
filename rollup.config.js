import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

const baseConfig = {
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
};

export default [
  // DevTools entry point
  {
    input: 'src/devtools.ts',
    output: {
      file: 'dist/devtools.js',
      format: 'iife',
      sourcemap: true,
      name: 'ValidKunDevTools'
    },
    ...baseConfig
  },
  // Panel entry point
  {
    input: 'src/panel.ts',
    output: {
      file: 'dist/panel.js',
      format: 'iife',
      sourcemap: true,
      name: 'ValidKunPanel'
    },
    ...baseConfig
  },
  // Standalone app entry point (for backward compatibility)
  {
    input: 'src/main.ts',
    output: {
      file: 'dist/bundle.js',
      format: 'iife',
      sourcemap: true,
      name: 'ValidKun'
    },
    ...baseConfig
  }
];

