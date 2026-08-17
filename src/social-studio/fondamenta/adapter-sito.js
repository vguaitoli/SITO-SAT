import { VERSIONE_SCHEMA } from "./schema";

/**
 * Lettura dei dati dal sito.
 *
 * Il sito resta la fonte primaria: qui si legge, non si scrive. Ciò che arriva
 * finisce nel ramo `fattuali` con l'origine marcata «sito», e una copia
 * integrale resta in `fonte.istantanea` — serve ad accorgersi quando il sito
 * cambia sotto un contenuto già pronto, non a diventare una seconda verità.
 *
 * L'adapter riceve gli eventi già normalizzati da `useSiteContent()`: la
 * normalizzazione del sito è di fatto il nostro read layer, e riscriverla
 * significherebbe avere due definizioni della stessa cosa.
 */

const soloData = (iso) => (iso ? String(iso).slice(0, 10) : "");
const soloPiene = (v) => (Array.isArray(v) ? v.filter((x) => String(x || "").trim()) : []);

/** Estrae min e max da «Da 5 a 10 partecipanti». */
function partecipantiDa(frase) {
  const numeri = String(frase || "").match(/\d+/g);
  if (!numeri || numeri.length < 2) return { min: "", max: "" };
  return { min: numeri[0], max: numeri[1] };
}

/** Divide «Olbia – Tempio» in partenza e arrivo. */
function dividiTratta(titolo) {
  const parti = String(titolo || "").split(/\s+[–—-]\s+/);
  if (parti.length >= 2) {
    return { partenza: parti[0].trim(), arrivo: parti.slice(1).join(" – ").trim() };
  }
  return { partenza: "", arrivo: String(titolo || "").trim() };
}

/**
 * Costruisce i rami `fattuali`, `editoriale` e `fonte` da un evento del sito.
 *
 * Non inventa nulla: ciò che il sito non dice resta vuoto. In particolare km
 * per singola tappa e pneumatici non esistono nella fonte e vanno inseriti a
 * mano se servono.
 */
export function daEvento(evento, { tourGroup, urlBase = "", whatsapp = "" } = {}) {
  if (!evento) throw new Error("Nessun evento da importare.");
  const gruppo = partecipantiDa(tourGroup);

  const tappe = (evento.tappe || []).map((t, i) => {
    const tratta = dividiTratta(t.title);
    return {
      id: `tappa-${i + 1}`,
      giorno: `Giorno ${i + 1}`,
      partenza: tratta.partenza,
      arrivo: tratta.arrivo,
      km: "", // il sito non lo espone per tappa
      descrizione: t.desc || "",
      foto: null,
    };
  });

  const campiDalSito = [
    "categoria", "nome", "dataInizio", "dataFine", "periodo", "prezzo", "km",
    "sterrato", "durata", "livello", "mezzo", "puntiInteresse", "inclusi",
    "nonInclusi", "requisiti", "tappe", "url",
  ];

  return {
    fonte: {
      tipo: "evento",
      slug: evento.slug || null,
      istantanea: strutturaConfrontabile(evento),
      importatoIl: new Date().toISOString(),
    },

    fattuali: {
      categoria: evento.type || "",
      nome: evento.name || "",
      dataInizio: soloData(evento.date),
      dataFine: soloData(evento.endDate),
      periodo: evento.periodo || "",
      prezzo: evento.prezzo || "",
      km: evento.km || "",
      sterrato: evento.sterrato || "",
      durata: evento.durata || "",
      livello: evento.livello || "",
      partenza: evento.partenza || "",
      partecipantiMin: gruppo.min,
      partecipantiMax: gruppo.max,
      mezzo: evento.type || "",
      pneumatici: soloPiene(evento.equipaggiamento).find((r) => /pneumatic|gomm/i.test(r)) || "",
      esperienza: evento.livello || "",
      puntiInteresse: String(evento.interesse || "").split(",").map((s) => s.trim()).filter(Boolean),
      inclusi: soloPiene(evento.incluso),
      nonInclusi: soloPiene(evento.esclusioni),
      requisiti: soloPiene(evento.equipaggiamento),
      tappe,
      url: evento.slug && urlBase ? `${urlBase}/eventi/${evento.slug}` : "",
      origine: Object.fromEntries(campiDalSito.map((c) => [c, "sito"])),
    },

    editoriale: {
      // Il sottotitolo del sito è già scritto per essere un claim.
      claim: evento.subtitle || "",
      titoloBreve: evento.name || "",
      fraseNumeri: String(evento.descrizione || "").split("\n")[0] || "",
      descrizione: evento.descrizione || "",
      whatsapp,
      cta: "Scrivici per prenotare",
    },
  };
}

/**
 * I soli campi che vale la pena confrontare per capire se il sito è cambiato.
 * Tenere tutto renderebbe il confronto rumoroso: `updatedAt` cambia sempre.
 */
function strutturaConfrontabile(evento) {
  return {
    name: evento.name ?? null,
    subtitle: evento.subtitle ?? null,
    type: evento.type ?? null,
    periodo: evento.periodo ?? null,
    date: soloData(evento.date),
    endDate: soloData(evento.endDate),
    prezzo: evento.prezzo ?? null,
    km: evento.km ?? null,
    sterrato: evento.sterrato ?? null,
    durata: evento.durata ?? null,
    livello: evento.livello ?? null,
    interesse: evento.interesse ?? null,
    incluso: soloPiene(evento.incluso),
    esclusioni: soloPiene(evento.esclusioni),
    equipaggiamento: soloPiene(evento.equipaggiamento),
    tappe: (evento.tappe || []).map((t) => t.title ?? ""),
  };
}

/** Etichette leggibili dei campi, per i messaggi di scostamento. */
const NOMI = {
  name: "nome", subtitle: "sottotitolo", type: "tipologia", periodo: "periodo",
  date: "data di inizio", endDate: "data di fine", prezzo: "prezzo", km: "chilometri",
  sterrato: "sterrato", durata: "durata", livello: "livello",
  interesse: "punti di interesse", incluso: "servizi inclusi",
  esclusioni: "esclusioni", equipaggiamento: "requisiti", tappe: "tappe",
};

/**
 * Confronta l'istantanea con l'evento attuale del sito.
 *
 * È il senso di `fonte.istantanea`: un contenuto approvato la settimana scorsa
 * può riferirsi a un prezzo che nel frattempo è cambiato, e nessuno se ne
 * accorgerebbe guardando la grafica.
 *
 * @returns {{allineato: boolean, scostamenti: {campo: string, nome: string, prima: unknown, adesso: unknown}[]}}
 */
export function confrontaConLaFonte(contenuto, eventoAttuale) {
  const istantanea = contenuto?.fonte?.istantanea;
  if (!istantanea || !eventoAttuale) return { allineato: true, scostamenti: [] };

  const adesso = strutturaConfrontabile(eventoAttuale);
  const scostamenti = [];

  for (const campo of Object.keys(adesso)) {
    const prima = JSON.stringify(istantanea[campo] ?? null);
    const dopo = JSON.stringify(adesso[campo] ?? null);
    if (prima !== dopo) {
      scostamenti.push({
        campo,
        nome: NOMI[campo] || campo,
        prima: istantanea[campo] ?? null,
        adesso: adesso[campo] ?? null,
      });
    }
  }

  return { allineato: scostamenti.length === 0, scostamenti };
}

/** Aggiorna l'istantanea dopo un reimport consapevole. */
export function riallineaAllaFonte(contenuto, eventoAttuale) {
  return {
    ...contenuto,
    versioneSchema: contenuto.versioneSchema ?? VERSIONE_SCHEMA,
    fonte: {
      ...contenuto.fonte,
      istantanea: strutturaConfrontabile(eventoAttuale),
      importatoIl: new Date().toISOString(),
    },
  };
}
