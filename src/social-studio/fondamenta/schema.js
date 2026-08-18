import { z } from "zod";

/**
 * Schema dei contenuti di Social Studio.
 *
 * Due principi guidano questa forma:
 *
 * 1. Dati fattuali ed editoriali stanno in rami separati, non mescolati. Ciò
 *    che è fattuale non deve mai finire fra il materiale che un modello
 *    linguistico può riscrivere.
 * 2. Il sito resta la fonte primaria. `fonte.istantanea` è una copia di sola
 *    lettura scattata al momento dell'import: serve ad accorgersi quando il
 *    sito cambia sotto un contenuto già pronto, non a diventare una seconda
 *    verità.
 */

/** Versione dello schema. Si incrementa a ogni modifica non retrocompatibile. */
export const VERSIONE_SCHEMA = 1;

export const CATEGORIE = [
  "tour", "eventi", "trail", "sardegna", "guide", "garage", "crew", "info",
];

export const FORMATI = ["post", "story", "carosello"];

export const STATI = ["bozza", "pronto", "programmato", "pubblicato", "archiviato"];

/** Da dove viene un singolo dato fattuale. Rende verificabile il Fact Lock. */
export const ORIGINI = ["sito", "manuale", "gpx"];

/** Disponibilità dei posti, mostrata sul badge accanto alla data. */
export const STATI_POSTI = ["disponibili", "ultimi", "soldout", "attesa"];

/** Taglie della caption. Passano al provider come parte della richiesta. */
export const LUNGHEZZE_CAPTION = ["breve", "standard", "storytelling"];

/**
 * Da dove viene una voce degli highlight.
 *
 * `preset` è scritta a mano per un singolo evento, `punti-interesse` derivata
 * dai dati del sito, `manuale` toccata nell'editor. Serve a sapere cosa è
 * ancora da rileggere: una voce derivata ha il titolo giusto e la descrizione
 * da scrivere.
 */
export const ORIGINI_HIGHLIGHT = ["preset", "punti-interesse", "manuale", ""];

const iso = z.string().datetime({ offset: true }).or(z.string().length(0));
const giorno = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.string().length(0));

/** Riferimento a un binario nell'archivio (foto o GPX). Mai il dato inline. */
export const riferimentoBlob = z.object({
  idBlob: z.string(),
  nome: z.string().default(""),
  byte: z.number().int().nonnegative().default(0),
});

/** Ritaglio non distruttivo: l'originale non viene mai riscritto. */
export const ritaglio = z.object({
  idBlob: z.string().nullable().default(null),
  zoom: z.number().min(1).max(4).default(1),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  /**
   * Ribaltamento orizzontale. Spento per definizione.
   *
   * Nel riferimento EVENTI la fotografia di copertina è specchiata, ma è una
   * scelta su quella fotografia: qui è un dato del ritaglio, accanto a zoom e
   * punto focale. Le bozze salvate prima non hanno il campo e ricevono `false`
   * dalla convalida — nessuna migrazione, nessun cambio di resa.
   */
  specchiata: z.boolean().default(false),
});

export const tappa = z.object({
  id: z.string(),
  giorno: z.string().default(""),
  partenza: z.string().default(""),
  arrivo: z.string().default(""),
  km: z.string().default(""),
  descrizione: z.string().default(""),
  foto: ritaglio.nullable().default(null),
});

/**
 * I dati fattuali. Nessun campo qui è generabile: arriva dal sito, dal GPX o
 * dalla mano dell'utente. `origine` tiene traccia di quale delle tre.
 */
export const fattuali = z.object({
  categoria: z.string().default(""),
  nome: z.string().default(""),
  dataInizio: giorno.default(""),
  dataFine: giorno.default(""),
  periodo: z.string().default(""),
  prezzo: z.string().default(""),
  km: z.string().default(""),
  sterrato: z.string().default(""),
  durata: z.string().default(""),
  livello: z.string().default(""),
  partecipantiMin: z.string().default(""),
  partecipantiMax: z.string().default(""),
  /**
   * Località di partenza. Viene da `startLocation` del sito e l'adapter la
   * importava già, ma questo schema non la dichiarava: la convalida la
   * scartava in silenzio a ogni salvataggio, e `estraiFattuali` la leggeva
   * sempre vuota.
   */
  partenza: z.string().default(""),
  mezzo: z.string().default(""),
  pneumatici: z.string().default(""),
  esperienza: z.string().default(""),
  puntiInteresse: z.array(z.string()).default([]),
  inclusi: z.array(z.string()).default([]),
  nonInclusi: z.array(z.string()).default([]),
  requisiti: z.array(z.string()).default([]),
  tappe: z.array(tappa).default([]),
  url: z.string().default(""),
  origine: z.record(z.enum(ORIGINI)).default({}),
});

/** Ciò che appartiene solo alla comunicazione social. Qui l'AI può lavorare. */
export const editoriale = z.object({
  titoloBreve: z.string().default(""),
  /**
   * Kicker: la riga spaziata sopra il titolo, accanto alla barra in accento.
   *
   * È un dato **editoriale**, non fattuale: «NORD SARDEGNA · GALLURA» è una
   * scelta di racconto, non la località di partenza. Non si deriva dai dati e
   * non si inventa — vuoto per definizione, e il template non disegna il blocco
   * se manca.
   */
  kicker: z.string().default(""),
  claim: z.string().default(""),
  fraseNumeri: z.string().default(""),
  descrizione: z.string().default(""),
  highlight: z.array(z.object({
    id: z.string(),
    titolo: z.string().default(""),
    descrizione: z.string().default(""),
    /** Da dove viene la voce: un preset scritto a mano, i punti di interesse
     *  del sito, o la mano di chi scrive. Serve a sapere cosa va riletto. */
    origine: z.enum(ORIGINI_HIGHLIGHT).default(""),
  })).default([]),
  caption: z.object({
    testo: z.string().default(""),
    lunghezza: z.enum(LUNGHEZZE_CAPTION).default("standard"),
    paragrafiBloccati: z.array(z.number().int().nonnegative()).default([]),
  }).default({}),
  cta: z.string().default(""),
  whatsapp: z.string().default(""),
  statoPosti: z.enum(STATI_POSTI).default("disponibili"),
});

export const configurazioneMappa = z.object({
  gpx: riferimentoBlob.nullable().default(null),
  conservaGpx: z.boolean().default(true),
  zoom: z.number().min(0.2).max(8).default(1),
  spostamento: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  rotazione: z.number().min(-180).max(180).default(0),
  margine: z.number().min(0).max(0.4).default(0.14),
  spessoreTraccia: z.number().min(1).max(24).default(7),
  mostraMarker: z.boolean().default(true),
  mostraNomi: z.boolean().default(true),
  mostraIsola: z.boolean().default(true),
  mostraAltimetria: z.boolean().default(false),
  localita: z.array(z.object({
    id: z.string(),
    nome: z.string(),
    lon: z.number(),
    lat: z.number(),
  })).default([]),
});

/** Metadati visuali, per la Visual History e il bilanciamento del feed. */
export const visual = z.object({
  /**
   * Mood EVENTI: cambia insieme filtro fotografico, velo e contrasto.
   *
   * I tre nomi vengono dal progetto Claude Design. Non toccano l'accento.
   */
  mood: z.enum(["Notte", "Polvere", "Inchiostro"]).default("Notte"),
  tono: z.enum(["dark", "light", "mixed"]).default("dark"),
  tipo: z.enum(["photo", "graphic", "mixed"]).default("mixed"),
  soggetto: z.array(z.enum(["person", "bike", "landscape", "group", "technical", "food"])).default([]),
  intento: z.enum(["editorial", "commercial", "informative", "community"]).default("editorial"),
});

export const versione = z.object({
  n: z.number().int().positive(),
  quando: iso,
  etichetta: z.string().default(""),
  dati: z.unknown(),
});

export const contenuto = z.object({
  id: z.string(),
  versioneSchema: z.number().int().positive().default(VERSIONE_SCHEMA),
  categoria: z.enum(CATEGORIE),
  formato: z.enum(FORMATI),
  variante: z.string().default("standard"),
  stato: z.enum(STATI).default("bozza"),
  titolo: z.string().default(""),

  fonte: z.object({
    tipo: z.enum(["evento", "tour", "guida", "nessuna"]).default("nessuna"),
    slug: z.string().nullable().default(null),
    istantanea: z.unknown().nullable().default(null),
    importatoIl: iso.default(""),
  }).default({}),

  fattuali: fattuali.default({}),
  editoriale: editoriale.default({}),

  media: z.object({
    cover: ritaglio.nullable().default(null),
    esperienza: z.array(ritaglio.nullable()).default([]),
    sfondi: z.record(ritaglio.nullable()).default({}),
  }).default({}),

  mappa: configurazioneMappa.default({}),
  visual: visual.default({}),
  versioni: z.array(versione).default([]),

  creato: iso,
  modificato: iso,
  dataPrevista: giorno.default(""),
});

/**
 * I tag di una fotografia.
 *
 * Non sono decorazione: con qualche centinaio di immagini sono l'unico modo di
 * ritrovarne una. Per questo si convalidano come tutto il resto — un tag
 * scritto male è una foto che non si trova più.
 */
export const tagMedia = z.object({
  evento: z.string().default(""),
  luogo: z.string().default(""),
  data: giorno.default(""),
  categoria: z.string().default(""),
  soggetto: z.array(z.string()).default([]),
  mezzo: z.string().default(""),
  disciplina: z.string().default(""),
  libere: z.array(z.string()).default([]),
});

/** Voce della libreria media. Il binario sta a parte, qui solo i metadati. */
export const vociMedia = z.object({
  id: z.string(),
  idBlob: z.string(),
  nome: z.string().default(""),
  tipoMime: z.string().default(""),
  byte: z.number().int().nonnegative().default(0),
  larghezza: z.number().int().nonnegative().default(0),
  altezza: z.number().int().nonnegative().default(0),
  aggiunto: iso,
  tag: tagMedia.default({}),
});

/**
 * Convalida i tag di una fotografia, applicando i valori predefiniti.
 * Solleva un errore leggibile: un tag scartato in silenzio sarebbe peggio.
 */
export function convalidaTagMedia(dati) {
  const esito = tagMedia.safeParse(dati ?? {});
  if (esito.success) return esito.data;
  const dettagli = esito.error.issues
    .map((i) => `${i.path.join(".") || "(radice)"}: ${i.message}`)
    .join("; ");
  throw new Error(`Tag non validi — ${dettagli}`);
}

/** Il backup completo, con la sua versione: serve a importarlo in futuro. */
export const backup = z.object({
  formato: z.literal("sta-social-studio-backup"),
  versioneSchema: z.number().int().positive(),
  esportatoIl: iso,
  contenuti: z.array(contenuto).default([]),
  media: z.array(vociMedia).default([]),
  planner: z.array(z.unknown()).default([]),
  impostazioni: z.record(z.unknown()).default({}),
  /** Presente solo se richiesto esplicitamente: i GPX non escono per abitudine. */
  gpx: z.array(z.object({ idBlob: z.string(), nome: z.string(), contenuto: z.string() })).optional(),
});

/**
 * Convalida un contenuto applicando i valori predefiniti.
 * Restituisce sempre un oggetto completo o solleva un errore leggibile.
 */
export function convalidaContenuto(dati) {
  const esito = contenuto.safeParse(dati);
  if (esito.success) return esito.data;
  const dettagli = esito.error.issues
    .map((i) => `${i.path.join(".") || "(radice)"}: ${i.message}`)
    .join("; ");
  throw new Error(`Contenuto non valido — ${dettagli}`);
}

/** Contenuto nuovo, già conforme allo schema. */
export function contenutoVuoto({ categoria = "eventi", formato = "post", id } = {}) {
  const adesso = new Date().toISOString();
  return convalidaContenuto({
    id: id || `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    versioneSchema: VERSIONE_SCHEMA,
    categoria,
    formato,
    creato: adesso,
    modificato: adesso,
  });
}
