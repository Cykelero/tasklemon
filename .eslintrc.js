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
        'no-mixed-spaces-and-tabs': 1,
        'dot-location': [1, 'property'],
        'no-multi-spaces': 1,
        'no-multi-str': 'error',
        'grouped-accessor-pairs': [1, 'getBeforeSet'],
        
        'consistent-return': 'error',
        'no-var': 'error',
        
        'no-unused-vars': 1,
        'no-constant-condition': [1, {checkLoops: false }],
        'accessor-pairs': 'error',
        'default-param-last': 'error',
        'require-atomic-updates': 'error',
        'array-callback-return': 'error',
        'no-return-assign': 'error',
        'no-self-compare': 'error',
        'no-useless-backreference': 1,
        'no-sequences': 'error',
        'no-unused-expressions': 1,
        'no-empty': [1, {allowEmptyCatch: true}],
        
        'no-implied-eval': 'error',
        'no-warning-comments': 1
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
