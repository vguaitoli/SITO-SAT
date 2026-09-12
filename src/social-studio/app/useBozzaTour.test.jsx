import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBozzaTour, CODICI } from "./useBozzaTour";
import { FornitoreArchivio } from "./ContestoArchivio";
import { FornitoreTransizione, ESITI } from "./transizione";
import { creaArchivioMemoria } from "../fondamenta/archivio";
import { editorPerRubrica, statoRubrica } from "./registro-editor";

/**
 * Il ciclo delle bozze TOUR, senza interfaccia.
 *
 * Si monta l'hook sotto i fornitori veri e si guarda il **dato**: che cosa
 * finisce nell'archivio, che cosa resta in memoria, che cosa succede quando una
 * risposta arriva tardi. I codici di esito si controllano perché sono parte del
 * contratto; i testi non esistono ancora, ed è giusto così.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Un tour sintetico: nessun dato operativo reale, nessun nome vero. */
const TOUR = {
  slug: "prova-di-contratto",
  name: "Prova di Contratto",
  type: "Enduro",
  date: "2026-05-01T00:00:00.000Z",
  descrizione: "Testo di prova.",
  prezzo: "100 €",
  km: "50 km",
  durata: "1 giorno",
  livello: "Facile",
};
const ALTRO_TOUR = { ...TOUR, slug: "seconda-prova", name: "Seconda Prova" };

let contenitore;
let radice;
let canale;

beforeEach(() => {
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
  canale = { api: null };
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

function Prova() {
  canale.api = useBozzaTour({ urlBase: "https://esempio.test" });
  return null;
}

async function monta(archivio = creaArchivioMemoria()) {
  await act(async () => {
    radice.render(
      <FornitoreArchivio archivio={archivio}>
        <FornitoreTransizione>
          <Prova />
        </FornitoreTransizione>
      </FornitoreArchivio>,
    );
  });
  await respiro();
  return archivio;
}

const respiro = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Una promessa che risolve o rigetta quando lo decide la prova. */
const rinviata = () => {
  let risolvi;
  let rigetta;
  const promessa = new Promise((ris, rig) => {
    risolvi = ris;
    rigetta = rig;
  });
  promessa.catch(() => {});
  return { promessa, risolvi, rigetta };
};

/** Un archivio che sa fermarsi o rompersi su un metodo, una volta sola. */
function archivioPilotabile() {
  const archivio = creaArchivioMemoria();
  const veri = {
    salva: archivio.salva.bind(archivio),
    leggi: archivio.leggi.bind(archivio),
    elenca: archivio.elenca.bind(archivio),
  };
  const scritture = [];
  const soste = { salva: null, leggi: null, elenca: null };
  const rompi = { salva: false, leggi: false, elenca: false };
  // `nullo.leggi` simula un record che non c'è più: la lettura riesce, ma non
  // restituisce niente. È un fallimento diverso da un rigetto.
  const nullo = { leggi: false };

  for (const nome of ["salva", "leggi", "elenca"]) {
    archivio[nome] = async (...args) => {
      if (nome === "salva") scritture.push(args[0]?.id ?? null);
      const sosta = soste[nome];
      if (sosta) {
        soste[nome] = null;
        await sosta.promessa;
      }
      if (rompi[nome]) throw new Error(`${nome} non disponibile`);
      if (nome === "leggi" && nullo.leggi) return null;
      return veri[nome](...args);
    };
  }

  return {
    archivio,
    scritture,
    rompi,
    nullo,
    /** Legge dal disco scavalcando i guasti simulati. */
    leggiDavvero: veri.leggi,
    fermaProssima(nome) {
      const sosta = rinviata();
      soste[nome] = sosta;
      return sosta;
    },
  };
}

const dialogo = () => contenitore.querySelector('[data-transizione="dialogo"]');
const bottone = (testo) =>
  [...contenitore.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === testo);

describe("creare una bozza da un tour", () => {
  it("importa i fatti pubblicati e lascia vuoto ciò che il sito non dichiara", async () => {
    await monta();
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    const c = canale.api.contenuto;
    expect(c.categoria).toBe("tour");
    expect(c.formato).toBe("post");
    expect(c.fattuali.nome).toBe("Prova di Contratto");
    expect(c.fonte.tipo).toBe("tour");
    expect(c.fonte.slug).toBe("prova-di-contratto");
    // I campi che il sito non espone con semantica affidabile restano vuoti.
    expect(c.fattuali.area).toBe("");
    expect(c.fattuali.mezzo).toBe("");
    expect(c.fattuali.partenza).toBe("");
    expect(c.fattuali.dataFine).toBe("");
    // Non si importano claim: appartengono alla categoria, non al tour.
    expect(c.editoriale.claim).toBe("");
    // Nasce non salvata.
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.esito.codice).toBe(CODICI.creata);
  });

  it("non muta il tour ricevuto", async () => {
    await monta();
    const prima = JSON.stringify(TOUR);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    expect(JSON.stringify(TOUR)).toBe(prima);
  });

  it("scrivere un fatto a mano lo stacca dal sito; scrivere un testo no", async () => {
    await monta();
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    expect(canale.api.contenuto.fattuali.origine.nome).toBe("sito");

    await act(async () => {
      canale.api.scriviFattuale("mezzo", "Moto");
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Testo scritto a mano");
    });

    const c = canale.api.contenuto;
    expect(c.fattuali.mezzo).toBe("Moto");
    expect(c.fattuali.origine.mezzo).toBe("manuale");
    expect(c.editoriale.claim).toBe("Testo scritto a mano");
    // I testi non sono fatti: non entrano in `origine`.
    expect(c.fattuali.origine.claim).toBeUndefined();
    // E un fatto scritto a mano non tocca l'origine degli altri.
    expect(c.fattuali.origine.nome).toBe("sito");
  });
});

describe("salvare e riaprire", () => {
  it("salva, rilegge e registra una revisione", async () => {
    const archivio = await monta();
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Prima stesura");
    });

    let riletto;
    await act(async () => {
      riletto = await canale.api.salva();
    });
    await respiro();

    expect(riletto).toBeTruthy();
    expect(canale.api.sporco).toBe(false);
    expect(canale.api.esito.codice).toBe(CODICI.salvata);
    // Il dato è davvero sul disco, ed è quello riletto.
    const sul = await archivio.leggi(riletto.id);
    expect(sul.editoriale.claim).toBe("Prima stesura");
    expect(sul.categoria).toBe("tour");
    expect(sul.versioni).toHaveLength(1);
    // L'elenco è aggiornato.
    expect(canale.api.bozze.map((b) => b.id)).toContain(riletto.id);
  });

  it("l'elenco mostra solo bozze tour", async () => {
    const archivio = await monta();
    await archivio.salva({
      ...(await import("../fondamenta/schema")).contenutoVuoto({
        categoria: "eventi",
        formato: "post",
      }),
      titolo: "Una bozza EVENTI",
    });
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    expect(canale.api.bozze).toHaveLength(1);
    expect(canale.api.bozze[0].id).toBe(canale.api.contenuto.id);
  });

  it("aprire un id EVENTI è rifiutato e non sostituisce il lavoro", async () => {
    const archivio = await monta();
    const { contenutoVuoto } = await import("../fondamenta/schema");
    const idEventi = await archivio.salva({
      ...contenutoVuoto({ categoria: "eventi", formato: "post" }),
      titolo: "Una bozza EVENTI",
    });

    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Lavoro in corso");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const idTour = canale.api.contenuto.id;

    let esito;
    await act(async () => {
      esito = await canale.api.apri(idEventi);
    });
    await respiro();

    expect(esito.esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.nonUnaBozzaTour);
    // Il lavoro corrente è intatto.
    expect(canale.api.contenuto.id).toBe(idTour);
    expect(canale.api.contenuto.editoriale.claim).toBe("Lavoro in corso");
  });
});

describe("sostituire il lavoro non salvato", () => {
  it("«Annulla» conserva contenuto e identità", async () => {
    await monta();
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Non perdermi");
    });
    const id = canale.api.contenuto.id;

    let promessa;
    act(() => {
      promessa = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();

    await act(async () => {
      bottone("Annulla").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.annullato);
    expect(canale.api.contenuto.id).toBe(id);
    expect(canale.api.contenuto.editoriale.claim).toBe("Non perdermi");
    expect(canale.api.sporco).toBe(true);
  });

  it("«Scarta modifiche» passa all'altro tour senza scrivere", async () => {
    const { archivio, scritture } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    let promessa;
    act(() => {
      promessa = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.fonte.slug).toBe("seconda-prova");
    expect(scritture).toHaveLength(0);
    expect(await archivio.elenca({ categoria: "tour" })).toHaveLength(0);
  });

  it("«Salva e continua» salva il primo e apre il secondo", async () => {
    const { archivio, scritture } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    let promessa;
    act(() => {
      promessa = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.fonte.slug).toBe("seconda-prova");
    // Una scrittura sola, e quello che è sul disco è il primo tour.
    expect(scritture).toHaveLength(1);
    const salvate = await archivio.elenca({ categoria: "tour" });
    expect(salvate).toHaveLength(1);
    expect((await archivio.leggi(salvate[0].id)).fonte.slug).toBe("prova-di-contratto");
  });

  it("un salvataggio che fallisce non lascia procedere", async () => {
    const { archivio, rompi } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    rompi.salva = true;
    act(() => {
      canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();

    // Il dialogo resta, il lavoro pure.
    expect(dialogo()).toBeTruthy();
    expect(canale.api.contenuto.fonte.slug).toBe("prova-di-contratto");
    expect(canale.api.esito.codice).toBe(CODICI.erroreScrittura);
  });

  it("una seconda richiesta mentre il dialogo è aperto è «occupato»", async () => {
    await monta();
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    act(() => {
      canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();

    let secondo;
    await act(async () => {
      secondo = await canale.api.apri("qualunque-id");
    });
    expect(secondo.esito).toBe(ESITI.occupato);
    expect(contenitore.querySelectorAll('[data-transizione="dialogo"]')).toHaveLength(1);
  });
});

describe("corse asincrone", () => {
  it("scrivere durante la lettura non fa applicare la bozza letta", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const primo = canale.api.contenuto.id;

    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sosta = fermaProssima("leggi");
    let promessa;
    act(() => {
      promessa = canale.api.apri(primo);
    });
    await respiro();
    // Mentre la lettura è in volo si scrive.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Scritto durante la lettura");
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.superataDaModifiche);
    // Quello che si è scritto è ancora qui, e la bozza letta non l'ha coperto.
    expect(canale.api.contenuto.editoriale.claim).toBe("Scritto durante la lettura");
    expect(canale.api.contenuto.id).not.toBe(primo);
  });

  it("scrivere durante il salvataggio non dichiara pulito il lavoro", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    const sosta = fermaProssima("salva");
    let promessa;
    act(() => {
      promessa = canale.api.salva();
    });
    await respiro();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Arrivata dopo");
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessa).toBeNull();
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.esito.codice).toBe(CODICI.superataDaModifiche);
    expect(canale.api.contenuto.editoriale.claim).toBe("Arrivata dopo");
  });

  it("scrivere durante l'aggiornamento dell'elenco non dichiara pulito il lavoro", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    // Scrittura e rilettura passano; si ferma l'ultima attesa.
    const sosta = fermaProssima("elenca");
    let promessa;
    act(() => {
      promessa = canale.api.salva();
    });
    await respiro();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Arrivata all'ultimo");
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessa).toBeNull();
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.esito.codice).toBe(CODICI.superataDaModifiche);
    expect(canale.api.contenuto.editoriale.claim).toBe("Arrivata all'ultimo");
  });

  it("due salvataggi per lo stesso gesto scrivono una volta sola", async () => {
    const { archivio, scritture, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    const sosta = fermaProssima("salva");
    let a;
    let b;
    act(() => {
      a = canale.api.salva();
      b = canale.api.salva();
    });
    expect(scritture).toHaveLength(1);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await a).toBeTruthy();
    expect(await b).toBe(await a);
    expect(scritture).toHaveLength(1);
    expect((await archivio.leggi(canale.api.contenuto.id)).versioni).toHaveLength(1);
  });

  it("un errore di lettura è un esito, non una rejection scoperta", async () => {
    const { archivio, rompi } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    rompi.leggi = true;
    let esito;
    await act(async () => {
      esito = await canale.api.apri(id);
    });
    await respiro();

    expect(esito.esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.erroreLettura);
    expect(canale.api.contenuto.id).toBe(id);
  });

  it("smontare mentre si salva non lascia effetti tardivi", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    const sosta = fermaProssima("salva");
    let promessa;
    act(() => {
      promessa = canale.api.salva();
    });
    await respiro();

    act(() => radice.unmount());
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });

    expect(await promessa).toBeNull();
    // Rimontare per l'`afterEach`, che smonta di nuovo.
    radice = createRoot(contenitore);
  });

  it("smontare mentre si aggiorna l'elenco non dichiara salvato", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    // Scrittura e rilettura passano: si smonta durante l'ultima attesa.
    const sosta = fermaProssima("elenca");
    let promessa;
    act(() => {
      promessa = canale.api.salva();
    });
    await respiro();

    act(() => radice.unmount());
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });

    // Nessun «salvata» annunciato a un albero che non c'è più.
    expect(await promessa).toBeNull();
    radice = createRoot(contenitore);
  });
});

describe("TOUR resta chiusa", () => {
  it("i registri veri non la rendono disponibile", () => {
    expect(statoRubrica("tour")).toBe("pianificata");
    expect(editorPerRubrica("tour")).toBeNull();
  });
});

describe("l'elenco che non si aggiorna dopo un salvataggio", () => {
  it("non annulla la scrittura, e lo dice per quello che è", async () => {
    const { archivio, rompi } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Sul disco davvero");
    });

    rompi.elenca = true;
    let riletto;
    await act(async () => {
      riletto = await canale.api.salva();
    });
    await respiro();
    rompi.elenca = false;

    // La scrittura è riuscita: il record torna, e il lavoro è pulito.
    expect(riletto).toBeTruthy();
    expect(canale.api.sporco).toBe(false);
    // Ma non si annuncia «salvata» come se tutto fosse andato: è l'elenco.
    expect(canale.api.esito.codice).toBe(CODICI.erroreElenco);
    // E il dato è davvero sul disco.
    const sul = await archivio.leggi(riletto.id);
    expect(sul.editoriale.claim).toBe("Sul disco davvero");
  });
});

/** Raccoglie le rejection non gestite prodotte dal corpo. */
async function rejectionNonGestite(corpo) {
  const viste = [];
  const cattura = (e) => viste.push(e);
  process.on("unhandledRejection", cattura);
  try {
    await corpo();
    await new Promise((r) => setImmediate(r));
  } finally {
    process.off("unhandledRejection", cattura);
  }
  return viste;
}

/** I claim conservati dalle revisioni, nell'ordine. */
const claimStorici = (record) => record.versioni.map((v) => v.dati?.editoriale?.claim ?? null);

/**
 * Una scrittura superata lascia comunque qualcosa sul disco.
 *
 * È il punto in cui è facile perdere la storia: la scrittura riesce, ma il
 * lavoro corrente è già più avanti, e restituire `null` non basta. Se il
 * tentativo successivo riparte dalla catena di revisioni vecchia,
 * `archivio.salva` sostituisce l'intero record e lo stato intermedio — che
 * *era* sul disco — sparisce senza essere diventato una revisione.
 */
describe("la storia dopo una scrittura superata", () => {
  it("conserva lo stato intermedio come revisione ripristinabile", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "A");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    // B: si modifica e si avvia una scrittura che resta in volo.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "B");
    });
    const sosta = fermaProssima("salva");
    let prima;
    act(() => {
      prima = canale.api.salva();
    });
    await respiro();
    // C: si scrive ancora mentre B è in volo.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await prima).toBeNull();
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.esito.codice).toBe(CODICI.superataDaModifiche);
    expect(canale.api.contenuto.editoriale.claim).toBe("C");
    // In questo momento sul disco c'è B.
    expect((await archivio.leggi(id)).editoriale.claim).toBe("B");

    // Secondo salvataggio, su C.
    let secondo;
    await act(async () => {
      secondo = await canale.api.salva();
    });
    await respiro();

    expect(secondo).toBeTruthy();
    const sul = await archivio.leggi(id);
    expect(sul.editoriale.claim).toBe("C");
    expect(canale.api.sporco).toBe(false);
    // Né A né B sono spariti: sono revisioni, e la numerazione è coerente.
    const storici = claimStorici(sul);
    expect(storici).toContain("A");
    expect(storici).toContain("B");
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
  });

  it("vale anche per una bozza mai salvata prima", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "B");
    });

    const sosta = fermaProssima("salva");
    let prima;
    act(() => {
      prima = canale.api.salva();
    });
    await respiro();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await prima).toBeNull();
    const id = canale.api.contenuto.id;
    expect((await archivio.leggi(id)).editoriale.claim).toBe("B");

    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sul = await archivio.leggi(id);
    expect(sul.editoriale.claim).toBe("C");
    // La prima scrittura non è stata cancellata: B è ripristinabile.
    expect(claimStorici(sul)).toContain("B");
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
  });

  it("se cambia identità, base e storia non passano all'altra bozza", async () => {
    const { archivio, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Prima bozza");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const primo = canale.api.contenuto.id;
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Modifica in volo");
    });

    const sosta = fermaProssima("salva");
    let prima;
    act(() => {
      prima = canale.api.salva();
    });
    await respiro();

    // Mentre la scrittura è in volo si passa a un'altra bozza, scartando.
    act(() => {
      canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await prima).toBeNull();
    expect(canale.api.esito.codice).toBe(CODICI.superataDaAltroContenuto);
    const secondo = canale.api.contenuto.id;
    expect(secondo).not.toBe(primo);
    // La nuova bozza non ha ereditato nulla della storia dell'altra.
    expect(canale.api.contenuto.versioni).toHaveLength(0);

    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const sul = await archivio.leggi(secondo);
    expect(sul.versioni).toHaveLength(1);
    expect(claimStorici(sul)).toEqual([null]);
  });
});

describe("i contratti pubblici sono davvero tali", () => {
  it("«ricarica» chiamata da fuori non rigetta: riporta un esito", async () => {
    const { archivio, rompi } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Intatto");
    });

    rompi.elenca = true;
    let esitoRicarica;
    const scoperte = await rejectionNonGestite(async () => {
      await act(async () => {
        esitoRicarica = await canale.api.ricarica();
      });
      await respiro();
    });
    rompi.elenca = false;

    expect(scoperte).toHaveLength(0);
    expect(esitoRicarica.codice).toBe(CODICI.erroreElenco);
    expect(canale.api.esito.codice).toBe(CODICI.erroreElenco);
    // Il lavoro non è cambiato.
    expect(canale.api.contenuto.editoriale.claim).toBe("Intatto");
    expect(canale.api.sporco).toBe(true);
  });

  it("due «salva» nello stesso giro sono la stessa promessa", async () => {
    const { archivio, scritture, fermaProssima } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    const sosta = fermaProssima("salva");
    let a;
    let b;
    act(() => {
      a = canale.api.salva();
      b = canale.api.salva();
    });
    // Identiche, non soltanto equivalenti: è ciò che garantisce una scrittura.
    expect(a).toBe(b);
    expect(scritture).toHaveLength(1);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();
    expect(scritture).toHaveLength(1);
    expect((await archivio.leggi(canale.api.contenuto.id)).versioni).toHaveLength(1);
  });

  it("una scrittura fallita libera il blocco, e si può riprovare", async () => {
    const { archivio, scritture, rompi } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    rompi.salva = true;
    await act(async () => {
      expect(await canale.api.salva()).toBeNull();
    });
    await respiro();
    expect(canale.api.esito.codice).toBe(CODICI.erroreScrittura);

    rompi.salva = false;
    await act(async () => {
      expect(await canale.api.salva()).toBeTruthy();
    });
    await respiro();
    expect(scritture).toHaveLength(2);
    expect(canale.api.sporco).toBe(false);
  });
});

/**
 * Una scrittura confermata ma non riletta è il caso più insidioso.
 *
 * `archivio.salva` ha restituito un id: sul disco quel record c'è. Se però la
 * rilettura fallisce, in memoria restano la base e la catena di **prima**, e
 * riscriverci sopra sostituirebbe lo stato appena persistito facendolo sparire
 * dalla storia. Non basta distinguere i due errori: bisogna impedire la
 * sovrascrittura finché la base non è stata recuperata.
 */
describe("rilettura fallita dopo una scrittura riuscita", () => {
  it("non lascia che il salvataggio successivo cancelli lo stato persistito", async () => {
    const { archivio, rompi, leggiDavvero } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "A");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    // B: la scrittura riesce davvero, fallisce soltanto la rilettura.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "B");
    });
    rompi.leggi = true;
    let esitoB;
    await act(async () => {
      esitoB = await canale.api.salva();
    });
    await respiro();

    expect(esitoB).toBeNull();
    expect(canale.api.sporco).toBe(true);
    // B è sul disco: lo si verifica con il metodo vero, non con quello guasto.
    expect((await leggiDavvero(id)).editoriale.claim).toBe("B");

    // C, e poi si riprova con la lettura tornata a funzionare.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    rompi.leggi = false;
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sul = await leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("C");
    expect(canale.api.sporco).toBe(false);
    // Né A né B sono spariti, senza doppioni e con numerazione coerente.
    const storici = claimStorici(sul);
    expect(storici).toContain("A");
    expect(storici).toContain("B");
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
  });

  it("vale anche al primo salvataggio di una bozza nuova", async () => {
    const { archivio, rompi, leggiDavvero } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "B");
    });

    rompi.leggi = true;
    await act(async () => {
      expect(await canale.api.salva()).toBeNull();
    });
    await respiro();
    const id = canale.api.contenuto.id;
    expect((await leggiDavvero(id)).editoriale.claim).toBe("B");

    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    rompi.leggi = false;
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sul = await leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("C");
    expect(claimStorici(sul)).toContain("B");
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
  });

  it("una rilettura che torna vuota è trattata come fallita", async () => {
    const { archivio, nullo, leggiDavvero } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "B");
    });

    nullo.leggi = true;
    await act(async () => {
      expect(await canale.api.salva()).toBeNull();
    });
    await respiro();
    const id = canale.api.contenuto.id;
    expect(canale.api.sporco).toBe(true);

    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    nullo.leggi = false;
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sul = await leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("C");
    expect(claimStorici(sul)).toContain("B");
  });

  it("se il recupero fallisce ancora non si sovrascrive, e «Salva e continua» non passa", async () => {
    const { archivio, scritture, rompi, leggiDavvero } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "B");
    });

    rompi.leggi = true;
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;
    const scrittureDopoB = scritture.length;

    // Si scrive C e si riprova, ma la lettura è ancora guasta.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    await act(async () => {
      expect(await canale.api.salva()).toBeNull();
    });
    await respiro();

    // Nessuna sovrascrittura: sul disco c'è ancora B.
    expect(scritture).toHaveLength(scrittureDopoB);
    expect((await leggiDavvero(id)).editoriale.claim).toBe("B");
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.contenuto.editoriale.claim).toBe("C");

    // E la guardia non lascia passare una transizione.
    act(() => {
      canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    expect(canale.api.contenuto.editoriale.claim).toBe("C");

    // Tornata la lettura, si riprova e stavolta passa.
    await act(async () => {
      bottone("Annulla").click();
    });
    await respiro();
    rompi.leggi = false;
    await act(async () => {
      expect(await canale.api.salva()).toBeTruthy();
    });
    await respiro();
    expect((await leggiDavvero(id)).editoriale.claim).toBe("C");
  });

  it("cambiando bozza il debito non blocca l'altra identità", async () => {
    const { archivio, rompi, leggiDavvero } = archivioPilotabile();
    await monta(archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "B");
    });

    rompi.leggi = true;
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const primo = canale.api.contenuto.id;

    // Si passa a un'altra bozza scartando, poi la lettura torna a funzionare.
    act(() => {
      canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();
    rompi.leggi = false;

    const secondo = canale.api.contenuto.id;
    expect(secondo).not.toBe(primo);
    await act(async () => {
      expect(await canale.api.salva()).toBeTruthy();
    });
    await respiro();

    // La nuova bozza si salva senza ereditare nulla dall'altra.
    const sul = await leggiDavvero(secondo);
    expect(sul.versioni).toHaveLength(1);
    expect(claimStorici(sul)).toEqual([null]);
    // E l'altra è rimasta a B, intatta.
    expect((await leggiDavvero(primo)).editoriale.claim).toBe("B");
  });
});

/** Porta una bozza allo stato «scritta sul disco ma non riletta». */
async function conDebitoDiRecupero(pilot, claim = "B") {
  await act(async () => {
    await canale.api.creaDaTour(TOUR);
  });
  await act(async () => {
    canale.api.scriviEditoriale("claim", "A");
  });
  await act(async () => {
    await canale.api.salva();
  });
  await respiro();
  const id = canale.api.contenuto.id;
  await act(async () => {
    canale.api.scriviEditoriale("claim", claim);
  });
  pilot.rompi.leggi = true;
  await act(async () => {
    await canale.api.salva();
  });
  await respiro();
  pilot.rompi.leggi = false;
  return id;
}

/** Risponde al dialogo della guardia. */
async function rispondiAlDialogo(testo) {
  await respiro();
  expect(dialogo()).toBeTruthy();
  await act(async () => {
    bottone(testo).click();
  });
  await respiro();
}

/**
 * Il recupero appartiene alla bozza per cui è iniziato.
 *
 * Fra l'avvio del recupero e la sua risposta si può cambiare bozza: adottare
 * allora la base recuperata significherebbe travasare la storia di una in
 * un'altra, e — peggio — scrivere quell'altra senza che nessuno l'abbia
 * chiesto. `archivio.salva` sostituisce l'intero record, quindi la bozza
 * arrivata dopo perderebbe la propria Version History.
 */
describe("la corsa del recupero", () => {
  it("passare a una bozza nuova durante il recupero non la contamina", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const idX = await conDebitoDiRecupero(pilot);

    // Il prossimo `leggi` è quello di recupero: si ferma lì.
    const sosta = pilot.fermaProssima("leggi");
    let promessaX;
    act(() => {
      promessaX = canale.api.salva();
    });
    await respiro();

    act(() => {
      canale.api.creaDaTour(ALTRO_TOUR);
    });
    await rispondiAlDialogo("Scarta modifiche");
    const idY = canale.api.contenuto.id;
    const scrittureDopoY = pilot.scritture.length;

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessaX).toBeNull();
    // Nessuna scrittura: Y non è stata salvata da un gesto che non c'è stato.
    expect(pilot.scritture).toHaveLength(scrittureDopoY);
    expect(canale.api.contenuto.id).toBe(idY);
    // Y non ha ereditato la storia di X, ed è ancora da salvare.
    expect(canale.api.contenuto.versioni).toHaveLength(0);
    expect(canale.api.sporco).toBe(true);

    // Salvando Y adesso, si registra solo la sua revisione di creazione.
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const sulY = await pilot.leggiDavvero(idY);
    expect(sulY.versioni).toHaveLength(1);
    expect(claimStorici(sulY)).toEqual([null]);
    // E X è rimasta com'era sul disco.
    expect((await pilot.leggiDavvero(idX)).editoriale.claim).toBe("B");
  });

  it("aprire durante il recupero una bozza con storia propria non la altera", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);

    // Y esiste già, con una storia sua.
    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Y1");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const idY = canale.api.contenuto.id;
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Y2");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const primaDiY = await pilot.leggiDavvero(idY);
    expect(primaDiY.versioni).toHaveLength(2);

    const idX = await conDebitoDiRecupero(pilot);

    const sosta = pilot.fermaProssima("leggi");
    let promessaX;
    act(() => {
      promessaX = canale.api.salva();
    });
    await respiro();

    act(() => {
      canale.api.apri(idY);
    });
    await rispondiAlDialogo("Scarta modifiche");
    expect(canale.api.contenuto.id).toBe(idY);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessaX).toBeNull();
    // Sul disco Y è esattamente quella di prima: nessuna revisione persa,
    // nessuna revisione di X entrata dentro.
    const dopoDiY = await pilot.leggiDavvero(idY);
    expect(dopoDiY.versioni).toHaveLength(2);
    expect(claimStorici(dopoDiY)).toEqual(claimStorici(primaDiY));
    expect(dopoDiY.editoriale.claim).toBe("Y2");
    expect((await pilot.leggiDavvero(idX)).editoriale.claim).toBe("B");
  });

  it("riaprire lo stesso id durante il recupero non fa salvare la nuova sessione", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const idX = await conDebitoDiRecupero(pilot);

    const sosta = pilot.fermaProssima("leggi");
    let promessaX;
    act(() => {
      promessaX = canale.api.salva();
    });
    await respiro();

    // Si abbandona X, poi la si riapre: stesso id, sessione diversa.
    act(() => {
      canale.api.creaDaTour(ALTRO_TOUR);
    });
    await rispondiAlDialogo("Scarta modifiche");
    act(() => {
      canale.api.apri(idX);
    });
    await rispondiAlDialogo("Scarta modifiche");
    expect(canale.api.contenuto.id).toBe(idX);
    const scrittureDopo = pilot.scritture.length;

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessaX).toBeNull();
    // La vecchia operazione non ha scritto la sessione nuova.
    expect(pilot.scritture).toHaveLength(scrittureDopo);
    expect((await pilot.leggiDavvero(idX)).editoriale.claim).toBe("B");
  });

  it("restando sulla stessa bozza, il recupero conserva le battiture più recenti", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const idX = await conDebitoDiRecupero(pilot);

    const sosta = pilot.fermaProssima("leggi");
    let promessaX;
    act(() => {
      promessaX = canale.api.salva();
    });
    await respiro();

    // Si scrive mentre il recupero è in volo, senza cambiare bozza.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessaX).toBeTruthy();
    expect(canale.api.sporco).toBe(false);
    const sul = await pilot.leggiDavvero(idX);
    // Si scrive l'ultima battitura, e la storia tiene sia A sia B.
    expect(sul.editoriale.claim).toBe("C");
    const storici = claimStorici(sul);
    expect(storici).toContain("A");
    expect(storici).toContain("B");
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
  });

  it("smontare durante il recupero non lascia effetti tardivi", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const idX = await conDebitoDiRecupero(pilot);

    const sosta = pilot.fermaProssima("leggi");
    let promessaX;
    act(() => {
      promessaX = canale.api.salva();
    });
    await respiro();
    const scrittureDopo = pilot.scritture.length;

    act(() => radice.unmount());
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });

    expect(await promessaX).toBeNull();
    expect(pilot.scritture).toHaveLength(scrittureDopo);
    expect((await pilot.leggiDavvero(idX)).editoriale.claim).toBe("B");
    radice = createRoot(contenitore);
  });
});

/** Monta l'hook dentro `StrictMode`, che invoca render e updater due volte. */
async function montaSevero(archivio = creaArchivioMemoria()) {
  await act(async () => {
    radice.render(
      <React.StrictMode>
        <FornitoreArchivio archivio={archivio}>
          <FornitoreTransizione>
            <Prova />
          </FornitoreTransizione>
        </FornitoreArchivio>
      </React.StrictMode>,
    );
  });
  await respiro();
  return archivio;
}

/**
 * La finestra prima del render.
 *
 * Fra una modifica e l'operazione che la segue, nello stesso giro, React non ha
 * ancora ridisegnato: lo stato è quello di prima. Un'operazione imperativa che
 * legge lo stato — e non un riferimento aggiornato subito — lavora quindi su
 * dati vecchi, e il contatore delle modifiche, già incrementato, la fa passare
 * per buona. È la finestra in cui si perde lavoro senza nemmeno un avviso.
 */
describe("modificare e agire nello stesso giro", () => {
  it("salvare subito dopo aver scritto persiste quello che si è scritto", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    // Nessun respiro fra le due chiamate: è proprio quello il punto.
    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "B");
      promessa = canale.api.salva();
    });
    await respiro();

    const riletto = await promessa;
    expect(riletto).toBeTruthy();
    expect(riletto.editoriale.claim).toBe("B");
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("B");
    expect(canale.api.contenuto.editoriale.claim).toBe("B");
    // Pulito solo perché B è davvero sul disco.
    expect(canale.api.sporco).toBe(false);
  });

  it("più modifiche di fila, testi e fatti, arrivano tutte sul disco", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "Claim nuovo");
      canale.api.scriviEditoriale("kicker", "Kicker nuovo");
      canale.api.scriviFattuale("mezzo", "Moto");
      promessa = canale.api.salva();
    });
    await respiro();
    await promessa;

    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("Claim nuovo");
    expect(sul.editoriale.kicker).toBe("Kicker nuovo");
    expect(sul.fattuali.mezzo).toBe("Moto");
    // La provenienza è quella giusta, e non si è sporcata quella degli altri.
    expect(sul.fattuali.origine.mezzo).toBe("manuale");
    expect(sul.fattuali.origine.nome).toBe("sito");
    // I fatti non toccati sono rimasti come li aveva messi il sito.
    expect(sul.fattuali.nome).toBe("Prova di Contratto");
    expect(sul.fattuali.area).toBe("");
  });

  it("lo stesso vale sotto StrictMode", async () => {
    const pilot = archivioPilotabile();
    await montaSevero(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "B severo");
      promessa = canale.api.salva();
    });
    await respiro();
    await promessa;

    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("B severo");
    expect(canale.api.contenuto.editoriale.claim).toBe("B severo");
    expect(canale.api.sporco).toBe(false);
  });
});

describe("la guardia vede la modifica appena fatta", () => {
  it("creare da un altro tour subito dopo aver scritto chiede prima", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    // Modifica e sostituzione nello stesso giro: la promessa si prende qui, la
    // risposta al dialogo arriva dopo.
    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "Non perdermi");
      promessa = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();

    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Annulla").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.annullato);
    expect(canale.api.contenuto.id).toBe(id);
    expect(canale.api.contenuto.editoriale.claim).toBe("Non perdermi");
    expect(canale.api.sporco).toBe(true);
  });

  it("aprire un'altra bozza subito dopo aver scritto non sostituisce di nascosto", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    // Una bozza già persistita da riaprire.
    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const altra = canale.api.contenuto.id;

    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "Ancora qui");
      promessa = canale.api.apri(altra);
    });
    await respiro();

    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Annulla").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.annullato);
    expect(canale.api.contenuto.id).toBe(id);
    expect(canale.api.contenuto.editoriale.claim).toBe("Ancora qui");
  });

  it("«Salva e continua» porta sul disco l'ultima modifica, poi sostituisce", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;

    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "Ultima parola");
      promessa = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    // La modifica è sul disco, non persa nella sostituzione.
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("Ultima parola");
    // E adesso è aperta l'altra.
    expect(canale.api.contenuto.fonte.slug).toBe("seconda-prova");
    expect(canale.api.contenuto.id).not.toBe(id);
  });

  it("«Scarta modifiche» sostituisce soltanto dopo la scelta esplicita", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const id = canale.api.contenuto.id;
    const scrittureDopoSalva = pilot.scritture.length;

    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "Destinata a sparire");
      promessa = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();

    // Finché non si risponde, niente è cambiato.
    expect(dialogo()).toBeTruthy();
    expect(canale.api.contenuto.id).toBe(id);
    expect(canale.api.contenuto.editoriale.claim).toBe("Destinata a sparire");

    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.id).not.toBe(id);
    // Scartare non scrive: sul disco resta la versione salvata prima.
    expect(pilot.scritture).toHaveLength(scrittureDopoSalva);
    expect((await pilot.leggiDavvero(id)).editoriale.claim).not.toBe("Destinata a sparire");
  });

  it("dopo aver aperto una bozza, sostituirla non chiede più nulla", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    // Due bozze persistite.
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const primo = canale.api.contenuto.id;
    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    // Si sporca, poi si apre l'altra scartando: da lì l'editor è pulito.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Da scartare");
    });
    let promessa;
    act(() => {
      promessa = canale.api.apri(primo);
    });
    await respiro();
    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();
    expect((await promessa).esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.id).toBe(primo);
    expect(canale.api.sporco).toBe(false);

    // Ora sostituire non deve chiedere: non c'è niente da perdere.
    let seconda;
    act(() => {
      seconda = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();
    expect(dialogo()).toBeNull();
    expect((await seconda).esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.id).not.toBe(primo);
  });
});

/** Il tour, come apparirebbe dopo un cambiamento sul sito. */
const TOUR_CAMBIATO = {
  ...TOUR,
  prezzo: "150 €",
  km: "80 km",
  descrizione: "Testo di prova, riscritto sul sito.",
};

/** Prepara una bozza TOUR salvata, con un fatto scritto a mano e del copy. */
async function bozzaConLavoroEditoriale() {
  await act(async () => {
    await canale.api.creaDaTour(TOUR);
  });
  await act(async () => {
    canale.api.scriviEditoriale("claim", "Scritto da me");
    canale.api.scriviFattuale("mezzo", "Moto");
  });
  await act(async () => {
    await canale.api.salva();
  });
  await respiro();
  return canale.api.contenuto.id;
}

/**
 * Accettare che il sito è cambiato non è reimportare.
 *
 * §17.4 lo dice per il contenuto: riallineare tocca solo `fonte`. Qui si prova
 * che l'operazione pubblica dell'hook rispetti quel contratto — perché il
 * modo più facile di rovinare una bozza è «aggiornarla» sovrascrivendo il
 * lavoro editoriale con quello che dice il sito adesso.
 */
describe("riallineare la bozza alla fonte", () => {
  it("cambia soltanto la fonte, e lascia intatto tutto il resto", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConLavoroEditoriale();
    const prima = canale.api.contenuto;
    const istantaneaPrima = JSON.stringify(prima.fonte.istantanea);

    let esito;
    await act(async () => {
      esito = canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
    });
    await respiro();
    const dopo = canale.api.contenuto;

    expect(esito.codice).toBe(CODICI.fonteAccettata);
    expect(canale.api.esito.codice).toBe(CODICI.fonteAccettata);
    // La fonte è nuova…
    expect(JSON.stringify(dopo.fonte.istantanea)).not.toBe(istantaneaPrima);
    expect(dopo.fonte.tipo).toBe("tour");
    expect(dopo.fonte.slug).toBe(TOUR.slug);
    // …e tutto il resto è identico, ramo per ramo.
    expect(dopo.id).toBe(prima.id);
    expect(dopo.fattuali).toEqual(prima.fattuali);
    expect(dopo.editoriale).toEqual(prima.editoriale);
    expect(dopo.media).toEqual(prima.media);
    expect(dopo.visual).toEqual(prima.visual);
    expect(dopo.mappa).toEqual(prima.mappa);
    expect(dopo.formato).toBe(prima.formato);
    expect(dopo.variante).toEqual(prima.variante);
    expect(dopo.versioni).toEqual(prima.versioni);
    // In particolare: niente reimport dei fatti, e la mano resta la mano.
    expect(dopo.fattuali.mezzo).toBe("Moto");
    expect(dopo.fattuali.origine.mezzo).toBe("manuale");
    expect(dopo.editoriale.claim).toBe("Scritto da me");
  });

  it("è una modifica non salvata, e non tocca l'archivio", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConLavoroEditoriale();
    const scrittureDopoSalva = pilot.scritture.length;
    const sulDiscoPrima = await pilot.leggiDavvero(id);

    await act(async () => {
      canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
    });
    await respiro();

    expect(canale.api.sporco).toBe(true);
    // Nessuna scrittura implicita.
    expect(pilot.scritture).toHaveLength(scrittureDopoSalva);
    expect(JSON.stringify((await pilot.leggiDavvero(id)).fonte)).toBe(
      JSON.stringify(sulDiscoPrima.fonte),
    );
  });

  it("salvando e riaprendo, la nuova istantanea resta e la storia pure", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConLavoroEditoriale();
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;

    await act(async () => {
      canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sul = await pilot.leggiDavvero(id);
    expect(sul.fonte.istantanea.prezzo).toBe("150 €");
    expect(sul.editoriale.claim).toBe("Scritto da me");
    expect(sul.fattuali.mezzo).toBe("Moto");
    // La storia precedente non è stata persa.
    expect(sul.versioni.length).toBeGreaterThanOrEqual(revisioniPrima);
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));

    // E riaprendola, quello che si legge è quello che c'è.
    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    await act(async () => {
      await canale.api.apri(id);
    });
    await respiro();
    expect(canale.api.contenuto.fonte.istantanea.prezzo).toBe("150 €");
    expect(canale.api.contenuto.editoriale.claim).toBe("Scritto da me");
  });

  it("senza tour, senza bozza o con uno slug diverso non cambia niente", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);

    // Nessuna bozza aperta.
    expect(canale.api.riallineaAllaFonte(TOUR).codice).toBe(CODICI.nessunaBozza);

    await bozzaConLavoroEditoriale();
    const prima = canale.api.contenuto;

    let senza;
    let altro;
    await act(async () => {
      senza = canale.api.riallineaAllaFonte(null);
      altro = canale.api.riallineaAllaFonte(ALTRO_TOUR);
    });
    await respiro();

    expect(senza.codice).toBe(CODICI.fonteAssente);
    expect(altro.codice).toBe(CODICI.fonteNonCorrispondente);
    // Contenuto, sporco e archivio intatti.
    expect(canale.api.contenuto).toEqual(prima);
    expect(canale.api.sporco).toBe(false);
    expect(pilot.scritture).toHaveLength(1);
  });
});

describe("riallineare nello stesso giro di altre operazioni", () => {
  it("modifica, riallineamento e salvataggio senza respiro finiscono tutti sul disco", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConLavoroEditoriale();

    let promessa;
    act(() => {
      canale.api.scriviEditoriale("kicker", "Kicker nuovo");
      canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
      promessa = canale.api.salva();
    });
    await respiro();
    await promessa;

    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.kicker).toBe("Kicker nuovo");
    expect(sul.fonte.istantanea.prezzo).toBe("150 €");
    expect(sul.editoriale.claim).toBe("Scritto da me");
    expect(canale.api.sporco).toBe(false);
  });

  it("dopo un riallineamento, sostituire la bozza chiede prima", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConLavoroEditoriale();

    let promessa;
    act(() => {
      canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
      promessa = canale.api.creaDaTour(ALTRO_TOUR);
    });
    await respiro();

    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Annulla").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.annullato);
    expect(canale.api.contenuto.id).toBe(id);
    expect(canale.api.contenuto.fonte.istantanea.prezzo).toBe("150 €");
    expect(canale.api.sporco).toBe(true);
  });

  it("sotto StrictMode l'istante di importazione resta uno solo", async () => {
    const pilot = archivioPilotabile();
    await montaSevero(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
    try {
      await act(async () => {
        canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
      });
    } finally {
      vi.useRealTimers();
    }
    await respiro();

    // L'istante arriva da `riallineaTourAllaFonte` e raggiunge il contenuto.
    expect(canale.api.contenuto.fonte.importatoIl).toBe("2026-03-01T10:00:00.000Z");
    expect(canale.api.contenuto.fonte.istantanea.prezzo).toBe("150 €");
    expect(canale.api.sporco).toBe(true);

    /*
     * E ciò che si vede è ciò che si salva: il salvataggio legge il
     * riferimento, la schermata legge lo stato, e se la trasformazione non
     * fosse pura i due potrebbero divergere.
     */
    const inMemoria = canale.api.contenuto.fonte.importatoIl;
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const sul = await pilot.leggiDavvero(canale.api.contenuto.id);
    expect(sul.fonte.importatoIl).toBe(inMemoria);
    expect(canale.api.contenuto.fonte.importatoIl).toBe(inMemoria);
  });

  it("riallineare durante una scrittura lenta non si perde", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConLavoroEditoriale();
    const sulDiscoPrima = await pilot.leggiDavvero(id);

    await act(async () => {
      canale.api.scriviEditoriale("claim", "In volo");
    });
    const sosta = pilot.fermaProssima("salva");
    let promessa;
    act(() => {
      promessa = canale.api.salva();
    });
    await respiro();

    // Il riallineamento arriva mentre la scrittura è ancora aperta.
    await act(async () => {
      canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    // La risposta vecchia non lo cancella e non dichiara salvato.
    expect(await promessa).toBeNull();
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.contenuto.fonte.istantanea.prezzo).toBe("150 €");
    // Sul disco c'è quello che è stato davvero scritto, non il riallineamento.
    const dopoLaCorsa = await pilot.leggiDavvero(id);
    expect(dopoLaCorsa.editoriale.claim).toBe("In volo");
    expect(JSON.stringify(dopoLaCorsa.fonte.istantanea)).toBe(
      JSON.stringify(sulDiscoPrima.fonte.istantanea),
    );

    // E riprovando, il secondo salvataggio riesce.
    await act(async () => {
      expect(await canale.api.salva()).toBeTruthy();
    });
    await respiro();
    expect((await pilot.leggiDavvero(id)).fonte.istantanea.prezzo).toBe("150 €");
    expect(canale.api.sporco).toBe(false);
  });

  it("riallineare durante l'aggiornamento dell'elenco non si perde", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConLavoroEditoriale();

    await act(async () => {
      canale.api.scriviEditoriale("claim", "Prima dell'elenco");
    });
    const sosta = pilot.fermaProssima("elenca");
    let promessa;
    act(() => {
      promessa = canale.api.salva();
    });
    await respiro();

    await act(async () => {
      canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessa).toBeNull();
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.contenuto.fonte.istantanea.prezzo).toBe("150 €");

    await act(async () => {
      expect(await canale.api.salva()).toBeTruthy();
    });
    await respiro();
    expect((await pilot.leggiDavvero(id)).fonte.istantanea.prezzo).toBe("150 €");
  });
});
