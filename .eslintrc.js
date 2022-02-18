module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  plugins: ['@typescript-eslint'],
  extends: ['standard', 'plugin:prettier/recommended', 'plugin:node/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    //    'node/no-unpublished-require': ["error", {
    //            "allowModules": [],
    //            "convertPath": null,
    //            "tryExtensions": [".js", ".json", ".node"]
    //        }],
    'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
  },
};
