module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'off',
      { allowConstantExport: true },
    ],
    'react/prop-types': 'off',
  },
  overrides: [
    {
      // Components and hooks must go through the service layer; never call repositories or API clients directly.
      files: ['src/components/**/*.{js,jsx,ts,tsx}', 'src/hooks/**/*.{js,jsx,ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/repositories/*'],
                message:
                  'Import repositories through services instead of directly from components/hooks.',
              },
              {
                group: ['@/core/api/*'],
                message:
                  'Components and hooks should not call core API clients directly. Use service-layer helpers.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    },
    {
      files: ['backend/**/*.js', 'backend/**/*.ts'],
      env: { node: true }
    }
  ]
}
