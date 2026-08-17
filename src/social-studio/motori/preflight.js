import { CATEGORIE, formatoValido, varianteValida } from "../design/categorie";
import { FORMATI } from "../design/formati";
import { FAMIGLIE_RICHIESTE } from "../design/tokens";
import { fontMancanti } from "./font";
import { valutaRisoluzione } from "../media/libreria";

/**
 * Pre-flight: i controlli che precedono l'esportazione.
 *
 * Tre livelli. `errore` blocca l'esportazione, perché produrrebbe un file da
 * rifare. `avviso` si può ignorare consapevolmente. `ok` è ciò che è stato
 * verificato e va bene — si mostra anche quello, perché sapere che un controllo
 * è passato vale quanto sapere che è fallito.
 *
 * Ogni controllo è una funzione pura che riceve un contesto e restituisce voci:
 * si aggiungono senza toccare il resto, e si verificano uno per uno.
 */

export const LIVELLI = { ok: "ok", avviso: "avviso", errore: "errore" };

const voce = (livello, id, messaggio) => ({ livello, id, messaggio });

/* ------------------------------------------------------------------ *
 * Controlli
 * ------------------------------------------------------------------ */

function campiObbligatori({ contenuto }) {
  const esiti = [];
  const f = contenuto.fattuali || {};

  if (!f.nome && !contenuto.titolo) {
    esiti.push(voce("errore", "nome", "Manca il nome del contenuto."));
  }
  if (contenuto.categoria === "eventi") {
    // Su un evento questi tre non sono dettagli: sono il motivo del post.
    if (!f.prezzo) esiti.push(voce("errore", "prezzo", "Manca il prezzo."));
    if (!f.dataInizio && !f.periodo) esiti.push(voce("errore", "date", "Mancano le date."));
    if (!contenuto.editoriale?.cta) esiti.push(voce("avviso", "cta", "Manca la CTA."));
  }
  return esiti;
}

function coerenzaTemplate({ contenuto }) {
  const esiti = [];
  const rubrica = CATEGORIE[contenuto.categoria];
  if (!rubrica) {
    return [voce("errore", "rubrica", `Rubrica «${contenuto.categoria}» inesistente.`)];
  }
  if (!formatoValido(contenuto.categoria, contenuto.formato)) {
    esiti.push(voce("errore", "formato", `Il formato «${contenuto.formato}» non è previsto per ${rubrica.nome}.`));
  }
  if (!varianteValida(contenuto.categoria, contenuto.variante)) {
    esiti.push(voce("errore", "variante", `La variante «${contenuto.variante}» non è fra quelle approvate per ${rubrica.nome}.`));
  }
  if (rubrica.provvisoria) {
    esiti.push(voce("avviso", "provvisoria", `La grafica di ${rubrica.nome} è provvisoria: in attesa del sorgente di riferimento.`));
  }
  return esiti;
}

function fotografie({ contenuto, vociMedia = [], formato }) {
  const esiti = [];
  const tela = FORMATI[formato]?.larghezza || 1080;
  const rubrica = CATEGORIE[contenuto.categoria];

  const riferimenti = [
    contenuto.media?.cover,
    ...(contenuto.media?.esperienza || []),
    ...Object.values(contenuto.media?.sfondi || {}),
  ].filter((r) => r?.idBlob);

  // Le rubriche a peso fotografico alto senza foto non hanno senso di esistere.
  if (!riferimenti.length) {
    const grave = rubrica && rubrica.pesoFoto >= 60;
    esiti.push(
      voce(grave ? "errore" : "avviso", "foto-mancanti",
        grave
          ? `${rubrica.nome} è una rubrica fotografica (${rubrica.pesoFoto}% foto): senza immagini non si esporta.`
          : "Nessuna fotografia assegnata."),
    );
    return esiti;
  }

  for (const r of riferimenti) {
    const v = vociMedia.find((m) => m.id === r.idBlob || m.idBlob === r.idBlob);
    if (!v) {
      esiti.push(voce("errore", `foto-perduta-${r.idBlob}`, "Una fotografia assegnata non è più nella libreria."));
      continue;
    }
    const giudizio = valutaRisoluzione(v, tela);
    if (giudizio.esito !== "ok") esiti.push(voce(giudizio.esito, `foto-${v.id}`, giudizio.messaggio));
  }

  if (!esiti.length) esiti.push(voce("ok", "foto", `${riferimenti.length} fotografie, risoluzione adeguata.`));
  return esiti;
}

function mappaEGpx({ contenuto }) {
  // Il GPX serve solo dove la mappa fa parte del format.
  const serve = contenuto.categoria === "eventi" && contenuto.formato === "carosello";
  if (!serve) return [];
  return contenuto.mappa?.gpx?.idBlob
    ? [voce("ok", "gpx", "Traccia GPX presente.")]
    : [voce("errore", "gpx", "Il carosello evento contiene la slide del percorso: serve il file GPX.")];
}

function caption({ contenuto }) {
  const testo = contenuto.editoriale?.caption?.testo || "";
  if (!testo.trim()) return [voce("avviso", "caption", "La caption è vuota.")];

  const esiti = [];
  const parole = testo.trim().split(/\s+/).length;
  if (parole < 20) esiti.push(voce("avviso", "caption-corta", `Caption di ${parole} parole: molto breve.`));

  // Una caption senza invito all'azione su un contenuto commerciale è
  // un'occasione mancata, non un errore.
  const commerciale = ["eventi", "tour"].includes(contenuto.categoria);
  const haInvito = /(scriv|prenot|info|link|dm|whatsapp|contatt|iscriv)/i.test(testo);
  if (commerciale && !haInvito) {
    esiti.push(voce("avviso", "caption-cta", "La caption non contiene un invito all'azione."));
  }
  return esiti.length ? esiti : [voce("ok", "caption", `Caption di ${parole} parole.`)];
}

function sfori({ problemi = [] }) {
  return problemi.map((p) =>
    voce(p.livello === "errore" ? "errore" : "avviso", `sforo-${p.chiave}`, p.messaggio),
  );
}

/**
 * I font devono essere caricati **prima** della cattura, altrimenti il PNG
 * esce con un carattere di sistema e nessuno lo dice. Requisito esplicito:
 * meglio un errore che una sostituzione silenziosa.
 */
function font() {
  if (typeof document === "undefined" || !document.fonts) {
    return [voce("avviso", "font", "Stato dei font non verificabile in questo ambiente.")];
  }
  const mancanti = fontMancanti();
  return mancanti.length
    ? [voce("errore", "font", `Font non caricati: ${mancanti.join(", ")}. L'esportazione userebbe un carattere di sistema.`)]
    : [voce("ok", "font", `Font pronti: ${FAMIGLIE_RICHIESTE.join(", ")}.`)];
}

const CONTROLLI = [campiObbligatori, coerenzaTemplate, fotografie, mappaEGpx, caption, sfori, font];

/**
 * Esegue il pre-flight.
 *
 * @param {object} contesto  { contenuto, vociMedia, formato, problemi }
 * @returns {{esiti: object[], errori: object[], avvisi: object[], puoiEsportare: boolean}}
 */
export function preflight(contesto) {
  const contenuto = contesto.contenuto || {};
  const formato = contesto.formato || contenuto.formato || "post";
  const pieno = { ...contesto, contenuto, formato };

  const esiti = CONTROLLI.flatMap((c) => {
    try {
      return c(pieno) || [];
    } catch (errore) {
      // Un controllo che si rompe non deve impedire di vedere gli altri, ma
      // non deve nemmeno passare inosservato.
      return [voce("errore", "controllo-fallito", `Un controllo non è riuscito: ${errore.message}`)];
    }
  });

  const errori = esiti.filter((e) => e.livello === "errore");
  const avvisi = esiti.filter((e) => e.livello === "avviso");
  return { esiti, errori, avvisi, puoiEsportare: errori.length === 0 };
}
