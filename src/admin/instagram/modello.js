/**
 * Modello dati del carosello Instagram.
 *
 * Una sola struttura alimenta tutte e otto le slide. Il template non cambia
 * mai: cambiano solo i valori qui dentro, le fotografie e il GPX.
 */

export const STATI_POSTI = [
  { id: "disponibili", label: "Posti disponibili" },
  { id: "ultimi", label: "Ultimi posti" },
  { id: "soldout", label: "Sold out" },
  { id: "attesa", label: "Lista d'attesa" },
];

/** Le voci di "cosa è incluso" riconosciute, con l'icona associata. */
export const SERVIZI = [
  { chiave: "pernottamento", etichetta: "Pernottamento", icona: "letto" },
  { chiave: "colazione", etichetta: "Colazione", icona: "caffe" },
  { chiave: "cena", etichetta: "Cena", icona: "posate" },
  { chiave: "pranzo", etichetta: "Pranzo", icona: "posate" },
  { chiave: "mezza pensione", etichetta: "Mezza pensione", icona: "posate" },
  { chiave: "guida", etichetta: "Guida", icona: "guida" },
  { chiave: "assistenza", etichetta: "Assistenza", icona: "chiave" },
  { chiave: "bagagli", etichetta: "Trasporto bagagli", icona: "bagaglio" },
  { chiave: "gps", etichetta: "Tracce GPS", icona: "gps" },
  { chiave: "assicurazione", etichetta: "Assicurazione", icona: "scudo" },
  { chiave: "carburante", etichetta: "Carburante", icona: "carburante" },
  { chiave: "trasporto", etichetta: "Trasporto", icona: "furgone" },
  { chiave: "foto", etichetta: "Servizio foto", icona: "foto" },
  { chiave: "gadget", etichetta: "Gadget", icona: "regalo" },
];

/** Sceglie l'icona più adatta al testo di un servizio. */
export function iconaPerServizio(testo) {
  const t = String(testo || "").toLowerCase();
  const trovato = SERVIZI.find((s) => t.includes(s.chiave));
  return trovato ? trovato.icona : "spunta";
}

export function nuovaTappa(numero = 1) {
  return {
    id: `tappa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    giorno: `Giorno ${numero}`,
    partenza: "",
    arrivo: "",
    km: "",
    descrizione: "",
    foto: null,
  };
}

export function nuovoHighlight() {
  return {
    id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    titolo: "",
    descrizione: "",
  };
}

/** Riferimento a una fotografia: l'immagine sta nell'archivio, qui c'è il crop. */
export function nuovaFoto(idImmagine) {
  return { idImmagine, zoom: 1, x: 0.5, y: 0.5 };
}

export function caroselloVuoto() {
  return {
    versione: 1,
    id: `car-${Date.now()}`,
    aggiornato: new Date().toISOString(),
    slugEvento: null,

    // --- dati evento ---
    categoria: "",
    nome: "",
    claim: "",
    dataInizio: "",
    dataFine: "",
    periodo: "",
    prezzo: "",
    km: "",
    sterrato: "",
    durata: "",
    livello: "",
    partecipantiMin: "",
    partecipantiMax: "",
    mezzo: "",
    pneumatici: "",
    esperienza: "",
    puntiInteresse: [],
    descrizione: "",
    inclusi: [],
    nonInclusi: [],
    requisiti: [],
    cta: "Scrivici per prenotare",
    url: "",
    whatsapp: "",
    statoPosti: "disponibili",

    // --- contenuti per slide ---
    fraseNumeri: "",
    highlight: [],
    tappe: [],

    // --- fotografie (riferimenti all'archivio immagini) ---
    foto: {
      cover: null,
      esperienza: [null, null, null, null],
      sfondoNumeri: null,
      sfondoCta: null,
    },

    // --- mappa ---
    mappa: {
      idGpx: null,
      nomeGpx: "",
      zoom: 1,
      spostamento: { x: 0, y: 0 },
      rotazione: 0,
      margine: 0.14,
      spessoreTraccia: 7,
      mostraMarker: true,
      mostraNomi: true,
      mostraIsola: true,
      localita: [],
    },
  };
}

const soloPiene = (v) => (Array.isArray(v) ? v.filter((x) => String(x || "").trim()) : []);

/** Estrae "5" e "10" da "Da 5 a 10 partecipanti". */
function partecipantiDa(testo) {
  const numeri = String(testo || "").match(/\d+/g);
  if (!numeri || numeri.length < 2) return { min: "", max: "" };
  return { min: numeri[0], max: numeri[1] };
}

/** Divide "Olbia – Tempio" in partenza e arrivo. */
function dividiTratta(titolo) {
  const parti = String(titolo || "").split(/\s+[–—-]\s+/);
  if (parti.length >= 2) return { partenza: parti[0].trim(), arrivo: parti.slice(1).join(" – ").trim() };
  return { partenza: "", arrivo: String(titolo || "").trim() };
}

const soloData = (iso) => (iso ? String(iso).slice(0, 10) : "");

/**
 * Compila il carosello a partire da un evento già presente nel sito.
 *
 * Fotografie e GPX restano vuoti: quelli si caricano a mano.
 *
 * @param {object} evento   evento normalizzato da useSiteContent()
 * @param {object} [extra]  { tourGroup, url, whatsapp }
 */
export function daEventoDelSito(evento, extra = {}) {
  const base = caroselloVuoto();
  const gruppo = partecipantiDa(extra.tourGroup);

  return {
    ...base,
    slugEvento: evento.slug || null,
    categoria: evento.type || "",
    nome: evento.name || "",
    claim: evento.subtitle || "",
    dataInizio: soloData(evento.date),
    dataFine: soloData(evento.endDate),
    periodo: evento.periodo || "",
    prezzo: evento.prezzo || "",
    km: evento.km || "",
    sterrato: evento.sterrato || "",
    durata: evento.durata || "",
    livello: evento.livello || "",
    partecipantiMin: gruppo.min,
    partecipantiMax: gruppo.max,
    mezzo: evento.type || "",
    // Se fra l'equipaggiamento c'è una riga sui pneumatici, vale come valore
    // suggerito per la slide tecnica: resta comunque modificabile.
    pneumatici: soloPiene(evento.equipaggiamento).find((r) => /pneumatic|gomm/i.test(r)) || "",
    esperienza: evento.livello || "",
    puntiInteresse: String(evento.interesse || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    descrizione: evento.descrizione || "",
    inclusi: soloPiene(evento.incluso),
    nonInclusi: soloPiene(evento.esclusioni),
    requisiti: soloPiene(evento.equipaggiamento),
    url: extra.url || "",
    whatsapp: extra.whatsapp || "",
    // La prima riga della descrizione funziona bene come frase della slide 02.
    fraseNumeri: String(evento.descrizione || "").split("\n")[0] || "",
    tappe: (evento.tappe || []).map((t, i) => {
      const tratta = dividiTratta(t.title);
      return {
        ...nuovaTappa(i + 1),
        giorno: `Giorno ${i + 1}`,
        partenza: tratta.partenza,
        arrivo: tratta.arrivo,
        descrizione: t.desc || "",
      };
    }),
    highlight: [],
  };
}

/** Etichetta leggibile del periodo, per le slide. */
export function periodoLeggibile(carosello) {
  if (carosello.periodo) return carosello.periodo;
  const { dataInizio, dataFine } = carosello;
  if (!dataInizio) return "";
  const fmt = (iso, conAnno) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      ...(conAnno ? { year: "numeric" } : {}),
    });
  if (!dataFine || dataFine === dataInizio) return fmt(dataInizio, true);
  return `${fmt(dataInizio, false)} – ${fmt(dataFine, true)}`;
}

/** Forma breve, per la cover: "29.10 → 01.11.2026". */
export function periodoBreve(carosello) {
  const { dataInizio, dataFine } = carosello;
  if (!dataInizio) return carosello.periodo || "";
  const gg = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const anno = new Date(`${(dataFine || dataInizio)}T00:00:00`).getFullYear();
  if (!dataFine || dataFine === dataInizio) return `${gg(dataInizio)}.${anno}`;
  return `${gg(dataInizio)} → ${gg(dataFine)}.${anno}`;
}
