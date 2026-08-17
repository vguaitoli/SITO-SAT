import { TELA_STORY } from "./costanti";

/**
 * I formati di pubblicazione, con le loro aree di sicurezza.
 *
 * La Story non è un Post stirato: cambia il rapporto, cambiano i margini e
 * cambia ciò che si può mettere in alto e in basso, perché l'interfaccia di
 * Instagram occupa spazio reale che nel Post non esiste.
 */

export const FORMATI = {
  post: {
    id: "post",
    nome: "Post",
    larghezza: 1080,
    altezza: 1350,
    rapporto: "4:5",
    /**
     * Instagram non ritaglia il 4:5, quindi il margine è una scelta grafica,
     * non una protezione. Resta ampio perché il respiro è parte del look.
     */
    margine: { alto: 84, destro: 84, basso: 84, sinistro: 84 },
    note: "Formato principale. Nessun ritaglio da parte di Instagram.",
  },

  story: {
    id: "story",
    nome: "Story",
    larghezza: TELA_STORY.larghezza,
    altezza: TELA_STORY.altezza,
    rapporto: "9:16",
    /**
     * Qui i margini sono protezione vera. In alto passano l'avatar e la barra
     * di avanzamento; in basso il campo «rispondi» e la zona in cui si mette
     * di solito lo sticker del link. Titolo, dati, logo e CTA stanno dentro.
     */
    margine: { alto: 260, destro: 90, basso: 340, sinistro: 90 },
    /** Fascia riservata allo sticker del link: si lascia libera. */
    zonaSticker: { dalBasso: 340, altezza: 180 },
    note: "L'interfaccia di Instagram copre circa 250 px in alto e 320 in basso.",
  },

  carosello: {
    id: "carosello",
    nome: "Carosello",
    larghezza: 1080,
    altezza: 1350,
    rapporto: "4:5",
    margine: { alto: 84, destro: 84, basso: 84, sinistro: 84 },
    /** Il numero di slide non è una variabile di contenuto: è il format. */
    slide: 8,
    note: "Otto slide a struttura fissa. Cambiarne il numero richiede una variante progettata.",
  },
};

export const ELENCO_FORMATI = Object.values(FORMATI);

/** Area utile, al netto dei margini di sicurezza. */
export function areaUtile(idFormato) {
  const f = FORMATI[idFormato];
  if (!f) throw new Error(`Formato sconosciuto: ${idFormato}`);
  return {
    x: f.margine.sinistro,
    y: f.margine.alto,
    larghezza: f.larghezza - f.margine.sinistro - f.margine.destro,
    altezza: f.altezza - f.margine.alto - f.margine.basso,
  };
}

/**
 * Verifica che un rettangolo stia dentro l'area di sicurezza.
 * Usato dal pre-flight per logo, CTA e blocchi dati.
 */
export function dentroAreaSicura(idFormato, rettangolo) {
  const area = areaUtile(idFormato);
  const sfori = [];
  if (rettangolo.x < area.x) sfori.push("sinistra");
  if (rettangolo.y < area.y) sfori.push("alto");
  if (rettangolo.x + rettangolo.larghezza > area.x + area.larghezza) sfori.push("destra");
  if (rettangolo.y + rettangolo.altezza > area.y + area.altezza) sfori.push("basso");
  return { dentro: sfori.length === 0, sfori };
}
