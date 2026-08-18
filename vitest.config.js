import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Configurazione dei test.
 *
 * Ambiente jsdom perché il parser GPX usa DOMParser, che in Node non esiste.
 * L'alias @ ricalca quello di vite.config.js: i moduli si importano con gli
 * stessi percorsi che usano nell'applicazione.
 *
 * L'ambito è ristretto alle fondamenta: src/social-studio, gli script, le API e
 * — sola eccezione nel sito pubblico — src/seo, perché è lì che vivono i
 * metadati della pagina interna dello studio.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
  test: {
    environment: "jsdom",
    include: [
      "src/social-studio/**/*.test.{js,jsx}",
      "src/seo/**/*.test.js",
      "scripts/**/*.test.mjs",
      "api/**/*.test.mjs",
    ],
    globals: false,
    restoreMocks: true,
  },
});
