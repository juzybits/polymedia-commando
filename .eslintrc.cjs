module.exports = {
    root: true,
    env: { node: true },
    ignorePatterns: [ "dist", "node_modules" ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: [ "./tsconfig.json" ],
        tsconfigRootDir: __dirname,
    },
    plugins: [
        "@stylistic",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/strict-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked",
    ],
    rules: {
        "@stylistic/jsx-quotes": [ "error", "prefer-double" ],
        "@stylistic/member-delimiter-style": [ "error", { "multiline": { "delimiter": "semi" }, "singleline": { "delimiter": "semi" } } ],
        "@stylistic/quotes": [ "error", "double", { "avoidEscape": true } ],
        "@stylistic/semi": [ "error", "always" ],
        "@typescript-eslint/consistent-type-definitions": [ "error", "type" ],
        "@typescript-eslint/prefer-nullish-coalescing": [ "error", { "ignoreConditionalTests": true } ],
        "@typescript-eslint/restrict-template-expressions": "off",
        // Allow while(true) loops
        "@typescript-eslint/no-unnecessary-condition": "off",
        "no-constant-condition": "off",
        // Chill with the any checks
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-member-access": "off",
        "@typescript-eslint/no-unsafe-return": "off",
    },
    settings: {
    },
}
