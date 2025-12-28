import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly', // React is available globally in JSX
        console: 'readonly', // Node.js console
        fetch: 'readonly', // Browser fetch API
        window: 'readonly', // Browser window
        process: 'readonly', // Node.js process
        alert: 'readonly', // Browser alert
        setTimeout: 'readonly', // Browser setTimeout
        Buffer: 'readonly', // Node.js Buffer
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // React 17+ JSX Transform - no need to import React
      'react/react-in-jsx-scope': 'off',
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Console rules
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
      // General rules
      'prefer-const': 'error',
      'no-unused-expressions': 'off', // Allow unused expressions
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
      globals: {
        React: 'readonly', // React is available globally in JSX
        console: 'readonly', // Node.js console
        fetch: 'readonly', // Browser fetch API
        window: 'readonly', // Browser window
        process: 'readonly', // Node.js process
        alert: 'readonly', // Browser alert
        setTimeout: 'readonly', // Browser setTimeout
        Buffer: 'readonly', // Node.js Buffer
      },
    },
    rules: {
      'prefer-const': 'error',
      'no-unused-vars': 'off',
      'no-console': ['error', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },
  // Ignore build and generated files
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'build/**',
      'dist/**',
      '*.min.js',
    ],
  },
]
