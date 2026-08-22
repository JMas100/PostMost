import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
    {
        // `next lint` never covered these — they're outside the Next.js app
        // (a separately-built browser extension, a plain Node seed script).
        // eslint . lints the whole repo by default, so restore that scope explicitly.
        ignores: ["extensions/**", "prisma/seed.js"],
    },
    {
        extends: [...nextCoreWebVitals, ...nextTypescript],

        rules: {
            "no-unused-vars": "off",

            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            }],
        },
    },
    {
        // Config files run as CommonJS regardless of the app's module setup.
        files: ["tailwind.config.ts"],
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
]);