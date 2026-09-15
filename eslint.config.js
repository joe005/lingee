import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

/* 见 docs/react-migration-plan.md §8.8：项目之前零 lint（只有 Prettier 管
   格式）。这次只给 src/ 下新增的 React 代码接 ESLint + react-hooks 规则——
   这是最容易在写的当场就抓到、事后人肉回归很难发现的 bug 类型（依赖数组
   写错）。src/scripts/main.js 是尚未触碰、依然是 var/IIFE 风格的既有代码，
   不纳入 lint 范围，强行套现代规则只会刷出一堆和这次改动无关的历史噪音。 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/scripts/main.js', 'src/artifacts/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: '18.3' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
