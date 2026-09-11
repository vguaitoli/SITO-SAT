import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La protezione del lavoro non salvato, dentro l'editor vero.
 *
 * Non su un aiutante isolato: si monta `EditorEvento`, si modifica davvero un
 * campo, e si guarda che cosa succede quando si prova a sostituire il
 * contenuto. È l'unico modo di provare la cosa che conta — che il lavoro non
 * sparisca — perché il difetto viveva proprio nella distanza fra lo stato
 * interno dell'editor e chi decide le transizioni.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom non ha `ResizeObserver`, che `Anteprima` usa per scalare la tela.
globalThis.ResizeObserver ||= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const EVENTI = [
  {
    slug: "primo-evento",
    name: "Primo Evento",
    type: "Enduro",
    date: "2026-05-01T00:00:00.000Z",
    prezzo: "400 €",
    km: "200 km",
    durata: "2 giorni",
    livello: "Medio",
    descrizione: "Primo.",
    tappe: [{ title: "Uno — Due", desc: "Prima" }],
  },
  {
    slug: "secondo-evento",
    name: "Secondo Evento",
    type: "4x4",
    date: "2026-06-01T00:00:00.000Z",
    prezzo: "500 €",
    km: "300 km",
    durata: "3 giorni",
    livello: "Facile",
    descrizione: "Secondo.",
    tappe: [{ title: "Tre — Quattro", desc: "Seconda" }],
  },
];

vi.mock("@/content/TinaContentProvider", () => ({
  useSiteContent: () => ({
    events: EVENTI,
    SITE: { url: "https://esempio.test", whatsapp: "+39 000" },
    TOUR_GROUP: {},
  }),
}));

let EditorEvento;
let FornitoreArchivio;
let FornitoreTransizione;
let creaArchivioMemoria;
let contenitore;
let radice;

beforeEach(async () => {
  ({ default: EditorEvento } = await import("./EditorEvento"));
  ({ FornitoreArchivio } = await import("./ContestoArchivio"));
  ({ FornitoreTransizione } = await import("./transizione"));
  ({ creaArchivioMemoria } = await import("../fondamenta/archivio"));
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

const assesta = async (ms = 60) => {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)); });
};

const bottone = (testo) =>
  [...contenitore.querySelectorAll("button")].find(
    (b) => b.textContent.trim().toLowerCase() === testo.toLowerCase(),
  );

const contiene = (testo) =>
  [...contenitore.querySelectorAll("button")].find((b) =>
    b.textContent.trim().toLowerCase().includes(testo.toLowerCase()),
  );

const premi = async (b) => {
  expect(b).toBeTruthy();
  await act(async () => { b.click(); });
  await assesta();
};

const dialogo = () => contenitore.querySelector('[data-transizione="dialogo"]');

/**
 * Il campo «Titolo breve», trovato dalla sua etichetta.
 *
 * Non per valore: dopo averci scritto dentro il valore cambia, e un helper che
 * cerca per contenuto finirebbe su un altro campo — restituendo stringhe vuote
 * e facendo fallire i test per la ragione sbagliata.
 */
const campoTitolo = () => {
  const etichetta = [...contenitore.querySelectorAll("label")].find((l) =>
    /Titolo breve/i.test(l.textContent || ""),
  );
  const campo =
    etichetta?.querySelector("input[type=text]") ||
    etichetta?.parentElement?.querySelector("input[type=text]");
  // Meglio fallire qui, con il motivo, che restituire null e far fallire
  // l'asserzione successiva per una ragione che non c'entra.
  if (!campo) throw new Error("campo «Titolo breve» non trovato nell'editor montato");
  return campo;
};

async function scrivi(campo, valore) {
  const setter = Object.getOwnPropertyDescriptor(
    campo.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
    "value",
  ).set;
  await act(async () => {
    setter.call(campo, valore);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await assesta();
}

async function monta(archivio = creaArchivioMemoria()) {
  await act(async () => {
    radice.render(
      <FornitoreArchivio archivio={archivio}>
        <FornitoreTransizione>
          <EditorEvento />
        </FornitoreTransizione>
      </FornitoreArchivio>,
    );
  });
  await assesta();
  return archivio;
}

/** Crea una bozza dal primo evento e la sporca con una modifica vera. */
async function conModificaNonSalvata() {
  await premi(contiene("primo evento"));
  const campo = campoTitolo();
  expect(campo).toBeTruthy();
  await scrivi(campo, "Titolo scritto a mano");
  expect(contenitore.textContent).toMatch(/non salvato|modifiche non salvate/i);
  return campo;
}

describe("l'editor dichiara il lavoro non salvato", () => {
  it("una modifica vera rende l'editor sporco", async () => {
    await monta();
    await premi(contiene("primo evento"));
    // Creare da un evento è già lavoro non salvato.
    expect(contenitore.textContent).toMatch(/non salvat/i);
    const campo = campoTitolo();
    await scrivi(campo, "Titolo scritto a mano");
    expect(campo.value).toBe("Titolo scritto a mano");
  });

  it("salvando, l'editor torna pulito", async () => {
    await monta();
    await conModificaNonSalvata();
    await premi(contiene("salva la bozza"));
    expect(contenitore.textContent).toMatch(/salvato alle/i);
  });
});

describe("aprire un'altra bozza è protetto", () => {
  it("con lavoro non salvato chiede prima di sostituire", async () => {
    const archivio = await monta();
    // Una bozza già nell'archivio, da riaprire.
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await assesta();

    // Adesso si crea altro lavoro non salvato…
    await conModificaNonSalvata();
    const elenco = await archivio.elenca({ categoria: "eventi" });
    expect(elenco.length).toBeGreaterThan(0);

    // …e si prova ad aprire la bozza salvata.
    const voce = [...contenitore.querySelectorAll("button")].find((b) =>
      /bozza ·/.test(b.textContent || ""),
    );
    await premi(voce);
    expect(dialogo()).toBeTruthy();
    expect(contenitore.textContent).toContain("Aprire un'altra bozza");
  });

  it("«Annulla» conserva il contenuto e l'identità", async () => {
    await monta();
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await conModificaNonSalvata();

    const voce = [...contenitore.querySelectorAll("button")].find((b) => /bozza ·/.test(b.textContent || ""));
    await premi(voce);
    await premi(bottone("Annulla"));

    expect(dialogo()).toBeNull();
    // Il campo ha ancora quello che ci si era scritto dentro.
    expect(campoTitolo().value).toBe("Titolo scritto a mano");
    expect(contenitore.textContent).toMatch(/non salvat/i);
  });

  it("«Scarta modifiche» apre l'altra bozza e non scrive nell'archivio", async () => {
    const archivio = await monta();
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    const primaDelloScarto = (await archivio.elenca({ categoria: "eventi" })).length;

    await conModificaNonSalvata();
    const voce = [...contenitore.querySelectorAll("button")].find((b) => /bozza ·/.test(b.textContent || ""));
    await premi(voce);
    await premi(bottone("Scarta modifiche"));

    expect(dialogo()).toBeNull();
    // Nessuna bozza in più: scartare non salva, e non cancella quelle già lì.
    expect((await archivio.elenca({ categoria: "eventi" })).length).toBe(primaDelloScarto);
    // Non basta «diverso»: dev'esserci il contenuto dell'altra bozza.
    expect(campoTitolo().value).toBe("Secondo Evento");
  });

  it("«Salva e continua» scrive una revisione sola e poi apre", async () => {
    const archivio = await monta();
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await conModificaNonSalvata();

    const voce = [...contenitore.querySelectorAll("button")].find((b) => /bozza ·/.test(b.textContent || ""));
    await premi(voce);
    await premi(bottone("Salva e continua"));
    await assesta(150);

    expect(dialogo()).toBeNull();
    const elenco = await archivio.elenca({ categoria: "eventi" });
    // Le due bozze: la salvata di partenza e quella appena salvata.
    expect(elenco.length).toBe(2);
    // E la bozza salvata dal dialogo ha una sola revisione per quel gesto.
    // Quella salvata dal dialogo è la bozza nata dal primo evento: porta il
    // titolo scritto a mano, prova che il dialogo ha salvato *questa* e non
    // l'altra, e ha una revisione sola — un gesto, una revisione.
    const voceSalvata = elenco.find((x) => x.titolo === "Primo Evento");
    expect(voceSalvata).toBeTruthy();
    const salvata = await archivio.leggi(voceSalvata.id);
    expect(salvata.editoriale.titoloBreve).toBe("Titolo scritto a mano");
    expect(salvata.versioni).toHaveLength(1);
  });
});

describe("creare da un altro evento è protetto", () => {
  it("chiede prima di sostituire il lavoro in corso", async () => {
    await monta();
    await conModificaNonSalvata();
    await premi(contiene("secondo evento"));
    expect(dialogo()).toBeTruthy();
    expect(contenitore.textContent).toContain("Creare una bozza da un altro evento");
  });

  it("«Annulla» non cambia evento", async () => {
    await monta();
    await conModificaNonSalvata();
    await premi(contiene("secondo evento"));
    await premi(bottone("Annulla"));
    expect(campoTitolo().value).toBe("Titolo scritto a mano");
  });

  it("«Scarta modifiche» passa al nuovo evento", async () => {
    await monta();
    await conModificaNonSalvata();
    await premi(contiene("secondo evento"));
    await premi(bottone("Scarta modifiche"));
    expect(dialogo()).toBeNull();
    expect(campoTitolo().value).toBe("Secondo Evento");
  });
});

describe("il salvataggio che fallisce non lascia procedere", () => {
  it("l'errore si vede e il lavoro resta aperto", async () => {
    const archivio = creaArchivioMemoria();
    const salvaVero = archivio.salva.bind(archivio);
    let rompi = false;
    archivio.salva = async (c) => {
      if (rompi) throw new Error("disco pieno");
      return salvaVero(c);
    };
    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await conModificaNonSalvata();

    rompi = true;
    const voce = [...contenitore.querySelectorAll("button")].find((b) => /bozza ·/.test(b.textContent || ""));
    await premi(voce);
    await premi(bottone("Salva e continua"));

    // La transizione non è avvenuta e il lavoro è ancora lì.
    expect(dialogo()).toBeTruthy();
    expect(campoTitolo().value).toBe("Titolo scritto a mano");
    expect(contenitore.textContent).toMatch(/non salvato: disco pieno/i);
  });
});

describe("corse asincrone", () => {
  it("un salvataggio lento non azzera «non salvato» se nel frattempo si scrive", async () => {
    const archivio = creaArchivioMemoria();
    const salvaVero = archivio.salva.bind(archivio);
    let sblocca;
    archivio.salva = async (c) => {
      await new Promise((r) => { sblocca = r; });
      return salvaVero(c);
    };
    await monta(archivio);
    await premi(contiene("primo evento"));
    const campo = campoTitolo();
    await scrivi(campo, "Prima versione");

    // Parte il salvataggio e resta in volo.
    await act(async () => { contiene("salva la bozza").click(); });
    // Mentre è in volo si scrive ancora.
    await scrivi(campoTitolo(), "Seconda versione");
    // Ora la scrittura ritorna: è superata.
    await act(async () => { sblocca(); await new Promise((r) => setTimeout(r, 80)); });

    // Il campo tiene la modifica più recente…
    expect(campoTitolo().value).toBe("Seconda versione");
    // …e l'editor non si dichiara pulito, perché non lo è.
    expect(contenitore.textContent).toMatch(/nel frattempo hai modificato altro/i);
    expect(contenitore.textContent).not.toMatch(/salvato alle/i);
  });

  it("una richiesta di transizione alla volta", async () => {
    await monta();
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await conModificaNonSalvata();

    const voce = [...contenitore.querySelectorAll("button")].find((b) => /bozza ·/.test(b.textContent || ""));
    await premi(voce);
    // Un secondo tentativo mentre il dialogo è aperto non ne apre un altro.
    await act(async () => { contiene("primo evento").click(); });
    expect(contenitore.querySelectorAll('[data-transizione="dialogo"]')).toHaveLength(1);
  });
});

describe("avviso di uscita dal browser", () => {
  it("si accende solo con lavoro non salvato e si spegne dopo il salvataggio", async () => {
    const aggiunti = [];
    const rimossi = [];
    const add = window.addEventListener.bind(window);
    const rem = window.removeEventListener.bind(window);
    vi.spyOn(window, "addEventListener").mockImplementation((t, f, o) => {
      if (t === "beforeunload") aggiunti.push(f);
      return add(t, f, o);
    });
    vi.spyOn(window, "removeEventListener").mockImplementation((t, f, o) => {
      if (t === "beforeunload") rimossi.push(f);
      return rem(t, f, o);
    });
    try {
      await monta();
      // A editor vuoto non c'è niente da proteggere.
      expect(aggiunti).toHaveLength(0);

      await conModificaNonSalvata();
      expect(aggiunti.length).toBeGreaterThan(0);

      // L'avviso è quello del browser: si accende impostando returnValue.
      const evento = { preventDefault: vi.fn(), returnValue: undefined };
      aggiunti.at(-1)(evento);
      expect(evento.preventDefault).toHaveBeenCalled();
      expect(evento.returnValue).toBe("");

      // Salvando, il listener si ritira: non solo allo smontaggio.
      await premi(contiene("salva la bozza"));
      expect(rimossi.length).toBeGreaterThan(0);
      expect(rimossi).toContain(aggiunti.at(-1));
    } finally {
      vi.restoreAllMocks();
    }
  });
});

/* ================================================================== *
 * Il ciclo asincrono, nell'editor vero
 * ================================================================== */

/** Una promessa che risolve quando lo decide il test. */
const rinviata = () => {
  let risolvi;
  const promessa = new Promise((r) => {
    risolvi = r;
  });
  return { promessa, risolvi };
};

/** La voce di una bozza nell'elenco, riconosciuta dal titolo. */
const voceBozza = (titolo) =>
  [...contenitore.querySelectorAll("button")].find(
    (b) => /bozza ·/.test(b.textContent || "") && (b.textContent || "").startsWith(titolo),
  );

describe("annullare durante una scrittura lenta", () => {
  it("conserva identità e contenuto, e scrive una volta sola", async () => {
    const archivio = creaArchivioMemoria();
    const salvaVero = archivio.salva.bind(archivio);
    const scritture = [];
    let cancello = null;
    archivio.salva = async (c) => {
      scritture.push(c.titolo);
      if (cancello) await cancello.promessa;
      return salvaVero(c);
    };

    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    expect(scritture).toHaveLength(1);

    await conModificaNonSalvata();

    cancello = rinviata();
    await premi(voceBozza("Secondo Evento"));
    expect(dialogo()).toBeTruthy();

    // Il salvataggio parte e resta in volo.
    await act(async () => {
      bottone("Salva e continua").click();
    });
    expect(scritture).toHaveLength(2);

    // Si annulla mentre la scrittura è ancora aperta.
    await act(async () => {
      bottone("Annulla").click();
    });
    await act(async () => {
      cancello.risolvi();
      await cancello.promessa;
    });
    await assesta();

    // L'editor è rimasto sulla propria bozza, con il proprio contenuto.
    expect(dialogo()).toBeNull();
    expect(campoTitolo().value).toBe("Titolo scritto a mano");
    // Nessuna scrittura in più: annullare non ha rifatto partire niente.
    expect(scritture).toHaveLength(2);

    // E il dato persistito è quello giusto, non quello dell'altra bozza.
    const elenco = await archivio.elenca({ categoria: "eventi" });
    const suo = elenco.find((x) => x.titolo === "Primo Evento");
    expect(suo).toBeTruthy();
    expect((await archivio.leggi(suo.id)).editoriale.titoloBreve).toBe("Titolo scritto a mano");
  });
});

describe("aprire un'altra bozza mentre la lettura è lenta", () => {
  it("non sovrascrive le modifiche sopraggiunte", async () => {
    const archivio = creaArchivioMemoria();
    const leggiVero = archivio.leggi.bind(archivio);
    let cancello = null;
    archivio.leggi = async (id) => {
      if (cancello) await cancello.promessa;
      return leggiVero(id);
    };

    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(2);

    // L'editor è pulito: aprire non chiede nulla, ma la lettura è lenta.
    cancello = rinviata();
    await act(async () => {
      voceBozza("Secondo Evento").click();
    });
    expect(dialogo()).toBeNull();

    // Mentre la lettura è in volo, si scrive.
    await scrivi(campoTitolo(), "Scritto durante l'apertura");
    await act(async () => {
      cancello.risolvi();
      await cancello.promessa;
    });
    await assesta();

    // Quello che si è scritto è ancora lì: la bozza letta non l'ha coperto.
    expect(campoTitolo().value).toBe("Scritto durante l'apertura");
    expect(contenitore.textContent).toMatch(/apertura annullata/i);

    // E niente è stato scritto sul disco: il lavoro resta non salvato.
    const elenco = await archivio.elenca({ categoria: "eventi" });
    expect(elenco).toHaveLength(2);
    const suo = elenco.find((x) => x.titolo === "Primo Evento");
    expect((await archivio.leggi(suo.id)).editoriale.titoloBreve).toBe("Primo Evento");
  });
});

/* ================================================================== *
 * Le attese finali del salvataggio
 * ================================================================== */

/**
 * Un archivio che sa fermarsi su una chiamata sola, quando glielo si chiede.
 *
 * Il salvataggio non finisce con la scrittura: dopo aver riletto aggiorna
 * l'elenco delle bozze e lo spazio occupato, e sono due attese come le altre.
 * Qui si aprono, una per volta, per guardare che cosa succede se si scrive
 * proprio lì dentro.
 */
function archivioConSosta() {
  const archivio = creaArchivioMemoria();
  const veri = {
    salva: archivio.salva.bind(archivio),
    elenca: archivio.elenca.bind(archivio),
    spazioUsato: archivio.spazioUsato.bind(archivio),
    elimina: archivio.elimina.bind(archivio),
  };
  const scritture = [];
  const eliminazioni = [];
  const soste = { elenca: null, spazioUsato: null, elimina: null };
  // Si accende quando il test vuole che l'archivio rifiuti l'eliminazione.
  const rompi = { elimina: false, elenca: false };

  archivio.salva = async (c) => {
    scritture.push(c.titolo);
    return veri.salva(c);
  };
  archivio.elimina = async (id) => {
    eliminazioni.push(id);
    const sosta = soste.elimina;
    if (sosta) {
      soste.elimina = null;
      await sosta.promessa;
    }
    if (rompi.elimina) throw new Error("archivio non raggiungibile");
    return veri.elimina(id);
  };
  // Una sosta sola: la prima chiamata dopo l'armamento, non tutte.
  const conSosta = (nome) => async (...args) => {
    const sosta = soste[nome];
    if (sosta) {
      soste[nome] = null;
      await sosta.promessa;
    }
    if (rompi[nome]) throw new Error(`${nome} non disponibile`);
    return veri[nome](...args);
  };
  archivio.elenca = conSosta("elenca");
  archivio.spazioUsato = conSosta("spazioUsato");

  return {
    archivio,
    scritture,
    eliminazioni,
    rompi,
    /** Ferma la prossima chiamata a quel metodo, e restituisce come liberarla. */
    fermaProssima(nome) {
      const sosta = rinviata();
      soste[nome] = sosta;
      return sosta;
    },
  };
}

/** Il cestino della voce con quel titolo, nell'elenco delle bozze. */
const cestino = (titolo) =>
  voceBozza(titolo)?.parentElement?.querySelector('button[title="Elimina la bozza"]') || null;

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

/**
 * Scrivere mentre il salvataggio sta finendo non deve costare il lavoro.
 *
 * @param {"elenca"|"spazioUsato"} dove quale delle due attese finali si apre
 * @param {string} testo che cosa si scrive in quella finestra
 */
function provaSostaFinale(dove, testo) {
  return async () => {
    const { archivio, scritture, fermaProssima } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await conModificaNonSalvata();
    // Una sola scrittura finora: la bozza di destinazione. Creare e scrivere
    // a mano non salva niente.
    expect(scritture).toHaveLength(1);

    await premi(voceBozza("Secondo Evento"));
    expect(dialogo()).toBeTruthy();

    // Il salvataggio parte e si ferma sull'ultima attesa, a scrittura e
    // rilettura già compiute.
    const sosta = fermaProssima(dove);
    await act(async () => {
      bottone("Salva e continua").click();
    });
    await assesta();
    expect(scritture).toHaveLength(2);

    // È qui che si scrive: il dialogo non impedisce di raggiungere i campi.
    await scrivi(campoTitolo(), testo);
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await assesta();

    // La transizione non è avvenuta e il lavoro è ancora qui.
    expect(campoTitolo().value).toBe(testo);
    expect(contenitore.textContent).toMatch(/nel frattempo hai modificato altro/i);
    expect(contenitore.textContent).toMatch(/modifiche non salvate/i);
    // Il dialogo è ancora aperto: si può decidere di nuovo.
    expect(dialogo()).toBeTruthy();
    // Nessuna scrittura in più per quel rifiuto.
    expect(scritture).toHaveLength(2);

    // L'archivio ha la versione davvero salvata, non quella sopraggiunta.
    const elenco = await archivio.elenca({ categoria: "eventi" });
    const suo = elenco.find((x) => x.titolo === "Primo Evento");
    expect(suo).toBeTruthy();
    expect((await archivio.leggi(suo.id)).editoriale.titoloBreve).toBe("Titolo scritto a mano");

    // E riprovando, senza nient'altro di mezzo, salva il testo nuovo e apre.
    await premi(bottone("Salva e continua"));
    await assesta(150);
    expect(dialogo()).toBeNull();
    // Una transizione sola, e una scrittura sola per compierla.
    expect(scritture).toHaveLength(3);
    expect(campoTitolo().value).toBe("Secondo Evento");
    const dopo = elenco.find((x) => x.titolo === "Primo Evento");
    const finale = await archivio.leggi(dopo.id);
    expect(finale.editoriale.titoloBreve).toBe(testo);
    // Due revisioni, non una: il rifiuto costa un secondo salvataggio, perché
    // il primo era già sul disco. È il prezzo dichiarato di non perdere lavoro.
    expect(finale.versioni).toHaveLength(2);
  };
}

describe("scrivere mentre il salvataggio sta finendo", () => {
  it(
    "durante l'aggiornamento dell'elenco non autorizza la transizione",
    provaSostaFinale("elenca", "Scritto durante l'elenco"),
  );

  it(
    "durante l'aggiornamento dello spazio non autorizza la transizione",
    provaSostaFinale("spazioUsato", "Scritto durante lo spazio"),
  );
});

describe("cambiare bozza mentre il salvataggio sta finendo", () => {
  it("lo dice per quello che è, e non per un'altra ragione", async () => {
    const { archivio, scritture, fermaProssima } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await conModificaNonSalvata();

    // Salvataggio normale, senza dialogo: si ferma sull'aggiornamento
    // dell'elenco, a scrittura e rilettura già compiute.
    const sosta = fermaProssima("elenca");
    await act(async () => {
      contiene("salva la bozza").click();
    });
    await assesta();
    expect(scritture).toHaveLength(2);

    // L'editor si è già dichiarato pulito: aprire un'altra bozza non chiede
    // nulla e sostituisce il contenuto proprio lì dentro.
    await act(async () => {
      voceBozza("Secondo Evento").click();
    });
    await assesta();
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await assesta();

    expect(campoTitolo().value).toBe("Secondo Evento");
    // Il motivo dev'essere quello vero: non «hai modificato altro», che
    // manderebbe a salvare di nuovo una bozza che non è più aperta.
    expect(contenitore.textContent).toMatch(/completato su un'altra bozza/i);
    // E quel che era stato salvato è salvato davvero.
    const elenco = await archivio.elenca({ categoria: "eventi" });
    const suo = elenco.find((x) => x.titolo === "Primo Evento");
    expect((await archivio.leggi(suo.id)).editoriale.titoloBreve).toBe("Titolo scritto a mano");
  });
});

/* ================================================================== *
 * Il cestino
 * ================================================================== */

/**
 * Eliminare è distruttivo quanto sostituire, e più definitivo.
 *
 * Il cestino era l'unico gesto rimasto fuori dal contratto: cancellava
 * nell'archivio e poi decideva che cosa svuotare guardando il contenuto
 * catturato **prima** dell'attesa. Da lì due modi di perdere lavoro — buttare
 * via modifiche non salvate senza chiedere, e svuotare una bozza diversa da
 * quella cancellata.
 */
describe("eliminare una bozza", () => {
  it("con modifiche non salvate su quella bozza, non si elimina", async () => {
    const { archivio, eliminazioni } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));
    // Ora è salvata e aperta: la si sporca.
    await scrivi(campoTitolo(), "Modifica non salvata");

    await premi(cestino("Primo Evento"));

    // Niente è stato cancellato, e il lavoro è ancora qui.
    expect(eliminazioni).toHaveLength(0);
    expect(campoTitolo().value).toBe("Modifica non salvata");
    expect(contenitore.textContent).toMatch(/modifiche non salvate/i);
    expect(contenitore.textContent).toMatch(/non eliminata/i);
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(1);
  });

  it("pulita, si elimina e l'editor si riallinea", async () => {
    const { archivio, eliminazioni } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    await premi(cestino("Primo Evento"));

    expect(eliminazioni).toHaveLength(1);
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(0);
    // L'editor è vuoto e non si dichiara sporco.
    expect(contenitore.textContent).not.toMatch(/modifiche non salvate/i);
  });

  it("un'altra bozza si elimina senza toccare quella aperta e sporca", async () => {
    const { archivio, eliminazioni } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));
    await scrivi(campoTitolo(), "Lavoro in corso");

    await premi(cestino("Secondo Evento"));

    expect(eliminazioni).toHaveLength(1);
    // Quella aperta è intatta, modifiche comprese.
    expect(campoTitolo().value).toBe("Lavoro in corso");
    expect(contenitore.textContent).toMatch(/modifiche non salvate/i);
    const rimaste = await archivio.elenca({ categoria: "eventi" });
    expect(rimaste).toHaveLength(1);
    expect(rimaste[0].titolo).toBe("Primo Evento");
  });

  it("un'eliminazione lenta non svuota la bozza aperta nel frattempo", async () => {
    const { archivio, fermaProssima } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    // Si cancella quella aperta (pulita), ma l'archivio è lento.
    const sosta = fermaProssima("elimina");
    await act(async () => {
      cestino("Primo Evento").click();
    });
    await assesta();

    // Nel frattempo si apre l'altra bozza.
    await act(async () => {
      voceBozza("Secondo Evento").click();
    });
    await assesta();
    expect(campoTitolo().value).toBe("Secondo Evento");

    // La risposta tardiva non deve svuotare quello che ora è aperto.
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await assesta();
    expect(campoTitolo().value).toBe("Secondo Evento");
    /*
     * E non basta che non si svuoti: la bozza aperta non è stata eliminata,
     * quindi non va né dichiarata non salvata né annunciata come sparita
     * dall'archivio. Senza questo, confondere l'identità resterebbe invisibile.
     */
    expect(contenitore.textContent).not.toMatch(/eliminata dall'archivio/i);
    expect(contenitore.textContent).not.toMatch(/modifiche non salvate/i);
  });

  it("scrivere durante un'eliminazione lenta non fa sparire quel che si è scritto", async () => {
    const { archivio, fermaProssima } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    const sosta = fermaProssima("elimina");
    await act(async () => {
      cestino("Primo Evento").click();
    });
    await assesta();

    await scrivi(campoTitolo(), "Scritto mentre spariva");
    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await assesta();

    // L'archivio non ce l'ha più, ma la memoria sì — e lo dice.
    expect(campoTitolo().value).toBe("Scritto mentre spariva");
    expect(contenitore.textContent).toMatch(/modifiche non salvate/i);
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(0);
  });

  it("un errore dell'archivio si vede, e non resta una rejection scoperta", async () => {
    const { archivio, rompi, eliminazioni } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    rompi.elimina = true;
    const scoperte = await rejectionNonGestite(async () => {
      await premi(cestino("Primo Evento"));
    });

    expect(scoperte).toHaveLength(0);
    expect(eliminazioni).toHaveLength(1);
    expect(contenitore.textContent).toMatch(/non eliminata: archivio non raggiungibile/i);
    // La bozza è ancora lì, e l'editor pure.
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(1);
    expect(campoTitolo().value).toBe("Primo Evento");
  });

  it("due clic sul cestino non cancellano due volte", async () => {
    const { archivio, eliminazioni, fermaProssima } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    const sosta = fermaProssima("elimina");
    const primo = cestino("Primo Evento");
    /*
     * Due clic nello stesso giro, prima che React ridisegni: è il doppio clic
     * vero, ed è l'unico modo di provare la difesa nella logica invece che
     * nell'attributo. React filtra i click sui pulsanti che considera
     * disabilitati guardando le proprie props, non l'attributo del DOM: un
     * clic «forzato» rimettendo `disabled = false` non arriverebbe mai al
     * gestore, e la prova passerebbe senza aver provato niente.
     */
    await act(async () => {
      primo.click();
      primo.click();
    });
    await assesta();
    expect(eliminazioni).toHaveLength(1);
    // E da qui in poi il pulsante è anche disabilitato, per chi guarda.
    expect(primo.disabled).toBe(true);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await assesta();
    expect(eliminazioni).toHaveLength(1);
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(0);
  });
});

/**
 * L'eliminazione non finisce con la cancellazione.
 *
 * Dopo aver cancellato si ricarica l'elenco, e anche quella è una chiamata
 * all'archivio che può rifiutare. Restava fuori dal `try`: la promessa usciva
 * scoperta da un gestore di clic. E il messaggio dev'essere vero — la bozza
 * **è** stata eliminata — e leggibile anche quando l'editor è rimasto vuoto.
 */
describe("l'elenco che non si aggiorna dopo un'eliminazione", () => {
  it("non lascia una rejection scoperta e lo dice per quello che è", async () => {
    const { archivio, rompi, eliminazioni } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    rompi.elenca = true;
    const scoperte = await rejectionNonGestite(async () => {
      await premi(cestino("Primo Evento"));
    });
    rompi.elenca = false;

    expect(scoperte).toHaveLength(0);
    expect(eliminazioni).toHaveLength(1);
    // La cancellazione è avvenuta davvero: il record non c'è più.
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(0);
    // Quindi non si dice «non eliminata», che manderebbe a riprovare invano.
    expect(contenitore.textContent).not.toMatch(/non eliminata/i);
    // E il messaggio si legge anche con l'editor vuoto.
    expect(contenitore.textContent).toMatch(/elenco non si è aggiornato/i);
    expect(contenitore.textContent).toMatch(/Apri una bozza o creane una/i);
  });

  it("conserva quello che si è scritto durante l'attesa, e lo dice insieme", async () => {
    const { archivio, rompi, fermaProssima } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    const sosta = fermaProssima("elimina");
    await act(async () => {
      cestino("Primo Evento").click();
    });
    await assesta();
    await scrivi(campoTitolo(), "Salvato dall'oblio");

    rompi.elenca = true;
    const scoperte = await rejectionNonGestite(async () => {
      await act(async () => {
        sosta.risolvi();
        await sosta.promessa;
      });
      await assesta();
    });
    rompi.elenca = false;

    expect(scoperte).toHaveLength(0);
    // Il lavoro è ancora qui…
    expect(campoTitolo().value).toBe("Salvato dall'oblio");
    // …e si leggono entrambe le cose, non solo l'ultima.
    expect(contenitore.textContent).toMatch(/eliminata dall'archivio/i);
    expect(contenitore.textContent).toMatch(/elenco non si è aggiornato/i);
  });

  it("il blocco resta fino alla fine del ricaricamento, e poi si libera", async () => {
    const { archivio, eliminazioni, fermaProssima } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("secondo evento"));
    await premi(contiene("salva la bozza"));
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    // La cancellazione passa, ma il ricaricamento resta appeso.
    const sosta = fermaProssima("elenca");
    await act(async () => {
      cestino("Primo Evento").click();
    });
    await assesta();
    expect(eliminazioni).toHaveLength(1);

    /*
     * Il cestino di un'**altra** bozza: è l'unico modo di esercitare il blocco
     * qui. Quello della bozza appena cancellata è disabilitato, e React filtra
     * i click sui pulsanti che considera tali guardando le proprie props:
     * cliccarlo non raggiungerebbe il gestore, e non proverebbe nulla.
     */
    await act(async () => {
      cestino("Secondo Evento").click();
    });
    await assesta();
    expect(eliminazioni).toHaveLength(1);

    await act(async () => {
      sosta.risolvi();
      await sosta.promessa;
    });
    await assesta();

    // Finito il ricaricamento il blocco è libero: adesso l'altra si elimina.
    await premi(cestino("Secondo Evento"));
    expect(eliminazioni).toHaveLength(2);
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(0);
  });

  it("dopo un errore di cancellazione il blocco si libera lo stesso", async () => {
    const { archivio, rompi, eliminazioni } = archivioConSosta();
    await monta(archivio);
    await premi(contiene("primo evento"));
    await premi(contiene("salva la bozza"));

    rompi.elimina = true;
    await premi(cestino("Primo Evento"));
    expect(eliminazioni).toHaveLength(1);
    expect(contenitore.textContent).toMatch(/non eliminata/i);

    // Il blocco non è rimasto chiuso: riprovando, si elimina.
    rompi.elimina = false;
    await premi(cestino("Primo Evento"));
    expect(eliminazioni).toHaveLength(2);
    expect(await archivio.elenca({ categoria: "eventi" })).toHaveLength(0);
  });
});
