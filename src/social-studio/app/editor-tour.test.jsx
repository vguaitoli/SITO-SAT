import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorTour, { CAMPI_EDITORIALI, CAMPI_FATTUALI } from "./EditorTour";
import { FornitoreArchivio } from "./ContestoArchivio";
import { FornitoreTransizione } from "./transizione";
import { creaArchivioMemoria } from "../fondamenta/archivio";
import { contenutoVuoto } from "../fondamenta/schema";
import { editorPerRubrica, statoRubrica } from "./registro-editor";
import { templateDisponibile } from "../design/registro-template";

/**
 * Il primo nucleo dell'editor TOUR.
 *
 * Si monta sotto i fornitori veri, con un archivio **in memoria**: nessuna
 * bozza di prova tocca l'archivio personale, e ogni prova parte da un disco
 * vuoto. Quello che si guarda è il dato — che cosa finisce nell'archivio e che
 * cosa resta in memoria — più i pochi testi che sono contratto con chi legge:
 * «non salvato» e il messaggio di un salvataggio fallito.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Due tour sintetici: nessun tour reale, nessun dato operativo. */
const TOUR = Object.freeze({
  slug: "prova-di-contratto",
  name: "Prova Di Contratto",
  type: "Enduro",
  descrizione: "Testo di prova importato dal sito.",
  prezzo: "100 €",
  km: "50 km",
  durata: "1 Giorno",
  livello: "Facile",
  periodo: "Aprile",
  sterrato: "40%",
  interesse: "Primo Luogo, Secondo Luogo",
});

const ALTRO_TOUR = Object.freeze({
  ...TOUR,
  slug: "seconda-prova",
  name: "Seconda Prova",
  prezzo: "200 €",
});

const TOURS = Object.freeze([TOUR, ALTRO_TOUR]);

let contenitore;
let radice;

beforeEach(() => {
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

async function monta({ archivio = creaArchivioMemoria(), onChiudi } = {}) {
  await act(async () => {
    radice.render(
      <FornitoreArchivio archivio={archivio}>
        <FornitoreTransizione>
          <EditorTour tours={TOURS} urlBase="https://esempio.test" onChiudi={onChiudi} />
        </FornitoreTransizione>
      </FornitoreArchivio>,
    );
  });
  await respiro();
  return archivio;
}

/* ------------------------------------------------------------------ *
 * Piccoli aiutanti sul DOM
 * ------------------------------------------------------------------ */

const testo = () => contenitore.textContent || "";
const q = (sel) => contenitore.querySelector(sel);
const qa = (sel) => [...contenitore.querySelectorAll(sel)];

const bottone = (nome) =>
  qa("button").find((b) => (b.textContent || "").trim().toLowerCase().includes(nome.toLowerCase()));

const premi = async (nome) => {
  const b = bottone(nome);
  if (!b) throw new Error(`Nessun pulsante «${nome}». C'è: ${qa("button").map((x) => x.textContent.trim()).join(" | ")}`);
  await act(async () => {
    b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await respiro();
};

const campo = (etichetta) => qa("input, textarea").find((i) => i.getAttribute("aria-label") === etichetta);

const scrivi = async (etichetta, valore) => {
  const el = campo(etichetta);
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(el, valore);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await respiro();
};

const scegliTour = async (slug) => {
  const select = q("select");
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(select, slug);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await respiro();
};

/** Crea una bozza dal tour indicato. */
const creaDa = async (slug) => {
  await scegliTour(slug);
  await premi("Crea bozza dal tour");
};

/** Preme «Apri» sulla riga della bozza indicata, non sulla prima che capita. */
const apriBozza = async (titolo) => {
  const riga = qa('[data-elenco="bozze-tour"] li').find((l) => (l.textContent || "").includes(titolo));
  if (!riga) throw new Error(`Nessuna riga «${titolo}»`);
  await act(async () => {
    riga.querySelector("button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await respiro();
};

const statoLavoro = () => q("[data-stato-lavoro]")?.getAttribute("data-stato-lavoro");
const dialogo = () => q('[role="dialog"]');

/** Un archivio che sa rompersi su `salva`, e conta le scritture. */
function archivioPilotabile() {
  const archivio = creaArchivioMemoria();
  const vero = archivio.salva.bind(archivio);
  const stato = { rompi: false, scritture: 0 };
  archivio.salva = async (c) => {
    stato.scritture += 1;
    if (stato.rompi) throw new Error("disco non disponibile");
    return vero(c);
  };
  return { archivio, stato };
}

/* ================================================================== *
 * La fonte e l'importazione
 * ================================================================== */

describe("la bozza nasce dal tour scelto, e da nient'altro", () => {
  it("importa i fatti del tour e non ne inventa nessuno", async () => {
    await monta();
    await creaDa(TOUR.slug);

    const leggi = (c) => q(`[data-fatto="${c}"]`)?.textContent || "";

    // Quello che il sito espone, com'è: nessuna unità aggiunta, nessun arrotondamento.
    expect(leggi("nome")).toContain("Prova Di Contratto");
    expect(leggi("categoria")).toContain("Enduro");
    expect(leggi("durata")).toContain("1 Giorno");
    expect(leggi("km")).toContain("50 km");
    expect(leggi("prezzo")).toContain("100 €");
    expect(leggi("sterrato")).toContain("40%");

    /*
     * E quello che il sito **non** espone resta vuoto. `mezzo` in particolare:
     * copiarlo da `type` funzionerebbe otto volte su nove, che è il modo
     * peggiore di sbagliare — «Su Misura» è un tipo di tour, non un veicolo.
     */
    for (const vuoto of ["area", "mezzo"]) {
      expect(leggi(vuoto), vuoto).toContain("vuoto");
      expect(leggi(vuoto), vuoto).toContain("non importato");
    }

    // La provenienza è dichiarata su ogni fatto importato.
    expect(leggi("prezzo")).toContain("dal sito");
  });

  it("l'editoriale importa solo ciò che è un punto di partenza del testo", async () => {
    await monta();
    await creaDa(TOUR.slug);

    expect(campo("Titolo breve").value).toBe("Prova Di Contratto");
    expect(campo("Descrizione").value).toBe("Testo di prova importato dal sito.");
    // Claim, kicker, CTA e frase dei numeri sono scelte di scrittura: nascono vuoti.
    for (const etichetta of ["Claim", "Kicker", "CTA", "Frase dei numeri"]) {
      expect(campo(etichetta).value, etichetta).toBe("");
    }
  });

  it("una bozza appena creata non è sul disco", async () => {
    const archivio = await monta();
    await creaDa(TOUR.slug);

    expect(statoLavoro()).toBe("non-salvato");
    expect(await archivio.elenca({ categoria: "tour" })).toEqual([]);
    expect(testo()).toMatch(/non è ancora sul disco/i);
  });
});

/* ================================================================== *
 * Fatti e testi, separati
 * ================================================================== */

describe("i fatti non si modificano da qui", () => {
  it("il riquadro dei fatti non contiene nessun campo scrivibile", async () => {
    await monta();
    await creaDa(TOUR.slug);

    const fatti = q('[data-parte="fattuali"]');
    expect(fatti).toBeTruthy();
    expect(fatti.querySelectorAll("input, textarea, select, [contenteditable]")).toHaveLength(0);
    expect(fatti.textContent).toMatch(/sola lettura/i);
  });

  it("i due riquadri sono distinti, e gli editabili stanno solo in quello editoriale", async () => {
    await monta();
    await creaDa(TOUR.slug);

    const editoriale = q('[data-parte="editoriale"]');
    const scrivibili = qa("input[aria-label], textarea[aria-label]");
    expect(scrivibili.length).toBe(CAMPI_EDITORIALI.length);
    for (const el of scrivibili) expect(editoriale.contains(el)).toBe(true);
  });

  it("i fatti mostrati sono quelli dichiarati", async () => {
    await monta();
    await creaDa(TOUR.slug);
    for (const { campo: c } of CAMPI_FATTUALI) {
      expect(q(`[data-fatto="${c}"]`), c).toBeTruthy();
    }
  });
});

/* ================================================================== *
 * Scrivere, salvare, riaprire
 * ================================================================== */

describe("il lavoro editoriale", () => {
  it("una modifica marca il lavoro come non salvato", async () => {
    const archivio = await monta();
    await creaDa(TOUR.slug);
    await premi("Salva");
    expect(statoLavoro()).toBe("salvato");

    await scrivi("Claim", "Una frase scritta a mano.");

    expect(statoLavoro()).toBe("non-salvato");
    expect(testo()).toMatch(/modifiche non salvate/i);
    // E sul disco non c'è ancora.
    const [salvata] = await archivio.elenca({ categoria: "tour" });
    const record = await archivio.leggi(salvata.id);
    expect(record.editoriale.claim).toBe("");
  });

  it("l'input non tiene una copia propria: quel che si legge è quel che si salverà", async () => {
    const archivio = await monta();
    await creaDa(TOUR.slug);
    await scrivi("Kicker", "Sardegna");
    await scrivi("CTA", "Scopri il tour");
    await premi("Salva");

    const [b] = await archivio.elenca({ categoria: "tour" });
    const record = await archivio.leggi(b.id);
    expect(record.editoriale.kicker).toBe("Sardegna");
    expect(record.editoriale.cta).toBe("Scopri il tour");
    expect(campo("Kicker").value).toBe("Sardegna");
  });

  it("salvata e riaperta: il testo è ancora lì", async () => {
    const archivio = await monta();
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Frase che deve sopravvivere.");
    await premi("Salva");
    expect(testo()).toMatch(/^(?!.*non salvato).*Salvata\./s);
    expect(statoLavoro()).toBe("salvato");

    /*
     * Si crea un'altra bozza — l'editor è pulito, nessun dialogo — e la si
     * salva, così l'elenco ne ha due e si può tornare sulla prima. Una bozza
     * appena creata nasce sporca: aprirne un'altra chiederebbe, ed è un'altra
     * prova.
     */
    await creaDa(ALTRO_TOUR.slug);
    expect(campo("Claim").value).toBe("");
    await premi("Salva");

    await apriBozza("Prova Di Contratto");
    expect(campo("Claim").value).toBe("Frase che deve sopravvivere.");
    expect(statoLavoro()).toBe("salvato");
    expect(await archivio.elenca({ categoria: "tour" })).toHaveLength(2);
  });

  it("l'elenco mostra le bozze TOUR e non quelle di altre rubriche", async () => {
    const archivio = creaArchivioMemoria();
    // Una bozza EVENTI già nell'archivio: non deve comparire.
    await archivio.salva({
      ...contenutoVuoto({ categoria: "eventi", formato: "post" }),
      titolo: "Un Evento",
    });
    await monta({ archivio });
    await creaDa(TOUR.slug);
    await premi("Salva");

    const elenco = q('[data-elenco="bozze-tour"]');
    expect(elenco.textContent).toContain("Prova Di Contratto");
    expect(elenco.textContent).not.toContain("Un Evento");
    expect(elenco.querySelectorAll("li")).toHaveLength(1);
  });
});

/* ================================================================== *
 * Il salvataggio che non riesce
 * ================================================================== */

describe("un salvataggio fallito non diventa un successo", () => {
  it("il contenuto resta, lo stato resta non salvato, e si può riprovare", async () => {
    const { archivio, stato } = archivioPilotabile();
    await monta({ archivio });
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Testo da non perdere.");

    stato.rompi = true;
    await premi("Salva");

    // Mai «Salvata».
    expect(testo()).not.toMatch(/(^|[^n])\bSalvata\./);
    expect(testo()).toMatch(/salvataggio non è riuscito/i);
    expect(statoLavoro()).toBe("non-salvato");
    // Il lavoro è ancora qui, parola per parola.
    expect(campo("Claim").value).toBe("Testo da non perdere.");
    expect(await archivio.elenca({ categoria: "tour" })).toEqual([]);

    // E il ritentativo funziona: il pulsante non è rimasto bloccato.
    stato.rompi = false;
    await premi("Salva");
    expect(statoLavoro()).toBe("salvato");
    expect(await archivio.elenca({ categoria: "tour" })).toHaveLength(1);
    expect(stato.scritture).toBe(2);
  });
});

/* ================================================================== *
 * Le transizioni: il lavoro non salvato non se ne va da solo
 * ================================================================== */

describe("le modifiche non salvate sono protette", () => {
  it("creare un'altra bozza con lavoro sporco chiede prima", async () => {
    await monta();
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Lavoro in corso.");

    await scegliTour(ALTRO_TOUR.slug);
    await premi("Crea bozza dal tour");

    expect(dialogo()).toBeTruthy();
    // Nessuna sostituzione finché non si risponde.
    expect(campo("Claim").value).toBe("Lavoro in corso.");
  });

  it("annullare conserva il lavoro e non cambia bozza", async () => {
    await monta();
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Lavoro in corso.");

    await scegliTour(ALTRO_TOUR.slug);
    await premi("Crea bozza dal tour");
    await premi("Annulla");

    expect(dialogo()).toBeFalsy();
    expect(campo("Claim").value).toBe("Lavoro in corso.");
    expect(campo("Titolo breve").value).toBe("Prova Di Contratto");
    expect(statoLavoro()).toBe("non-salvato");
    expect(testo()).toMatch(/il lavoro non salvato è ancora qui/i);
  });

  it("«Salva e continua» scrive e poi cambia bozza", async () => {
    const archivio = await monta();
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Da salvare prima di andare.");

    await scegliTour(ALTRO_TOUR.slug);
    await premi("Crea bozza dal tour");
    await premi("Salva e continua");

    // La transizione è avvenuta: davanti c'è l'altra bozza.
    expect(campo("Titolo breve").value).toBe("Seconda Prova");
    // E la prima è sul disco con il suo testo.
    const elenco = await archivio.elenca({ categoria: "tour" });
    expect(elenco).toHaveLength(1);
    const record = await archivio.leggi(elenco[0].id);
    expect(record.editoriale.claim).toBe("Da salvare prima di andare.");
  });

  it("«Scarta modifiche» cambia bozza senza scrivere niente", async () => {
    const { archivio, stato } = archivioPilotabile();
    await monta({ archivio });
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Questo si butta.");

    await scegliTour(ALTRO_TOUR.slug);
    await premi("Crea bozza dal tour");
    await premi("Scarta modifiche");

    expect(campo("Titolo breve").value).toBe("Seconda Prova");
    expect(stato.scritture).toBe(0);
    expect(await archivio.elenca({ categoria: "tour" })).toEqual([]);
  });

  it("aprire un'altra bozza con lavoro sporco passa dalla stessa protezione", async () => {
    await monta();
    await creaDa(TOUR.slug);
    await premi("Salva");
    await creaDa(ALTRO_TOUR.slug);
    await premi("Salva");
    await scrivi("Claim", "Modifica sulla seconda.");

    // Si apre la prima bozza: c'è lavoro sporco, quindi si chiede.
    await apriBozza("Prova Di Contratto");
    expect(dialogo()).toBeTruthy();
    await premi("Annulla");
    expect(campo("Claim").value).toBe("Modifica sulla seconda.");
  });
});

describe("chiudere l'editor è una transizione come le altre", () => {
  it("con lavoro sporco chiede, e annullando non chiude", async () => {
    const onChiudi = vi.fn();
    await monta({ onChiudi });
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Non buttarmi via.");

    await premi("Chiudi");

    expect(dialogo()).toBeTruthy();
    expect(onChiudi).not.toHaveBeenCalled();

    await premi("Annulla");
    expect(onChiudi).not.toHaveBeenCalled();
    expect(campo("Claim").value).toBe("Non buttarmi via.");
  });

  it("con l'editor pulito chiude senza chiedere niente", async () => {
    const onChiudi = vi.fn();
    await monta({ onChiudi });
    await creaDa(TOUR.slug);
    await premi("Salva");

    await premi("Chiudi");

    expect(dialogo()).toBeFalsy();
    expect(onChiudi).toHaveBeenCalledTimes(1);
  });

  it("«Salva e continua» salva e poi chiude", async () => {
    const onChiudi = vi.fn();
    const archivio = await monta({ onChiudi });
    await creaDa(TOUR.slug);
    await scrivi("Claim", "Salvami all'uscita.");

    await premi("Chiudi");
    await premi("Salva e continua");

    expect(onChiudi).toHaveBeenCalledTimes(1);
    const elenco = await archivio.elenca({ categoria: "tour" });
    const record = await archivio.leggi(elenco[0].id);
    expect(record.editoriale.claim).toBe("Salvami all'uscita.");
  });
});

/* ================================================================== *
 * Quel che questo capitolo non cambia
 * ================================================================== */

describe("l'editor diagnostico non abilita TOUR", () => {
  it("non è nel registro, e la rubrica resta pianificata", async () => {
    await monta();
    await creaDa(TOUR.slug);

    expect(editorPerRubrica("tour")).toBeNull();
    expect(statoRubrica("tour")).toBe("pianificata");
    expect(templateDisponibile("tour", "post", "standard")).toBe(false);
    expect(templateDisponibile("tour", "story", "standard")).toBe(false);
    // EVENTI non cambia: continua ad avere il suo editor.
    expect(statoRubrica("eventi")).toBe("disponibile");
    expect(editorPerRubrica("eventi")).toBeTruthy();
  });

  it("non c'è niente di media, GPX, cronologia o export in questo nucleo", async () => {
    await monta();
    await creaDa(TOUR.slug);
    const schermo = testo();
    for (const parola of ["Cronologia", "Ripristina", "Elimina", "Esporta", "Carica GPX"]) {
      expect(schermo, parola).not.toContain(parola);
    }
    expect(q('input[type="file"]')).toBeFalsy();
  });
});
