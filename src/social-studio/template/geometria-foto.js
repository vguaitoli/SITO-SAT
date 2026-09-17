/**
 * Dove va disegnata una fotografia perché copra un riquadro senza deformarsi.
 *
 * Esiste per una ragione misurata, non teorica. Nel browser `object-fit: cover`
 * ritaglia; html2canvas 1.4.1 **non legge `object-fit`** — disegna l'immagine
 * intera dentro il riquadro intero:
 *
 *     ctx.drawImage(image, 0, 0, intrinsicWidth, intrinsicHeight,
 *                          box.left, box.top, box.width, box.height)
 *
 * cioè una scala orizzontale e una verticale diverse. Una fotografia 1800×832
 * in un riquadro 1080×1350 usciva schiacciata di 0,60 in orizzontale e
 * allungata di 1,62 in verticale: nel PNG un cerchio diventava un'ovale alto e
 * un quadrato un rettangolo. L'anteprima era giusta e l'esportazione no, che è
 * il modo peggiore di sbagliare — il difetto si vede solo aprendo il file.
 *
 * La soluzione non è correggere il PNG dopo: è dare all'immagine una geometria
 * **esplicita in pixel**, la stessa che `object-fit: cover` calcolerebbe. Così
 * il riquadro dell'immagine ha già le proporzioni giuste, e a html2canvas resta
 * da fare una scala sola — la stessa nei due assi.
 *
 * Modulo puro: nessun React, nessun DOM. Lo stesso calcolo vale per l'anteprima
 * e per la cattura, perché è lo stesso numero.
 */

/**
 * La geometria «cover» di un'immagine dentro un riquadro.
 *
 * Riproduce `object-fit: cover` con `object-position: x% y%`, più uno zoom
 * moltiplicativo. La scala è **unica** per i due assi per costruzione: si
 * riempie ritagliando, mai deformando.
 *
 * Il punto focale è una frazione dell'immagine che va a cadere sulla stessa
 * frazione del riquadro — è ciò che rende `x: 0` «allineato a sinistra» e
 * `x: 1` «allineato a destra», come fa `object-position`.
 *
 * @param {object} opzioni
 * @param {{larghezza: number, altezza: number}} opzioni.intrinseca
 *   dimensioni vere del file, non quelle dell'elemento
 * @param {{larghezza: number, altezza: number}} opzioni.contenitore
 * @param {number} [opzioni.zoom=1]
 * @param {number} [opzioni.x=0.5] punto focale orizzontale, 0…1
 * @param {number} [opzioni.y=0.5] punto focale verticale, 0…1
 * @returns {{larghezza: number, altezza: number, sinistra: number, alto: number, scala: number}|null}
 *   `null` quando le dimensioni non sono ancora note o non sono utilizzabili:
 *   disegnare con una geometria provvisoria è esattamente ciò che va evitato.
 */
export function geometriaCover({ intrinseca, contenitore, zoom = 1, x = 0.5, y = 0.5 }) {
  const numeroPositivo = (v) => Number.isFinite(v) && v > 0;
  if (
    !numeroPositivo(intrinseca?.larghezza) ||
    !numeroPositivo(intrinseca?.altezza) ||
    !numeroPositivo(contenitore?.larghezza) ||
    !numeroPositivo(contenitore?.altezza) ||
    !numeroPositivo(zoom)
  ) {
    return null;
  }

  // Una scala sola, la più grande fra le due che bastano a coprire.
  const copertura = Math.max(
    contenitore.larghezza / intrinseca.larghezza,
    contenitore.altezza / intrinseca.altezza,
  );
  const scala = copertura * zoom;

  const larghezza = intrinseca.larghezza * scala;
  const altezza = intrinseca.altezza * scala;

  /*
   * `object-position` distribuisce l'eccedenza: a p% il bordo sinistro sta a
   * `(riquadro − immagine) × p`. Con lo zoom l'eccedenza è negativa da entrambi
   * i lati, e la formula continua a valere senza casi particolari.
   */
  const sinistra = (contenitore.larghezza - larghezza) * limita(x);
  const alto = (contenitore.altezza - altezza) * limita(y);

  return { larghezza, altezza, sinistra, alto, scala };
}

/** Il punto focale vive in 0…1: fuori di lì non è un punto della fotografia. */
function limita(v) {
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}
