import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  // Feature/shared boundary: shared code and UI primitives never import from features.
  {
    files: ["shared/**/*.{ts,tsx}", "src/components/ui/**/*.tsx", "src/lib/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@/features", message: "shared/lib/ui must not import from features" }],
          patterns: [{ group: ["@/features/*"], message: "shared/lib/ui must not import from features" }],
        },
      ],
    },
  },
  // Features never reference each other directly: classes must not import holds
  // and vice versa. Imports within a feature (through its own index.ts or
  // deep paths) remain allowed.
  {
    files: ["features/classes/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["@/features/holds/**"], message: "classes must not import holds directly" }],
        },
      ],
    },
  },
  {
    files: ["features/holds/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [{ group: ["@/features/classes/**"], message: "holds must not import classes directly" }],
        },
      ],
    },
  },
])
