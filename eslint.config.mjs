import typescriptParser from '@typescript-eslint/parser'
import eslintPluginTypescript from '@typescript-eslint/eslint-plugin'

const eslintConfig = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: typescriptParser },
    plugins: { '@typescript-eslint': eslintPluginTypescript },
    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Basic rules
      'prefer-const': 'error',
      'no-unused-expressions': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'prefer-const': 'error',
      'no-unused-vars': 'off',
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'build/**', 'dist/**', '*.min.js', 'next-env.d.ts', '.playwright-mcp/**'],
  },
]

export default eslintConfig
