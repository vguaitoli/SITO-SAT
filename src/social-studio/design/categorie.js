import { COLORI, FOTO } from "./tokens";

/**
 * Le otto rubriche della comunicazione Instagram di STA.
 *
 * Non sono otto copie dello stesso layout: sono otto rubriche della stessa
 * pubblicazione. Ognuna ha un peso fotografico diverso, un tono diverso e
 * varianti proprie, ma condividono cornice, tipografia e marchio — è da lì che
 * si riconosce il profilo anche senza vedere il logo.
 *
 * `pesoFoto` e `pesoGrafica` non sono percentuali geometriche da rispettare col
 * righello: indicano quanto la fotografia deve dominare la composizione, e da
 * essi derivano la densità del velo scuro e la quantità di elementi grafici
 * ammessi. Sono i valori predefiniti che si caricano scegliendo la rubrica.
 */

export const CATEGORIE = {
  tour: {
    id: "tour",
    numero: "01",
    nome: "Tour",
    scopo: "Presentare le esperienze disponibili.",
    pesoFoto: 60,
    pesoGrafica: 40,
    accento: COLORI.accento,
    velo: FOTO.velo.medio,
    tonoCaption: "Desiderio e esperienza: cosa si vive, per chi è, cosa la distingue.",
    varianti: ["standard", "editoriale", "griglia-dati"],
    formati: ["post", "story"],
  },

  eventi: {
    id: "eventi",
    numero: "02",
    nome: "Eventi",
    scopo: "Riempire le partenze con data confermata.",
    pesoFoto: 50,
    pesoGrafica: 50,
    // L'unico punto in cui vive l'arancio più luminoso della locandina.
    accento: COLORI.accentoEventi,
    velo: FOTO.velo.medio,
    tonoCaption: "Desiderio, dati e conversione. La CTA non è opzionale.",
    varianti: ["standard", "locandina", "minimale"],
    formati: ["post", "story", "carosello"],
    /** La grafica attende il sorgente della locandina: vedi note in fondo. */
    provvisoria: true,
  },

  trail: {
    id: "trail",
    numero: "03",
    nome: "Trail",
    scopo: "Raccontare fondo, tecnica, terreno, difficoltà.",
    pesoFoto: 60,
    pesoGrafica: 40,
    accento: COLORI.accento,
    velo: FOTO.velo.medio,
    tonoCaption: "Tecnico e concreto. Chi legge deve capire com'è il fondo.",
    varianti: ["technical", "photo-data", "topographic"],
    formati: ["post", "story"],
    /** Le rubriche tecniche possono mostrare coordinate e quote. */
    elementiTecnici: true,
  },

  sardegna: {
    id: "sardegna",
    numero: "04",
    nome: "Sardegna",
    scopo: "Far desiderare il territorio.",
    pesoFoto: 90,
    pesoGrafica: 10,
    accento: COLORI.accento,
    velo: FOTO.velo.leggero,
    tonoCaption: "Editoriale ma concreto. Nessun cliché turistico.",
    varianti: ["full-bleed", "editorial", "minimal"],
    formati: ["post", "story"],
  },

  guide: {
    id: "guide",
    numero: "05",
    nome: "Guide",
    scopo: "Far conoscere le persone che accompagnano.",
    pesoFoto: 80,
    pesoGrafica: 20,
    accento: COLORI.accento,
    velo: FOTO.velo.leggero,
    tonoCaption: "Personale, non un curriculum.",
    varianti: ["ritratto", "citazione", "scheda"],
    formati: ["post", "story"],
  },

  garage: {
    id: "garage",
    numero: "06",
    nome: "Garage",
    scopo: "Mostrare competenza tecnica su mezzi e attrezzatura.",
    pesoFoto: 60,
    pesoGrafica: 40,
    accento: COLORI.accento,
    velo: FOTO.velo.medio,
    tonoCaption: "Tecnico e pratico: problema, soluzione, errore da evitare.",
    varianti: ["detail", "tech-sheet", "full-photo"],
    formati: ["post", "story"],
    elementiTecnici: true,
  },

  crew: {
    id: "crew",
    numero: "07",
    nome: "Crew",
    scopo: "Le persone e la vita reale dei tour.",
    pesoFoto: 95,
    pesoGrafica: 5,
    accento: COLORI.accento,
    velo: FOTO.velo.leggero,
    tonoCaption: "Umano e naturale. Nessuna costruzione.",
    varianti: ["full-bleed", "minimal-caption"],
    formati: ["post", "story"],
  },

  info: {
    id: "info",
    numero: "08",
    nome: "Info",
    scopo: "Rispondere alle domande frequenti.",
    pesoFoto: 20,
    pesoGrafica: 80,
    accento: COLORI.accento,
    velo: FOTO.velo.denso,
    tonoCaption: "Chiaro e utile. La risposta prima dei dettagli.",
    varianti: ["scheda", "elenco", "carosello-breve"],
    formati: ["post", "story", "carosello"],
    /** È l'unica rubrica su fondo chiaro: testo nero, arancio, icone, schemi. */
    fondoChiaro: true,
    /** Il carosello INFO ha un numero di slide variabile, da 3 a 6. */
    slideMin: 3,
    slideMax: 6,
  },
};

export const ELENCO_CATEGORIE = Object.values(CATEGORIE).sort((a, b) =>
  a.numero.localeCompare(b.numero),
);

export const ID_CATEGORIE = ELENCO_CATEGORIE.map((c) => c.id);

/** Impostazioni predefinite della rubrica, caricate scegliendola. */
export function predefinitiCategoria(id) {
  const c = CATEGORIE[id];
  if (!c) throw new Error(`Rubrica sconosciuta: ${id}`);
  return {
    accento: c.accento,
    pesoFoto: c.pesoFoto,
    pesoGrafica: c.pesoGrafica,
    velo: c.velo,
    variante: c.varianti[0],
    fondoChiaro: Boolean(c.fondoChiaro),
    elementiTecnici: Boolean(c.elementiTecnici),
  };
}

/** Vero se la variante è fra quelle approvate per la rubrica. */
export function varianteValida(idCategoria, variante) {
  return Boolean(CATEGORIE[idCategoria]?.varianti.includes(variante));
}

/** Vero se il formato è previsto per la rubrica. */
export function formatoValido(idCategoria, formato) {
  return Boolean(CATEGORIE[idCategoria]?.formati.includes(formato));
}
