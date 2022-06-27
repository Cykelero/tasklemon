module.exports = {
    root: true,
    env: {
        node: true,
        es6: true
    },
    parserOptions: {
        ecmaVersion: 11,
        sourceType: 'module'
    },
    plugins: [
        'require-path-exists'
    ],
    extends: [
        'eslint:recommended',
        'plugin:require-path-exists/recommended'
    ],
    rules: {
        'no-mixed-spaces-and-tabs': 'warn',
        'dot-location': ['warn', 'property'],
        'no-multi-spaces': 'warn',
        'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
        'no-multi-str': 'error',
        'grouped-accessor-pairs': ['warn', 'getBeforeSet'],
        
        'consistent-return': 'error',
        'no-var': 'error',
        
        'no-unused-vars': 'warn',
        'no-unreachable': 'warn',
        'no-constant-condition': ['warn', { checkLoops: false }],
        'accessor-pairs': 'error',
        'default-param-last': 'error',
        'require-atomic-updates': 'error',
        'array-callback-return': 'error',
        'no-return-assign': 'error',
        'no-self-compare': 'error',
        'no-useless-backreference': 'warn',
        'no-sequences': 'error',
        'no-unused-expressions': 'warn',
        'no-empty': ['warn', { allowEmptyCatch: true }],
        
        'no-implied-eval': 'error',
        'no-warning-comments': 'warn'
    },
    overrides: [
        {
            files: ['spec/**/*.js'],
            env: {
                jasmine: true
            }
        }
    ]
};
