import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import EditorTour from "./EditorTour";
import FonteTour from "./FonteTour";
import { FornitoreArchivio } from "./ContestoArchivio";
import { FornitoreTransizione } from "./transizione";
import { creaArchivioMemoria } from "../fondamenta/archivio";
import { useBozzaTour } from "./useBozzaTour";
import { accendiAmbienteGrafico, spegniAmbienteGrafico } from "./ambiente-di-prova";

/**
 * Fonte, cronologia ed eliminazione, sull'editor **vero**.
 *
 * Tre aree diverse con lo stesso rischio di fondo: raccontare come riuscito
 * qualcosa che non lo è, o far succedere qualcosa che nessuno ha chiesto. Un
 * confronto che sporca la bozza, un ripristino che duplica la storia, una
 * cancellazione che passa dal salvataggio e scrive proprio il record che si
 * voleva togliere.
 *
 * Archivio in memoria, vuoto a ogni prova: nessuna bozza di prova nell'archivio
 * personale.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
});

const ALTRO_TOUR = Object.freeze({ ...TOUR, slug: "seconda-prova", name: "Seconda Prova" });

let contenitore;
let radice;

beforeEach(() => {
  accendiAmbienteGrafico();
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
  spegniAmbienteGrafico();
});

const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const assesta = async () => {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
};

const testo = () => contenitore.textContent || "";
const q = (sel) => contenitore.querySelector(sel);
const qa = (sel) => [...contenitore.querySelectorAll(sel)];
const bottone = (nome) =>
  qa("button").find((b) => (b.textContent || "").trim().toLowerCase().includes(nome.toLowerCase()));

const clic = async (el) => {
  if (!el) throw new Error("Elemento assente");
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await respiro();
};

const premi = (nome) => clic(bottone(nome));

const campo = (etichetta) =>
  qa("input, textarea").find((i) => i.getAttribute("aria-label") === etichetta);

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

const statoLavoro = () => q("[data-stato-lavoro]")?.getAttribute("data-stato-lavoro");
const dialogo = () => q('[role="dialog"]');

let tourDelBanco = [TOUR, ALTRO_TOUR];

async function monta({ archivio = creaArchivioMemoria(), tours = [TOUR, ALTRO_TOUR] } = {}) {
  tourDelBanco = tours;
  await act(async () => {
    radice.render(
      <FornitoreArchivio archivio={archivio}>
        <FornitoreTransizione>
          <EditorTour tours={tourDelBanco} urlBase="https://esempio.test" />
        </FornitoreTransizione>
      </FornitoreArchivio>,
    );
  });
  await respiro();
  return archivio;
}

/** Rimonta lo stesso archivio con un catalogo diverso: il sito è cambiato. */
async function cambiaIlSito(archivio, tours) {
  tourDelBanco = tours;
  await act(async () => {
    radice.render(
      <FornitoreArchivio archivio={archivio}>
        <FornitoreTransizione>
          <EditorTour tours={tours} urlBase="https://esempio.test" />
        </FornitoreTransizione>
      </FornitoreArchivio>,
    );
  });
  await respiro();
}

const creaBozza = async (slug = TOUR.slug) => {
  const select = q('select[aria-label="Tour dal sito"]');
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
    setter.call(select, slug);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await respiro();
  await premi("Crea bozza dal tour");
};

/** Preme «Apri» sulla riga della bozza indicata, non sulla prima che capita. */
const apriBozza = async (titolo) => {
  const riga = qa('[data-elenco="bozze-tour"] li').find((l) =>
    (l.textContent || "").includes(titolo),
  );
  if (!riga) throw new Error(`Nessuna riga «${titolo}»`);
  await clic(riga.querySelector("button"));
};

async function recordDi(archivio, titolo) {
  const elenco = await archivio.elenca({ categoria: "tour" });
  const voce = elenco.find((b) => b.titolo === titolo) || elenco[0];
  return voce ? archivio.leggi(voce.id) : null;
}

/* ================================================================== *
 * D. Confronto e riallineamento
 * ================================================================== */

describe("il confronto con il sito è una domanda, non un'operazione", () => {
  it("con l'istantanea che regge dice allineata", async () => {
    await monta();
    await creaBozza();
    await premi("Salva");

    await clic(q('[data-azione="confronta-fonte"]'));

    expect(q("[data-confronto]").getAttribute("data-confronto")).toBe("fonte-allineata");
    expect(q('[data-elenco="scostamenti"]')).toBeFalsy();
  });

  it("con il sito cambiato elenca campo, prima e adesso", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    await cambiaIlSito(archivio, [{ ...TOUR, prezzo: "150 €" }, ALTRO_TOUR]);
    // La bozza è ancora aperta? No: rimontare l'editor la chiude. Si riapre.
    await clic(qa('[data-elenco="bozze-tour"] li')[0].querySelector("button"));
    await clic(q('[data-azione="confronta-fonte"]'));

    expect(q("[data-confronto]").getAttribute("data-confronto")).toBe("fonte-cambiata");
    const riga = q('[data-scostamento="prezzo"]');
    expect(riga).toBeTruthy();
    expect(riga.textContent).toContain("100 €");
    expect(riga.textContent).toContain("150 €");
  });

  /**
   * Il difetto che questa prova esclude: un confronto che tocca la bozza.
   * Chiedersi se il sito è cambiato dev'essere **gratuito**, altrimenti non lo
   * si chiede — e una domanda che sporca il lavoro, o che aggiunge una
   * revisione, è tutto fuorché gratuita.
   */
  it("confrontare non tocca contenuto, «non salvato», archivio né revisioni", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    const prima = await recordDi(archivio, "Prova Di Contratto");
    const esitoPrima = q("[data-esito]")?.getAttribute("data-esito");

    await clic(q('[data-azione="confronta-fonte"]'));
    await clic(q('[data-azione="confronta-fonte"]'));

    expect(statoLavoro()).toBe("salvato");
    expect(q("[data-esito]")?.getAttribute("data-esito")).toBe(esitoPrima);
    const dopo = await recordDi(archivio, "Prova Di Contratto");
    expect(dopo.versioni).toEqual(prima.versioni);
    expect(dopo.fonte).toEqual(prima.fonte);
    expect(dopo.modificato).toBe(prima.modificato);
  });

  it("senza tour corrispondente nel catalogo non si inventa un confronto", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    // Il tour sparisce dal sito.
    await cambiaIlSito(archivio, [ALTRO_TOUR]);
    await clic(qa('[data-elenco="bozze-tour"] li')[0].querySelector("button"));
    await clic(q('[data-azione="confronta-fonte"]'));

    expect(q("[data-confronto]").getAttribute("data-confronto")).toBe("fonte-assente");
    expect(testo()).toMatch(/nessun tour corrispondente/i);
  });

  it("riallineare è un gesto esplicito: marca non salvato e non salva", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");
    const prima = await recordDi(archivio, "Prova Di Contratto");

    await cambiaIlSito(archivio, [{ ...TOUR, prezzo: "150 €" }, ALTRO_TOUR]);
    await clic(qa('[data-elenco="bozze-tour"] li')[0].querySelector("button"));
    await scrivi("Claim", "Testo che non deve sparire.");

    await clic(q('[data-azione="riallinea-fonte"]'));

    // Il riallineamento riuscito è un fatto della bozza: lo pubblica l'hook.
    expect(q("[data-esito]").getAttribute("data-esito")).toBe("fonte-accettata");
    expect(statoLavoro()).toBe("non-salvato");
    // Non ha scritto: sul disco l'istantanea è ancora quella di prima.
    const durante = await recordDi(archivio, "Prova Di Contratto");
    expect(durante.fonte.istantanea).toEqual(prima.fonte.istantanea);

    await premi("Salva");
    const dopo = await recordDi(archivio, "Prova Di Contratto");
    expect(dopo.fonte.istantanea.prezzo).toBe("150 €");
    // Il lavoro editoriale non si perde per aver preso atto del cambiamento.
    expect(dopo.editoriale.claim).toBe("Testo che non deve sparire.");
    // E i fatti restano quelli importati: riallineare non è reimportare.
    expect(dopo.fattuali.prezzo).toBe(prima.fattuali.prezzo);
  });

  /**
   * Una bozza compatibile ma **senza istantanea** — da un backup, o da un
   * record vecchio — non è confrontabile, e il riallineamento è l'unico modo
   * di ripararla. Chiedere l'istantanea anche lì impedirebbe proprio
   * l'operazione capace di ricostruirla.
   */
  it("una fonte senza istantanea non è confrontabile, ma si ripara", async () => {
    const archivio = creaArchivioMemoria();
    await monta({ archivio });
    await creaBozza();
    await premi("Salva");

    // Si toglie l'istantanea dal record, come farebbe un backup vecchio.
    const record = await recordDi(archivio, "Prova Di Contratto");
    await archivio.salva({ ...record, fonte: { ...record.fonte, istantanea: null } });
    await clic(qa('[data-elenco="bozze-tour"] li')[0].querySelector("button"));

    await clic(q('[data-azione="confronta-fonte"]'));
    expect(q("[data-confronto]").getAttribute("data-confronto")).toBe("fonte-non-confrontabile");

    await clic(q('[data-azione="riallinea-fonte"]'));
    expect(q("[data-esito]").getAttribute("data-esito")).toBe("fonte-accettata");
    await premi("Salva");
    expect((await recordDi(archivio, "Prova Di Contratto")).fonte.istantanea).toBeTruthy();
  });
});

/**
 * L'identità incompatibile si prova al confine pubblico.
 *
 * Dall'interfaccia il tour lo si cerca **per slug**, quindi o è il proprio o
 * non c'è: `fonte-non-corrispondente` non è raggiungibile da un clic, ed è una
 * buona notizia. Ma il confine deve rifiutarlo lo stesso — un chiamante futuro,
 * un id passato di mano — e qui si verifica con il pannello vero e l'hook vero,
 * costruendo la sola chiamata.
 */
describe("un tour che non è la fonte viene rifiutato", () => {
  function Banco() {
    const b = useBozzaTour({ urlBase: "https://esempio.test" });
    return (
      <div>
        <button type="button" onClick={() => b.creaDaTour(TOUR)}>
          Crea
        </button>
        <span data-fonte={JSON.stringify(b.contenuto?.fonte?.slug ?? null)} />
        <span data-sporco={b.sporco ? "si" : "no"} />
        {b.contenuto && (
          <FonteTour
            contenuto={b.contenuto}
            tourAttuale={ALTRO_TOUR}
            onConfronta={b.confrontaConLaFonte}
            onRiallinea={b.riallineaAllaFonte}
          />
        )}
      </div>
    );
  }

  it("non si confronta e non si accetta l'istantanea di un altro percorso", async () => {
    await act(async () => {
      radice.render(
        <FornitoreArchivio archivio={creaArchivioMemoria()}>
          <FornitoreTransizione>
            <Banco />
          </FornitoreTransizione>
        </FornitoreArchivio>,
      );
    });
    await respiro();
    await premi("Crea");

    await clic(q('[data-azione="confronta-fonte"]'));
    expect(q("[data-confronto]").getAttribute("data-confronto")).toBe("fonte-non-corrispondente");

    await clic(q('[data-azione="riallinea-fonte"]'));
    expect(q("[data-esito-fonte]").getAttribute("data-esito-fonte")).toBe("fonte-non-corrispondente");
    // E lo slug della bozza non è cambiato.
    expect(q("[data-fonte]").dataset.fonte).toBe(JSON.stringify(TOUR.slug));
  });
});

/* ================================================================== *
 * E. Cronologia e ripristino
 * ================================================================== */

describe("la cronologia e il ritorno indietro", () => {
  const revisioni = () => qa('[data-elenco="revisioni"] [data-revisione]');
  const numeri = () => revisioni().map((r) => Number(r.dataset.revisione));

  /** Porta la bozza a due revisioni: creazione, poi il claim di prima. */
  const conDueRevisioni = async (archivio) => {
    await creaBozza();
    await premi("Salva");
    await scrivi("Claim", "Primo claim.");
    await premi("Salva");
    await scrivi("Claim", "Secondo claim.");
    await premi("Salva");
    return archivio;
  };

  it("mostra le revisioni dalla più recente, con lo stato ripristinabile", async () => {
    const archivio = await monta();
    await conDueRevisioni(archivio);

    expect(numeri()).toEqual([...numeri()].sort((a, b) => b - a));
    // La v1 è il punto di creazione: esiste nella storia, ma non porta stato.
    const v1 = q('[data-revisione="1"]');
    expect(v1.dataset.ripristinabile).toBe("no");
    expect(v1.querySelector("button")).toBeFalsy();
    expect(v1.textContent).toMatch(/non ripristinabile/i);
    // Le successive sì.
    expect(q('[data-revisione="2"]').dataset.ripristinabile).toBe("si");
  });

  it("una revisione non ripristinabile non chiede nemmeno se salvare", async () => {
    const archivio = await monta();
    await conDueRevisioni(archivio);
    await scrivi("Claim", "Lavoro non salvato.");

    // Non c'è pulsante sulla v1: l'ostacolo si riconosce prima del dialogo, e
    // qui si verifica che l'interfaccia non lo offra proprio.
    expect(q('[data-revisione="1"]').querySelector("button")).toBeFalsy();
    expect(dialogo()).toBeFalsy();
    expect(statoLavoro()).toBe("non-salvato");
  });

  it("ripristinare con lavoro sporco passa dal dialogo, e annullare non ripristina", async () => {
    const archivio = await monta();
    await conDueRevisioni(archivio);
    await scrivi("Claim", "Terzo claim, non salvato.");

    await clic(q('[data-revisione="2"] button'));
    expect(dialogo()).toBeTruthy();

    await premi("Annulla");
    expect(campo("Claim").value).toBe("Terzo claim, non salvato.");
    expect(statoLavoro()).toBe("non-salvato");
  });

  it("«Scarta modifiche» ripristina senza archiviare ciò che si è scelto di buttare", async () => {
    const archivio = await monta();
    await conDueRevisioni(archivio);
    await scrivi("Claim", "Da buttare.");

    await clic(q('[data-revisione="3"] button'));
    await premi("Scarta modifiche");
    await assesta();

    /*
     * La v3 conserva lo stato **precedente** al terzo salvataggio, cioè
     * «Primo claim.»: una revisione è il punto a cui si vuole tornare, non lo
     * stato che quel salvataggio ha prodotto.
     */
    expect(campo("Claim").value).toBe("Primo claim.");
    const record = await recordDi(archivio, "Prova Di Contratto");
    const archiviati = record.versioni.map((v) => v.dati?.editoriale?.claim);
    expect(archiviati).not.toContain("Da buttare.");
  });

  /**
   * Il difetto che questa prova esclude: **due** revisioni per un gesto solo.
   *
   * `ripristinaRevisione` registra già la voce «stato prima del ripristino»;
   * il salvataggio che segue deve sapere di non doverne aggiungere un'altra,
   * altrimenti la cronologia raddoppia proprio dove serve leggerla.
   */
  it("un ripristino produce una revisione sola", async () => {
    const archivio = await monta();
    await conDueRevisioni(archivio);
    const prima = (await recordDi(archivio, "Prova Di Contratto")).versioni.length;

    await clic(q('[data-revisione="2"] button'));
    await assesta();

    const dopo = (await recordDi(archivio, "Prova Di Contratto")).versioni;
    expect(dopo.length).toBe(prima + 1);
    expect(dopo.at(-1).etichetta).toMatch(/stato prima del ripristino della v2/);
    expect(q("[data-esito]").getAttribute("data-esito")).toBe("revisione-ripristinata");
    expect(statoLavoro()).toBe("salvato");
  });

  it("una revisione sparita nel frattempo non diventa un successo", async () => {
    const archivio = await monta();
    await conDueRevisioni(archivio);

    // Si toglie la v2 dal record sul disco e si riapre: l'elenco in memoria
    // non la conosce più, e chiederla dev'essere un errore riconoscibile.
    const record = await recordDi(archivio, "Prova Di Contratto");
    await archivio.salva({ ...record, versioni: record.versioni.filter((v) => v.n !== 2) });
    await clic(qa('[data-elenco="bozze-tour"] li')[0].querySelector("button"));

    expect(q('[data-revisione="2"]')).toBeFalsy();
    expect(numeri()).not.toContain(2);
  });
});

/* ================================================================== *
 * F. Eliminazione
 * ================================================================== */

describe("eliminare una bozza chiede due volte", () => {
  const rigaDi = (titolo) =>
    qa('[data-elenco="bozze-tour"] li').find((l) => (l.textContent || "").includes(titolo));
  const conferma = () => q('[data-conferma="due-tempi"]');
  const esitoEliminazione = () =>
    q("[data-esito-eliminazione]")?.getAttribute("data-esito-eliminazione") ?? null;

  const chiediElimina = async (titolo) => {
    await clic(rigaDi(titolo).querySelector('[data-azione="elimina"]'));
  };

  it("il primo gesto non cancella niente, e nomina la bozza", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    await chiediElimina("Prova Di Contratto");

    expect(conferma()).toBeTruthy();
    expect(conferma().textContent).toContain("Prova Di Contratto");
    expect(await archivio.elenca({ categoria: "tour" })).toHaveLength(1);
    // Nessun `window.confirm`: il pannello sta nella pagina e si può leggere.
    expect(conferma().querySelector('[data-azione="conferma"]')).toBeTruthy();
  });

  it("annullare chiude il pannello e lascia tutto dov'è", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    await chiediElimina("Prova Di Contratto");
    await clic(conferma().querySelector('[data-azione="annulla-conferma"]'));

    expect(conferma()).toBeFalsy();
    expect(await archivio.elenca({ categoria: "tour" })).toHaveLength(1);
    expect(esitoEliminazione()).toBeNull();
  });

  /**
   * Il difetto che questa prova esclude: un'eliminazione che passa dal dialogo
   * delle transizioni. Quel dialogo offre «Salva e continua», che qui
   * significherebbe **scrivere proprio la bozza che si sta cancellando**.
   */
  it("la bozza corrente con lavoro non salvato non si elimina, e non si salva", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");
    await scrivi("Claim", "Lavoro non salvato.");

    await chiediElimina("Prova Di Contratto");
    await clic(conferma().querySelector('[data-azione="conferma"]'));

    expect(esitoEliminazione()).toBe("modifiche-non-salvate");
    // Nessun dialogo di transizione: non è quella la strada.
    expect(dialogo()).toBeFalsy();
    // La bozza c'è ancora, e il claim non è finito sul disco.
    expect(await archivio.elenca({ categoria: "tour" })).toHaveLength(1);
    expect((await recordDi(archivio, "Prova Di Contratto")).editoriale.claim).toBe("");
    expect(statoLavoro()).toBe("non-salvato");
    expect(campo("Claim").value).toBe("Lavoro non salvato.");
  });

  it("una bozza diversa si elimina anche con la corrente sporca", async () => {
    const archivio = await monta();
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await scrivi("Claim", "Sporco sulla corrente.");

    await chiediElimina("Seconda Prova");
    await clic(conferma().querySelector('[data-azione="conferma"]'));

    expect(esitoEliminazione()).toBe("eliminata");
    const rimaste = await archivio.elenca({ categoria: "tour" });
    expect(rimaste.map((b) => b.titolo)).toEqual(["Prova Di Contratto"]);
    // Il lavoro sulla corrente è intatto.
    expect(campo("Claim").value).toBe("Sporco sulla corrente.");
    expect(statoLavoro()).toBe("non-salvato");
  });

  it("la corrente pulita si elimina e l'editor si svuota", async () => {
    const archivio = await monta();
    await creaBozza();
    await premi("Salva");

    await chiediElimina("Prova Di Contratto");
    await clic(conferma().querySelector('[data-azione="conferma"]'));

    expect(esitoEliminazione()).toBe("eliminata");
    expect(await archivio.elenca({ categoria: "tour" })).toEqual([]);
    expect(testo()).toMatch(/nessuna bozza aperta/i);
    expect(q('[data-parte="editoriale"]')).toBeFalsy();
    expect(statoLavoro()).toBe("salvato");
  });

  /**
   * L'elenco rimasto indietro **non** è una cancellazione fallita: dire il
   * contrario manderebbe a ripetere un gesto su un record che non c'è più.
   */
  it("con l'elenco che non si rilegge dice eliminata, non fallita", async () => {
    const archivio = creaArchivioMemoria();
    await monta({ archivio });
    await creaBozza();
    await premi("Salva");

    const elencaVera = archivio.elenca.bind(archivio);
    let rompi = false;
    archivio.elenca = async (f) => {
      if (rompi) throw new Error("elenco non disponibile");
      return elencaVera(f);
    };

    await chiediElimina("Prova Di Contratto");
    rompi = true;
    await clic(conferma().querySelector('[data-azione="conferma"]'));

    expect(esitoEliminazione()).toBe("eliminata-elenco-non-aggiornato");
    expect(testo()).toMatch(/è l'elenco a essere rimasto indietro/i);
    rompi = false;
    expect(await archivio.elenca({ categoria: "tour" })).toEqual([]);
  });

  it("eliminare un record già sparito non è una falsa riuscita", async () => {
    const archivio = creaArchivioMemoria();
    await monta({ archivio });
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");
    await creaBozza(TOUR.slug);
    await premi("Salva");

    // «Seconda Prova» sparisce alle spalle dell'interfaccia.
    const elenco = await archivio.elenca({ categoria: "tour" });
    const sparita = elenco.find((b) => b.titolo === "Seconda Prova");
    await archivio.elimina(sparita.id);

    await chiediElimina("Seconda Prova");
    await clic(conferma().querySelector('[data-azione="conferma"]'));

    expect(esitoEliminazione()).toBe("non-una-bozza-tour");
    expect(testo()).not.toMatch(/bozza eliminata\./i);
  });
});

/* ================================================================== *
 * 6.3M.1 — il risultato appartiene agli ingressi che l'hanno prodotto
 * ================================================================== */

/**
 * Il difetto: uno stato locale che sopravvive al proprio contesto.
 *
 * `FonteTour` teneva la risposta del confronto in un `useState` e la disegnava
 * finché non se ne chiedeva un'altra. Cambiando bozza il pannello mostrava già
 * lo slug della nuova — i dati arrivano dalle prop — e **accanto** il verdetto
 * calcolato su quella di prima. Non è un ritardo di un fotogramma: è un
 * risultato che resta lì, e che chi legge attribuisce alla bozza che ha
 * davanti.
 *
 * La stessa cosa vale quando cambia il tour del sito sotto un componente che
 * non viene smontato: la risposta continua a descrivere un'istantanea che
 * nessuno sta più guardando.
 */
describe("il confronto non sopravvive al proprio contesto", () => {
  /** Due bozze salvate, da due tour diversi. Si resta con B aperta. */
  const dueBozze = async () => {
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");
  };

  const confronto = () => q("[data-confronto]")?.getAttribute("data-confronto") ?? null;
  const esitoFonte = () => q("[data-esito]")?.getAttribute("data-esito") ?? null;

  it("confrontata A, aprendo B non resta niente del confronto di A", async () => {
    await monta();
    await dueBozze();
    await apriBozza("Prova Di Contratto");

    await clic(q('[data-azione="confronta-fonte"]'));
    expect(confronto()).toBe("fonte-allineata");

    await apriBozza("Seconda Prova");

    // Il pannello mostra già la fonte di B…
    expect(q("[data-fonte-slug]").textContent).toBe(ALTRO_TOUR.slug);
    // …e non deve mostrare il verdetto calcolato su A.
    expect(confronto()).toBeNull();
    expect(q('[data-elenco="scostamenti"]')).toBeFalsy();
  });

  it("un nuovo confronto su B dà il risultato di B", async () => {
    const archivio = await monta();
    await dueBozze();
    await apriBozza("Prova Di Contratto");
    await clic(q('[data-azione="confronta-fonte"]'));
    await apriBozza("Seconda Prova");

    // Il sito è cambiato **solo** sul tour di B.
    await cambiaIlSito(archivio, [TOUR, { ...ALTRO_TOUR, prezzo: "999 €" }]);
    await apriBozza("Seconda Prova");
    await clic(q('[data-azione="confronta-fonte"]'));

    expect(confronto()).toBe("fonte-cambiata");
    expect(q('[data-scostamento="prezzo"]').textContent).toContain("999 €");
  });

  /**
   * **Senza smontare niente e senza riaprire la bozza.** Rimontare l'albero con
   * un catalogo diverso lascia lo stato di React dov'è: la bozza resta aperta,
   * `FonteTour` resta lo stesso componente, e l'unico ingresso che cambia è il
   * tour. Riaprire la bozza invaliderebbe da sé — la prova non direbbe più
   * niente sul tour.
   */
  it("cambiando il tour del sito la vecchia risposta sparisce, e non si riesegue", async () => {
    const archivio = await monta();
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await clic(q('[data-azione="confronta-fonte"]'));
    expect(confronto()).toBe("fonte-allineata");
    const istantanea = (await recordDi(archivio, "Prova Di Contratto")).fonte.istantanea;

    await cambiaIlSito(archivio, [{ ...TOUR, prezzo: "150 €" }, ALTRO_TOUR]);

    // La bozza non è stata riaperta: è ancora quella, con la stessa istantanea.
    expect(campo("Titolo breve").value).toBe("Prova Di Contratto");
    expect(statoLavoro()).toBe("salvato");
    expect((await recordDi(archivio, "Prova Di Contratto")).fonte.istantanea).toEqual(istantanea);

    // «Allineata» era vero sull'istantanea di prima: adesso non lo è più, e
    // non va lasciato lì. Ma nemmeno si ricalcola da soli: si torna a «non
    // ancora confrontato» finché non lo chiede chi guarda.
    expect(confronto()).toBeNull();

    await clic(q('[data-azione="confronta-fonte"]'));
    expect(confronto()).toBe("fonte-cambiata");
    expect(q('[data-scostamento="prezzo"]').textContent).toContain("150 €");
  });

  /**
   * Il contrario del difetto, e conta quanto il difetto: una risposta ancora
   * vera non va buttata via per un motivo che non la riguarda. Scrivere un
   * claim non tocca né l'identità della bozza né la sua istantanea né il tour.
   */
  it("una modifica editoriale non invalida un confronto ancora valido", async () => {
    await monta();
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await clic(q('[data-azione="confronta-fonte"]'));
    expect(confronto()).toBe("fonte-allineata");

    await scrivi("Claim", "Un testo che non c'entra con la fonte.");
    await scrivi("Kicker", "Nemmeno questo.");

    expect(confronto()).toBe("fonte-allineata");
  });

  /**
   * Un ripristino invalida la risposta **quando riporta un'altra istantanea**.
   *
   * Non sempre: `fonte` non è fra i rami sorvegliati da Version History, quindi
   * nessuna revisione ne porta una copia. Quello che succede è più sottile e
   * altrettanto reale: il ripristino riparte dalla **base sul disco**, e se in
   * memoria c'era un riallineamento non ancora salvato, tornando indietro torna
   * anche l'istantanea vecchia. La risposta calcolata su quella nuova smette di
   * descrivere la bozza, e deve sparire.
   */
  it("un ripristino che riporta l'istantanea persistita invalida la risposta", async () => {
    const archivio = await monta();
    await creaBozza(TOUR.slug);
    await premi("Salva");
    // Una revisione ripristinabile: la v1 è il punto di creazione e non ne ha.
    await scrivi("Claim", "Serve una revisione con uno stato dentro.");
    await premi("Salva");

    // Il sito cambia, si accetta l'istantanea nuova **senza salvare**…
    await cambiaIlSito(archivio, [{ ...TOUR, prezzo: "150 €" }, ALTRO_TOUR]);
    await apriBozza("Prova Di Contratto");
    await clic(q('[data-azione="riallinea-fonte"]'));
    await clic(q('[data-azione="confronta-fonte"]'));
    expect(confronto()).toBe("fonte-allineata");

    // …e si torna indietro: il ripristino riparte dal disco, che porta
    // l'istantanea di prima.
    await clic(q('[data-revisione="2"] button'));
    await premi("Scarta modifiche");
    await assesta();

    expect(confronto()).toBeNull();
  });

  /**
   * Il messaggio del riallineamento **riuscito** non è più uno stato del
   * pannello: lo pubblica l'hook, che è l'autorità su che cosa è successo alla
   * bozza, e che lo azzera alla prima modifica e lo sostituisce aprendone
   * un'altra. Il pannello tiene solo i **rifiuti**, che per definizione non
   * cambiano niente e quindi restano veri finché il contesto è lo stesso.
   */
  it("riallineata A, aprendo B non resta l'esito di A", async () => {
    const archivio = await monta();
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");

    await cambiaIlSito(archivio, [{ ...TOUR, prezzo: "150 €" }, ALTRO_TOUR]);
    await apriBozza("Prova Di Contratto");
    await clic(q('[data-azione="riallinea-fonte"]'));
    expect(esitoFonte()).toBe("fonte-accettata");

    // Il riallineamento ha sporcato la bozza: aprirne un'altra passa dalla
    // protezione, e la si attraversa scartando.
    await apriBozza("Seconda Prova");
    await premi("Scarta modifiche");

    expect(esitoFonte()).toBe("aperta");
    expect(q("[data-esito-fonte]")).toBeFalsy();
    expect(contenitore.textContent).not.toMatch(/istantanea del sito accettata/i);
  });
});

/* ================================================================== *
 * 6.3M.1 — audit: i messaggi di un gesto non sopravvivono al gesto dopo
 * ================================================================== */

/**
 * Lo stesso difetto, trovato rileggendo gli stati locali di 6.3M.
 *
 * `notaTransizione` racconta com'è finita l'ultima transizione, e «Annullato:
 * il lavoro non salvato è ancora qui» è vero finché quel lavoro c'è. Ogni
 * transizione riuscita la sostituisce — ma l'eliminazione **non** passa dalle
 * transizioni, di proposito (§19.15.6), quindi non la toccava: cancellata la
 * bozza, l'editor si svuotava e restava a schermo la promessa che il lavoro non
 * salvato fosse ancora lì.
 *
 * Stessa cosa per l'esito dell'eliminazione, che è il messaggio di un gesto e
 * non uno stato dell'elenco.
 */
describe("i messaggi di un gesto cedono il posto al gesto successivo", () => {
  const rigaDi = (titolo) =>
    qa('[data-elenco="bozze-tour"] li').find((l) => (l.textContent || "").includes(titolo));

  it("eliminata la bozza, non resta «il lavoro non salvato è ancora qui»", async () => {
    await monta();
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");
    await apriBozza("Prova Di Contratto");

    // Si sporca, si prova a cambiare bozza e si annulla: la nota compare.
    await scrivi("Claim", "Lavoro non salvato.");
    await apriBozza("Seconda Prova");
    await premi("Annulla");
    expect(testo()).toMatch(/il lavoro non salvato è ancora qui/i);

    // Si salva e si elimina la bozza corrente: adesso non c'è più niente.
    await premi("Salva");
    await clic(rigaDi("Prova Di Contratto").querySelector('[data-azione="elimina"]'));
    await clic(q('[data-azione="conferma"]'));

    expect(testo()).toMatch(/nessuna bozza aperta/i);
    expect(testo()).not.toMatch(/il lavoro non salvato è ancora qui/i);
  });

  it("l'esito di un'eliminazione non resta sotto il gesto successivo", async () => {
    await monta();
    await creaBozza(TOUR.slug);
    await premi("Salva");
    await creaBozza(ALTRO_TOUR.slug);
    await premi("Salva");

    // Si elimina una bozza che non è quella aperta.
    await clic(rigaDi("Prova Di Contratto").querySelector('[data-azione="elimina"]'));
    await clic(q('[data-azione="conferma"]'));
    expect(q("[data-esito-eliminazione]").getAttribute("data-esito-eliminazione")).toBe("eliminata");

    // Poi si fa altro: quel messaggio ha finito il suo compito.
    await creaBozza(TOUR.slug);

    expect(q("[data-esito-eliminazione]")).toBeFalsy();
    expect(testo()).not.toMatch(/bozza eliminata\./i);
  });
});

/**
 * Il contratto del pannello, da solo.
 *
 * Nell'editor due bozze non condividono mai l'oggetto `fonte` — ogni lettura
 * dall'archivio ne produce uno nuovo — quindi l'identità della bozza sembra
 * ridondante. Non lo è: è ciò che rende la regola vera **per costruzione**
 * invece che per una proprietà dell'archivio che nessuno ha promesso. Qui le
 * due bozze condividono l'oggetto apposta, ed è l'unica cosa che le distingue.
 */
describe("il pannello lega la risposta anche all'identità della bozza", () => {
  const FONTE_CONDIVISA = Object.freeze({
    tipo: "tour",
    slug: TOUR.slug,
    istantanea: Object.freeze({ nome: TOUR.name, prezzo: TOUR.prezzo }),
    importatoIl: "2026-01-01T00:00:00.000Z",
  });

  const bozza = (id) => ({ id, categoria: "tour", fonte: FONTE_CONDIVISA });

  function Banco({ id }) {
    return (
      <FonteTour
        contenuto={bozza(id)}
        tourAttuale={TOUR}
        onConfronta={() => ({ codice: "fonte-allineata", allineato: true, scostamenti: [] })}
        onRiallinea={() => ({ codice: "fonte-accettata" })}
      />
    );
  }

  it("cambiando bozza la risposta sparisce anche a parità di fonte e di tour", async () => {
    await act(async () => {
      radice.render(<Banco id="bozza-a" />);
    });
    await respiro();

    await clic(q('[data-azione="confronta-fonte"]'));
    expect(q("[data-confronto]").getAttribute("data-confronto")).toBe("fonte-allineata");

    // Stesso oggetto `fonte`, stesso tour: cambia solo l'identità della bozza.
    await act(async () => {
      radice.render(<Banco id="bozza-b" />);
    });
    await respiro();

    expect(q("[data-confronto]")).toBeFalsy();
  });
});
