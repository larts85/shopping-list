import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'plugin:prettier/recommended'
  ),
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'prettier/prettier': [
        'error',
        {
          bracketSpacing: true,
          printWidth: 80,
          singleQuote: true,
          trailingComma: 'es5',
          tabWidth: 2,
          useTabs: false,
          semi: false,
          endOfLine: 'lf',
        },
      ],
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
      'react/jsx-max-props-per-line': [
        'error',
        { maximum: 3, when: 'multiline' },
      ],
      'prefer-const': 'error',
      'no-unused-expressions': 2,
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
]

export default eslintConfig
