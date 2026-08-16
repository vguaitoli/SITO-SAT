/**
 * Guardia contro i commit accidentali dello snapshot TinaCMS.
 *
 * Il dev server riscrive src/content/tina-snapshot.json sostituendo gli URL del
 * CDN Tina (https://assets.tina.io/...) con percorsi locali (/media/cms/...).
 * In locale funziona, in produzione le immagini spariscono.
 *
 * Questo controllo SEGNALA e fallisce. Non ripristina nulla da solo: decidere
 * cosa fare del proprio albero di lavoro spetta a chi lo sta usando.
 *
 * Uso:
 *   node scripts/controlla-snapshot.mjs            controlla il file su disco
 *   node scripts/controlla-snapshot.mjs --staged   controlla la versione in stage
 *
 * Come hook (facoltativo, una volta sola):
 *   printf '#!/bin/sh\nnode scripts/controlla-snapshot.mjs --staged\n' > .git/hooks/pre-commit
 *   chmod +x .git/hooks/pre-commit
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { pathToFileURL } from "node:url";

const FILE = "src/content/tina-snapshot.json";
const SEGNALE_LOCALE = '"/media/cms/';
const SEGNALE_CDN = "https://assets.tina.io/";

/**
 * Logica pura, isolata perché sia verificabile senza toccare disco né git.
 *
 * @param {string} contenuto
 * @returns {{locali: number, cdn: number, sospetto: boolean}}
 */
export function analizzaSnapshot(contenuto) {
  const conteggio = (ago) => contenuto.split(ago).length - 1;
  const locali = conteggio(SEGNALE_LOCALE);
  return { locali, cdn: conteggio(SEGNALE_CDN), sospetto: locali > 0 };
}

// Il resto del file gira solo quando lo script è invocato da riga di comando.
const eseguitoDaCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!eseguitoDaCli) {
  // importato come modulo: nient'altro da fare
} else {

const soloStage = process.argv.includes("--staged");

function inStage() {
  const elenco = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" });
  return elenco.split("\n").includes(FILE);
}

function versioneInStage() {
  return execFileSync("git", ["show", `:${FILE}`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

try {
  if (soloStage && !inStage()) process.exit(0);

  const contenuto = soloStage ? versioneInStage() : await readFile(FILE, "utf8");
  const { locali, cdn } = analizzaSnapshot(contenuto);

  if (locali === 0) {
    if (!soloStage) console.log(`ok — ${FILE}: ${cdn} URL del CDN, nessun percorso locale.`);
    process.exit(0);
  }

  const dove = soloStage ? "in stage per il commit" : "sul disco";
  console.error(
    `\n✖  ${FILE} contiene ${locali} percors${locali === 1 ? "o" : "i"} local${locali === 1 ? "e" : "i"} "/media/cms/" ${dove}.\n\n` +
      "   Li scrive il dev server al posto degli URL del CDN Tina.\n" +
      "   Committarli fa sparire le immagini in produzione.\n\n" +
      "   Per scartare la modifica:\n" +
      `     git restore ${soloStage ? "--staged --worktree " : ""}${FILE}\n\n` +
      "   Se invece la modifica è voluta, salta il controllo con:\n" +
      "     git commit --no-verify\n",
  );
  process.exit(1);
} catch (errore) {
  if (errore?.code === "ENOENT") {
    console.error(`✖  ${FILE} non trovato.`);
    process.exit(1);
  }
  throw errore;
}

}
