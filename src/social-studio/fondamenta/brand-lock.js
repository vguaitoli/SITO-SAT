/**
 * Brand Lock.
 *
 * Attivo per impostazione predefinita. Finché è attivo, ciò che costituisce
 * l'identità — font, palette, margini, posizione del logo, numerazione,
 * struttura dei template, proporzioni, stile delle CTA — non è modificabile
 * dall'editor. Non perché sia intoccabile in assoluto, ma perché non deve
 * cambiare per distrazione mentre si lavora a un singolo contenuto.
 *
 * Il lucchetto è una regola dichiarata e verificabile, non un sentimento: le
 * proprietà bloccate stanno in un elenco, e `puoiModificare()` è l'unico punto
 * che decide. Se qualcuno aggiunge un campo all'editor senza passare da qui, il
 * test di copertura lo segnala.
 */

/** Le proprietà che il Brand Lock protegge. */
export const PROPRIETA_BLOCCATE = [
  "font",
  "palette",
  "logo",
  "posizioneLogo",
  "margini",
  "areaSicura",
  "markerCategoria",
  "proporzioni",
  "ctaStandard",
  "numerazione",
  "strutturaTemplate",
  "scalaTipografica",
];

/** Ciò che resta sempre modificabile: è il contenuto, non l'identità. */
export const PROPRIETA_LIBERE = [
  "testi",
  "fotografie",
  "ritaglio",
  "gpx",
  "configurazioneMappa",
  "tappe",
  "highlight",
  "icone",
  "datiEvento",
  "caption",
  "variante", // solo fra quelle approvate per la rubrica
  "statoEditoriale",
  "dataPrevista",
];

export const CHIAVE_ARCHIVIO = "sta-social-studio:brand-lock";

/** Stato attuale. Attivo se non è stato disattivato di proposito. */
export function brandLockAttivo() {
  try {
    return localStorage.getItem(CHIAVE_ARCHIVIO) !== "disattivato";
  } catch {
    // Senza accesso a localStorage si sceglie la prudenza.
    return true;
  }
}

/**
 * Cambia lo stato del lucchetto.
 * La disattivazione richiede una conferma esplicita: non è un interruttore da
 * sfiorare per caso.
 */
export function impostaBrandLock(attivo, { confermato = false } = {}) {
  if (!attivo && !confermato) {
    throw new Error(
      "Disattivare il Brand Lock richiede una conferma esplicita: " +
        "impostaBrandLock(false, { confermato: true }).",
    );
  }
  try {
    localStorage.setItem(CHIAVE_ARCHIVIO, attivo ? "attivo" : "disattivato");
  } catch {
    // Ambiente senza localStorage: lo stato resta quello predefinito.
  }
  return attivo;
}

/**
 * Decide se una proprietà è modificabile.
 *
 * @param {string} proprieta
 * @param {boolean} [attivo]  stato del lucchetto, per i test
 * @returns {{consentito: boolean, motivo: string}}
 */
export function puoiModificare(proprieta, attivo = brandLockAttivo()) {
  if (PROPRIETA_LIBERE.includes(proprieta)) {
    return { consentito: true, motivo: "Proprietà di contenuto." };
  }
  if (PROPRIETA_BLOCCATE.includes(proprieta)) {
    return attivo
      ? {
          consentito: false,
          motivo: `«${proprieta}» fa parte dell'identità: il Brand Lock è attivo. Disattivalo dalle impostazioni se intendi cambiarla per tutti i contenuti.`,
        }
      : { consentito: true, motivo: "Brand Lock disattivato." };
  }
  // Proprietà non classificata: si tratta come identità. Meglio un blocco di
  // troppo che una deriva grafica silenziosa.
  return attivo
    ? {
        consentito: false,
        motivo: `«${proprieta}» non è fra le proprietà di contenuto: bloccata per prudenza. Se è contenuto, va dichiarata in PROPRIETA_LIBERE.`,
      }
    : { consentito: true, motivo: "Brand Lock disattivato." };
}

/** Solleva un errore se la modifica non è consentita. Da usare nei setter. */
export function esigiModificabile(proprieta, attivo = brandLockAttivo()) {
  const esito = puoiModificare(proprieta, attivo);
  if (!esito.consentito) throw new Error(esito.motivo);
}
