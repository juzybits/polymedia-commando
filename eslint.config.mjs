import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import eslintPluginImport from "eslint-plugin-import";
import tsEslint from "typescript-eslint";

export default [
    eslint.configs.recommended,
    ...tsEslint.configs.strictTypeChecked,
    ...tsEslint.configs.stylisticTypeChecked,
    {
        ignores: [ "**/dist", "**/node_modules" ],
    },
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                project: [ "./tsconfig.json" ],
            },
        },
        plugins: {
            "@stylistic": stylistic,
            import: eslintPluginImport,
        },
        rules: {
            "@stylistic/jsx-quotes": [ "error", "prefer-double" ],
            "@stylistic/member-delimiter-style": [ "error", { multiline: { delimiter: "semi" }, singleline: { delimiter: "semi" } } ],
            "@stylistic/no-tabs": "error",
            "@stylistic/quotes": [ "error", "double", { avoidEscape: true } ],
            "@stylistic/semi": [ "error", "always" ],
            "@typescript-eslint/consistent-type-definitions": [ "error", "type" ],
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-inferrable-types": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unnecessary-type-parameters": "off",
            "@typescript-eslint/no-unused-expressions": [ "error", { allowShortCircuit: true, allowTernary: true } ],
            "@typescript-eslint/no-unused-vars": [ "error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" } ],
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
            "no-constant-condition": "off",
            // Chill with the any checks
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
        },
        settings: {
            react: {
                version: "18"
            }
        },
    },
    {
        files: ["src/**/*.ts?(x)"],
        rules: {
            "import/extensions": ["error", "ignorePackages", { ts: "never", tsx: "never" }],
        },
    },
    {
        files: ["**/__tests__/**/*.ts?(x)"],
        rules: {
            "import/extensions": ["off", "ignorePackages"],
        },
    },
];
