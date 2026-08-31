import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      // `fetchpriority` (minuscolo) è la forma corretta per React 18.3.x:
      // React avvisa sulla variante camelCase `fetchPriority`, mentre la regola
      // (pensata per React 19) vorrebbe il camelCase. Manteniamo il minuscolo,
      // runtime-pulito, e lo esentiamo qui.
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close", "fetchpriority"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },

  /* ================================================================== *
   * Social Studio
   * ================================================================== *
   *
   * Prima questa cartella non era coperta da nessun blocco: `files` si
   * fermava a `src/components`, `src/pages` e `src/Layout.jsx`. Lanciare
   * `eslint` su un file di Social Studio usciva con 0 non perché il codice
   * fosse pulito, ma perché non gli veniva applicata **nessuna regola** — un
   * verde che non voleva dire niente, e per qualche capitolo l'ho riportato
   * come se volesse dire qualcosa.
   *
   * Le regole sono le stesse del sito pubblico, con due differenze: qui i set
   * `recommended` vengono innestati davvero (nel blocco sopra lo spread di
   * oggetti li faceva sovrascrivere dalla chiave `rules` finale), e
   * `exhaustive-deps` è acceso come avviso. Le poche deviazioni volute — su
   * tutte l'effetto di `useLavoroExport`, che dipende dal solo `id` di
   * proposito — portano già il proprio commento di esenzione.
   */
  {
    files: ["src/social-studio/**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    settings: { react: { version: "detect" } },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginReact.configs.flat.recommended.rules,
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    /*
     * I test girano in jsdom ma uno di loro — quello di architettura — legge
     * il filesystem per verificare che `app/` e `template/` non importino
     * `archivio-locale`. Gli servono le globali di Node oltre a quelle del
     * browser.
     */
    files: ["src/social-studio/**/*.test.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];
