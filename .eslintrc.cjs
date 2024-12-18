module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ["airbnb-base"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
  },
  settings: {
    "import/resolver": {
      "babel-module": {},
    },
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  rules: {
    "max-len": ["error", { code: 150 }],
    "no-eval": "off",
    quotes: ["error", "double"],
    "comma-dangle": "off",
    "no-console": "off",
    "object-curly-newline": "off",
    "import/extensions": "off",
    "import/no-unresolved": "off",
    "import/prefer-default-export": "off",
  },
};
