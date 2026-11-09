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
  // Shared code, UI primitives and lib helpers never import from features.
  {
    files: [
      "src/shared/**/*.{ts,tsx}",
      "src/components/ui/**/*.tsx",
      "src/lib/**/*.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*"],
              message: "shared/lib/ui must not import from features",
            },
          ],
        },
      ],
    },
  },
  // Features never reference each other directly: only their public index.ts.
  {
    files: ["src/features/classes/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/holds/*"],
              message: "classes may only import holds through its index",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/holds/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/classes/*"],
              message: "holds may only import classes through its index",
            },
          ],
        },
      ],
    },
  },
])
