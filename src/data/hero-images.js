/**
 * Immagini di apertura scelte a mano per singolo tour o evento, per slug.
 *
 * Una voce qui decide due cose insieme: l'apertura della pagina di dettaglio e
 * l'immagine dell'anteprima quando il link viene condiviso (og:image e
 * JSON-LD). Le due devono coincidere, altrimenti su WhatsApp compare una foto
 * diversa da quella che si vede aprendo la pagina.
 *
 * Senza una voce qui la pagina ricava l'apertura dalla prima tappa che ha una
 * foto, e senza tappe ripiega sull'immagine generica della categoria: è così
 * che tre eventi diversi finivano per mostrare lo stesso scatto. Ogni evento in
 * calendario ha quindi la sua voce; i tour mantengono il comportamento di prima
 * finché non se ne aggiunge una.
 *
 * Una voce ha la precedenza sulla foto della prima tappa, perché è una scelta
 * esplicita per l'apertura mentre quella della tappa illustra la giornata.
 *
 * Non è un campo di TinaCMS per la stessa ragione spiegata in
 * src/data/route-maps.js: aggiungere un campo allo schema blocca le build
 * finché Tina Cloud non reindicizza il branch.
 */
export const HERO_IMAGES = {
  "wild-camp-ferragosto-2026": {
    src: "/media/reali/4x4exp-nuvole-1200.webp",
    alt: "Fuoristrada 4x4 su un crinale sopra il mare di nuvole tra le montagne della Sardegna",
  },
  "sardinia-into-the-wild-2026": {
    src: "/media/reali/4x4-cengia-rocciosa-1400.webp",
    alt: "Fuoristrada 4x4 con tenda da tetto su una cengia rocciosa tra pareti calcaree e macchia mediterranea",
  },
  "maxienduro-sardegna-ottobre-2026": {
    src: "/media/reali/maxienduro-tenere-1200.webp",
    alt: "Maxienduro da viaggio parcheggiata su uno sterrato sotto il cielo sardo",
  },
  "la-via-dei-giganti-2026": {
    src: "/media/reali/maxienduro-gallura-1200.webp",
    alt: "Gruppo di maxienduro in sosta su una pista sterrata della Gallura con il mare sullo sfondo",
  },
  "tour-dei-santi-4x4-2026": {
    src: "/media/reali/4x4exp-crinale-1200.webp",
    alt: "Convoglio di fuoristrada 4x4 in fila su un crinale panoramico tra le montagne sarde",
  },
  "honda-xr-tour-2026": {
    src: "/media/reali/carousel-enduro-12-1200.webp",
    alt: "Rider enduro su un sentiero sterrato in Sardegna",
  },
  "capodanno-2026-sardegna": {
    src: "/media/reali/4x4-discesa-sassosa-1400.webp",
    alt: "Fuoristrada 4x4 in discesa su una pista sassosa, con un secondo mezzo alle spalle e la vallata sullo sfondo",
  },
};
