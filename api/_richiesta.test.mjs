import { describe, expect, it } from "vitest";
import { byteUtf8, contentTypeAmmesso, stessaOrigine } from "./_richiesta.js";

describe("byteUtf8", () => {
  it("conta i byte, non i caratteri", () => {
    expect(byteUtf8("abc")).toBe(3);
    // Ogni accentata pesa due byte: il punto per cui `length` non basta.
    expect("àèìòù".length).toBe(5);
    expect(byteUtf8("àèìòù")).toBe(10);
    // Un'emoji con modificatori pesa molto più di quanto `length` suggerisca.
    expect(byteUtf8("🏍️")).toBeGreaterThan("🏍️".length);
  });

  it("un tetto misurato sui caratteri si aggira, uno sui byte no", () => {
    const testo = "à".repeat(20000);
    expect(testo.length).toBe(20000);            // sembra sotto un tetto di 32.000
    expect(byteUtf8(testo)).toBe(40000);         // in realtà lo supera
    expect(byteUtf8(testo)).toBeGreaterThan(32 * 1024);
  });

  it("regge valori assenti", () => {
    expect(byteUtf8(null)).toBe(0);
    expect(byteUtf8(undefined)).toBe(0);
    expect(byteUtf8("")).toBe(0);
  });
});

describe("contentTypeAmmesso", () => {
  it("accetta application/json, con o senza charset", () => {
    expect(contentTypeAmmesso("application/json")).toBe(true);
    expect(contentTypeAmmesso("application/json; charset=utf-8")).toBe(true);
    expect(contentTypeAmmesso("APPLICATION/JSON")).toBe(true);
    expect(contentTypeAmmesso("  application/json  ")).toBe(true);
  });

  it("rifiuta i tipi che il browser manda senza preflight", () => {
    // Sono i tre tipi delle richieste "semplici": il vettore classico per
    // aggirare i controlli d'origine.
    expect(contentTypeAmmesso("text/plain")).toBe(false);
    expect(contentTypeAmmesso("multipart/form-data; boundary=x")).toBe(false);
    expect(contentTypeAmmesso("application/x-www-form-urlencoded")).toBe(false);
  });

  it("rifiuta tipi assenti o simili ma diversi", () => {
    expect(contentTypeAmmesso(null)).toBe(false);
    expect(contentTypeAmmesso("")).toBe(false);
    expect(contentTypeAmmesso("application/json-patch+json")).toBe(false);
    expect(contentTypeAmmesso("application/ld+json")).toBe(false);
  });
});

describe("stessaOrigine", () => {
  it("si fida di Sec-Fetch-Site quando c'è", () => {
    expect(stessaOrigine({ secFetchSite: "same-origin" }).ok).toBe(true);
    // "none" è la navigazione diretta dell'utente.
    expect(stessaOrigine({ secFetchSite: "none" }).ok).toBe(true);
    expect(stessaOrigine({ secFetchSite: "cross-site" }).ok).toBe(false);
    expect(stessaOrigine({ secFetchSite: "same-site" }).ok).toBe(false);
  });

  it("Sec-Fetch-Site prevale su un Origin coincidente", () => {
    // Non falsificabile da JavaScript: se dice cross-site, è cross-site.
    const esito = stessaOrigine({
      secFetchSite: "cross-site",
      origin: "https://www.sardegnatrailavventura.it",
      host: "www.sardegnatrailavventura.it",
    });
    expect(esito.ok).toBe(false);
  });

  it("confronta Origin con l'host quando Sec-Fetch-Site manca", () => {
    expect(stessaOrigine({
      origin: "https://www.sardegnatrailavventura.it",
      host: "www.sardegnatrailavventura.it",
    }).ok).toBe(true);

    expect(stessaOrigine({
      origin: "https://sito-malevolo.example",
      host: "www.sardegnatrailavventura.it",
    }).ok).toBe(false);
  });

  it("non si lascia ingannare da un host che è sottostringa", () => {
    expect(stessaOrigine({
      origin: "https://www.sardegnatrailavventura.it.malevolo.example",
      host: "www.sardegnatrailavventura.it",
    }).ok).toBe(false);
  });

  it("rifiuta un Origin illeggibile o un host assente", () => {
    expect(stessaOrigine({ origin: "non-un-url", host: "x" }).ok).toBe(false);
    expect(stessaOrigine({ origin: "https://x", host: null }).ok).toBe(false);
  });

  it("lascia passare le richieste senza segnali di browser", () => {
    // curl o un client server-side: l'autenticazione l'ha già superata, e
    // bloccarlo renderebbe l'endpoint inutilizzabile dagli strumenti.
    expect(stessaOrigine({}).ok).toBe(true);
    expect(stessaOrigine({ host: "localhost:3999" }).ok).toBe(true);
  });
});
