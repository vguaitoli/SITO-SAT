import { CATEGORIE, formatoValido, varianteValida } from "../design/categorie";
import { FORMATI } from "../design/formati";
import { FAMIGLIE_RICHIESTE } from "../design/tokens";
import { CAPIENZA, capienzaCaratteri, LARGHEZZA_UTILE, TIPO_STORY } from "../design/eventi-story";
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
    /*
     * Il kicker è la riga sopra il titolo nel Post standard. Senza, quel blocco
     * semplicemente non si disegna: è un'assenza legittima, non un guasto. Ma
     * va detta, perché l'alternativa — comporre un testo dai dati — riempirebbe
     * la locandina di una geografia che nessuno ha scritto.
     */
    if (contenuto.formato === "post" && !contenuto.editoriale?.kicker) {
      esiti.push(voce("avviso", "kicker",
        "Manca il kicker: la riga sopra il titolo non verrà disegnata. Scrivilo, non si ricava dai dati."));
    }
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
  /*
   * Il GPX serve dove la mappa fa parte del format: la slide 03 del carosello
   * e la schermata 03 della Story, che è su carta chiara e ha il tracciato come
   * fondo. Sul Post no: la traccia è decorativa e la sua assenza non lascia un
   * buco.
   */
  if (contenuto.categoria !== "eventi") return [];
  const dove = contenuto.formato === "carosello"
    ? "Il carosello evento contiene la slide del percorso"
    : contenuto.formato === "story"
      ? "La Story contiene la schermata del tracciato"
      : null;
  if (!dove) return [];
  return contenuto.mappa?.gpx?.idBlob
    ? [voce("ok", "gpx", "Traccia GPX presente.")]
    : [voce("errore", "gpx", `${dove}: serve il file GPX.`)];
}

/**
 * Il profilo altimetrico è opzionale, ma quando è acceso deve poter esistere.
 *
 * Qui sta soltanto il controllo che si può fare **sul contenuto**: l'opzione
 * accesa senza un GPX caricato. Se la traccia c'è ma non ha quote utilizzabili,
 * a dirlo è il componente che prova a disegnarla — è l'unico che le legge
 * davvero, e la sua segnalazione arriva qui attraverso `sfori`, su entrambi i
 * percorsi, editor ed esportazione. Duplicare quel giudizio in due posti
 * significherebbe farlo divergere, e mostrarlo due volte nel pannello.
 *
 * Il profilo vive nella slide 03 del carosello. Sul Post e sulla Story non
 * compare, quindi lì l'opzione accesa non chiede nulla in più del GPX che il
 * format già richiede.
 */
function profiloAltimetrico({ contenuto, formato }) {
  if (contenuto.categoria !== "eventi") return [];
  if (!contenuto.mappa?.mostraAltimetria) return [];
  if (formato !== "carosello") return [];
  return contenuto.mappa?.gpx?.idBlob
    ? [voce("ok", "altimetria", "Profilo altimetrico richiesto: traccia GPX presente.")]
    : [voce("errore", "altimetria", "Profilo altimetrico richiesto: senza file GPX non c'è nulla da disegnare. Carica la traccia o spegni l'opzione.")];
}

/**
 * Quello che non entra nelle schermate della Story.
 *
 * Le schermate 04 e 05 sono costruite su cinque righe: la sesta non si
 * stringe, esce dalla tela. Prima il template tagliava a cinque e non lo
 * diceva — il PNG usciva pulito, con tre tappe in meno, e il difetto si
 * scopriva pubblicando.
 *
 * È un **avviso**, non un errore, e la scelta è deliberata: un errore
 * renderebbe la Story inesportabile per qualunque evento con sei tappe, che è
 * un caso normale e non un guasto. Un avviso non si supera per sbaglio —
 * blocca l'esportazione finché non si preme «Esporta comunque» — e quindi
 * l'omissione resta una decisione presa, mai un effetto collaterale.
 */
function capienzaStory({ contenuto, formato }) {
  if (contenuto.categoria !== "eventi" || formato !== "story") return [];
  const f = contenuto.fattuali || {};
  const esiti = [];

  const tappe = f.tappe || [];
  if (tappe.length > CAPIENZA.tappe) {
    const fuori = tappe.length - CAPIENZA.tappe;
    esiti.push(voce("avviso", "capienza-tappe",
      `La schermata 04 mostra ${CAPIENZA.tappe} tappe su ${tappe.length}: ` +
      `${fuori === 1 ? "una tappa resterebbe fuori" : `${fuori} tappe resterebbero fuori`} dal PNG.`));
  }

  const inclusi = f.inclusi || [];
  if (inclusi.length > CAPIENZA.inclusi) {
    const fuori = inclusi.length - CAPIENZA.inclusi;
    esiti.push(voce("avviso", "capienza-inclusi",
      `La schermata 05 mostra ${CAPIENZA.inclusi} voci di «incluso» su ${inclusi.length}: ` +
      `${fuori === 1 ? "una voce resterebbe fuori" : `${fuori} voci resterebbero fuori`} dal PNG.`));
  }

  const requisiti = (f.requisiti || []).join(". ");
  const maxRequisiti = capienzaCaratteri(TIPO_STORY.corpoRequisiti, CAPIENZA.righeRequisiti);
  if (requisiti.length > maxRequisiti) {
    esiti.push(voce("avviso", "capienza-requisiti",
      `I requisiti occupano ${requisiti.length} caratteri: la schermata 05 ne regge circa ${maxRequisiti} ` +
      `prima che il testo si rimpicciolisca fino a non leggersi.`));
  }

  const maxDescrizione = capienzaCaratteri(
    TIPO_STORY.corpoTappa, CAPIENZA.righeDescrizioneTappa, LARGHEZZA_UTILE.tappa,
  );
  tappe.slice(0, CAPIENZA.tappe).forEach((t, i) => {
    const d = String(t.descrizione || "");
    if (d.length > maxDescrizione) {
      esiti.push(voce("avviso", `capienza-tappa-${i}`,
        `La descrizione della tappa ${i + 1} è di ${d.length} caratteri: ` +
        `ne entrano circa ${maxDescrizione} nelle ${CAPIENZA.righeDescrizioneTappa} righe disponibili.`));
    }
  });

  if (!esiti.length) {
    esiti.push(voce("ok", "capienza",
      `Tappe e voci di «incluso» entrano nelle schermate: ${tappe.length}/${CAPIENZA.tappe} e ${inclusi.length}/${CAPIENZA.inclusi}.`));
  }
  return esiti;
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

/**
 * La grafica di cui parla una segnalazione, non l'istanza che l'ha prodotta.
 *
 * Il registro dei problemi indicizza per **istanza React**, ed è giusto così:
 * `carosello/03` è l'anteprima visibile, `pacco/carosello/03` è la copia fuori
 * schermo che verrà catturata, e devono restare due chiavi diverse perché lo
 * smontaggio dell'una non cancelli la segnalazione dell'altra.
 *
 * Ma l'**identità editoriale** è una sola: di slide 03 del carosello ce n'è una.
 * Il prefisso `pacco/` distingue due renderer dello stesso artefatto, non due
 * problemi. Usarlo come nome della grafica faceva comparire lo stesso errore due
 * volte, e — peggio — faceva dipendere il conteggio dalla vista aperta
 * nell'editor: col carosello a schermo due copie, col Post o la Story una sola.
 * Lo stesso export riportava numeri diversi a seconda di dove si stava
 * guardando.
 *
 * Si toglie **solo** il prefisso iniziale, e una volta sola: tutto il resto
 * della chiave è nome vero.
 */
const chiaveLogica = (chiave) => String(chiave ?? "").replace(/^pacco\//, "");

/**
 * Le segnalazioni raccolte dai template, una per grafica.
 *
 * La deduplica guarda **tre** cose insieme — livello, chiave logica e
 * messaggio — e non basta che ne coincidano due:
 *
 * - stesso messaggio su grafiche diverse sono due problemi da sistemare
 *   (sei tappe che non entrano nella Story e sei che non entrano nel carosello);
 * - stessa grafica con messaggi diversi sono due problemi;
 * - stessa grafica e stesso messaggio ma livelli diversi sono due cose diverse,
 *   perché una blocca e l'altra informa: fonderle ne perderebbe una.
 *
 * L'ordine di arrivo è conservato e l'elenco in ingresso non viene toccato.
 */
function sfori({ problemi = [] }) {
  const viste = new Set();
  const esiti = [];
  for (const p of problemi) {
    const logica = chiaveLogica(p.chiave);
    const livello = p.livello === "errore" ? "errore" : "avviso";
    // Il separatore è un carattere che in una chiave o in un messaggio non
    // compare: senza, «a» + «bc» e «ab» + «c» darebbero la stessa impronta.
    const impronta = `${livello}\u0000${logica}\u0000${p.messaggio}`;
    if (viste.has(impronta)) continue;
    viste.add(impronta);
    esiti.push(voce(livello, `sforo-${logica}`, p.messaggio));
  }
  return esiti;
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

const CONTROLLI = [campiObbligatori, coerenzaTemplate, fotografie, mappaEGpx, profiloAltimetrico, capienzaStory, caption, sfori, font];

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
