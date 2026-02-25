import { FlatCompat } from '@eslint/eslintrc'
import nextPlugin from '@next/eslint-plugin-next'
import typescriptPlugin from '@typescript-eslint/eslint-plugin'
import prettierPlugin from 'eslint-plugin-prettier'
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort'
import typescriptParser from '@typescript-eslint/parser'

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname
})

const eslintConfig = [
    {
        files: ['src/**/*.{js,jsx,ts,tsx}'],
        ignores: [
            '**/*.d.ts',
            '**/node_modules/**',
            '.next/**',
            '**/dist/**',
            '**/build/**'
        ],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json'
            }
        },
        plugins: {
            '@next/next': nextPlugin,
            '@typescript-eslint': typescriptPlugin,
            'prettier': prettierPlugin,
            'simple-import-sort': simpleImportSortPlugin
        },
        rules: {
            // Prettier customization
            'prettier/prettier': [
                'error',
                {
                    bracketSpacing: true,
                    jsxBracketSameLine: false,
                    printWidth: 120,
                    semi: false,
                    singleQuote: true,
                    tabWidth: 4,
                    arrowParens: 'avoid',
                    trailingComma: 'none'
                }
            ],

            // TypeScript ESLint rules
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            'simple-import-sort/imports': 'error',
            'simple-import-sort/exports': 'error'
        }
    }
]

export default eslintConfig
