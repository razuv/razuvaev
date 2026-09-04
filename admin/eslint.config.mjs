import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import promisePlugin from 'eslint-plugin-promise'
import sonarjs from 'eslint-plugin-sonarjs'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'src/@iconify/icons-bundle.js', '*.d.ts'],
  },
  ...vuePlugin.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,ts,tsx,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        parser: tsParser,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      promise: promisePlugin,
      sonarjs,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...promisePlugin.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-nested-template-literals': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/require-toggle-inside-transition': 'off',
      'vue/valid-template-root': 'off',
      'vue/valid-v-for': 'off',
    },
  },
]
