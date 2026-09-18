import {
  CATEGORIA,
  GEOMETRIA,
  QUANTI_DATI,
  STATI_FOTO,
  ZONE_INSTAGRAM,
  datiVisibili,
  fotoDelPost,
  fotoDellaStory,
  rettangoli,
  tuttoDentroAreaSicura,
} from "../design/tour";
import { geometriaCover } from "../template/geometria-foto";
import { valutaRisoluzione } from "../media/libreria";
import { controlloFont, controlloSfori, voce } from "./preflight";

/**
 * Pre-flight della rubrica TOUR.
 *
 * Stesso contratto del pre-flight generale — voci con `livello`, `id` e
 * `messaggio`, errori che bloccano e avvisi che si superano solo
 * consapevolmente — e due controlli comuni riusati invece che riscritti:
 * `controlloSfori`, che è il canale da cui arrivano le misure vere dei
 * template, e `controlloFont`, che è la promessa di non sostituire un carattere
 * in silenzio.
 *
 * **Non registra TOUR e non la abilita.** Il pre-flight generale continua a
 * rispondere `template-non-implementato` per la rubrica, perché il registro dei
 * template non la contiene: questo modulo non lo aggira e non espone nessun
 * interruttore per farlo. Serve al banco diagnostico, che monta i prototipi e
 * ha bisogno di sapere se quel che vede è fotografabile.
 *
 * ## Due domande diverse, due gruppi di controlli
 *
 * **Sul contenuto** si risponde leggendo la bozza: c'è un titolo, c'è la CTA,
 * ci sono abbastanza dati, la cover è assegnata, i rettangoli stanno dove
 * devono. Sono giudizi puri e non chiedono niente al browser.
 *
 * **Sulle evidenze del renderer** si risponde soltanto guardando che cosa è
 * successo mentre si disegnava. È la parte che non si può dedurre: un `idBlob`
 * presente dimostra che qualcuno ha scelto una fotografia, non che il binario
 * esista o che l'immagine si carichi; e un registro degli sfori vuoto può
 * voler dire «nessun problema» o «nessuno ha ancora misurato», che sono
 * situazioni opposte. Evidenze **assenti, in sospeso, malformate o riferite a
 * un'altra sorgente** non producono mai un via libera: nel dubbio non si
 * fotografa.
 *
 * ## Nessun errore non è autorizzazione
 *
 * `senzaErrori` dice che niente blocca. `puoiCatturare` dice che si può
 * scattare, e richiede in più che gli avvisi siano stati confermati **per
 * questa** configurazione: la conferma porta l'impronta di ciò che è stato
 * verificato, e qualunque cambiamento — sorgente, ritaglio, testo, condizioni
 * del renderer — la rende inservibile.
 */

/** I formati che TOUR disegna. Nessun carosello: il prototipo non lo prevede. */
export const FORMATI_TOUR = Object.freeze(["post", "story"]);

/** Come può stare la fotografia nel renderer, in questo istante. */
export const STATI_EVIDENZA = Object.freeze(["caricata", "in-corso", "fallita"]);

const testo = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Il titolo che il template disegna davvero.
 *
 * **La selezione è quella del renderer, carattere per carattere**, e solo
 * dopo si giudica. `PostTour` e `StoryTour` scrivono
 * `titoloBreve || nome || ""`, e in JavaScript una stringa di spazi è truthy:
 * con `titoloBreve` a `" "` il ripiego su `fattuali.nome` **non scatta** e la
 * grafica esce con il blocco più grande vuoto.
 *
 * Applicare `trim` *prima* del ripiego — come faceva questa funzione —
 * significava giudicare un titolo diverso da quello pubblicato: il pre-flight
 * approvava «Nome Di Prova» mentre il PNG non conteneva nessun titolo. Il
 * `trim` serve, ma **dopo**: decide se quel che il renderer ha scelto si vede.
 */
export const titoloDisegnato = (contenuto) =>
  contenuto?.editoriale?.titoloBreve || contenuto?.fattuali?.nome || "";

const plurale = (n, uno, molti) => (n === 1 ? uno : molti);

/* ------------------------------------------------------------------ *
 * La selezione fotografica, una volta sola
 * ------------------------------------------------------------------ */

/**
 * Quale fotografia disegna il formato, secondo `design/tour.js`.
 *
 * Non c'è una seconda implementazione della regola: il pre-flight chiede al
 * modulo che i template già usano, così non può giudicare una scelta diversa da
 * quella disegnata.
 */
export function selezioneFoto(contenuto, formato, sorgenti = {}) {
  const media = contenuto?.media;
  const cover = sorgenti.cover || null;
  return formato === "post"
    ? fotoDelPost({ media, sorgenteCover: cover })
    : fotoDellaStory({ media, sorgenteStory: sorgenti.story || null, sorgenteCover: cover });
}

/* ------------------------------------------------------------------ *
 * Controlli sul contenuto
 * ------------------------------------------------------------------ */

function titolo({ contenuto }) {
  const scelto = titoloDisegnato(contenuto);
  const visibile = testo(scelto);
  if (visibile) return [voce("ok", "titolo", `Titolo: «${visibile}».`)];

  /*
   * Due assenze, e la seconda è più insidiosa. Con entrambi i campi vuoti il
   * ripiego ha fatto il suo lavoro e non c'era niente da disegnare; con
   * `titoloBreve` di soli spazi il ripiego **non è scattato**, il nome c'è ed
   * è buono, e il template ha scelto comunque gli spazi. Qui non si ripiega
   * per conto proprio: si dice che cosa sta succedendo, e chi scrive svuota
   * quel campo.
   */
  const perSpazi = scelto !== "" && testo(contenuto?.fattuali?.nome) !== "";
  return [voce("errore", "titolo",
    perSpazi
      ? "Il titolo disegnato è fatto di soli spazi: `editoriale.titoloBreve` non è vuoto, quindi il template non ripiega su `fattuali.nome` e lascia il blocco bianco. Svuota il campo, o scrivici il titolo."
      : "Manca il titolo. Il template disegna `editoriale.titoloBreve` e in mancanza `fattuali.nome`: senza nessuno dei due il blocco resta vuoto.")];
}

function cta({ contenuto }) {
  const c = testo(contenuto?.editoriale?.cta);
  if (c) return [voce("ok", "cta", `CTA: «${c}».`)];
  /*
   * Non si ricava dall'URL. L'indirizzo è un dato operativo e resta fuori
   * dalla grafica — disegnarlo lo pubblicherebbe in un'immagine che nessuno
   * può correggere dopo — e comporre un invito dal dominio significherebbe
   * scrivere copy al posto di chi scrive.
   */
  return [voce("errore", "cta",
    "Manca la CTA editoriale: senza, il template non disegna nulla al suo posto. Non si ricava dall'URL, che resta fuori dalla grafica.")];
}

function dati({ contenuto, formato }) {
  const visibili = datiVisibili(contenuto?.fattuali, formato);
  const { minimo, massimo } = QUANTI_DATI[formato];
  if (visibili.length < minimo) {
    /*
     * Il minimo non si raggiunge inventando: nessun dato si compone, nessuna
     * unità si aggiunge a un valore che non ce l'ha. Un `240` scritto `240 km`
     * dal pre-flight sarebbe un dato scritto qui e fatto sembrare importato.
     */
    return [voce("errore", "dati",
      `${formato === "post" ? "Il Post" : "La Story"} mostra ${visibili.length} ${plurale(visibili.length, "dato", "dati")} su un minimo di ${minimo}: ` +
      "compila altri campi fattuali. Nessun dato si inventa e nessuna unità si aggiunge.")];
  }
  return [voce("ok", "dati",
    `${visibili.length} ${plurale(visibili.length, "dato", "dati")} su ${massimo}: ${visibili.map((d) => d.etichetta).join(", ")}.`)];
}

/**
 * La fotografia, dal lato del contenuto: che cosa è stato assegnato, e se il
 * riferimento si è potuto risolvere.
 *
 * Tre assenze diverse, e non vanno confuse. **Assente** è una bozza da
 * completare. **Irrecuperabile** è un guasto: qualcuno ha scelto quella
 * fotografia e il binario non si trova, e coprirlo con un ripiego
 * pubblicherebbe un'immagine che nessuno ha scelto per quel formato.
 * **Ripiego** è invece una scelta legittima, e resta un avviso.
 */
function fotografia({ formato, selezione }) {
  const { stato, quale } = selezione;

  if (stato === STATI_FOTO.irrecuperabile) {
    return [voce("errore", `foto-${quale}-irrecuperabile`,
      quale === "story"
        ? "La Story ha una fotografia assegnata che non si è potuta risolvere. Non ripiega sulla cover: l'inquadratura è di un altro file, e sostituirla in silenzio pubblicherebbe una fotografia che nessuno ha scelto per la Story."
        : "La cover è assegnata ma il suo binario non si è potuto risolvere. Ricaricala o riassegnala prima di esportare.")];
  }

  if (formato === "post") {
    if (stato === STATI_FOTO.assente) {
      return [voce("errore", "foto-cover-assente",
        "Il Post TOUR richiede la cover. Non ripiega sulla fotografia della Story: quella è inquadrata per il 9:16 e qui finirebbe su una tela 4:5.")];
    }
    return [voce("ok", "foto", "Cover assegnata e risolta.")];
  }

  if (stato === STATI_FOTO.ripiego) {
    return [voce("avviso", "foto-story-ripiego",
      "La Story non ha una fotografia propria e usa la cover: l'inquadratura è pensata per il 4:5 e qui finisce su una tela 9:16. Assegnane una alla Story, o verifica il ritaglio.")];
  }
  if (stato === STATI_FOTO.assente) {
    return [voce("errore", "foto-story-assente",
      "Nessuna fotografia utilizzabile per la Story: né la propria né la cover.")];
  }
  return [voce("ok", "foto", "Fotografia dedicata della Story.")];
}

/**
 * Il claim vuoto è un'assenza legittima.
 *
 * Lo schema lo lascia vuoto per definizione, e il template semplicemente non
 * disegna quel blocco. Quando invece c'è e **non entra**, il template lo
 * omette registrando un avviso: quella misura è sua — dipende dai font
 * caricati e dalla larghezza reale — e arriva qui da `controlloSfori`.
 * Rifarla a colpi di soglia sui caratteri darebbe un secondo giudizio sullo
 * stesso fatto, libero di contraddire il primo.
 */
function claim({ contenuto }) {
  const c = testo(contenuto?.editoriale?.claim);
  return c
    ? [voce("ok", "claim", `Claim presente (${c.length} caratteri). Se non entra lo dice la misura del template.`)]
    : [voce("ok", "claim", "Claim vuoto: assenza legittima, il blocco non viene disegnato.")];
}

/** Due rettangoli si toccano davvero, non solo per un bordo condiviso. */
const siSovrappongono = (a, b) =>
  a.x < b.x + b.larghezza &&
  a.x + a.larghezza > b.x &&
  a.y < b.y + b.altezza &&
  a.y + a.altezza > b.y;

/**
 * Area di sicurezza e fasce della Story, sui rettangoli canonici.
 *
 * I rettangoli sono gli stessi numeri con cui i template posizionano: se la
 * geometria dichiarata e quella disegnata divergessero, divergerebbero insieme
 * e la prova di `design/tour.js` se ne accorgerebbe prima. Qui si verifica che
 * quei numeri rispettino il contratto — dentro l'area utile, e per la Story
 * sopra le due fasce che l'interfaccia di Instagram occupa: sticker 1580–1760
 * e risposta 1760–1920.
 */
function geometria({ formato }) {
  const esiti = [];

  for (const f of tuttoDentroAreaSicura(formato)) {
    esiti.push(voce("errore", `area-${f.nome}`,
      `Il blocco «${f.nome}» esce dall'area di sicurezza del ${formato} (${f.sfori.join(", ")}).`));
  }

  if (formato === "story") {
    const r = rettangoli("story");
    for (const [nomeZona, zona] of Object.entries(ZONE_INSTAGRAM)) {
      const alto = zona.y;
      const basso = zona.y + zona.altezza;
      for (const [nome, rett] of Object.entries(r)) {
        if (siSovrappongono(rett, zona)) {
          esiti.push(voce("errore", `zona-${nomeZona}-${nome}`,
            `Il blocco «${nome}» entra nella fascia ${nomeZona} della Story (${alto}–${basso}): lì l'interfaccia di Instagram copre la grafica.`));
        }
      }
    }
  }

  if (esiti.length) return esiti;

  const z = ZONE_INSTAGRAM;
  return [voce("ok", "geometria",
    formato === "story"
      ? `Tutti i blocchi dentro l'area utile e sopra le fasce di Instagram (sticker ${z.sticker.y}–${z.sticker.y + z.sticker.altezza}, risposta ${z.risposta.y}–${z.risposta.y + z.risposta.altezza}).`
      : `Tutti i blocchi dentro l'area utile del Post (${GEOMETRIA.post.area.larghezza}×${GEOMETRIA.post.area.altezza}).`)];
}

/**
 * Quel che TOUR **non** chiede.
 *
 * I prototipi Post e Story non disegnano mappa, tracciato né profilo
 * altimetrico: pretendere un GPX bloccherebbe l'esportazione per una cosa che
 * nessuno sta disegnando. Il controllo esiste per dirlo, e la prova lo usa per
 * accorgersi se un domani qualcuno lo reintroducesse di straforo.
 */
function senzaGpx() {
  return [voce("ok", "gpx-non-richiesto",
    "Nessun requisito GPX, mappa o altimetria: i prototipi TOUR non li disegnano.")];
}

/* ------------------------------------------------------------------ *
 * La risoluzione che conta: quella disegnata
 * ------------------------------------------------------------------ */

/**
 * Quanti pixel del file finiscono davvero nella larghezza della tela.
 *
 * **La larghezza originale non dice niente da sola.** Una fotografia
 * 1800×10 ha 1800 px di larghezza e passerebbe qualunque soglia; ma su una
 * Story 1080×1920 deve coprire 1920 px di altezza partendo da 10, cioè viene
 * ingrandita 192 volte e disegnata a 345600×1920. Nella larghezza visibile ci
 * finiscono **5,6 pixel** del file. Giudicare sull'asse lungo significa non
 * guardare quello che rovina l'immagine.
 *
 * La scala la calcola `geometriaCover`, la stessa funzione pura che disegna:
 * qui non si riscrive il ritaglio, lo si interroga. Include lo zoom del
 * ritaglio, perché ingrandire peggiora la risoluzione e il pre-flight deve
 * accorgersene. `larghezza / scala` è la larghezza **equivalente** sulla tela:
 * quanti pixel originali si spalmano sui 1080 che si vedranno.
 *
 * Geometria non calcolabile restituisce `null`, e chi chiama blocca: una
 * risoluzione che non si è potuta calcolare non è una risoluzione adeguata.
 */
export function risoluzioneUtile({ formato, intrinseca, ritaglio }) {
  const tela = GEOMETRIA[formato]?.tela;
  if (!tela) return null;
  const g = geometriaCover({
    intrinseca,
    contenitore: tela,
    zoom: ritaglio?.zoom ?? 1,
    x: ritaglio?.x ?? 0.5,
    y: ritaglio?.y ?? 0.5,
  });
  if (!g) return null;
  return { tela, scala: g.scala, equivalente: tela.larghezza / g.scala };
}

/* ------------------------------------------------------------------ *
 * Evidenze del renderer
 * ------------------------------------------------------------------ */

/** La chiave con cui i template registrano la fotografia, in qualunque ambito. */
const CHIAVE_FOTO = /(^|\/)foto$/;

const registroParlaDellaFoto = (problemi) =>
  (Array.isArray(problemi) ? problemi : []).some(
    (p) => p?.livello === "errore" && CHIAVE_FOTO.test(String(p?.chiave ?? "")),
  );

function evidenzeDelRenderer({ formato, selezione, evidenze, problemi }) {
  if (!evidenze || typeof evidenze !== "object") {
    return [voce("errore", "evidenze-assenti",
      "Nessuna evidenza dal renderer: non si sa se la grafica sia stata disegnata. Un registro vuoto non significa renderer pronto, e alla cieca non si fotografa.")];
  }
  if (evidenze.formato !== formato) {
    return [voce("errore", "evidenze-altro-formato",
      `Le evidenze riguardano «${evidenze.formato ?? "—"}» e il controllo è sul ${formato}: sono di un'altra grafica e non dicono niente su questa.`)];
  }
  if (!Array.isArray(problemi)) {
    return [voce("errore", "evidenze-malformate",
      "Le segnalazioni del renderer non sono un elenco: il registro non è stato letto, e non si decide su una lettura che non c'è stata.")];
  }

  const esiti = [];

  const misure = evidenze.misureInSospeso;
  if (!Number.isInteger(misure) || misure < 0) {
    esiti.push(voce("errore", "evidenze-malformate",
      `Il conteggio delle misure in sospeso non è un intero non negativo (${JSON.stringify(misure)}): il registro non risponde come dovrebbe.`));
  } else if (misure > 0) {
    esiti.push(voce("errore", "misure-in-sospeso",
      `${misure} ${plurale(misure, "misura ancora in sospeso", "misure ancora in sospeso")}: di solito i font o le fotografie che stanno caricando. Riprova fra un istante.`));
  } else {
    esiti.push(voce("ok", "misure", "Nessuna misura in sospeso: la grafica ha finito di assestarsi."));
  }

  const attesa = selezione.sorgente;
  if (attesa) esiti.push(...evidenzaFotografica({ formato, selezione, evidenze, problemi }));

  return esiti;
}

function evidenzaFotografica({ formato, selezione, evidenze, problemi }) {
  const attesa = selezione.sorgente;
  const foto = evidenze.foto;
  if (!foto || typeof foto !== "object" || !STATI_EVIDENZA.includes(foto.stato)) {
    return [voce("errore", "evidenze-malformate",
      `Manca un esito leggibile per la fotografia (stato ${JSON.stringify(foto?.stato)}): il caricamento non è stato osservato.`)];
  }
  if (foto.sorgente !== attesa) {
    /*
     * L'evidenza di ieri su una fotografia di oggi. Cambiando sorgente, la
     * misura precedente resta un fatto vero su un'altra immagine: usarla
     * significherebbe autorizzare la cattura sulla base di dimensioni che non
     * appartengono a quel che si sta per fotografare.
     */
    return [voce("errore", "evidenze-obsolete",
      `L'esito osservato riguarda «${foto.sorgente ?? "—"}», la grafica disegna «${attesa}»: l'evidenza è di un'altra fotografia.`)];
  }
  if (foto.stato === "in-corso") {
    return [voce("errore", "foto-in-corso",
      "La fotografia sta ancora caricando: senza le sue dimensioni la geometria non è quella definitiva, e il PNG uscirebbe senza immagine.")];
  }
  if (foto.stato === "fallita") {
    /*
     * Il template lo dice già attraverso il registro, e quel messaggio passa
     * da `controlloSfori`. Si aggiunge una voce **solo** se il registro tace:
     * un fallimento dichiarato dall'evidenza e non riscontrato fra le
     * segnalazioni resta bloccante, ma quando ci sono entrambi il pannello ne
     * mostra uno.
     */
    return registroParlaDellaFoto(problemi)
      ? []
      : [voce("errore", "foto-non-caricata",
        "La fotografia non si è caricata: non se ne conoscono le dimensioni. Verifica il file prima di esportare.")];
  }

  const { larghezza, altezza } = foto;
  if (!(Number.isFinite(larghezza) && larghezza > 0 && Number.isFinite(altezza) && altezza > 0)) {
    return [voce("errore", "evidenze-malformate",
      `La fotografia risulta caricata ma senza dimensioni utilizzabili (${JSON.stringify(larghezza)}×${JSON.stringify(altezza)}).`)];
  }

  const utile = risoluzioneUtile({ formato, intrinseca: { larghezza, altezza }, ritaglio: selezione.ritaglio });
  if (!utile) {
    return [voce("errore", "foto-geometria",
      `Non si riesce a calcolare la geometria della fotografia (${larghezza}×${altezza} su ${formato}): senza, non si sa a quale risoluzione verrà disegnata.`)];
  }

  /*
   * Le soglie restano **quelle della libreria** — sotto il 75% della tela è un
   * errore, sotto il 100% un avviso — applicate alla larghezza equivalente
   * invece che a quella del file. Nessuna soglia nuova: cambia il numero che
   * si confronta, non il metro.
   */
  const equivalente = Math.round(utile.equivalente);
  const giudizio = valutaRisoluzione({ larghezza: equivalente, nome: "La fotografia" }, utile.tela.larghezza);
  if (giudizio.esito === "ok") {
    return [voce("ok", "foto-renderer",
      `Fotografia caricata: ${larghezza}×${altezza} px, ${equivalente} px equivalenti sulla tela da ${utile.tela.larghezza}.`)];
  }
  return [voce(giudizio.esito, "foto-risoluzione",
    `La fotografia è ${larghezza}×${altezza} px, ma il ritaglio del ${formato} la ingrandisce ${utile.scala.toFixed(2)}×: ` +
    `nella larghezza della tela ne finiscono ${equivalente} px su ${utile.tela.larghezza}. ` +
    `${giudizio.esito === "errore" ? "Si vedrà sfocata." : "Accettabile solo se non è a pieno formato."}`)];
}

/* ------------------------------------------------------------------ *
 * L'impronta della verifica
 * ------------------------------------------------------------------ */

/**
 * Che cosa è stato verificato, in forma confrontabile.
 *
 * Una conferma vale per **questa** grafica: formato, testi disegnati, dati
 * scelti, fotografia con il suo ritaglio, condizioni osservate nel renderer e
 * avvisi superati. Cambiare una qualunque di queste cose produce un'impronta
 * diversa, e la conferma precedente smette di autorizzare: è il modo per non
 * trasformare un «Esporta comunque» in un lasciapassare permanente.
 */
function improntaVerifica({ formato, contenuto, selezione, evidenze }, avvisi) {
  const f = contenuto?.fattuali;
  const foto = evidenze && typeof evidenze === "object" ? evidenze.foto : null;
  return [
    formato,
    titoloDisegnato(contenuto),
    testo(contenuto?.editoriale?.cta),
    testo(contenuto?.editoriale?.claim),
    datiVisibili(f, formato).map((d) => `${d.campo}=${d.valore}`).join("|"),
    [selezione.sorgente ?? "", selezione.stato, selezione.quale ?? "", JSON.stringify(selezione.ritaglio ?? null)].join("~"),
    [foto?.sorgente ?? "", foto?.stato ?? "", foto?.larghezza ?? "", foto?.altezza ?? ""].join("~"),
    avvisi.map((a) => `${a.id}:${a.messaggio}`).join("|"),
  ].join("\u0000");
}

/* ------------------------------------------------------------------ *
 * L'esecuzione
 * ------------------------------------------------------------------ */

const CONTROLLI_CONTENUTO = [titolo, cta, dati, fotografia, claim, geometria, senzaGpx];
const CONTROLLI_RENDERER = [evidenzeDelRenderer, controlloSfori, controlloFont];

function assembla(esiti, impronta, conferma, selezione) {
  const errori = esiti.filter((e) => e.livello === "errore");
  const avvisi = esiti.filter((e) => e.livello === "avviso");
  const senzaErrori = errori.length === 0;
  const richiedeConferma = senzaErrori && avvisi.length > 0;
  const confermaValida = Boolean(impronta) && conferma?.impronta === impronta;
  return {
    esiti,
    errori,
    avvisi,
    senzaErrori,
    richiedeConferma,
    confermaValida,
    // Nessun errore **non** è autorizzazione: gli avvisi vanno confermati.
    puoiCatturare: senzaErrori && (avvisi.length === 0 || confermaValida),
    impronta,
    selezione,
  };
}

/**
 * Esegue il pre-flight TOUR.
 *
 * @param {object} contesto
 * @param {object} contesto.contenuto  la bozza TOUR
 * @param {"post"|"story"} contesto.formato
 * @param {{cover?: string|null, story?: string|null}} [contesto.sorgenti]
 *   le sorgenti già risolte, quelle che il renderer ha ricevuto
 * @param {object} [contesto.evidenze]
 *   `{ formato, misureInSospeso, foto: { sorgente, stato, larghezza, altezza } }`
 * @param {object[]} [contesto.problemi]  il registro degli sfori, letto adesso
 * @param {{impronta: string}} [contesto.conferma]  l'avviso superato consapevolmente
 * @returns {{esiti, errori, avvisi, senzaErrori, richiedeConferma, confermaValida, puoiCatturare, impronta, selezione}}
 */
export function preflightTour(contesto = {}) {
  const contenuto = contesto.contenuto || {};
  const formato = contesto.formato || contenuto.formato || "post";

  // Prima di tutto: si sta parlando di TOUR, e di un formato che TOUR disegna.
  // Senza questo, `datiVisibili` solleverebbe e il motivo arriverebbe come un
  // guasto generico invece che come la diagnosi che è.
  if (contenuto.categoria !== CATEGORIA) {
    return assembla(
      [voce("errore", "rubrica", `Il pre-flight TOUR ha ricevuto la rubrica «${contenuto.categoria ?? "—"}».`)],
      null, null, null,
    );
  }
  if (!FORMATI_TOUR.includes(formato)) {
    return assembla(
      [voce("errore", "formato", `Formato «${formato}» non previsto per TOUR: i prototipi sono ${FORMATI_TOUR.join(" e ")}.`)],
      null, null, null,
    );
  }

  const selezione = selezioneFoto(contenuto, formato, contesto.sorgenti || {});
  const pieno = { ...contesto, contenuto, formato, selezione, problemi: contesto.problemi };

  const esiti = [...CONTROLLI_CONTENUTO, ...CONTROLLI_RENDERER].flatMap((c) => {
    try {
      return c(pieno) || [];
    } catch (errore) {
      // Un controllo che si rompe non nasconde gli altri, e non passa
      // inosservato: resta un errore, quindi blocca.
      return [voce("errore", "controllo-fallito", `Un controllo non è riuscito: ${errore.message}`)];
    }
  });

  const avvisi = esiti.filter((e) => e.livello === "avviso");
  return assembla(esiti, improntaVerifica(pieno, avvisi), contesto.conferma, selezione);
}
