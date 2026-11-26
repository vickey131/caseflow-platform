import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Every feature file except the cases feature itself
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['src/features/cases/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          regex: String.raw`^(\.\./)+cases/.+|(^|/)features/cases/.+`,
          message: 'Do not import internals of the cases feature from another feature.',
        }],
      }],
    },
  },
])
