/**
 * Libreria media condivisa.
 *
 * Le fotografie stanno nell'archivio come binari; qui si gestiscono i metadati
 * e la ricerca. Il punto della libreria non è conservare le immagini — lo fa
 * l'archivio — ma **ritrovarle**: con qualche centinaio di foto, scorrere una
 * griglia non è una strategia.
 */

export const TIPI_AMMESSI = ["image/jpeg", "image/png", "image/webp"];
export const ESTENSIONI_AMMESSE = [".jpg", ".jpeg", ".png", ".webp"];

/** Soggetti previsti dai tag. Elenco chiuso: serve a cercare, non a descrivere. */
export const SOGGETTI = ["moto", "persona", "gruppo", "paesaggio", "cibo", "dettaglio tecnico"];

/** Risoluzione sotto la quale una foto non regge un 1080×1350. */
export const LARGHEZZA_MINIMA = 1080;

export function tipoAmmesso(file) {
  if (TIPI_AMMESSI.includes(file.type)) return true;
  // Alcuni sistemi non dichiarano il MIME: si guarda l'estensione.
  const nome = String(file.name || "").toLowerCase();
  return !file.type && ESTENSIONI_AMMESSE.some((e) => nome.endsWith(e));
}

/**
 * Legge le dimensioni reali di un'immagine.
 * Servono al pre-flight: una foto da 800 px su una tela da 1080 si vede.
 */
export function dimensioniImmagine(blob) {
  return new Promise((risolvi, rifiuta) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      risolvi({ larghezza: img.naturalWidth, altezza: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rifiuta(new Error("Immagine illeggibile."));
    };
    img.src = url;
  });
}

/** Tag vuoti, per una voce nuova. */
export function tagVuoti() {
  return {
    evento: "",
    luogo: "",
    data: "",
    categoria: "",
    soggetto: [],
    mezzo: "",
    disciplina: "",
    libere: [],
  };
}

const senzaAccenti = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * Costruisce il testo su cui si cerca: tutti i tag più il nome del file.
 * Senza accenti, così «Buddusò» si trova scrivendo «budduso».
 */
export function testoRicercabile(voce) {
  const t = voce.tag || {};
  return senzaAccenti(
    [
      voce.nome, t.evento, t.luogo, t.data, t.categoria, t.mezzo, t.disciplina,
      ...(t.soggetto || []), ...(t.libere || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * Cerca nella libreria.
 *
 * La query si spezza in termini e **tutti** devono comparire: così
 * «Buddusò Maxienduro 2026» restringe invece di allargare, che è ciò che serve
 * quando le foto sono centinaia. I termini si confrontano per prefisso, perché
 * «maxi» debba trovare «maxienduro».
 *
 * @param {object[]} voci
 * @param {string} query
 * @param {object} [filtri]  { soggetto, disciplina, evento, anno }
 */
export function cerca(voci, query, filtri = {}) {
  const termini = senzaAccenti(query).split(/[\s+]+/).filter(Boolean);

  return voci.filter((voce) => {
    const t = voce.tag || {};

    if (filtri.soggetto && !(t.soggetto || []).includes(filtri.soggetto)) return false;
    if (filtri.disciplina && t.disciplina !== filtri.disciplina) return false;
    if (filtri.evento && t.evento !== filtri.evento) return false;
    if (filtri.anno && !String(t.data || "").startsWith(String(filtri.anno))) return false;

    if (!termini.length) return true;

    const fieno = testoRicercabile(voce);
    return termini.every((termine) =>
      fieno.split(/\s+/).some((parola) => parola.startsWith(termine)),
    );
  });
}

/** Valori distinti di un tag, per costruire i filtri dell'interfaccia. */
export function valoriDistinti(voci, campo) {
  const insieme = new Set();
  for (const voce of voci) {
    const valore = voce.tag?.[campo];
    if (Array.isArray(valore)) valore.forEach((v) => v && insieme.add(v));
    else if (valore) insieme.add(valore);
  }
  return [...insieme].sort((a, b) => String(a).localeCompare(String(b), "it"));
}

/**
 * Giudica se una fotografia regge il formato richiesto.
 * @returns {{esito: "ok"|"avviso"|"errore", messaggio: string}}
 */
export function valutaRisoluzione(voce, larghezzaTela = LARGHEZZA_MINIMA) {
  const l = voce.larghezza || 0;
  if (!l) return { esito: "avviso", messaggio: "Dimensioni dell'immagine non rilevate." };
  if (l < larghezzaTela * 0.75) {
    return {
      esito: "errore",
      messaggio: `${voce.nome || "Immagine"}: ${l} px di larghezza su una tela da ${larghezzaTela}. Si vedrà sfocata.`,
    };
  }
  if (l < larghezzaTela) {
    return {
      esito: "avviso",
      messaggio: `${voce.nome || "Immagine"}: ${l} px, poco sotto i ${larghezzaTela} della tela. Accettabile se non è a pieno formato.`,
    };
  }
  return { esito: "ok", messaggio: "Risoluzione adeguata." };
}
