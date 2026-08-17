import { describe, expect, it } from "vitest";
import { leggiBasic, ugualiATempoCostante, verifica } from "./_autenticazione.js";
import { config as configMiddleware, eProtetta } from "../middleware.js";

/**
 * L'autenticazione condivisa fra middleware ed endpoint.
 *
 * Sono test sulla logica, non sul routing di Vercel: quello va provato con
 * `vercel dev`, e i risultati stanno nel checkpoint della fase.
 */

const AMBIENTE = { SOCIAL_STUDIO_UTENTE: "vittorio", SOCIAL_STUDIO_PASSWORD: "segreto-lungo-abc" };
const basic = (u, p) => `Basic ${btoa(`${u}:${p}`)}`;

describe("ugualiATempoCostante", () => {
  it("riconosce le stringhe uguali", () => {
    expect(ugualiATempoCostante("abc", "abc")).toBe(true);
  });
  it("distingue quelle diverse, anche di lunghezza diversa", () => {
    expect(ugualiATempoCostante("abc", "abd")).toBe(false);
    expect(ugualiATempoCostante("abc", "abcd")).toBe(false);
    expect(ugualiATempoCostante("", "a")).toBe(false);
  });
});

describe("leggiBasic", () => {
  it("decodifica utente e password", () => {
    expect(leggiBasic(basic("vittorio", "segreto"))).toEqual({ utente: "vittorio", password: "segreto" });
  });
  it("regge una password che contiene i due punti", () => {
    expect(leggiBasic(basic("v", "a:b:c"))).toEqual({ utente: "v", password: "a:b:c" });
  });
  it("rifiuta schemi diversi da Basic", () => {
    expect(leggiBasic("Bearer abc")).toBeNull();
    expect(leggiBasic("")).toBeNull();
    expect(leggiBasic(null)).toBeNull();
  });
  it("rifiuta un base64 non valido", () => {
    expect(leggiBasic("Basic §§§non-base64§§§")).toBeNull();
  });
  it("rifiuta un contenuto senza separatore", () => {
    expect(leggiBasic(`Basic ${btoa("soloutente")}`)).toBeNull();
  });
});

describe("verifica", () => {
  it("nega l'accesso quando l'ambiente non è configurato", () => {
    // Il punto della chiusura di sicurezza: niente variabili, niente ingresso.
    expect(verifica(basic("chiunque", "qualsiasi"), {}).esito).toBe("non-configurato");
    expect(verifica(basic("v", "p"), { SOCIAL_STUDIO_UTENTE: "v" }).esito).toBe("non-configurato");
  });

  it("chiede le credenziali quando mancano", () => {
    expect(verifica(null, AMBIENTE).esito).toBe("mancante");
    expect(verifica("", AMBIENTE).esito).toBe("mancante");
  });

  it("segnala un'intestazione illeggibile", () => {
    expect(verifica("Bearer abc", AMBIENTE).esito).toBe("illeggibile");
  });

  it("rifiuta le credenziali errate", () => {
    expect(verifica(basic("vittorio", "sbagliata"), AMBIENTE).esito).toBe("errate");
    expect(verifica(basic("altro", "segreto-lungo-abc"), AMBIENTE).esito).toBe("errate");
    expect(verifica(basic("", ""), AMBIENTE).esito).toBe("errate");
  });

  it("accetta le credenziali corrette", () => {
    expect(verifica(basic("vittorio", "segreto-lungo-abc"), AMBIENTE).esito).toBe("ok");
  });

  it("non si lascia ingannare da un prefisso corretto", () => {
    expect(verifica(basic("vittorio", "segreto-lungo-ab"), AMBIENTE).esito).toBe("errate");
    expect(verifica(basic("vittorio", "segreto-lungo-abcd"), AMBIENTE).esito).toBe("errate");
  });
});

/**
 * `eProtetta` decide quali rotte richiedono le credenziali. È la funzione più
 * delicata del middleware: se dicesse «sì» troppo spesso metterebbe il sito
 * pubblico dietro una password, se dicesse «no» troppo spesso lascerebbe
 * scoperta l'area riservata.
 */
describe("eProtetta", () => {
  it("protegge lo studio e tutte le sue sotto-rotte", () => {
    expect(eProtetta("/admin/social")).toBe(true);
    expect(eProtetta("/admin/social/")).toBe(true);
    expect(eProtetta("/admin/social/eventi")).toBe(true);
    expect(eProtetta("/admin/social/api/caption")).toBe(true);
    expect(eProtetta("/admin/social/a/b/c/d")).toBe(true);
  });

  it("protegge l'endpoint anche se chiamato direttamente", () => {
    expect(eProtetta("/api/caption")).toBe(true);
  });

  it("NON protegge il sito pubblico", () => {
    for (const percorso of [
      "/", "/itinerari", "/eventi", "/eventi/la-via-dei-giganti-2026",
      "/blog", "/blog/qualcosa", "/esperienze/maxienduro", "/privacy",
      "/en", "/en/events", "/fr/blog", "/sitemap.xml", "/robots.txt",
      "/media/reali/foto.webp", "/fonts/oswald.woff2",
    ]) {
      expect(eProtetta(percorso), `${percorso} non deve essere protetto`).toBe(false);
    }
  });

  it("NON protegge l'admin di TinaCMS, che ha una sua autenticazione", () => {
    expect(eProtetta("/admin")).toBe(false);
    expect(eProtetta("/admin/index.html")).toBe(false);
  });

  it("confronta segmenti interi, non prefissi di stringa", () => {
    // Il caso classico: /admin/socialmente non è /admin/social, e non deve
    // essere confuso né con una rotta protetta né con una pubblica per errore.
    expect(eProtetta("/admin/socialmente")).toBe(false);
    expect(eProtetta("/admin/social-esperimento")).toBe(false);
    expect(eProtetta("/api/captions")).toBe(false);
    expect(eProtetta("/api/caption-altro")).toBe(false);
  });

  it("non dichiara un matcher: il filtro è nel codice", () => {
    // Con config.matcher la CLI di Vercel fallisce il parsing dei percorsi
    // con parametri e manda in 500 l'intero sito. Verificato sul campo.
    expect(configMiddleware).toBeUndefined();
  });
});
