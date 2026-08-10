/**
 * Immagini di apertura scelte a mano per singolo tour o evento, per slug.
 *
 * Serve ai tour senza programma giornaliero: la pagina di dettaglio ricava
 * altrimenti l'apertura dalla prima tappa che ha una foto, e senza tappe
 * ripiega sull'immagine generica della categoria.
 *
 * Una voce qui ha la precedenza sulla foto della prima tappa, perché è una
 * scelta esplicita per l'apertura mentre quella della tappa illustra la
 * giornata. Chi non compare qui mantiene il comportamento di prima.
 *
 * Non è un campo di TinaCMS per la stessa ragione spiegata in
 * src/data/route-maps.js: aggiungere un campo allo schema blocca le build
 * finché Tina Cloud non reindicizza il branch.
 */
export const HERO_IMAGES = {
  "sardinia-into-the-wild-2026": {
    src: "/media/reali/4x4-cengia-rocciosa-1400.webp",
    alt: "Fuoristrada 4x4 con tenda da tetto su una cengia rocciosa tra pareti calcaree e macchia mediterranea",
  },
};
