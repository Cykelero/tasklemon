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
    extends: 'eslint:recommended',
    rules: {
        'dot-location': ['error', 'property'],
        'no-multi-spaces': 'error',
        'no-multi-str': 'error',
        'grouped-accessor-pairs': ['error', 'getBeforeSet'],
        
        'consistent-return': 'error',
        'no-var': 'error',
        
        'no-constant-condition': [1, {checkLoops: false }],
        'accessor-pairs': 'error',
        'default-param-last': 'error',
        'require-atomic-updates': 'error',
        'array-callback-return': 'error',
        'no-return-assign': 'error',
        'no-self-compare': 'error',
        'no-useless-backreference': 'error',
        'no-sequences': 'error',
        'no-unused-expressions': 'error',
        'no-empty': ['error', {allowEmptyCatch: true}],
        
        'no-implied-eval': 'error',
        'no-warning-comments': 'error'
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
