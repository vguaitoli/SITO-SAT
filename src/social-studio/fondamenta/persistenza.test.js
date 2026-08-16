import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formattaByte, valutaSpazio } from "./persistenza";

describe("formattaByte", () => {
  it("scala le unità", () => {
    expect(formattaByte(0)).toBe("0 B");
    expect(formattaByte(512)).toBe("512 B");
    expect(formattaByte(2048)).toBe("2.0 KB");
    expect(formattaByte(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formattaByte(1024 ** 3 * 2.5)).toBe("2.5 GB");
  });

  it("non si rompe con valori assurdi", () => {
    expect(formattaByte(-1)).toBe("0 B");
    expect(formattaByte(Number.NaN)).toBe("0 B");
  });
});

describe("valutaSpazio", () => {
  it("segnala un errore oltre l'80% della quota", () => {
    const esito = valutaSpazio({ byte: 85, quota: 100, persistente: true });
    expect(esito.livello).toBe("errore");
    expect(esito.messaggio).toMatch(/backup/i);
  });

  it("avvisa fra il 60 e l'80%", () => {
    expect(valutaSpazio({ byte: 65, quota: 100, persistente: true }).livello).toBe("avviso");
  });

  it("avvisa se la persistenza non è attiva, anche con spazio libero", () => {
    const esito = valutaSpazio({ byte: 1, quota: 1000, persistente: false });
    expect(esito.livello).toBe("avviso");
    expect(esito.messaggio).toMatch(/persistenza non attiva/i);
  });

  it("dà esito positivo solo con spazio libero e persistenza attiva", () => {
    expect(valutaSpazio({ byte: 1, quota: 1000, persistente: true }).livello).toBe("ok");
  });

  it("regge una quota non dichiarata dal browser", () => {
    expect(() => valutaSpazio({ byte: 100, quota: null, persistente: true })).not.toThrow();
    expect(valutaSpazio({ byte: 100, quota: null, persistente: true }).livello).toBe("ok");
  });
});

/**
 * Test di architettura.
 *
 * La promessa dell'astrazione SocialStorage è che la scelta di IndexedDB non
 * si propaghi nell'interfaccia. È una promessa che si mantiene solo se
 * qualcuno la verifica: qui si controlla che nessun componente importi
 * direttamente l'implementazione.
 */
describe("astrazione dell'archivio", () => {
  const radice = path.resolve(process.cwd(), "src/social-studio");

  const file = (cartella) => {
    const dentro = path.join(radice, cartella);
    let voci;
    try {
      voci = readdirSync(dentro, { recursive: true });
    } catch {
      return [];
    }
    return voci
      .map((v) => path.join(dentro, String(v)))
      .filter((p) => /\.(js|jsx)$/.test(p) && statSync(p).isFile());
  };

  it("nessun file di app/ o template/ importa archivio-locale", () => {
    const colpevoli = [...file("app"), ...file("template")].filter((p) =>
      readFileSync(p, "utf8").includes("archivio-locale"),
    );
    // Il contesto è l'unico punto autorizzato a conoscere l'implementazione.
    const ammessi = colpevoli.filter((p) => !p.endsWith("ContestoArchivio.jsx"));
    expect(ammessi.map((p) => path.relative(radice, p))).toEqual([]);
  });
});
