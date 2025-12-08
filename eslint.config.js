// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
	{ ignores: ["**/*.js"] },
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"no-var": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-namespace": "off",

			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/explicit-function-return-type": [
				"warn",
				{ allowExpressions: true },
			],

			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/restrict-plus-operands": [
				"error",
				{ allowNullish: false },
			],
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{ allow: [], allowNullish: false },
			],
			curly: "error",
		},
	},
);
