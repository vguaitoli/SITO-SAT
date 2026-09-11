import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
