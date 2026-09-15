import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBozzaTour, CODICI } from "./useBozzaTour";
import { FornitoreArchivio } from "./ContestoArchivio";
import { FornitoreTransizione, ESITI } from "./transizione";
import { creaArchivioMemoria } from "../fondamenta/archivio";
import { contenutoVuoto } from "../fondamenta/schema";
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
    elimina: archivio.elimina.bind(archivio),
  };
  const scritture = [];
  const eliminazioni = [];
  const soste = { salva: null, leggi: null, elenca: null, elimina: null };
  const rompi = { salva: false, leggi: false, elenca: false, elimina: false };
  // `nullo.leggi` simula un record che non c'è più: la lettura riesce, ma non
  // restituisce niente. È un fallimento diverso da un rigetto.
  const nullo = { leggi: false };

  for (const nome of ["salva", "leggi", "elenca", "elimina"]) {
    archivio[nome] = async (...args) => {
      if (nome === "salva") scritture.push(args[0]?.id ?? null);
      if (nome === "elimina") eliminazioni.push(args[0] ?? null);
      const sosta = soste[nome];
      if (sosta) {
        soste[nome] = null;
        sosta.segnalaArrivo();
        await sosta.promessa;
      }
      if (rompi[nome]) throw new Error(`${nome} non disponibile`);
      if (nome === "leggi" && nullo.leggi) return null;
      return veri[nome](...args);
    };
  }

  /*
   * I binari hanno il loro giro di controlli: `salvaBlob` per vedere *se* e
   * *quando* un file entra nell'archivio, `leggiBlob` per simulare un binario
   * che manca o un archivio che non risponde, `eliminaBlob` per dimostrare che
   * nessuno cancella i file di nascosto.
   */
  const BINARI = ["salvaBlob", "leggiBlob", "eliminaBlob"];
  // Chiesti all'ingresso, salvati alla risposta: la differenza fra i due dice
  // se una richiesta è partita e non è ancora tornata.
  const blobChiesti = [];
  const blobSalvati = [];
  const blobEliminati = [];
  for (const nome of BINARI) {
    veri[nome] = archivio[nome].bind(archivio);
    soste[nome] = null;
    rompi[nome] = false;
  }
  // `nullo.leggiBlob` è il binario che non c'è più: la lettura riesce e non
  // restituisce niente. È diverso da un archivio che rifiuta.
  nullo.leggiBlob = false;

  for (const nome of BINARI) {
    archivio[nome] = async (...args) => {
      if (nome === "salvaBlob") blobChiesti.push(args[2]?.nome ?? null);
      if (nome === "eliminaBlob") blobEliminati.push(args[0] ?? null);
      const sosta = soste[nome];
      if (sosta) {
        soste[nome] = null;
        sosta.segnalaArrivo();
        await sosta.promessa;
      }
      if (rompi[nome]) throw new Error(`${nome} non disponibile`);
      if (nome === "leggiBlob" && nullo.leggiBlob) return null;
      const esito = veri[nome](...args);
      if (nome === "salvaBlob") esito.then((id) => blobSalvati.push(id));
      return esito;
    };
  }

  return {
    archivio,
    scritture,
    eliminazioni,
    blobChiesti,
    blobSalvati,
    blobEliminati,
    rompi,
    nullo,
    /** Legge dal disco scavalcando i guasti simulati. */
    leggiDavvero: veri.leggi,
    /** Legge un binario scavalcando i guasti simulati. */
    leggiBlobDavvero: (id) => veri.leggiBlob(id),
    /**
     * Ferma la prossima chiamata a quel metodo, e dice **quando** è arrivata.
     *
     * `arrivata` è ciò che rende deterministiche le prove sulle corse: senza,
     * per sapere che l'operazione ha raggiunto la sosta bisognerebbe aspettare
     * un tempo e sperare — e una prova che spera non dimostra niente.
     */
    fermaProssima(nome) {
      const sosta = rinviata();
      const arrivo = rinviata();
      sosta.arrivata = arrivo.promessa;
      sosta.segnalaArrivo = arrivo.risolvi;
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

/**
 * Chiedere se il sito è cambiato non deve cambiare niente.
 *
 * È il tipo di operazione che sembra innocua e non lo è: se sporcasse la bozza,
 * o azzerasse l'esito di un salvataggio appena riuscito, chi la chiama per
 * mostrare un avviso finirebbe per alterare lo stato che sta descrivendo.
 */
describe("confrontare la bozza con la fonte", () => {
  it("con la fonte invariata dice allineata, senza scostamenti", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConLavoroEditoriale();

    const esito = canale.api.confrontaConLaFonte(TOUR);
    expect(esito.codice).toBe(CODICI.fonteAllineata);
    expect(esito.allineato).toBe(true);
    expect(esito.scostamenti).toHaveLength(0);
  });

  it("con la fonte cambiata elenca gli scostamenti veri", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConLavoroEditoriale();

    const esito = canale.api.confrontaConLaFonte(TOUR_CAMBIATO);
    expect(esito.codice).toBe(CODICI.fonteCambiata);
    expect(esito.allineato).toBe(false);
    const campi = esito.scostamenti.map((s) => s.campo);
    expect(campi).toContain("prezzo");
    expect(campi).toContain("km");
    const prezzo = esito.scostamenti.find((s) => s.campo === "prezzo");
    expect(prezzo.prima).toBe("100 €");
    expect(prezzo.adesso).toBe("150 €");
    expect(typeof prezzo.nome).toBe("string");
    expect(prezzo.nome.length).toBeGreaterThan(0);
  });

  it("i casi impossibili non si travestono da «allineata»", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);

    // Nessuna bozza aperta.
    const senzaBozza = canale.api.confrontaConLaFonte(TOUR);
    expect(senzaBozza.codice).toBe(CODICI.nessunaBozza);
    expect(senzaBozza.allineato).toBeNull();
    expect(senzaBozza.scostamenti).toHaveLength(0);

    await bozzaConLavoroEditoriale();

    // Tour assente.
    const senzaTour = canale.api.confrontaConLaFonte(null);
    expect(senzaTour.codice).toBe(CODICI.fonteAssente);
    expect(senzaTour.allineato).toBeNull();

    // Slug diverso.
    const altroSlug = canale.api.confrontaConLaFonte(ALTRO_TOUR);
    expect(altroSlug.codice).toBe(CODICI.fonteNonCorrispondente);
    expect(altroSlug.allineato).toBeNull();

    // Tour senza slug: l'identità non è dichiarabile da quel lato.
    for (const rotto of [
      { ...TOUR, slug: "" },
      { ...TOUR, slug: null },
    ]) {
      const e = canale.api.confrontaConLaFonte(rotto);
      expect(e.codice).toBe(CODICI.fonteNonCorrispondente);
      expect(e.allineato).toBeNull();
      expect(e.scostamenti).toHaveLength(0);
    }

    // Nessuno di questi esiti è mai «allineata».
    for (const e of [senzaBozza, senzaTour, altroSlug]) {
      expect(e.codice).not.toBe(CODICI.fonteAllineata);
    }
  });

  it("una bozza TOUR senza istantanea non è confrontabile", async () => {
    const { contenutoVuoto } = await import("../fondamenta/schema");
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);

    /*
     * Un record che arriva da un backup o da una versione precedente può essere
     * TOUR e avere uno slug, ma non avere istantanea. Il motore, in quel caso,
     * risponde «allineato: true» — una risposta vuota. Qui non deve mai
     * diventare un esito positivo: non c'è niente con cui confrontare.
     */
    const id = await pilot.archivio.salva({
      ...contenutoVuoto({ categoria: "tour", formato: "post" }),
      titolo: "Senza istantanea",
      fonte: {
        tipo: "tour",
        slug: TOUR.slug,
        istantanea: null,
        importatoIl: "2026-01-01T00:00:00.000Z",
      },
    });
    await act(async () => {
      await canale.api.apri(id);
    });
    await respiro();
    expect(canale.api.contenuto.id).toBe(id);
    expect(canale.api.contenuto.fonte.istantanea).toBeNull();

    const esito = canale.api.confrontaConLaFonte(TOUR);
    // Non «non corrispondente»: la fonte corrisponde, manca l'istantanea.
    expect(esito.codice).toBe(CODICI.fonteNonConfrontabile);
    expect(esito.allineato).toBeNull();
    expect(esito.scostamenti).toHaveLength(0);
  });

  it("non scrive, non sporca e non tocca l'esito", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConLavoroEditoriale();
    const scrittureDopoSalva = pilot.scritture.length;
    const contenutoPrima = canale.api.contenuto;
    const esitoPrima = canale.api.esito;
    const sulDiscoPrima = JSON.stringify(await pilot.leggiDavvero(id));

    await act(async () => {
      canale.api.confrontaConLaFonte(TOUR_CAMBIATO);
      canale.api.confrontaConLaFonte(TOUR);
    });
    await respiro();

    // Identico, per riferimento: non è stato nemmeno ricreato.
    expect(canale.api.contenuto).toBe(contenutoPrima);
    expect(canale.api.esito).toBe(esitoPrima);
    expect(canale.api.sporco).toBe(false);
    expect(pilot.scritture).toHaveLength(scrittureDopoSalva);
    expect(JSON.stringify(await pilot.leggiDavvero(id))).toBe(sulDiscoPrima);
  });

  it("vede un riallineamento fatto nello stesso giro", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConLavoroEditoriale();

    // Prima è cambiata…
    expect(canale.api.confrontaConLaFonte(TOUR_CAMBIATO).allineato).toBe(false);

    // …si riallinea e si richiede subito, senza respiro fra le due chiamate.
    let dopo;
    act(() => {
      canale.api.riallineaAllaFonte(TOUR_CAMBIATO);
      dopo = canale.api.confrontaConLaFonte(TOUR_CAMBIATO);
    });

    expect(dopo.codice).toBe(CODICI.fonteAllineata);
    expect(dopo.allineato).toBe(true);
    expect(dopo.scostamenti).toHaveLength(0);
  });

  it("è davvero esposta dall'hook", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    expect(typeof canale.api.confrontaConLaFonte).toBe("function");
  });
});

/** Una bozza TOUR con identità valida ma senza istantanea, come da backup. */
async function bozzaSenzaIstantanea(pilot) {
  const { contenutoVuoto } = await import("../fondamenta/schema");
  const id = await pilot.archivio.salva({
    ...contenutoVuoto({ categoria: "tour", formato: "post" }),
    titolo: "Senza istantanea",
    fonte: {
      tipo: "tour",
      slug: TOUR.slug,
      istantanea: null,
      importatoIl: "2026-01-01T00:00:00.000Z",
    },
  });
  await act(async () => {
    await canale.api.apri(id);
  });
  await respiro();
  return id;
}

/**
 * Identità e confrontabilità sono due cose diverse.
 *
 * Confondere le due è una regressione sottile: una bozza compatibile ma senza
 * istantanea non è confrontabile — non c'è niente con cui confrontare — ma **si
 * può riallineare**, ed è anzi l'unico modo di ripararla. Chiedere l'istantanea
 * anche al riallineamento chiuderebbe la porta proprio a chi ne ha bisogno.
 */
describe("riallineare una bozza senza istantanea", () => {
  it("la ripara, e solo dopo diventa confrontabile", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSenzaIstantanea(pilot);
    const scrittureDopoApertura = pilot.scritture.length;

    // 1-2. Non confrontabile, ma per la ragione giusta.
    const primaDelConfronto = canale.api.confrontaConLaFonte(TOUR);
    expect(primaDelConfronto.codice).toBe(CODICI.fonteNonConfrontabile);
    expect(primaDelConfronto.allineato).toBeNull();

    // 3-5. Il riallineamento passa, ricostruisce l'istantanea, e il confronto
    // fatto nello stesso giro la vede.
    let esitoRiallineamento;
    let dopo;
    act(() => {
      esitoRiallineamento = canale.api.riallineaAllaFonte(TOUR);
      dopo = canale.api.confrontaConLaFonte(TOUR);
    });
    expect(esitoRiallineamento.codice).toBe(CODICI.fonteAccettata);
    expect(dopo.codice).toBe(CODICI.fonteAllineata);
    expect(dopo.allineato).toBe(true);
    expect(dopo.scostamenti).toHaveLength(0);

    await respiro();
    expect(canale.api.contenuto.fonte.istantanea).toBeTruthy();
    expect(canale.api.contenuto.fonte.istantanea.prezzo).toBe(TOUR.prezzo);

    // 6. Sporca, ma non salvata da sola.
    expect(canale.api.sporco).toBe(true);
    expect(pilot.scritture).toHaveLength(scrittureDopoApertura);
    expect((await pilot.leggiDavvero(id)).fonte.istantanea).toBeNull();
  });

  it("uno slug diverso continua a impedire il riallineamento", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaSenzaIstantanea(pilot);

    const esito = canale.api.riallineaAllaFonte(ALTRO_TOUR);
    expect(esito.codice).toBe(CODICI.fonteNonCorrispondente);
    expect(canale.api.contenuto.fonte.istantanea).toBeNull();
    expect(canale.api.sporco).toBe(false);
  });
});

/**
 * Una fonte malformata si raggiunge davvero.
 *
 * `apriSenzaChiedere` rifiuta solo `categoria !== "tour"`: un record con
 * categoria giusta ma `fonte.tipo` sbagliato o slug mancante passa il filtro,
 * si apre, e arriva a entrambe le API della fonte. Non è un caso di scuola —
 * un backup importato o un record scritto da una versione precedente può avere
 * esattamente quella forma.
 */
describe("bozze TOUR con una fonte malformata", () => {
  const MALFORMATE = [
    ["tipo sbagliato", { tipo: "evento", slug: TOUR.slug }],
    ["slug mancante", { tipo: "tour", slug: null }],
  ];

  it.each(MALFORMATE)("con %s: si apre, ma non si confronta né si riallinea", async (_nome, fonteRotta) => {
    const { contenutoVuoto } = await import("../fondamenta/schema");
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);

    const id = await pilot.archivio.salva({
      ...contenutoVuoto({ categoria: "tour", formato: "post" }),
      titolo: "Fonte malformata",
      fonte: {
        ...fonteRotta,
        istantanea: { nome: TOUR.name, prezzo: TOUR.prezzo },
        importatoIl: "2026-01-01T00:00:00.000Z",
      },
    });

    // 3. La bozza si apre davvero: il filtro di `apri` guarda solo la categoria.
    await act(async () => {
      await canale.api.apri(id);
    });
    await respiro();
    expect(canale.api.contenuto.id).toBe(id);

    const contenutoPrima = canale.api.contenuto;
    const scritturePrima = pilot.scritture.length;
    const sulDiscoPrima = JSON.stringify(await pilot.leggiDavvero(id));

    // 4. Il confronto rifiuta per identità, non per confrontabilità.
    const confronto = canale.api.confrontaConLaFonte(TOUR);
    expect(confronto.codice).toBe(CODICI.fonteNonCorrispondente);
    expect(confronto.allineato).toBeNull();
    expect(confronto.scostamenti).toHaveLength(0);

    // 5. E nemmeno il riallineamento accetta un'identità che non torna.
    const riallineamento = canale.api.riallineaAllaFonte(TOUR);
    expect(riallineamento.codice).toBe(CODICI.fonteNonCorrispondente);

    // 6. Niente è cambiato: né in memoria, né sul disco.
    await respiro();
    expect(canale.api.contenuto).toBe(contenutoPrima);
    expect(canale.api.sporco).toBe(false);
    expect(pilot.scritture).toHaveLength(scritturePrima);
    expect(JSON.stringify(await pilot.leggiDavvero(id))).toBe(sulDiscoPrima);
  });
});

/** Salva una bozza TOUR dal tour dato e restituisce il suo id. */
async function bozzaSalvata(tour, claim) {
  await act(async () => {
    await canale.api.creaDaTour(tour);
  });
  await act(async () => {
    canale.api.scriviEditoriale("claim", claim);
  });
  await act(async () => {
    await canale.api.salva();
  });
  await respiro();
  return canale.api.contenuto.id;
}

/**
 * Eliminare è definitivo: non c'è un annulla.
 *
 * Per questo non passa dal dialogo delle transizioni — «Salva e continua»
 * significherebbe salvare proprio ciò che si sta cancellando — e per questo
 * l'appartenenza si verifica nell'archivio e non nell'elenco, che è una
 * comodità e può essere vecchio.
 */
describe("eliminare una bozza TOUR", () => {
  it("una bozza non aperta si elimina", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    const corrente = await bozzaSalvata(TOUR, "Corrente");

    const esito = await canale.api.elimina(altra);
    await respiro();

    expect(esito.codice).toBe(CODICI.eliminata);
    expect(await pilot.leggiDavvero(altra)).toBeNull();
    expect(canale.api.contenuto.id).toBe(corrente);
    expect(canale.api.bozze.map((b) => b.id)).toEqual([corrente]);
  });

  it("la bozza corrente pulita si elimina e l'editor si svuota", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSalvata(TOUR, "Pulita");

    const esito = await canale.api.elimina(id);
    await respiro();

    expect(esito.codice).toBe(CODICI.eliminata);
    expect(canale.api.contenuto).toBeNull();
    expect(canale.api.sporco).toBe(false);
    expect(await pilot.leggiDavvero(id)).toBeNull();
  });

  it("con modifiche non salvate su quella bozza si rifiuta, senza toccare l'archivio", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSalvata(TOUR, "Salvata");
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Non perdermi");
    });
    const eliminazioniPrima = pilot.eliminazioni.length;

    const esito = await canale.api.elimina(id);
    await respiro();

    expect(esito.codice).toBe(CODICI.modificheNonSalvate);
    expect(pilot.eliminazioni).toHaveLength(eliminazioniPrima);
    expect(canale.api.contenuto.editoriale.claim).toBe("Non perdermi");
    expect(canale.api.sporco).toBe(true);
    expect(await pilot.leggiDavvero(id)).toBeTruthy();
  });

  it("un'altra bozza si elimina anche mentre la corrente è sporca", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    const corrente = await bozzaSalvata(TOUR, "Corrente");
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Lavoro in corso");
    });

    const esito = await canale.api.elimina(altra);
    await respiro();

    expect(esito.codice).toBe(CODICI.eliminata);
    expect(await pilot.leggiDavvero(altra)).toBeNull();
    expect(canale.api.contenuto.id).toBe(corrente);
    expect(canale.api.contenuto.editoriale.claim).toBe("Lavoro in corso");
    expect(canale.api.sporco).toBe(true);
  });

  it("un id EVENTI o inesistente non viene mai eliminato", async () => {
    const { contenutoVuoto } = await import("../fondamenta/schema");
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const idEventi = await pilot.archivio.salva({
      ...contenutoVuoto({ categoria: "eventi", formato: "post" }),
      titolo: "Bozza EVENTI",
    });
    await bozzaSalvata(TOUR, "Corrente");
    const eliminazioniPrima = pilot.eliminazioni.length;

    expect((await canale.api.elimina(idEventi)).codice).toBe(CODICI.nonUnaBozzaTour);
    expect((await canale.api.elimina("id-che-non-esiste")).codice).toBe(CODICI.nonUnaBozzaTour);
    expect((await canale.api.elimina(null)).codice).toBe(CODICI.nonUnaBozzaTour);
    await respiro();

    expect(pilot.eliminazioni).toHaveLength(eliminazioniPrima);
    expect(await pilot.leggiDavvero(idEventi)).toBeTruthy();
  });

  it("due richieste ravvicinate cancellano una volta sola", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    await bozzaSalvata(TOUR, "Corrente");

    const sosta = pilot.fermaProssima("leggi");
    let a;
    let b;
    act(() => {
      a = canale.api.elimina(altra);
      b = canale.api.elimina(altra);
    });
    // La seconda è respinta subito, prima ancora di leggere.
    expect((await b).codice).toBe(CODICI.eliminazioneOccupata);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await a).codice).toBe(CODICI.eliminata);
    expect(pilot.eliminazioni).toHaveLength(1);
  });

  it("aprire un'altra bozza durante l'attesa non la svuota", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    const corrente = await bozzaSalvata(TOUR, "Corrente");

    // Si cancella quella aperta, ma l'archivio è lento.
    const sosta = pilot.fermaProssima("elimina");
    let promessa;
    act(() => {
      promessa = canale.api.elimina(corrente);
    });
    await respiro();

    await act(async () => {
      await canale.api.apri(altra);
    });
    await respiro();
    expect(canale.api.contenuto.id).toBe(altra);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await promessa).codice).toBe(CODICI.eliminata);
    // La risposta tardiva non tocca la bozza aperta nel frattempo.
    expect(canale.api.contenuto.id).toBe(altra);
    expect(canale.api.contenuto.editoriale.claim).toBe("Altra");
    expect(canale.api.sporco).toBe(false);
  });

  it("scrivere durante l'attesa non fa sparire quel che si è scritto", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSalvata(TOUR, "Prima");

    const sosta = pilot.fermaProssima("elimina");
    let promessa;
    act(() => {
      promessa = canale.api.elimina(id);
    });
    await respiro();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Scritto mentre spariva");
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await promessa).codice).toBe(CODICI.eliminata);
    expect(canale.api.contenuto.editoriale.claim).toBe("Scritto mentre spariva");
    expect(canale.api.sporco).toBe(true);
    expect(await pilot.leggiDavvero(id)).toBeNull();
  });

  it("errore di lettura ed errore di eliminazione sono esiti distinti", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    await bozzaSalvata(TOUR, "Corrente");

    pilot.rompi.leggi = true;
    expect((await canale.api.elimina(altra)).codice).toBe(CODICI.erroreLettura);
    pilot.rompi.leggi = false;
    expect(pilot.eliminazioni).toHaveLength(0);

    pilot.rompi.elimina = true;
    expect((await canale.api.elimina(altra)).codice).toBe(CODICI.erroreEliminazione);
    pilot.rompi.elimina = false;
    expect(await pilot.leggiDavvero(altra)).toBeTruthy();

    // Il blocco si è liberato: si può riprovare, e stavolta passa.
    expect((await canale.api.elimina(altra)).codice).toBe(CODICI.eliminata);
    await respiro();
    expect(await pilot.leggiDavvero(altra)).toBeNull();
  });

  it("se l'elenco non si aggiorna, la cancellazione resta riuscita", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    await bozzaSalvata(TOUR, "Corrente");

    pilot.rompi.elenca = true;
    const esito = await canale.api.elimina(altra);
    await respiro();
    pilot.rompi.elenca = false;

    expect(esito.codice).toBe(CODICI.eliminataElencoNonAggiornato);
    expect(esito.codice).not.toBe(CODICI.erroreEliminazione);
    expect(await pilot.leggiDavvero(altra)).toBeNull();
  });

  it("smontare durante l'operazione non aggiorna più lo stato", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSalvata(TOUR, "Corrente");

    const sosta = pilot.fermaProssima("elimina");
    let promessa;
    act(() => {
      promessa = canale.api.elimina(id);
    });
    await respiro();
    const contenutoPrima = canale.api.contenuto;

    act(() => radice.unmount());
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });

    expect((await promessa).codice).toBe(CODICI.eliminata);
    // Il record è sparito, ma l'ultimo stato React non è stato toccato.
    expect(await pilot.leggiDavvero(id)).toBeNull();
    expect(canale.api.contenuto).toBe(contenutoPrima);
    radice = createRoot(contenitore);
  });
});

/**
 * Salvare ed eliminare la stessa bozza si escludono a vicenda.
 *
 * Senza questo vince chi finisce per ultimo: un salvataggio sospeso che ritorna
 * dopo una cancellazione **ricrea** il record appena eliminato, e la bozza
 * riappare senza che nessuno l'abbia chiesto. Le due corse si provano con
 * cancelli pilotati, non con attese.
 */
describe("interblocco fra salvataggio ed eliminazione", () => {
  it("un salvataggio in volo impedisce di eliminare la stessa bozza", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSalvata(TOUR, "Prima");
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Seconda");
    });

    const sosta = pilot.fermaProssima("salva");
    let salvataggio;
    act(() => {
      salvataggio = canale.api.salva();
    });
    await respiro();

    const esito = await canale.api.elimina(id);
    expect(esito.codice).toBe(CODICI.operazioneInConflitto);
    expect(pilot.eliminazioni).toHaveLength(0);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    // Il salvataggio è andato a buon fine e il record esiste.
    expect(await salvataggio).toBeTruthy();
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("Seconda");

    // Finito quello, si può riprovare: e stavolta passa.
    expect((await canale.api.elimina(id)).codice).toBe(CODICI.eliminata);
    await respiro();
    expect(await pilot.leggiDavvero(id)).toBeNull();
  });

  it("un'eliminazione in volo impedisce di salvare la stessa bozza", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSalvata(TOUR, "Prima");
    const scrittureAllInizio = pilot.scritture.length;

    const sosta = pilot.fermaProssima("elimina");
    let eliminazione;
    act(() => {
      eliminazione = canale.api.elimina(id);
    });
    await respiro();

    await act(async () => {
      canale.api.scriviEditoriale("claim", "Scritta mentre spariva");
    });
    let esitoSalva;
    await act(async () => {
      esitoSalva = await canale.api.salva();
    });
    await respiro();

    // Nessuna scrittura nuova, e il rifiuto è esplicito.
    expect(esitoSalva).toBeNull();
    expect(pilot.scritture).toHaveLength(scrittureAllInizio);
    expect(canale.api.esito.codice).toBe(CODICI.operazioneInConflitto);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await eliminazione).codice).toBe(CODICI.eliminata);
    expect(await pilot.leggiDavvero(id)).toBeNull();
    // Il lavoro scritto nel frattempo è rimasto in memoria, non salvato.
    expect(canale.api.contenuto.editoriale.claim).toBe("Scritta mentre spariva");
    expect(canale.api.sporco).toBe(true);

    // E adesso si può salvare di nuovo: il blocco si è liberato.
    await act(async () => {
      expect(await canale.api.salva()).toBeTruthy();
    });
    await respiro();
    expect(pilot.scritture.length).toBeGreaterThan(scrittureAllInizio);
  });

  it("una scrittura su un'altra bozza non blocca l'eliminazione di questa", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    const corrente = await bozzaSalvata(TOUR, "Corrente");
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Modificata");
    });

    // Il salvataggio in volo riguarda la bozza **corrente**, non l'altra.
    const sosta = pilot.fermaProssima("salva");
    let salvataggio;
    act(() => {
      salvataggio = canale.api.salva();
    });
    await respiro();

    const esito = await canale.api.elimina(altra);
    expect(esito.codice).toBe(CODICI.eliminata);
    expect(pilot.eliminazioni).toEqual([altra]);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await salvataggio).toBeTruthy();
    expect(await pilot.leggiDavvero(altra)).toBeNull();
    expect((await pilot.leggiDavvero(corrente)).editoriale.claim).toBe("Modificata");
  });
});

/**
 * Aprire ed eliminare la stessa bozza si escludono a vicenda.
 *
 * Senza questo resta in memoria una bozza dichiarata **pulita** la cui base sul
 * disco è già stata cancellata: il caso peggiore, perché non avvisa di nulla —
 * l'editor sembra allineato all'archivio e non lo è.
 */
describe("interblocco fra apertura ed eliminazione", () => {
  it("un'eliminazione in volo impedisce di aprire la stessa bozza", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaSalvata(TOUR, "Corrente");

    const sosta = pilot.fermaProssima("elimina");
    let eliminazione;
    act(() => {
      eliminazione = canale.api.elimina(id);
    });
    await respiro();

    let apertura;
    await act(async () => {
      apertura = await canale.api.apri(id);
    });
    await respiro();
    expect(apertura.esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.operazioneInConflitto);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await eliminazione).codice).toBe(CODICI.eliminata);
    expect(await pilot.leggiDavvero(id)).toBeNull();
    // E soprattutto: non è rimasta in memoria come bozza pulita.
    expect(canale.api.contenuto).toBeNull();
  });

  it("un'apertura in volo impedisce di eliminare la stessa bozza", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const altra = await bozzaSalvata(ALTRO_TOUR, "Altra");
    await bozzaSalvata(TOUR, "Corrente");

    const sosta = pilot.fermaProssima("leggi");
    let apertura;
    act(() => {
      apertura = canale.api.apri(altra);
    });
    await respiro();

    const esito = await canale.api.elimina(altra);
    expect(esito.codice).toBe(CODICI.operazioneInConflitto);
    expect(pilot.eliminazioni).toHaveLength(0);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await apertura).esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.id).toBe(altra);
    expect(await pilot.leggiDavvero(altra)).toBeTruthy();

    // Finita l'apertura, il gesto rifiutato si può ripetere.
    expect((await canale.api.elimina(altra)).codice).toBe(CODICI.eliminata);
    await respiro();
    expect(await pilot.leggiDavvero(altra)).toBeNull();
  });

  it("eliminare una bozza non impedisce di aprirne un'altra", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const a = await bozzaSalvata(TOUR, "A");
    const b = await bozzaSalvata(ALTRO_TOUR, "B");
    // Si torna su A, così l'apertura di B è una transizione vera.
    await act(async () => {
      await canale.api.apri(a);
    });
    await respiro();

    const sosta = pilot.fermaProssima("elimina");
    let eliminazione;
    act(() => {
      eliminazione = canale.api.elimina(a);
    });
    await respiro();

    // B si apre lo stesso: il blocco è per id.
    let apertura;
    await act(async () => {
      apertura = await canale.api.apri(b);
    });
    await respiro();
    expect(apertura.esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.id).toBe(b);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await eliminazione).codice).toBe(CODICI.eliminata);
    // La risposta tardiva non ha toccato B.
    expect(canale.api.contenuto.id).toBe(b);
    expect(canale.api.contenuto.editoriale.claim).toBe("B");
    expect(canale.api.sporco).toBe(false);
    expect(await pilot.leggiDavvero(b)).toBeTruthy();
    expect(await pilot.leggiDavvero(a)).toBeNull();
  });
});

/** Riscrive un oggetto con le stesse coppie in ordine inverso, anche annidate. */
const riordinaProfondo = (o) =>
  o && typeof o === "object" && !Array.isArray(o)
    ? Object.fromEntries(
        Object.entries(o)
          .reverse()
          .map(([k, v]) => [k, riordinaProfondo(v)]),
      )
    : o;

/** Una bozza salvata tre volte: creazione, A, B. */
async function bozzaConStoria() {
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
  await act(async () => {
    canale.api.scriviEditoriale("claim", "B");
  });
  await act(async () => {
    await canale.api.salva();
  });
  await respiro();
  return canale.api.contenuto.id;
}

/**
 * Tornare indietro deve lasciare una storia leggibile.
 *
 * Due punti delicati: il ripristino non deve registrare **due** revisioni per un
 * gesto solo — `ripristinaRevisione` ne scrive già una — e non deve archiviare
 * ciò che l'utente ha appena scelto di scartare. Scartare vuol dire buttare, non
 * mettere da parte.
 */
describe("cronologia e ripristino", () => {
  it("il riepilogo è dal più recente e dice che cosa è ripristinabile", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConStoria();

    const elenco = canale.api.revisioni();
    expect(elenco.length).toBeGreaterThanOrEqual(2);
    // Dalla più recente.
    expect(elenco.map((v) => v.n)).toEqual([...elenco.map((v) => v.n)].sort((a, b) => b - a));
    // Il punto di creazione non porta uno stato.
    expect(elenco.at(-1).ripristinabile).toBe(false);
    expect(elenco[0].ripristinabile).toBe(true);
    expect(typeof elenco[0].quando).toBe("string");
  });

  it("ripristina, persiste, e aggiunge una revisione sola", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const prima = (await pilot.leggiDavvero(id)).versioni.length;
    const daRipristinare = canale.api.revisioni().find((v) => v.ripristinabile).n;

    await act(async () => {
      await canale.api.ripristina(daRipristinare);
    });
    await respiro();

    expect(canale.api.esito.codice).toBe(CODICI.revisioneRipristinata);
    const sul = await pilot.leggiDavvero(id);
    // Quello che si vede è quello che è sul disco, e la bozza è pulita.
    expect(canale.api.contenuto.editoriale.claim).toBe(sul.editoriale.claim);
    expect(sul.editoriale.claim).toBe("A");
    expect(canale.api.sporco).toBe(false);
    // Una sola revisione in più, non due.
    expect(sul.versioni).toHaveLength(prima + 1);
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
    // E si può tornare indietro: lo stato precedente è conservato.
    expect(sul.versioni.at(-1).dati.editoriale.claim).toBe("B");
  });

  it("il ripristino si può annullare ripristinando a sua volta", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const versoA = canale.api.revisioni().find((v) => v.ripristinabile).n;
    await act(async () => {
      await canale.api.ripristina(versoA);
    });
    await respiro();
    expect(canale.api.contenuto.editoriale.claim).toBe("A");

    const versoB = canale.api.revisioni().find((v) => v.ripristinabile).n;
    await act(async () => {
      await canale.api.ripristina(versoB);
    });
    await respiro();
    expect(canale.api.contenuto.editoriale.claim).toBe("B");
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("B");
  });

  it("revisione inesistente e punto di creazione hanno codici distinti", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const scrittureePrima = pilot.scritture.length;
    const sulDiscoPrima = JSON.stringify(await pilot.leggiDavvero(id));

    let inesistente;
    await act(async () => {
      inesistente = await canale.api.ripristina(999);
    });
    expect(inesistente.esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.revisioneInesistente);

    const creazione = canale.api.revisioni().find((v) => !v.ripristinabile).n;
    let nonRipristinabile;
    await act(async () => {
      nonRipristinabile = await canale.api.ripristina(creazione);
    });
    expect(nonRipristinabile.esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.revisioneNonRipristinabile);

    await respiro();
    expect(pilot.scritture).toHaveLength(scrittureePrima);
    expect(JSON.stringify(await pilot.leggiDavvero(id))).toBe(sulDiscoPrima);
  });
});

describe("ripristinare con lavoro non salvato", () => {
  it("«Annulla» non cambia niente", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Non salvata");
    });
    const scrittureePrima = pilot.scritture.length;
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Annulla").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.annullato);
    expect(canale.api.contenuto.editoriale.claim).toBe("Non salvata");
    expect(canale.api.sporco).toBe(true);
    expect(pilot.scritture).toHaveLength(scrittureePrima);
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("B");
  });

  it("«Salva e continua» salva il lavoro e poi ripristina", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
    });
    await respiro();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("A");
    // C è stato salvato prima, quindi resta nella storia.
    expect(sul.versioni.map((v) => v.dati?.editoriale?.claim)).toContain("C");
    expect(canale.api.sporco).toBe(false);
  });

  it("«Scarta modifiche» non mette in cronologia ciò che è stato scartato", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Da buttare");
    });
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
    });
    await respiro();
    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("A");
    // Scartare vuol dire buttare: quel testo non deve comparire da nessuna parte.
    expect(JSON.stringify(sul)).not.toContain("Da buttare");
    expect(sul.versioni.at(-1).dati.editoriale.claim).toBe("B");
  });
});

describe("ripristino e corse asincrone", () => {
  it("scrivere durante il ripristino non dichiara pulito il lavoro", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    const sosta = pilot.fermaProssima("salva");
    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
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

    expect((await promessa).esito).toBe(ESITI.fallito);
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.contenuto.editoriale.claim).toBe("Arrivata dopo");
  });

  it("un'eliminazione in corso impedisce il ripristino", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    const sosta = pilot.fermaProssima("elimina");
    let eliminazione;
    act(() => {
      eliminazione = canale.api.elimina(id);
    });
    await respiro();

    let esito;
    await act(async () => {
      esito = await canale.api.ripristina(n);
    });
    expect(esito.esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.operazioneInConflitto);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();
    expect((await eliminazione).codice).toBe(CODICI.eliminata);
    expect(await pilot.leggiDavvero(id)).toBeNull();
  });

  it("un errore di scrittura è riprovabile", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    pilot.rompi.salva = true;
    let esito;
    await act(async () => {
      esito = await canale.api.ripristina(n);
    });
    await respiro();
    expect(esito.esito).toBe(ESITI.fallito);
    expect(canale.api.esito.codice).toBe(CODICI.erroreScrittura);
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("B");

    /*
     * Dopo il fallimento il contenuto ripristinato è in memoria e non sul
     * disco: la bozza è sporca, e il secondo tentativo passa dal dialogo. È
     * corretto — c'è del lavoro che si sta per sostituire.
     */
    expect(canale.api.sporco).toBe(true);

    pilot.rompi.salva = false;
    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("A");
    expect(canale.api.sporco).toBe(false);
  });

  it("smontare durante il ripristino non aggiorna più lo stato", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    const sosta = pilot.fermaProssima("salva");
    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
    });
    await respiro();
    const esitoPrima = canale.api.esito;

    act(() => radice.unmount());
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });

    await promessa;
    expect(canale.api.esito).toBe(esitoPrima);
    expect(await pilot.leggiDavvero(id)).toBeTruthy();
    radice = createRoot(contenitore);
  });
});

/**
 * Una richiesta impossibile non deve costare niente.
 *
 * Il controllo stava dentro l'azione, cioè **dopo** il dialogo: con una bozza
 * sporca, chiedere di ripristinare una revisione inesistente faceva comparire la
 * scelta, e «Salva e continua» salvava davvero il lavoro prima di scoprire che
 * non c'era nulla da ripristinare.
 */
describe("ripristini impossibili, con lavoro non salvato", () => {
  const IMPOSSIBILI = [
    ["revisione inesistente", () => 999, CODICI.revisioneInesistente],
    [
      "punto di creazione",
      () => canale.api.revisioni().find((v) => !v.ripristinabile).n,
      CODICI.revisioneNonRipristinabile,
    ],
  ];

  it.each(IMPOSSIBILI)("%s: nessun dialogo e nessuna scrittura", async (_nome, quale, atteso) => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Sporca");
    });
    const scrittureePrima = pilot.scritture.length;
    const sulDiscoPrima = JSON.stringify(await pilot.leggiDavvero(id));
    const n = quale();

    let esito;
    await act(async () => {
      esito = await canale.api.ripristina(n);
    });
    await respiro();

    // Nessun dialogo: non si chiede di salvare o scartare per niente.
    expect(dialogo()).toBeNull();
    expect(esito.esito).toBe(ESITI.fallito);
    expect(esito.errore.message).toBe(atteso);
    expect(canale.api.esito.codice).toBe(atteso);
    // Memoria, sporco e disco intatti.
    expect(pilot.scritture).toHaveLength(scrittureePrima);
    expect(canale.api.contenuto.editoriale.claim).toBe("Sporca");
    expect(canale.api.sporco).toBe(true);
    expect(JSON.stringify(await pilot.leggiDavvero(id))).toBe(sulDiscoPrima);
  });
});

describe("i motivi del fallimento non si appiattiscono", () => {
  it("un elenco non aggiornato non cancella il ripristino riuscito", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    pilot.rompi.elenca = true;
    let esito;
    await act(async () => {
      esito = await canale.api.ripristina(n);
    });
    await respiro();
    pilot.rompi.elenca = false;

    // Il ripristino è riuscito: la transizione è eseguita, il disco aggiornato.
    expect(esito.esito).toBe(ESITI.fatto);
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("A");
    expect(canale.api.contenuto.editoriale.claim).toBe("A");
    expect(canale.api.sporco).toBe(false);
    // Ma il motivo resta quello vero: è l'elenco a essere rimasto indietro.
    expect(canale.api.esito.codice).toBe(CODICI.erroreElenco);
    expect(canale.api.esito.codice).not.toBe(CODICI.revisioneRipristinata);
  });

  it("una rilettura fallita riporta il proprio motivo, e si recupera", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    pilot.rompi.leggi = true;
    let esito;
    await act(async () => {
      esito = await canale.api.ripristina(n);
    });
    await respiro();
    pilot.rompi.leggi = false;

    // Il motivo specifico arriva fino al risultato pubblico.
    expect(esito.esito).toBe(ESITI.fallito);
    expect(esito.errore.message).toBe(CODICI.riletturaFallita);
    expect(canale.api.esito.codice).toBe(CODICI.riletturaFallita);
    expect(canale.api.esito.codice).not.toBe(CODICI.erroreScrittura);
    // Il dato ripristinato è già sul disco, ma la memoria non si dichiara pulita.
    expect((await pilot.leggiDavvero(id)).editoriale.claim).toBe("A");
    expect(canale.api.sporco).toBe(true);

    // Il tentativo successivo recupera la base senza duplicare la storia.
    let secondo;
    act(() => {
      secondo = canale.api.ripristina(n);
    });
    await respiro();
    if (dialogo()) {
      await act(async () => {
        bottone("Salva e continua").click();
      });
      await respiro();
    }
    await secondo;
    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("A");
    expect(sul.versioni).toHaveLength(revisioniPrima + 1);
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
  });

  it("una scrittura superata riporta il proprio motivo", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    const sosta = pilot.fermaProssima("salva");
    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
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

    const esito = await promessa;
    expect(esito.esito).toBe(ESITI.fallito);
    expect(esito.errore.message).toBe(CODICI.superataDaModifiche);
    expect(canale.api.esito.codice).toBe(CODICI.superataDaModifiche);
  });
});

describe("un ripristino fallito non duplica la storia", () => {
  it("riprovando con «Salva e continua» resta una revisione sola", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    pilot.rompi.salva = true;
    await act(async () => {
      await canale.api.ripristina(n);
    });
    await respiro();
    pilot.rompi.salva = false;
    expect(canale.api.sporco).toBe(true);

    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("A");
    // Una revisione in più, non due o tre: lo stato precedente compare una volta.
    expect(sul.versioni).toHaveLength(revisioniPrima + 1);
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
    const primaDelRipristino = sul.versioni.filter(
      (v) => (v.etichetta || "").includes("prima del ripristino"),
    );
    expect(primaDelRipristino).toHaveLength(1);
    // E resta reversibile.
    expect(sul.versioni.at(-1).dati.editoriale.claim).toBe("B");
    expect(canale.api.sporco).toBe(false);
  });

  it("riprendendo con una modifica, la storia resta corretta", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    pilot.rompi.salva = true;
    await act(async () => {
      await canale.api.ripristina(n);
    });
    await respiro();
    pilot.rompi.salva = false;

    await act(async () => {
      canale.api.scriviEditoriale("kicker", "Aggiunto dopo");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sul = await pilot.leggiDavvero(id);
    // La modifica non è persa, e lo stato precedente non è duplicato.
    expect(sul.editoriale.claim).toBe("A");
    expect(sul.editoriale.kicker).toBe("Aggiunto dopo");
    expect(sul.versioni).toHaveLength(revisioniPrima + 1);
    expect(
      sul.versioni.filter((v) => (v.etichetta || "").includes("prima del ripristino")),
    ).toHaveLength(1);
    expect(sul.versioni.at(-1).dati.editoriale.claim).toBe("B");
  });
});

/**
 * Il ripristino pendente appartiene a una sessione, non a un id.
 *
 * Dopo un ripristino fallito lo stato in memoria porta già la voce forzata, e
 * il marcatore serve a non registrarla due volte. Ma riaprire la stessa bozza
 * comincia una sessione nuova, che dal disco riprende un contenuto **senza**
 * quella voce: ereditare il marcatore lì sopprimerebbe una revisione ordinaria,
 * e lo stato precedente sparirebbe dalla cronologia.
 */
describe("il pendente non sopravvive a una nuova sessione", () => {
  it("scartato e riaperto, un salvataggio ordinario registra la sua revisione", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    // Il ripristino fallisce: lo stato resta in memoria, sporco.
    pilot.rompi.salva = true;
    await act(async () => {
      await canale.api.ripristina(n);
    });
    await respiro();
    pilot.rompi.salva = false;
    expect(canale.api.sporco).toBe(true);

    // Si riapre la stessa bozza scartando: sessione nuova, contenuto dal disco.
    let apertura;
    act(() => {
      apertura = canale.api.apri(id);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Scarta modifiche").click();
    });
    await respiro();
    expect((await apertura).esito).toBe(ESITI.fatto);
    expect(canale.api.contenuto.editoriale.claim).toBe("B");

    // Una modifica normale, e un salvataggio normale.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "Dopo la riapertura");
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("Dopo la riapertura");
    // Lo stato precedente c'è, una volta sola: la revisione ordinaria è stata
    // registrata, non soppressa dal marcatore di una sessione finita.
    expect(sul.versioni).toHaveLength(revisioniPrima + 1);
    expect(sul.versioni.at(-1).dati.editoriale.claim).toBe("B");
    expect(sul.versioni.map((v) => v.n)).toEqual(sul.versioni.map((_, i) => i + 1));
  });
});

describe("il codice dell'operazione appartiene alla propria scrittura", () => {
  it("nel percorso no-op, «Salva e continua» con elenco rotto conserva errore-elenco", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    // Primo ripristino: fallisce prima della scrittura.
    pilot.rompi.salva = true;
    await act(async () => {
      await canale.api.ripristina(n);
    });
    await respiro();
    pilot.rompi.salva = false;
    const revisioniDopoIlFallimento = (await pilot.leggiDavvero(id)).versioni.length;

    // Retry: «Salva e continua» persiste lo stato richiesto, ma l'elenco rompe.
    pilot.rompi.elenca = true;
    let promessa;
    act(() => {
      promessa = canale.api.ripristina(n);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();
    pilot.rompi.elenca = false;

    expect((await promessa).esito).toBe(ESITI.fatto);
    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("A");
    expect(canale.api.sporco).toBe(false);
    // Nessuna revisione in più oltre quella del salvataggio.
    expect(sul.versioni).toHaveLength(revisioniDopoIlFallimento + 1);
    // E il motivo resta quello vero.
    expect(canale.api.esito.codice).toBe(CODICI.erroreElenco);
    expect(canale.api.esito.codice).not.toBe(CODICI.revisioneRipristinata);
  });

  it("un no-op non eredita l'errore di una scrittura precedente", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    // Un vecchio errore, da una scrittura dell'hook: resta in `ultimaScrittura`.
    await act(async () => {
      canale.api.scriviEditoriale("claim", "C");
    });
    pilot.rompi.elenca = true;
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    pilot.rompi.elenca = false;
    expect(canale.api.esito.codice).toBe(CODICI.erroreElenco);

    /*
     * Si prepara nell'archivio un record il cui stato coincide già con i dati
     * della revisione: è l'unico modo di far passare `ripristina` dal ramo
     * no-op senza provocare un'altra scrittura dell'hook.
     */
    const sul = await pilot.leggiDavvero(id);
    const rev = sul.versioni.find((v) => v.n === n);
    await pilot.archivio.salva({ ...sul, ...rev.dati });
    await act(async () => {
      await canale.api.apri(id);
    });
    await respiro();

    const scrittureePrima = pilot.scritture.length;
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;

    await act(async () => {
      await canale.api.ripristina(n);
    });
    await respiro();

    // Nessuna scrittura, nessuna revisione: è un no-op vero.
    expect(pilot.scritture).toHaveLength(scrittureePrima);
    expect((await pilot.leggiDavvero(id)).versioni).toHaveLength(revisioniPrima);
    // E l'esito è quello della richiesta corrente, non il vecchio errore.
    expect(canale.api.esito.codice).toBe(CODICI.revisioneRipristinata);
    expect(canale.api.esito.codice).not.toBe(CODICI.erroreElenco);
  });
});

describe("l'uguaglianza non dipende dall'ordine delle chiavi", () => {
  it("stesse coppie in ordine diverso: nessuna revisione nuova", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;

    /*
     * Il ramo principale passa da `convalidaContenuto`, che lo riscrive nel
     * proprio ordine canonico: riordinare **quello** non proverebbe nulla. È
     * `versioni[].dati` a essere `z.unknown()`, quindi conserva l'ordine
     * ricevuto — ed è lì che va messa la differenza.
     */
    const sul = await pilot.leggiDavvero(id);
    const rev = sul.versioni.find((v) => v.n === n);
    await pilot.archivio.salva({
      ...sul,
      // Il contenuto corrente diventa quello della revisione, normalizzato.
      ...rev.dati,
      versioni: sul.versioni.map((v) =>
        v.n === n ? { ...v, dati: { ...v.dati, editoriale: riordinaProfondo(v.dati.editoriale) } } : v,
      ),
    });
    await act(async () => {
      await canale.api.apri(id);
    });
    await respiro();

    // Le precondizioni della prova, dimostrate e non assunte.
    const dopoLaRilettura = await pilot.leggiDavvero(id);
    const datiRev = dopoLaRilettura.versioni.find((v) => v.n === n).dati.editoriale;
    const corrente = dopoLaRilettura.editoriale;
    expect(Object.keys(datiRev).sort()).toEqual(Object.keys(corrente).sort());
    for (const k of Object.keys(corrente)) {
      expect(datiRev[k]).toEqual(corrente[k]);
    }
    expect(Object.keys(datiRev)).not.toEqual(Object.keys(corrente));
    expect(JSON.stringify(datiRev)).not.toBe(JSON.stringify(corrente));

    const revisioniPrima = dopoLaRilettura.versioni.length;
    const scrittureePrima = pilot.scritture.length;

    await act(async () => {
      await canale.api.ripristina(n);
    });
    await respiro();

    expect(canale.api.esito.codice).toBe(CODICI.revisioneRipristinata);
    // Riconosciuto come già compiuto: nessuna scrittura, nessuna voce nuova.
    expect(pilot.scritture).toHaveLength(scrittureePrima);
    expect((await pilot.leggiDavvero(id)).versioni).toHaveLength(revisioniPrima);
  });

  it("un valore annidato davvero diverso fa ripristinare per davvero", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const id = await bozzaConStoria();
    const n = canale.api.revisioni().find((v) => v.ripristinabile).n;
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;

    await act(async () => {
      await canale.api.ripristina(n);
    });
    await respiro();

    const sul = await pilot.leggiDavvero(id);
    expect(sul.editoriale.claim).toBe("A");
    expect(sul.versioni).toHaveLength(revisioniPrima + 1);
  });
});

describe("la revisione scelta sopravvive al diradamento", () => {
  it("«Salva e continua» non la fa sparire da sotto i piedi", async () => {
    const { MASSIME_REVISIONI } = await import("../fondamenta/versioni");
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

    /*
     * Si porta la cronologia **esattamente** al tetto: la revisione successiva
     * fa scattare il diradamento, che tiene le ultime metà e una ogni due delle
     * più vecchie. La seconda voce — la più vecchia ripristinabile — è fra
     * quelle che spariscono.
     */
    let k = 0;
    while ((await pilot.leggiDavvero(id)).versioni.length < MASSIME_REVISIONI) {
      k += 1;
      await act(async () => {
        canale.api.scriviEditoriale("claim", `v${k}`);
      });
      await act(async () => {
        await canale.api.salva();
      });
      await respiro();
    }
    const versioniPrima = (await pilot.leggiDavvero(id)).versioni;
    expect(versioniPrima).toHaveLength(MASSIME_REVISIONI);
    const scelta = versioniPrima[1].n;
    const attesi = versioniPrima[1].dati;
    expect(attesi).toBeTruthy();

    await act(async () => {
      canale.api.scriviEditoriale("claim", "lavoro da salvare");
    });
    let promessa;
    act(() => {
      promessa = canale.api.ripristina(scelta);
    });
    await respiro();
    expect(dialogo()).toBeTruthy();
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await respiro();

    expect((await promessa).esito).toBe(ESITI.fatto);
    const sul = await pilot.leggiDavvero(id);
    // Il numero scelto non è più nell'elenco: il diradamento l'ha tolto.
    expect(sul.versioni.some((v) => v.n === scelta)).toBe(false);
    // E il ripristino è arrivato comunque ai dati originariamente scelti.
    expect(sul.editoriale.claim).toBe(attesi.editoriale.claim);
    // Il lavoro salvato prima del ripristino è nella cronologia.
    expect(sul.versioni.map((v) => v.dati?.editoriale?.claim)).toContain("lavoro da salvare");
    // E una sola voce forzata per questo ripristino.
    expect(
      sul.versioni.filter((v) => v.etichetta === `stato prima del ripristino della v${scelta}`),
    ).toHaveLength(1);
    expect(canale.api.sporco).toBe(false);
  });
});

/** Un ritaglio sintetico: nessun file, nessun byte, solo il riferimento. */
const ritaglio = (idBlob, extra = {}) => ({
  idBlob,
  // Entro il dominio dello schema: `zoom` 1–4, `x` e `y` 0–1.
  zoom: 1.4,
  x: 0.3,
  y: 0.7,
  specchiata: false,
  ...extra,
});

/**
 * Le fotografie stanno in SocialStorage; nel contenuto sta come ritrovarle.
 *
 * È la regola che tiene i record piccoli e i backup leggibili: un Blob o un
 * data URL dentro `media` finirebbe nelle revisioni, nei backup e in ogni
 * copia del contenuto, e crescerebbe senza che nessuno se ne accorga.
 */
describe("gli slot fotografici di TOUR", () => {
  it("una bozza nuova ha gli slot vuoti e dichiara solo cover e story", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    expect(canale.api.slotMediaDisponibili().map((s) => s.id)).toEqual(["cover", "story"]);
    expect(canale.api.leggiMedia("cover")).toBeNull();
    expect(canale.api.leggiMedia("story")).toBeNull();
    expect(canale.api.contenuto.media.cover).toBeNull();
    expect(canale.api.contenuto.media.sfondi.tourStory).toBeUndefined();
  });

  it("assegna, legge, sostituisce e rimuove entrambi gli slot", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    await act(async () => {
      canale.api.scriviMedia("cover", ritaglio("b-cover"));
      canale.api.scriviMedia("story", ritaglio("b-story", { specchiata: true }));
    });

    // Il ritaglio è conservato per intero.
    expect(canale.api.leggiMedia("cover")).toEqual(ritaglio("b-cover"));
    expect(canale.api.leggiMedia("story")).toEqual(ritaglio("b-story", { specchiata: true }));
    // In rami diversi: l'uno non sovrascrive l'altro.
    expect(canale.api.contenuto.media.cover.idBlob).toBe("b-cover");
    expect(canale.api.contenuto.media.sfondi.tourStory.idBlob).toBe("b-story");

    // Sostituzione e rimozione.
    await act(async () => {
      canale.api.scriviMedia("cover", ritaglio("b-cover-2"));
      canale.api.scriviMedia("story", null);
    });
    expect(canale.api.leggiMedia("cover").idBlob).toBe("b-cover-2");
    expect(canale.api.leggiMedia("story")).toBeNull();
  });

  it("nel contenuto entrano solo idBlob e parametri del ritaglio", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    await act(async () => {
      canale.api.scriviMedia("cover", {
        ...ritaglio("b-cover"),
        dati: "data:image/png;base64,AAAA",
        blob: { fintoByte: true },
        nomeFile: "foto.jpg",
      });
    });

    const salvatoInMemoria = canale.api.contenuto.media.cover;
    expect(Object.keys(salvatoInMemoria).sort()).toEqual(
      ["idBlob", "specchiata", "x", "y", "zoom"].sort(),
    );
    expect(JSON.stringify(canale.api.contenuto)).not.toContain("base64");
    expect(JSON.stringify(canale.api.contenuto)).not.toContain("foto.jpg");
  });

  it("slot non valido e bozza assente non cambiano niente", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);

    // Senza bozza aperta.
    expect(canale.api.scriviMedia("cover", ritaglio("b")).codice).toBe(CODICI.nessunaBozza);
    expect(canale.api.contenuto).toBeNull();

    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const prima = canale.api.contenuto;

    // Slot che TOUR non dichiara, compresi quelli di EVENTI.
    for (const slot of ["esperienza-0", "storyNumeri", "inventato"]) {
      expect(canale.api.scriviMedia(slot, ritaglio("b")).codice).toBe(
        CODICI.slotMediaNonValido,
      );
      expect(canale.api.leggiMedia(slot)).toBeNull();
    }
    await respiro();
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.sporco).toBe(false);
  });

  it("assegnare una fotografia sporca la bozza senza salvarla", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const scrittureePrima = pilot.scritture.length;

    await act(async () => {
      canale.api.scriviMedia("cover", ritaglio("b-cover"));
    });
    await respiro();

    expect(canale.api.sporco).toBe(true);
    expect(pilot.scritture).toHaveLength(scrittureePrima);
  });

  it("scrivere una fotografia e salvare nello stesso giro la persiste", async () => {
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
    const revisioniPrima = (await pilot.leggiDavvero(id)).versioni.length;

    let promessa;
    act(() => {
      canale.api.scriviMedia("story", ritaglio("b-story"));
      promessa = canale.api.salva();
    });
    await respiro();
    await promessa;

    const sul = await pilot.leggiDavvero(id);
    expect(sul.media.sfondi.tourStory).toEqual(ritaglio("b-story"));
    expect(canale.api.sporco).toBe(false);
    // Una revisione sola per quella modifica.
    expect(sul.versioni).toHaveLength(revisioniPrima + 1);

    // E riaprendo, quello che si legge è quello che c'è.
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
    expect(canale.api.leggiMedia("story")).toEqual(ritaglio("b-story"));
  });

  it("una risposta tardiva non cancella una fotografia assegnata dopo", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const sosta = pilot.fermaProssima("salva");
    let promessa;
    act(() => {
      canale.api.scriviEditoriale("claim", "In volo");
      promessa = canale.api.salva();
    });
    await respiro();
    await act(async () => {
      canale.api.scriviMedia("cover", ritaglio("b-arrivata-dopo"));
    });
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(await promessa).toBeNull();
    expect(canale.api.sporco).toBe(true);
    expect(canale.api.leggiMedia("cover").idBlob).toBe("b-arrivata-dopo");
  });
});

describe("le fotografie del sito restano sul sito", () => {
  it("creare da un tour non importa nulla in media", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const conFoto = {
      ...TOUR,
      foto: "/immagini/tour/prova.jpg",
      gallery: ["/immagini/tour/a.jpg", "/immagini/tour/b.jpg"],
      tappe: [{ title: "Uno", desc: "x", foto: "/immagini/tappe/uno.jpg", fotoAlt: "Uno" }],
    };

    await act(async () => {
      await canale.api.creaDaTour(conFoto);
    });

    const c = canale.api.contenuto;
    // Niente è stato copiato, scaricato o assegnato.
    expect(c.media.cover).toBeNull();
    expect(c.media.sfondi.tourStory).toBeUndefined();
    expect(canale.api.leggiMedia("cover")).toBeNull();
    expect(canale.api.leggiMedia("story")).toBeNull();
    // Nessun percorso del sito fuori dall'istantanea della fonte.
    const senzaFonte = JSON.stringify({ ...c, fonte: null });
    expect(senzaFonte).not.toContain("/immagini/");
    expect(senzaFonte).not.toContain(".jpg");
  });
});

/**
 * Un ritaglio si convalida al confine, non al salvataggio.
 *
 * Filtrare i nomi dei campi lasciava entrare valori fuori dominio: l'hook
 * accettava e mostrava la modifica, e il rifiuto arrivava molto dopo, come
 * generico errore di scrittura.
 */
describe("ritagli non validi", () => {
  const NON_VALIDI = [
    ["zoom 0", { idBlob: "b", zoom: 0 }],
    ["zoom oltre 4", { idBlob: "b", zoom: 9 }],
    ["x fuori dominio", { idBlob: "b", x: -1 }],
    ["y fuori dominio", { idBlob: "b", y: 2 }],
    ["zoom come stringa", { idBlob: "b", zoom: "1.4" }],
    ["specchiata come stringa", { idBlob: "b", specchiata: "sì" }],
    ["idBlob numerico", { idBlob: 12 }],
    ["valore primitivo", "non un ritaglio"],
    ["numero", 42],
    ["array", [{ idBlob: "b" }]],
    ["data URL in idBlob", { idBlob: "data:image/png;base64,AAAA" }],
    ["URL blob: in idBlob", { idBlob: "blob:http://localhost/abc" }],
    ["percorso assoluto in idBlob", { idBlob: "/immagini/tour/foto.jpg" }],
    ["percorso file:", { idBlob: "file:///Users/x/foto.jpg" }],
    /*
     * Da 6.3H.2: un `idBlob` è una chiave opaca dell'archivio. L'elenco dei
     * prefissi vietati era una lista di casi noti, e tutto ciò che segue vi
     * passava attraverso.
     */
    ["idBlob vuoto", { idBlob: "" }],
    ["idBlob di soli spazi", { idBlob: "   " }],
    ["idBlob null dentro l'oggetto", { idBlob: null }],
    ["idBlob assente", { zoom: 1.4, x: 0.3, y: 0.7 }],
    ["spazi iniziali", { idBlob: "  img-1" }],
    ["spazi finali", { idBlob: "img-1  " }],
    ["percorso relativo con slash", { idBlob: "cartella/foto.jpg" }],
    ["unità Windows con backslash", { idBlob: "C:\\foto.jpg" }],
    ["unità Windows con slash", { idBlob: "C:/foto.jpg" }],
    ["percorso UNC", { idBlob: "\\\\server\\condivisa\\foto.jpg" }],
    ["URL http", { idBlob: "http://example.com/foto.jpg" }],
    ["URL https", { idBlob: "https://example.com/foto.jpg" }],
    ["URL ftp", { idBlob: "ftp://server/foto.jpg" }],
    ["schema URI generico", { idBlob: "urn:uuid:8f3a1c22" }],
  ];

  it.each(NON_VALIDI)("rifiuta %s senza toccare nulla", async (_nome, valore) => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const prima = canale.api.contenuto;
    const scrittureePrima = pilot.scritture.length;

    let esito;
    await act(async () => {
      esito = canale.api.scriviMedia("cover", valore);
    });
    await respiro();

    expect(esito.codice).toBe(CODICI.ritaglioMediaNonValido);
    expect(canale.api.esito.codice).toBe(CODICI.ritaglioMediaNonValido);
    // Identico per riferimento: non è stato nemmeno ricreato.
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.sporco).toBe(false);
    expect(pilot.scritture).toHaveLength(scrittureePrima);
    expect(canale.api.leggiMedia("cover")).toBeNull();
  });

  it("un Blob non diventa un ritaglio vuoto", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    const prima = canale.api.contenuto;

    const campioni = [new Blob(["x"], { type: "image/png" })];
    if (typeof File !== "undefined") {
      campioni.push(new File(["x"], "foto.jpg", { type: "image/jpeg" }));
    }
    for (const campione of campioni) {
      let esito;
      await act(async () => {
        esito = canale.api.scriviMedia("cover", campione);
      });
      expect(esito.codice).toBe(CODICI.ritaglioMediaNonValido);
    }
    await respiro();
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.leggiMedia("cover")).toBeNull();
  });

  it("campi extra vengono filtrati, il ritaglio valido passa", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    await act(async () => {
      canale.api.scriviMedia("cover", {
        ...ritaglio("b-cover"),
        nomeFile: "foto.jpg",
        byte: 99999,
      });
    });
    expect(canale.api.leggiMedia("cover")).toEqual(ritaglio("b-cover"));
  });

  /**
   * La regola è una forma ammessa, non un elenco di divieti — quindi va
   * verificato anche che gli id veri continuino a passare.
   */
  it("gli identificatori che SocialStorage produce davvero passano", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    // La forma di `nuovoId("img")` in archivio.js: prefisso, millisecondi, coda.
    const veri = ["img-1757000000000-a1b2c3", "img-1757086400000-zk9q0p"];
    for (const id of veri) {
      let esito;
      await act(async () => {
        esito = canale.api.scriviMedia("cover", ritaglio(id));
      });
      expect(esito.codice).toBe(CODICI.mediaAssegnato);
      expect(canale.api.leggiMedia("cover").idBlob).toBe(id);
    }
  });

  it("un rifiuto non blocca l'assegnazione valida dello stesso giro", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    let rifiutato;
    let accettato;
    await act(async () => {
      rifiutato = canale.api.scriviMedia("cover", { idBlob: "cartella/foto.jpg" });
      accettato = canale.api.scriviMedia("cover", ritaglio("img-1757000000000-a1b2c3"));
    });
    await respiro();

    expect(rifiutato.codice).toBe(CODICI.ritaglioMediaNonValido);
    expect(accettato.codice).toBe(CODICI.mediaAssegnato);
    // L'ultima parola è dell'assegnazione riuscita, anche nell'esito mostrato.
    expect(canale.api.esito.codice).toBe(CODICI.mediaAssegnato);
    expect(canale.api.leggiMedia("cover")).toEqual(ritaglio("img-1757000000000-a1b2c3"));
    expect(canale.api.sporco).toBe(true);
  });

  it("dopo un rifiuto si può ancora assegnare e salvare", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      canale.api.scriviMedia("cover", { idBlob: "b", zoom: 99 });
    });
    expect(canale.api.esito.codice).toBe(CODICI.ritaglioMediaNonValido);

    await act(async () => {
      canale.api.scriviMedia("cover", ritaglio("b-buono"));
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    const id = canale.api.contenuto.id;
    expect((await pilot.leggiDavvero(id)).media.cover).toEqual(ritaglio("b-buono"));
    expect(canale.api.sporco).toBe(false);
  });
});

/* ================================================================== *
 * GPX: il riferimento si salva, la geometria no
 * ================================================================== */

/*
 * GPX sintetici, scritti qui: nessun percorso reale entra nel repository, e
 * nemmeno nelle prove. Le coordinate sono inventate e servono solo a far
 * esistere due punti distinti.
 */
const GPX_DUE_PUNTI = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Prima prova</name><trkseg>
    <trkpt lat="40.0000" lon="9.0000"><ele>100</ele></trkpt>
    <trkpt lat="40.0100" lon="9.0100"><ele>140</ele></trkpt>
  </trkseg></trk>
  <wpt lat="40.0050" lon="9.0050"><name>Punto inventato</name></wpt>
</gpx>`;

/** Un secondo GPX, riconoscibile dal primo: tre punti e un altro nome. */
const GPX_ALTRO = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Seconda prova</name><trkseg>
    <trkpt lat="41.0000" lon="8.0000"><ele>10</ele></trkpt>
    <trkpt lat="41.0100" lon="8.0100"><ele>20</ele></trkpt>
    <trkpt lat="41.0200" lon="8.0200"><ele>30</ele></trkpt>
  </trkseg></trk>
</gpx>`;

const GPX_MALFORMATO = `<?xml version="1.0"?><gpx><trk><trkseg></gpx>`;
const XML_NON_GPX = `<?xml version="1.0"?><cartella><voce nome="niente"/></cartella>`;
/** GPX legittimo, ma senza un segmento utilizzabile: un punto solo e un wpt. */
const GPX_SENZA_TRACCIA = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg><trkpt lat="40.0000" lon="9.0000"/></trkseg></trk>
  <wpt lat="40.0050" lon="9.0050"><name>Solo un punto</name></wpt>
</gpx>`;

const fileGpx = (testo, nome = "percorso.gpx") =>
  new File([testo], nome, { type: "application/gpx+xml" });

/** Crea una bozza, le assegna un GPX e la salva. Restituisce id e idBlob. */
async function bozzaConGpx(pilot, testo = GPX_DUE_PUNTI, nome = "percorso.gpx") {
  await act(async () => {
    await canale.api.creaDaTour(TOUR);
  });
  await act(async () => {
    await canale.api.caricaGpx(fileGpx(testo, nome));
  });
  await act(async () => {
    await canale.api.salva();
  });
  await respiro();
  return { id: canale.api.contenuto.id, idBlob: canale.api.contenuto.mappa.gpx.idBlob };
}

describe("il GPX entra come riferimento, non come geometria", () => {
  it("senza una bozza non legge e non scrive niente", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);

    let esiti;
    await act(async () => {
      esiti = [
        await canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI)),
        await canale.api.ricaricaGpx(),
        canale.api.rimuoviGpx(),
        canale.api.impostaConservaGpx(true),
      ];
    });

    expect(esiti.map((e) => e.codice)).toEqual([
      CODICI.nessunaBozza,
      CODICI.nessunaBozza,
      CODICI.nessunaBozza,
      CODICI.nessunaBozza,
    ]);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.nessunaBozza);
    expect(pilot.blobSalvati).toHaveLength(0);
    expect(pilot.scritture).toHaveLength(0);
    expect(canale.api.tracciaGpx).toBeNull();
    expect(canale.api.contenuto).toBeNull();
  });

  const NON_FILE = [
    ["null", null],
    ["indefinito", undefined],
    ["una stringa", GPX_DUE_PUNTI],
    ["un numero", 42],
    ["un oggetto qualunque", { name: "percorso.gpx", size: 10 }],
    ["un array", [GPX_DUE_PUNTI]],
  ];

  it.each(NON_FILE)("rifiuta %s senza toccare l'archivio", async (_nome, valore) => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    const prima = canale.api.contenuto;

    let esito;
    await act(async () => {
      esito = await canale.api.caricaGpx(valore);
    });

    expect(esito.codice).toBe(CODICI.fileGpxNonValido);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.fileGpxNonValido);
    expect(pilot.blobSalvati).toHaveLength(0);
    // Identico per riferimento: non è stato nemmeno ricreato.
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.tracciaGpx).toBeNull();
  });

  const NON_ANALIZZABILI = [
    ["XML malformato", GPX_MALFORMATO, "gpxIllegibile"],
    ["XML che non è un GPX", XML_NON_GPX, "gpxIllegibile"],
    ["GPX senza un segmento utilizzabile", GPX_SENZA_TRACCIA, "gpxSenzaTraccia"],
  ];

  it.each(NON_ANALIZZABILI)(
    "%s: nessun binario entra nell'archivio",
    async (_nome, testo, codice) => {
      const pilot = archivioPilotabile();
      await monta(pilot.archivio);
      await act(async () => {
        await canale.api.creaDaTour(TOUR);
      });
      const prima = canale.api.contenuto;

      let esito;
      await act(async () => {
        esito = await canale.api.caricaGpx(fileGpx(testo, "rotto.gpx"));
      });

      expect(esito.codice).toBe(CODICI[codice]);
      expect(canale.api.esitoGpx.codice).toBe(CODICI[codice]);
      // Il punto dell'ordine: si analizza **prima** di salvare.
      expect(pilot.blobSalvati).toHaveLength(0);
      expect(canale.api.contenuto).toBe(prima);
      expect(canale.api.contenuto.mappa.gpx).toBeNull();
      expect(canale.api.tracciaGpx).toBeNull();
    },
  );

  it("un GPX valido salva il binario, scrive il riferimento e tiene la geometria in memoria", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    const file = fileGpx(GPX_DUE_PUNTI, "prova-sintetica.gpx");

    let esito;
    await act(async () => {
      esito = await canale.api.caricaGpx(file);
    });

    expect(esito.codice).toBe(CODICI.gpxCaricato);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxCaricato);

    // Un solo binario, ed è quello riferito dal contenuto.
    expect(pilot.blobSalvati).toHaveLength(1);
    const rif = canale.api.contenuto.mappa.gpx;
    expect(rif.idBlob).toBe(pilot.blobSalvati[0]);
    expect(rif.nome).toBe("prova-sintetica.gpx");
    expect(rif.byte).toBe(file.size);
    // Il riferimento è solo questo: niente geometria, niente byte.
    expect(Object.keys(rif).sort()).toEqual(["byte", "idBlob", "nome"]);

    // La geometria vive soltanto in memoria.
    expect(canale.api.tracciaGpx.segmenti).toHaveLength(1);
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(2);
    expect(canale.api.tracciaGpx.idBlob).toBe(rif.idBlob);
    expect(canale.api.tracciaGpx.metriche.distanzaKm).toBeGreaterThan(0);
    expect(canale.api.tracciaGpx.metriche.punti).toBe(2);
  });

  it("nel contenuto non finiscono coordinate, segmenti né XML", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI));
    });

    const serializzato = JSON.stringify(canale.api.contenuto);
    for (const spia of ["trkpt", "trkseg", "<gpx", "segmenti", "waypoint", "metriche", "9.0100"]) {
      expect(serializzato, `«${spia}» nel contenuto`).not.toContain(spia);
    }
    // E la traccia in memoria invece ce l'ha: la prova non è vuota.
    expect(canale.api.tracciaGpx.segmenti[0][1].lon).toBeCloseTo(9.01, 4);
  });

  it("i waypoint restano etichette: nessuna località e nessuna tappa", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI));
    });

    // Il waypoint c'è, ed è noto.
    expect(canale.api.tracciaGpx.waypoint).toHaveLength(1);
    expect(canale.api.tracciaGpx.waypoint[0].nome).toBe("Punto inventato");
    // Ma non è diventato un dato della bozza.
    expect(canale.api.contenuto.mappa.localita).toEqual([]);
    expect(canale.api.contenuto.fattuali.tappe).toEqual([]);
    expect(JSON.stringify(canale.api.contenuto)).not.toContain("Punto inventato");
  });

  it("caricare non tocca fatti, media, fonte e testi, e non salva da solo", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const prima = canale.api.contenuto;
    const scrittureePrima = pilot.scritture.length;

    await act(async () => {
      await canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI));
    });

    // I rami che non c'entrano restano gli **stessi oggetti**.
    expect(canale.api.contenuto.fattuali).toBe(prima.fattuali);
    expect(canale.api.contenuto.editoriale).toBe(prima.editoriale);
    expect(canale.api.contenuto.media).toBe(prima.media);
    expect(canale.api.contenuto.fonte).toBe(prima.fonte);
    expect(canale.api.contenuto.editoriale.caption.testo).toBe("");
    // Modifica come le altre: non salvata, e non salvata da sola.
    expect(canale.api.sporco).toBe(true);
    expect(pilot.scritture).toHaveLength(scrittureePrima);
  });

  it("il salvataggio persiste il riferimento e registra una revisione sola", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { id, idBlob } = await bozzaConGpx(pilot);

    const sul = await pilot.leggiDavvero(id);
    expect(sul.mappa.gpx.idBlob).toBe(idBlob);
    expect(sul.mappa.gpx.nome).toBe("percorso.gpx");
    expect(sul.versioni).toHaveLength(1);
    expect(JSON.stringify(sul)).not.toContain("trkpt");
    expect(canale.api.sporco).toBe(false);
  });
});

describe("ricostruire la traccia dal binario", () => {
  it("aprire una bozza ricostruisce la geometria senza sporcarla", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { id, idBlob } = await bozzaConGpx(pilot);

    // Si passa ad altro, così la traccia in memoria non è più quella.
    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    expect(canale.api.tracciaGpx).toBeNull();

    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    await act(async () => {
      await canale.api.apri(id);
    });
    await respiro();

    expect(canale.api.esito.codice).toBe(CODICI.aperta);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxRicostruito);
    expect(canale.api.tracciaGpx.idBlob).toBe(idBlob);
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(2);
    // Ricostruire non è modificare.
    expect(canale.api.sporco).toBe(false);
    expect(canale.api.contenuto.mappa.gpx.idBlob).toBe(idBlob);
  });

  it("binario assente: il riferimento resta, la traccia no", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { id, idBlob } = await bozzaConGpx(pilot);

    // Il file sparisce dall'archivio: un backup importato senza GPX, o il
    // browser che ha ripulito lo spazio.
    pilot.nullo.leggiBlob = true;
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

    expect(canale.api.esito.codice).toBe(CODICI.aperta);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxBlobAssente);
    expect(canale.api.tracciaGpx).toBeNull();
    // Il riferimento **non** si cancella per un file che manca.
    expect(canale.api.contenuto.mappa.gpx.idBlob).toBe(idBlob);
    expect(canale.api.sporco).toBe(false);
  });

  it("binario illeggibile: il riferimento resta e il motivo è esplicito", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    // Un binario che c'è ma non si lascia analizzare.
    const rotto = new Blob([GPX_MALFORMATO], { type: "application/gpx+xml" });
    const idBlob = await pilot.archivio.salvaBlob("gpx", rotto, { nome: "rotto.gpx" });
    const id = await pilot.archivio.salva({
      ...contenutoVuoto({ categoria: "tour", formato: "post" }),
      titolo: "Con un file rotto",
      mappa: { gpx: { idBlob, nome: "rotto.gpx", byte: rotto.size } },
    });

    await act(async () => {
      await canale.api.apri(id);
    });
    await respiro();

    expect(canale.api.esito.codice).toBe(CODICI.aperta);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxIllegibile);
    expect(canale.api.tracciaGpx).toBeNull();
    expect(canale.api.contenuto.mappa.gpx.idBlob).toBe(idBlob);
    expect(canale.api.sporco).toBe(false);
  });

  it("ricaricaGpx riprova quando il binario torna disponibile", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { id, idBlob } = await bozzaConGpx(pilot);

    pilot.nullo.leggiBlob = true;
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
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxBlobAssente);

    // Il file torna: si riprova senza riaprire la bozza.
    pilot.nullo.leggiBlob = false;
    let esito;
    await act(async () => {
      esito = await canale.api.ricaricaGpx();
    });
    await respiro();

    expect(esito.codice).toBe(CODICI.gpxRicostruito);
    expect(canale.api.tracciaGpx.idBlob).toBe(idBlob);
    expect(canale.api.sporco).toBe(false);
    // E l'esito della bozza non è stato toccato da nessuna delle due prove.
    expect(canale.api.esito.codice).toBe(CODICI.aperta);
  });

  it("un archivio che rifiuta la lettura è un esito, non una rejection", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConGpx(pilot);

    pilot.rompi.leggiBlob = true;
    let esito;
    await act(async () => {
      esito = await canale.api.ricaricaGpx();
    });

    expect(esito.codice).toBe(CODICI.erroreArchivioGpx);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.erroreArchivioGpx);
    expect(canale.api.tracciaGpx).toBeNull();
  });
});

/**
 * Una risposta che arriva tardi non deve parlare per la sessione nuova.
 *
 * È la stessa difesa del resto dell'hook, applicata a un canale in più: fra la
 * richiesta del binario e la sua risposta si può aprire un'altra bozza,
 * sostituire il file o toglierlo, e applicare comunque quel risultato
 * mostrerebbe il percorso di una bozza sotto il contenuto di un'altra.
 */
describe("le risposte GPX superate non tornano in memoria", () => {
  it("la lettura di A non tocca la traccia di B aperta nel frattempo", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const a = await bozzaConGpx(pilot, GPX_DUE_PUNTI, "prima.gpx");
    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    await act(async () => {
      await canale.api.caricaGpx(fileGpx(GPX_ALTRO, "seconda.gpx"));
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const b = { id: canale.api.contenuto.id, idBlob: canale.api.contenuto.mappa.gpx.idBlob };

    // Si apre A e la sua lettura si ferma prima di rispondere.
    const sosta = pilot.fermaProssima("leggiBlob");
    await act(async () => {
      await canale.api.apri(a.id);
      await sosta.arrivata;
    });

    // Si apre B, la cui ricostruzione va fino in fondo.
    await act(async () => {
      await canale.api.apri(b.id);
    });
    await respiro();
    expect(canale.api.tracciaGpx.idBlob).toBe(b.idBlob);

    // Solo adesso risponde la lettura di A.
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect(canale.api.contenuto.id).toBe(b.id);
    expect(canale.api.tracciaGpx.idBlob).toBe(b.idBlob);
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(3);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxRicostruito);
  });

  it("la lettura del vecchio id non resuscita un GPX appena rimosso", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConGpx(pilot);

    const sosta = pilot.fermaProssima("leggiBlob");
    let tardiva;
    await act(async () => {
      tardiva = canale.api.ricaricaGpx();
      await sosta.arrivata;
    });

    await act(async () => {
      canale.api.rimuoviGpx();
    });
    expect(canale.api.tracciaGpx).toBeNull();
    expect(canale.api.contenuto.mappa.gpx).toBeNull();

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await tardiva).codice).toBe(CODICI.gpxSuperato);
    // Né la traccia né l'esito della rimozione sono stati sostituiti.
    expect(canale.api.tracciaGpx).toBeNull();
    expect(canale.api.contenuto.mappa.gpx).toBeNull();
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxRimosso);
  });

  it("la ricostruzione automatica non sostituisce il GPX caricato nel frattempo", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const a = await bozzaConGpx(pilot, GPX_DUE_PUNTI, "prima.gpx");
    await act(async () => {
      await canale.api.creaDaTour(ALTRO_TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    /*
     * La ricostruzione che parte da sola all'apertura non prende il blocco —
     * non è un gesto di chi lavora — quindi si può caricare un altro file
     * mentre è in volo. È proprio la corsa che il controllo sull'idBlob esiste
     * per chiudere.
     */
    const sosta = pilot.fermaProssima("leggiBlob");
    await act(async () => {
      await canale.api.apri(a.id);
      await sosta.arrivata;
    });

    await act(async () => {
      await canale.api.caricaGpx(fileGpx(GPX_ALTRO, "seconda.gpx"));
    });
    const nuovo = canale.api.contenuto.mappa.gpx.idBlob;
    expect(nuovo).not.toBe(a.idBlob);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    // Il file vecchio non torna: né come traccia né come esito.
    expect(canale.api.contenuto.mappa.gpx.idBlob).toBe(nuovo);
    expect(canale.api.tracciaGpx.idBlob).toBe(nuovo);
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(3);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxCaricato);
  });

  it("due caricamenti insieme: il secondo non parte alla cieca", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    const sosta = pilot.fermaProssima("salvaBlob");
    let primo;
    await act(async () => {
      primo = canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI, "prima.gpx"));
      await sosta.arrivata;
    });

    let secondo;
    await act(async () => {
      secondo = await canale.api.caricaGpx(fileGpx(GPX_ALTRO, "seconda.gpx"));
    });
    expect(secondo.codice).toBe(CODICI.gpxOccupato);
    // Il secondo non è nemmeno arrivato all'archivio: una sola richiesta, ed è
    // quella del primo file, ancora ferma.
    expect(pilot.blobChiesti).toEqual(["prima.gpx"]);
    expect(pilot.blobSalvati).toHaveLength(0);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await primo).codice).toBe(CODICI.gpxCaricato);
    expect(pilot.blobChiesti).toEqual(["prima.gpx"]);
    expect(pilot.blobSalvati).toHaveLength(1);
    expect(canale.api.contenuto.mappa.gpx.nome).toBe("prima.gpx");
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(2);
  });

  it("smontare mentre si salva il binario non lascia effetti né riferimenti", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    const prima = canale.api.contenuto;

    const sosta = pilot.fermaProssima("salvaBlob");
    let promessa;
    await act(async () => {
      promessa = canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI));
      await sosta.arrivata;
    });

    act(() => radice.unmount());
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });

    expect((await promessa).codice).toBe(CODICI.gpxSuperato);
    // Il binario è nato e non lo riferisce nessuno: si ripulisce.
    expect(pilot.blobSalvati).toHaveLength(1);
    expect(pilot.blobEliminati).toEqual([pilot.blobSalvati[0]]);
    expect(await pilot.leggiBlobDavvero(pilot.blobSalvati[0])).toBeNull();
    // L'ultimo contenuto reso non ha ricevuto nessun riferimento.
    expect(prima.mappa.gpx).toBeNull();

    radice = createRoot(contenitore);
  });

  it("smontare mentre si legge il binario non applica la traccia", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await bozzaConGpx(pilot);

    const sosta = pilot.fermaProssima("leggiBlob");
    let promessa;
    await act(async () => {
      promessa = canale.api.ricaricaGpx();
      await sosta.arrivata;
    });

    act(() => radice.unmount());
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });

    expect((await promessa).codice).toBe(CODICI.gpxSuperato);
    expect(pilot.blobEliminati).toEqual([]);

    radice = createRoot(contenitore);
  });
});

/**
 * Il binario non si cancella insieme al riferimento.
 *
 * Tre ritorni indietro dipendono da questo: la versione già salvata che lo
 * riferisce ancora, una revisione della cronologia che lo riporta, e lo scarto
 * delle modifiche. Cancellarlo qui li renderebbe impossibili tutti e tre, e in
 * silenzio.
 */
describe("togliere e sostituire un GPX", () => {
  it("rimuovere toglie riferimento e traccia, e lascia il binario dov'è", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { idBlob } = await bozzaConGpx(pilot);

    let esito;
    await act(async () => {
      esito = canale.api.rimuoviGpx();
    });

    expect(esito.codice).toBe(CODICI.gpxRimosso);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxRimosso);
    expect(canale.api.contenuto.mappa.gpx).toBeNull();
    expect(canale.api.tracciaGpx).toBeNull();
    expect(canale.api.sporco).toBe(true);
    // Nessuna cancellazione, e il file è ancora leggibile.
    expect(pilot.blobEliminati).toEqual([]);
    expect(await pilot.leggiBlobDavvero(idBlob)).not.toBeNull();
  });

  it("rimuovere quando non c'è nulla da togliere non sporca la bozza", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const prima = canale.api.contenuto;

    let esito;
    await act(async () => {
      esito = canale.api.rimuoviGpx();
    });

    expect(esito.codice).toBe(CODICI.nessunGpx);
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.sporco).toBe(false);
  });

  it("sostituire un GPX non cancella il precedente", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { idBlob: vecchio } = await bozzaConGpx(pilot, GPX_DUE_PUNTI, "prima.gpx");

    await act(async () => {
      await canale.api.caricaGpx(fileGpx(GPX_ALTRO, "seconda.gpx"));
    });

    const nuovo = canale.api.contenuto.mappa.gpx.idBlob;
    expect(nuovo).not.toBe(vecchio);
    expect(pilot.blobEliminati).toEqual([]);
    // Tutti e due i binari sono ancora nell'archivio.
    expect(await pilot.leggiBlobDavvero(vecchio)).not.toBeNull();
    expect(await pilot.leggiBlobDavvero(nuovo)).not.toBeNull();
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(3);
  });
});

/**
 * Il GPX è una modifica come le altre, quindi entra nella cronologia dalla
 * porta principale: si salva, si registra una revisione, si torna indietro.
 */
describe("GPX e Version History", () => {
  it("ripristinare una revisione ricostruisce la traccia di allora", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { idBlob: primo } = await bozzaConGpx(pilot, GPX_DUE_PUNTI, "prima.gpx");

    await act(async () => {
      await canale.api.caricaGpx(fileGpx(GPX_ALTRO, "seconda.gpx"));
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(3);

    // La revisione più recente conserva lo stato con il primo GPX.
    const versoIlPrimo = canale.api.revisioni()[0];
    expect(versoIlPrimo.ripristinabile).toBe(true);

    await act(async () => {
      await canale.api.ripristina(versoIlPrimo.n);
    });
    await respiro();

    expect(canale.api.esito.codice).toBe(CODICI.revisioneRipristinata);
    expect(canale.api.contenuto.mappa.gpx.idBlob).toBe(primo);
    expect(canale.api.tracciaGpx.idBlob).toBe(primo);
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(2);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxRicostruito);
  });

  it("un GPX rimosso e salvato si può ancora ripristinare", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { idBlob } = await bozzaConGpx(pilot);

    await act(async () => {
      canale.api.rimuoviGpx();
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    expect(canale.api.contenuto.mappa.gpx).toBeNull();

    const versoIlGpx = canale.api.revisioni()[0];
    await act(async () => {
      await canale.api.ripristina(versoIlGpx.n);
    });
    await respiro();

    // Il binario non era stato cancellato: il ritorno indietro è completo.
    expect(canale.api.contenuto.mappa.gpx.idBlob).toBe(idBlob);
    expect(canale.api.tracciaGpx.idBlob).toBe(idBlob);
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(2);
  });
});

describe("la politica di conservazione del binario", () => {
  const NON_BOOLEANI = [["una stringa", "sì"], ["un numero", 1], ["null", null], ["undefined", undefined]];

  it.each(NON_BOOLEANI)("rifiuta %s senza toccare contenuto e stato", async (_nome, valore) => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const prima = canale.api.contenuto;

    let esito;
    await act(async () => {
      esito = canale.api.impostaConservaGpx(valore);
    });

    expect(esito.codice).toBe(CODICI.conservaGpxNonValida);
    expect(canale.api.esitoGpx.codice).toBe(CODICI.conservaGpxNonValida);
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.sporco).toBe(false);
  });

  it("un booleano aggiorna la politica, marca non salvato e non scrive", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const scrittureePrima = pilot.scritture.length;
    // Il valore predefinito è conservare.
    expect(canale.api.contenuto.mappa.conservaGpx).toBe(true);

    let esito;
    await act(async () => {
      esito = canale.api.impostaConservaGpx(false);
    });

    expect(esito.codice).toBe(CODICI.conservaGpxAggiornata);
    expect(canale.api.contenuto.mappa.conservaGpx).toBe(false);
    expect(canale.api.sporco).toBe(true);
    expect(pilot.scritture).toHaveLength(scrittureePrima);

    // E si persiste come qualunque altra modifica.
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    expect((await pilot.leggiDavvero(canale.api.contenuto.id)).mappa.conservaGpx).toBe(false);
  });
});

/**
 * Il file resta un asset dell'attività: esce solo se qualcuno lo chiede.
 */
describe("il binario non esce per abitudine", () => {
  it("il backup ordinario non contiene il GPX, quello esplicito sì", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { idBlob } = await bozzaConGpx(pilot);

    const ordinario = await pilot.archivio.esportaBackup();
    expect(ordinario.gpx).toBeUndefined();
    const serializzato = JSON.stringify(ordinario);
    expect(serializzato).not.toContain("trkpt");
    expect(serializzato).not.toContain("<gpx");
    // Il riferimento invece c'è: è un dato della bozza.
    expect(serializzato).toContain(idBlob);

    // La prova non è vuota: chiedendolo, il file esce davvero.
    const completo = await pilot.archivio.esportaBackup({ includiGpx: true });
    expect(completo.gpx).toHaveLength(1);
    expect(completo.gpx[0].contenuto).toContain("trkpt");
  });
});

/**
 * Togliere un GPX deve vincere anche contro un caricamento partito prima.
 *
 * La guardia iniziale di `rimuoviGpx` guardava solo il riferimento e la
 * traccia, e durante il primo caricamento di una bozza vuota sono **entrambi
 * ancora vuoti**: il gesto tornava «nessun GPX» senza invalidare nulla, e la
 * risposta di `salvaBlob` arrivava dopo e assegnava il file a una bozza da cui
 * era appena stato tolto.
 */
describe("annullare un caricamento GPX non ancora applicato", () => {
  it("su una bozza vuota: il caricamento in volo non torna indietro", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const prima = canale.api.contenuto;

    const sosta = pilot.fermaProssima("salvaBlob");
    let caricamento;
    await act(async () => {
      caricamento = canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI));
      await sosta.arrivata;
    });
    // La finestra del difetto: il file è già analizzato, ma non applicato.
    expect(canale.api.contenuto.mappa.gpx).toBeNull();
    expect(canale.api.tracciaGpx).toBeNull();

    let esito;
    await act(async () => {
      esito = canale.api.rimuoviGpx();
    });

    expect(esito.codice).toBe(CODICI.gpxCaricamentoAnnullato);
    // Non c'era nessun riferimento da togliere: la bozza non si sporca.
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.sporco).toBe(false);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await caricamento).codice).toBe(CODICI.gpxSuperato);
    expect(canale.api.contenuto.mappa.gpx).toBeNull();
    expect(canale.api.tracciaGpx).toBeNull();
    // Il binario è nato e non lo riferisce nessuno: si ripulisce.
    expect(pilot.blobEliminati).toEqual([pilot.blobSalvati[0]]);
    // E l'esito resta quello del gesto, non quello della risposta tardiva.
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxCaricamentoAnnullato);
  });

  it("durante una sostituzione: toglie il vecchio e il nuovo non arriva", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    const { idBlob: vecchio } = await bozzaConGpx(pilot, GPX_DUE_PUNTI, "prima.gpx");

    const sosta = pilot.fermaProssima("salvaBlob");
    let caricamento;
    await act(async () => {
      caricamento = canale.api.caricaGpx(fileGpx(GPX_ALTRO, "seconda.gpx"));
      await sosta.arrivata;
    });

    let esito;
    await act(async () => {
      esito = canale.api.rimuoviGpx();
    });

    // Qui un riferimento c'era davvero: è una rimozione, e sporca la bozza.
    expect(esito.codice).toBe(CODICI.gpxRimosso);
    expect(canale.api.contenuto.mappa.gpx).toBeNull();
    expect(canale.api.tracciaGpx).toBeNull();
    expect(canale.api.sporco).toBe(true);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await caricamento).codice).toBe(CODICI.gpxSuperato);
    expect(canale.api.contenuto.mappa.gpx).toBeNull();
    expect(canale.api.tracciaGpx).toBeNull();
    expect(canale.api.esitoGpx.codice).toBe(CODICI.gpxRimosso);

    // Il vecchio binario resta — una revisione può riportarlo — e il nuovo,
    // che non ha mai raggiunto un contenuto, se ne va.
    const nuovo = pilot.blobSalvati.at(-1);
    expect(nuovo).not.toBe(vecchio);
    expect(pilot.blobEliminati).toEqual([nuovo]);
    expect(await pilot.leggiBlobDavvero(vecchio)).not.toBeNull();
    expect(await pilot.leggiBlobDavvero(nuovo)).toBeNull();
  });

  it("annullando mentre si legge il file, il binario non nasce nemmeno", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();

    // La sosta sta sulla lettura del file, che non passa dall'archivio.
    const sosta = rinviata();
    const arrivo = rinviata();
    const file = fileGpx(GPX_DUE_PUNTI);
    const testoVero = file.text.bind(file);
    file.text = async () => {
      arrivo.risolvi();
      await sosta.promessa;
      return testoVero();
    };

    let caricamento;
    await act(async () => {
      caricamento = canale.api.caricaGpx(file);
      await arrivo.promessa;
    });

    let esito;
    await act(async () => {
      esito = canale.api.rimuoviGpx();
    });
    expect(esito.codice).toBe(CODICI.gpxCaricamentoAnnullato);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();

    expect((await caricamento).codice).toBe(CODICI.gpxSuperato);
    // L'archivio non è stato nemmeno sfiorato: nessun orfano da ripulire.
    expect(pilot.blobChiesti).toEqual([]);
    expect(pilot.blobSalvati).toEqual([]);
    expect(pilot.blobEliminati).toEqual([]);
    expect(canale.api.contenuto.mappa.gpx).toBeNull();
    expect(canale.api.sporco).toBe(false);
  });

  it("il blocco lo libera solo chi l'ha preso, non chi annulla", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });

    const sosta = pilot.fermaProssima("salvaBlob");
    let caricamento;
    await act(async () => {
      caricamento = canale.api.caricaGpx(fileGpx(GPX_DUE_PUNTI, "prima.gpx"));
      await sosta.arrivata;
    });
    await act(async () => {
      canale.api.rimuoviGpx();
    });

    // L'operazione di prima è ancora in volo: nessun'altra parte.
    let durante;
    await act(async () => {
      durante = await canale.api.caricaGpx(fileGpx(GPX_ALTRO, "seconda.gpx"));
    });
    expect(durante.codice).toBe(CODICI.gpxOccupato);
    expect(pilot.blobChiesti).toEqual(["prima.gpx"]);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await respiro();
    expect((await caricamento).codice).toBe(CODICI.gpxSuperato);

    // Finita quella, il blocco è libero e un nuovo caricamento riesce.
    let dopo;
    await act(async () => {
      dopo = await canale.api.caricaGpx(fileGpx(GPX_ALTRO, "terza.gpx"));
    });

    expect(dopo.codice).toBe(CODICI.gpxCaricato);
    expect(canale.api.contenuto.mappa.gpx.nome).toBe("terza.gpx");
    expect(canale.api.tracciaGpx.segmenti[0]).toHaveLength(3);
  });

  it("senza riferimento e senza niente in volo resta «nessun GPX»", async () => {
    const pilot = archivioPilotabile();
    await monta(pilot.archivio);
    await act(async () => {
      await canale.api.creaDaTour(TOUR);
    });
    await act(async () => {
      await canale.api.salva();
    });
    await respiro();
    const prima = canale.api.contenuto;

    let esito;
    await act(async () => {
      esito = canale.api.rimuoviGpx();
    });

    expect(esito.codice).toBe(CODICI.nessunGpx);
    expect(canale.api.contenuto).toBe(prima);
    expect(canale.api.sporco).toBe(false);
    expect(pilot.blobEliminati).toEqual([]);
  });
});
