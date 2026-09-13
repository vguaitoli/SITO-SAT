import { useCallback, useEffect, useRef, useState } from "react";
import { useArchivio } from "./ContestoArchivio";
import { ESITI, useRegistraGuardia, useRichiediTransizione } from "./transizione";
import { contenutoVuoto } from "../fondamenta/schema";
import {
  confrontaTourConLaFonte,
  daTour,
  riallineaTourAllaFonte,
} from "../fondamenta/adapter-tour";
import {
  elencoRevisioni,
  registraRevisione,
  ripristinaRevisione,
} from "../fondamenta/versioni";

/**
 * Il ciclo di vita di una bozza TOUR, senza interfaccia.
 *
 * È il modello di stato che il futuro `EditorTour` monterà: creare da un tour
 * già normalizzato, scrivere, salvare, riaprire. Sta qui e non dentro un
 * componente perché la parte difficile non è il modulo grafico — è quello che
 * succede fra una richiesta all'archivio e la sua risposta, ed è esattamente
 * ciò che 6.3B ha imparato a difendere in EVENTI.
 *
 * **Questo hook non rende TOUR disponibile.** Il registro continua a
 * dichiararla `pianificata`, non c'è editor, non c'è template, e nulla di
 * quanto sta qui è raggiungibile dallo Studio. È un passo tecnico, e si misura
 * come tale.
 *
 * Una cosa che vale per l'uso: il fornitore delle transizioni tiene **una
 * guardia sola** (§18.6). Questo hook ne registra una, quindi non va montato
 * insieme a `EditorEvento` sotto lo stesso fornitore finché quel limite non è
 * risolto.
 */

/**
 * Gli esiti, come **codici**.
 *
 * Non frasi: che cosa si legge a schermo è una decisione editoriale, e non
 * spetta a questo livello. La futura interfaccia traduce; qui si dichiara solo
 * che cosa è successo, in modo che sia verificabile senza leggere testi.
 */
export const CODICI = {
  creata: "creata",
  aperta: "aperta",
  salvata: "salvata",
  // La scrittura è andata a buon fine, ma nel frattempo si è scritto altro:
  // il lavoro corrente **non** è quello sul disco.
  superataDaModifiche: "superata-da-modifiche",
  // La scrittura è andata a buon fine su un contenuto che non è più aperto.
  superataDaAltroContenuto: "superata-da-altro-contenuto",
  // L'id chiesto non è una bozza TOUR: non si sostituisce niente.
  nonUnaBozzaTour: "non-una-bozza-tour",
  erroreLettura: "errore-lettura",
  erroreScrittura: "errore-scrittura",
  erroreElenco: "errore-elenco",
  // La scrittura è **confermata** — l'archivio ha restituito un id — ma il
  // record non si è potuto rileggere. Non è un errore di scrittura: sul disco
  // c'è, semplicemente non lo si è potuto convalidare.
  riletturaFallita: "rilettura-fallita",
  // Si è riprovato a salvare, ma la base persistita non si riesce a recuperare:
  // riscriverci sopra cancellerebbe uno stato che c'è. Si riprova più tardi.
  baseNonRecuperata: "base-non-recuperata",
  // Il riallineamento alla fonte: accettata la nuova istantanea del tour.
  fonteAccettata: "fonte-accettata",
  fonteAssente: "fonte-assente",
  nessunaBozza: "nessuna-bozza",
  // La bozza aperta non viene da quel tour: accettarne l'istantanea
  // significherebbe dire che descrive un percorso che non descrive.
  fonteNonCorrispondente: "fonte-non-corrispondente",
  // Il confronto con la fonte: l'istantanea regge, oppure il sito è cambiato.
  fonteAllineata: "fonte-allineata",
  fonteCambiata: "fonte-cambiata",
  // L'identità corrisponde, ma manca l'istantanea: non c'è niente con cui
  // confrontare. È un caso diverso da una fonte che non corrisponde.
  fonteNonConfrontabile: "fonte-non-confrontabile",
  // L'eliminazione di una bozza.
  eliminata: "eliminata",
  eliminazioneOccupata: "eliminazione-occupata",
  modificheNonSalvate: "modifiche-non-salvate",
  erroreEliminazione: "errore-eliminazione",
  // Cancellata davvero, ma l'elenco è rimasto indietro: non è un fallimento e
  // non va ripetuta.
  eliminataElencoNonAggiornato: "eliminata-elenco-non-aggiornato",
  // Salvare ed eliminare la stessa bozza si escludono a vicenda: chi arriva
  // secondo aspetta che il primo finisca, e riprova.
  operazioneInConflitto: "operazione-in-conflitto",
  // Il ripristino di una revisione.
  revisioneRipristinata: "revisione-ripristinata",
  revisioneInesistente: "revisione-inesistente",
  // Il punto di creazione non porta con sé uno stato: non c'è dove tornare.
  revisioneNonRipristinabile: "revisione-non-ripristinabile",
};

const CATEGORIA = "tour";

/**
 * Uguaglianza strutturale: l'ordine delle chiavi non conta, quello degli
 * elementi sì.
 *
 * `JSON.stringify` sembrava sufficiente e non lo è: due oggetti con le stesse
 * coppie inserite in ordine diverso producono stringhe diverse. `versione.dati`
 * è `z.unknown()` — la convalida non normalizza ricorsivamente quello che c'è
 * dentro — quindi un backup o un record migrato può arrivare qui con le chiavi
 * in un altro ordine e far sembrare diverso ciò che è identico.
 */
function ugualeStrutturalmente(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;

  const aArray = Array.isArray(a);
  if (aArray !== Array.isArray(b)) return false;
  if (aArray) {
    // Negli array l'ordine è informazione: due sequenze diverse sono diverse.
    return a.length === b.length && a.every((v, i) => ugualeStrutturalmente(v, b[i]));
  }

  const chiaviA = Object.keys(a);
  const chiaviB = Object.keys(b);
  if (chiaviA.length !== chiaviB.length) return false;
  return chiaviA.every(
    (k) => Object.prototype.hasOwnProperty.call(b, k) && ugualeStrutturalmente(a[k], b[k]),
  );
}

/**
 * Quel tour e quella bozza parlano dello stesso percorso?
 *
 * L'identità dev'essere la stessa **e dichiarata**: senza uno slug non si sa da
 * quale tour venga la bozza, e accettarne o confrontarne l'istantanea le
 * farebbe dire di descrivere un percorso che non descrive. È il requisito
 * comune alle due operazioni sulla fonte: se divergessero, una potrebbe
 * accettare ciò che l'altra rifiuta.
 */
function identitaCompatibile(contenuto, tour) {
  const suo = contenuto?.fonte;
  return Boolean(
    contenuto?.categoria === CATEGORIA &&
      suo?.tipo === "tour" &&
      suo?.slug &&
      tour?.slug &&
      suo.slug === tour.slug,
  );
}

/**
 * …e c'è qualcosa con cui confrontarlo?
 *
 * L'istantanea serve **solo** per confrontare, e va tenuta distinta
 * dall'identità: una bozza compatibile ma senza istantanea — da un backup o da
 * un record vecchio — non è confrontabile, ma **si può riallineare**, ed è anzi
 * il modo di ripararla. Chiedere l'istantanea anche al riallineamento
 * impedirebbe l'unica operazione capace di ricostruirla.
 */
function fonteConfrontabile(contenuto, tour) {
  return identitaCompatibile(contenuto, tour) && Boolean(contenuto.fonte.istantanea);
}

/** @param {{urlBase?: string}} opzioni */
export function useBozzaTour({ urlBase = "" } = {}) {
  const { archivio } = useArchivio();
  const richiedi = useRichiediTransizione();

  const [contenuto, setContenuto] = useState(null);
  const [sporco, setSporco] = useState(false);
  const [bozze, setBozze] = useState([]);
  const [esito, setEsito] = useState(null);

  /*
   * Il contenuto corrente leggibile da una funzione asincrona già partita, e un
   * contatore delle modifiche. Sono le due fotografie che permettono, al
   * ritorno da un'attesa, di sapere se il mondo è ancora quello di prima: senza
   * di esse una risposta tardiva applica dati vecchi sopra battute nuove.
   */
  const contenutoRif = useRef(null);
  contenutoRif.current = contenuto;
  const modificheRif = useRef(0);
  /*
   * Lo stato «non salvato», leggibile **senza aspettare il render**.
   *
   * La guardia viene interrogata da un gesto che può arrivare nello stesso giro
   * della modifica: leggere lo stato di React significherebbe leggere quello di
   * prima, e una sostituzione passerebbe senza chiedere nulla, portandosi via
   * il lavoro appena scritto.
   */
  const sporcoRif = useRef(false);
  /*
   * La **sessione** del contenuto: cambia solo quando il contenuto viene
   * sostituito — creato o aperto — non quando lo si scrive.
   *
   * Serve dove l'identità non basta. Riaprire la stessa bozza dopo averla
   * abbandonata dà lo stesso `id` ma è un'altra sessione di lavoro, e
   * un'operazione partita prima non deve applicarvi nulla. E serve distinta dal
   * contatore delle modifiche, perché scrivere durante un'attesa non deve far
   * buttare via il recupero: il lavoro più recente va conservato.
   */
  const sessioneRif = useRef(0);
  /** L'ultimo stato che risulta essere sul disco: serve alle revisioni. */
  const salvatoRif = useRef(null);
  /** La scrittura in volo, per non farne partire due per lo stesso gesto. */
  const scritturaRif = useRef(null);
  /**
   * L'id che quella scrittura sta salvando.
   *
   * La promessa da sola non basta: dice *che* si sta scrivendo, non *su cosa*.
   * Senza questo, un salvataggio sospeso e un'eliminazione della stessa bozza
   * non si vedono, e chi finisce per ultimo vince — un salvataggio tardivo
   * ricrea un record appena cancellato.
   */
  const scritturaIdRif = useRef(null);
  /**
   * L'id che un'apertura sta leggendo.
   *
   * Serve per lo stesso motivo dell'id in scrittura: una bozza aperta mentre la
   * si stava eliminando resterebbe in memoria dichiarata **pulita**, con una
   * base persistita che sul disco non esiste più.
   */
  const aperturaIdRif = useRef(null);
  /**
   * L'ultima scrittura conclusa: `{ seq, codice }`.
   *
   * Il numero progressivo serve a sapere **se quella scrittura è la propria**:
   * un codice globale, da solo, potrebbe appartenere a un'operazione
   * precedente, e leggerlo porterebbe a scambiare il successo di una per il
   * fallimento di un'altra.
   */
  const ultimaScritturaRif = useRef({ seq: 0, codice: null });
  /**
   * Un ripristino già costruito ma non ancora sul disco:
   * `{ id, n, sessione }`.
   *
   * Lo stato in memoria contiene **già** la voce «stato prima del ripristino»,
   * perché `ripristinaRevisione` la registra prima di scrivere. Se la scrittura
   * fallisce, quel contenuto resta lì: un salvataggio ordinario lo tratterebbe
   * come una modifica qualunque e ne registrerebbe un'altra, duplicando lo
   * stesso stato nella cronologia.
   */
  const ripristinoPendenteRif = useRef(null);
  /**
   * Il debito lasciato da una scrittura confermata ma non riletta: `{ id }`.
   *
   * Finché c'è, la base in memoria è più vecchia di quella sul disco, e
   * riscriverci sopra farebbe sparire dalla storia lo stato appena persistito.
   */
  const recuperoRif = useRef(null);
  /** Falso dopo lo smontaggio: nessun effetto tardivo. */
  const vivoRif = useRef(true);
  /** L'id in corso di eliminazione, o null: una alla volta. */
  const eliminazioneRif = useRef(null);

  useEffect(() => {
    vivoRif.current = true;
    return () => {
      vivoRif.current = false;
    };
  }, []);

  /**
   * Ricarica l'elenco e **riporta** com'è andata, invece di rigettare.
   *
   * È un'operazione pubblica: chi la chiama non deve doversi ricordare di
   * metterci un `catch` attorno, o un archivio momentaneamente indisponibile
   * diventa una rejection che nessuno raccoglie. Gli errori qui sono esiti,
   * come dappertutto in questo contratto.
   *
   * @returns {Promise<{codice: string|null}>}
   */
  const ricarica = useCallback(async () => {
    try {
      const elenco = await archivio.elenca({ categoria: CATEGORIA });
      if (!vivoRif.current) return { codice: null };
      setBozze(elenco);
      return { codice: null };
    } catch {
      if (vivoRif.current) setEsito({ codice: CODICI.erroreElenco });
      return { codice: CODICI.erroreElenco };
    }
  }, [archivio]);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  /* ================================================================ *
   * Scrivere
   * ================================================================ */

  /** Cambia insieme stato e riferimento: non devono mai divergere. */
  const segnaSporco = useCallback((valore) => {
    sporcoRif.current = valore;
    setSporco(valore);
  }, []);

  /**
   * Ogni modifica passa da qui: è così che «non salvato» resta veritiero.
   *
   * Il riferimento si aggiorna **subito**, non al render successivo. Fra una
   * modifica e l'operazione che la segue, nello stesso giro, React non ha
   * ancora ridisegnato: un salvataggio che leggesse lo stato lavorerebbe su
   * dati vecchi, e il contatore — già incrementato — lo farebbe passare per
   * buono, riscrivendo sopra la modifica appena fatta senza un avviso.
   *
   * `fn` si applica due volte, al riferimento e allo stato, e per questo
   * dev'essere pura: sotto `StrictMode` React invoca gli aggiornatori due volte
   * di suo, e un effetto collaterale qui dentro si vedrebbe doppio.
   */
  const aggiorna = useCallback(
    (fn) => {
      modificheRif.current += 1;
      if (contenutoRif.current) contenutoRif.current = fn(contenutoRif.current);
      setContenuto((c) => (c ? fn(c) : c));
      segnaSporco(true);
      setEsito(null);
    },
    [segnaSporco],
  );

  const scriviEditoriale = useCallback(
    (campo, valore) =>
      aggiorna((c) => ({ ...c, editoriale: { ...c.editoriale, [campo]: valore } })),
    [aggiorna],
  );

  /**
   * Scrivere un fatto a mano lo stacca dal sito.
   *
   * `origine` non è decorazione: è ciò che permette di dire se un dato viene
   * dal sito o dalla mano di chi scrive, e quindi se un cambiamento sul sito lo
   * deve ancora riguardare.
   */
  const scriviFattuale = useCallback(
    (campo, valore) =>
      aggiorna((c) => ({
        ...c,
        fattuali: {
          ...c.fattuali,
          [campo]: valore,
          origine: { ...c.fattuali.origine, [campo]: "manuale" },
        },
      })),
    [aggiorna],
  );

  /* ================================================================ *
   * Creare, salvare, aprire
   * ================================================================ */

  const creaSenzaChiedere = useCallback(
    (tour) => {
      const base = contenutoVuoto({ categoria: CATEGORIA, formato: "post" });
      const importato = daTour(tour, { urlBase });
      const nuovo = {
        ...base,
        titolo: importato.fattuali.nome,
        fonte: importato.fonte,
        // I rami importati si **combinano** con i default dello schema: quello
        // che l'adapter lascia vuoto resta vuoto, non sparisce.
        fattuali: { ...base.fattuali, ...importato.fattuali },
        editoriale: { ...base.editoriale, ...importato.editoriale },
      };
      modificheRif.current += 1;
      sessioneRif.current += 1;
      setContenuto(nuovo);
      contenutoRif.current = nuovo;
      // Una bozza appena creata non è sul disco: `salvato` resta vuoto, e il
      // lavoro nasce non salvato.
      salvatoRif.current = null;
      segnaSporco(true);
      setEsito({ codice: CODICI.creata });
    },
    [urlBase, segnaSporco],
  );

  /**
   * Adotta come base la versione appena finita sul disco, senza toccare il
   * lavoro corrente.
   *
   * Serve quando una scrittura riesce ma è già superata: nell'archivio c'è
   * quello stato, e le sue revisioni sono la storia vera. Il contenuto in
   * memoria è più nuovo e non si tocca — nessuna fusione dei campi — ma deve
   * ereditare quella catena, perché `registraRevisione` la legge da
   * `contenuto.versioni`. Senza, il tentativo successivo ripartirebbe da una
   * storia vecchia e `archivio.salva`, che sostituisce l'intero record, farebbe
   * sparire uno stato che era ripristinabile.
   *
   * Si chiama **soltanto** dopo aver verificato che l'identità non è cambiata:
   * la storia di una bozza non appartiene a un'altra, e ricontrollarlo qui
   * sarebbe un ramo che nessuna prova può raggiungere.
   *
   * @param {object} riletto il record convalidato appena riletto dall'archivio
   */
  const adottaBasePersistita = useCallback((riletto) => {
    salvatoRif.current = riletto;
    const eredita = (c) => ({ ...c, versioni: riletto.versioni, modificato: riletto.modificato });
    // Il riferimento segue subito: la prossima scrittura parte da qui e non può
    // aspettare il render. Lo stato eredita dal valore più recente, non dal
    // riferimento, così non dipende da quando React ha svuotato la coda.
    if (contenutoRif.current) contenutoRif.current = eredita(contenutoRif.current);
    setContenuto((c) => (c ? eredita(c) : c));
  }, []);

  /**
   * Scrive nell'archivio e riporta il record riletto, oppure `null`.
   *
   * `null` significa «non contare su questo»: o la scrittura è fallita, o è
   * riuscita ma il lavoro corrente non è più quello che è finito sul disco.
   * È il valore che la guardia converte in «non si può proseguire».
   */
  const scrivi = useCallback(
    async (iniziale, { giaRegistrata = false } = {}) => {
      if (!iniziale) return null;

      /**
       * Registra il motivo **e** lo espone.
       *
       * `scrivi` conosce il motivo vero di un fallimento; metterlo solo nello
       * stato costringerebbe chi chiama a convertirlo in un generico «errore di
       * scrittura», perdendo la distinzione proprio dove serve.
       */
      const conCodice = (codice) => {
        ultimaScritturaRif.current = { seq: ultimaScritturaRif.current.seq + 1, codice };
        if (vivoRif.current) setEsito({ codice });
        return null;
      };

      /*
       * Prima di tutto si salda il debito, se c'è: una scrittura precedente è
       * andata a segno ma non si è potuta rileggere, quindi la catena in
       * memoria è vecchia. Scrivere adesso sostituirebbe l'intero record e
       * cancellerebbe dalla storia uno stato che è sul disco.
       */
      if (recuperoRif.current) {
        const atteso = recuperoRif.current;
        const corrente = contenutoRif.current;
        if (!corrente || corrente.id !== atteso.id) {
          // Riguarda un'altra bozza: quando la si riaprirà, `apri` rileggerà la
          // base dal disco. Qui non deve bloccare niente.
          recuperoRif.current = null;
        } else {
          const sessioneAllInizio = sessioneRif.current;
          let recuperato = null;
          try {
            recuperato = await archivio.leggi(atteso.id);
          } catch {
            recuperato = null;
          }
          if (!vivoRif.current) return null;
          /*
           * Prima di adottare qualunque cosa: è ancora la bozza per cui il
           * recupero era partito? Se nel frattempo è stata sostituita — o
           * abbandonata e riaperta, che è un'altra sessione anche a parità di
           * `id` — adottare travaserebbe la storia di una bozza in un'altra, e
           * la fotografia subito dopo la scriverebbe senza che nessuno l'abbia
           * chiesto. Il debito resta dov'era, riferito alla sua identità.
           */
          if (sessioneRif.current !== sessioneAllInizio) {
            return conCodice(CODICI.superataDaAltroContenuto);
          }
          if (!recuperato) {
            // Non si è ancora in grado di sapere da dove ripartire: meglio non
            // scrivere che scrivere sopra. Si può riprovare.
            return conCodice(CODICI.baseNonRecuperata);
          }
          recuperoRif.current = null;
          adottaBasePersistita(recuperato);
        }
      }

      /*
       * La fotografia si prende **dopo** il recupero: così si scrive il lavoro
       * più recente, e il contatore misura da qui in poi.
       */
      const daSalvare = contenutoRif.current;
      if (!daSalvare) return null;
      const modificheAllInizio = modificheRif.current;
      const sessioneDiPartenza = sessioneRif.current;
      const idDiPartenza = daSalvare.id ?? null;

      /*
       * Scrittura e rilettura hanno esiti distinti, e devono avere `catch`
       * distinti: condividerne uno solo faceva passare per «errore di
       * scrittura» un record che era già sul disco, lasciando la base vecchia
       * libera di sovrascriverlo al tentativo successivo.
       */
      let idSalvato = null;
      try {
        /*
         * Chi ripristina ha già registrato la propria voce — `ripristinaRevisione`
         * lo fa con `forza` — e passarla di nuovo da qui creerebbe due revisioni
         * per un gesto solo, sporcando la storia proprio dove serve leggerla.
         */
        const conStoria = giaRegistrata
          ? daSalvare
          : registraRevisione(daSalvare, salvatoRif.current);
        idSalvato = await archivio.salva(conStoria);
      } catch {
        return conCodice(CODICI.erroreScrittura);
      }
      if (!vivoRif.current) return null;

      let riletto = null;
      try {
        riletto = await archivio.leggi(idSalvato);
      } catch {
        riletto = null;
      }
      if (!vivoRif.current) return null;

      if (!riletto) {
        /*
         * La scrittura è confermata ma il record non è convalidato. Non lo si
         * può far passare per tale, e non si può ripartire da questa base: si
         * segna il debito e si blocca, lasciando il lavoro non salvato. La
         * guardia lo converte in «non si può proseguire».
         */
        recuperoRif.current = { id: idSalvato };
        return conCodice(CODICI.riletturaFallita);
      }

      // Prima delle ultime attese: applicare un record su un contenuto che non
      // è più quello cancellerebbe lavoro.
      if (
        (contenutoRif.current?.id ?? null) !== idDiPartenza ||
        sessioneRif.current !== sessioneDiPartenza
      ) {
        return conCodice(CODICI.superataDaAltroContenuto);
      }
      if (modificheRif.current !== modificheAllInizio) {
        // La scrittura è riuscita: quello stato è sul disco, e la sua storia
        // dev'essere la base del prossimo tentativo.
        adottaBasePersistita(riletto);
        return conCodice(CODICI.superataDaModifiche);
      }

      setContenuto(riletto);
      contenutoRif.current = riletto;
      salvatoRif.current = riletto;
      segnaSporco(false);

      /*
       * Anche ricaricare l'elenco è una chiamata all'archivio e può rifiutare.
       * Ma la scrittura **è** riuscita: dichiararla fallita manderebbe a
       * riscrivere qualcosa che è già sul disco. Si riporta il record e si dice
       * che è l'elenco a essere rimasto indietro.
       */
      const esitoElenco = await ricarica();
      const elencoAggiornato = !esitoElenco.codice;
      /*
       * Un solo controllo di vita, ed è qui: è l'ultimo punto in cui si può
       * ancora restituire `null` invece di annunciare un salvataggio a un
       * albero che non c'è più. Metterne un altro prima sarebbe una riga che
       * nessuna prova può distinguere — eviterebbe solo `setState` già inerti.
       */
      if (!vivoRif.current) return null;

      /*
       * L'ultimo controllo di coerenza, e dev'essere l'ultimo: ricaricare
       * l'elenco è un'attesa come le altre, e in mezzo si può scrivere. Da qui
       * al ritorno non ci sono più attese, quindi nessuna battuta può inserirsi.
       */
      if (
        (contenutoRif.current?.id ?? null) !== riletto.id ||
        sessioneRif.current !== sessioneDiPartenza
      ) {
        return conCodice(CODICI.superataDaAltroContenuto);
      }
      if (modificheRif.current !== modificheAllInizio) {
        return conCodice(CODICI.superataDaModifiche);
      }

      // Il ripristino è arrivato sul disco: non è più pendente.
      if (
        ripristinoPendenteRif.current?.id === riletto.id &&
        ripristinoPendenteRif.current.sessione === sessioneRif.current
      ) {
        ripristinoPendenteRif.current = null;
      }
      const codice = elencoAggiornato ? CODICI.salvata : CODICI.erroreElenco;
      ultimaScritturaRif.current = { seq: ultimaScritturaRif.current.seq + 1, codice };
      if (vivoRif.current) setEsito({ codice });
      return riletto;
    },
    [archivio, ricarica, adottaBasePersistita, segnaSporco],
  );

  /**
   * Salva, senza far partire due scritture per lo stesso lavoro.
   *
   * Una seconda chiamata mentre la prima è in volo riceve **la stessa**
   * promessa invece di aprirne un'altra: due scritture per un gesto solo
   * produrrebbero due revisioni di qualcosa che è cambiato una volta.
   */
  const salva = useCallback(() => {
    // Non `async`: una funzione asincrona avvolge sempre il ritorno in una
    // promessa nuova, e le due chiamate riceverebbero oggetti diversi. Qui la
    // promessa condivisa dev'essere la **stessa**. Questo controllo resta il
    // primo: due `salva()` concorrenti continuano a condividere la promessa.
    if (scritturaRif.current) return scritturaRif.current;

    const id = contenutoRif.current?.id ?? null;
    if (id && eliminazioneRif.current === id) {
      // Quella bozza sta sparendo: scriverla adesso la ricreerebbe.
      setEsito({ codice: CODICI.operazioneInConflitto });
      return Promise.resolve(null);
    }

    scritturaIdRif.current = id;
    // Un ripristino rimasto in memoria porta già la sua voce: registrarla di
    // nuovo duplicherebbe lo stesso stato nella cronologia.
    /*
     * Il pendente vale per **quella** sessione di lavoro: riaprire la stessa
     * bozza ne comincia una nuova, il cui contenuto viene dal disco e non porta
     * più la revisione forzata. Ereditare il marcatore lì sopprimerebbe una
     * revisione ordinaria, facendo sparire lo stato precedente.
     */
    const pendente = ripristinoPendenteRif.current;
    const giaRegistrata =
      pendente?.id === id && pendente.sessione === sessioneRif.current;
    const mia = scrivi(contenutoRif.current, { giaRegistrata }).finally(() => {
      // Ogni blocco lo libera soltanto l'operazione che l'ha preso.
      if (scritturaRif.current === mia) {
        scritturaRif.current = null;
        scritturaIdRif.current = null;
      }
    });
    scritturaRif.current = mia;
    return mia;
  }, [scrivi]);

  /** Il riepilogo delle revisioni, dalla più recente. */
  const revisioni = useCallback(
    () => (contenutoRif.current ? elencoRevisioni(contenutoRif.current) : []),
    [],
  );

  /**
   * I rami che Version History conserva in una revisione.
   *
   * Servono per riconoscere un ripristino **già avvenuto**: se il disco porta
   * già quello stato, ripeterlo non aggiungerebbe niente alla cronologia se non
   * una voce vuota.
   */
  const giaRipristinata = (base, dati) =>
    Object.keys(dati || {}).every((ramo) => ugualeStrutturalmente(base[ramo], dati[ramo]));

  /**
   * Che cosa impedisce, se qualcosa impedisce, di ripristinare la revisione `n`.
   *
   * Sta fuori dall'azione perché queste condizioni vanno riconosciute **prima**
   * del dialogo: una richiesta impossibile non deve chiedere se salvare o
   * scartare, e non deve produrre scritture.
   *
   * @returns {{codice: string}|null}
   */
  const ostacoloAlRipristino = useCallback((n) => {
    const base = salvatoRif.current;
    if (!base) return { codice: CODICI.nessunaBozza };
    const rev = (base.versioni || []).find((v) => v.n === n);
    if (!rev) return { codice: CODICI.revisioneInesistente };
    if (!rev.dati) return { codice: CODICI.revisioneNonRipristinabile };
    return null;
  }, []);

  /**
   * I dati della revisione `n`, fotografati adesso.
   *
   * Vanno catturati **prima** del dialogo. Un «Salva e continua» aggiunge una
   * revisione, e con la cronologia vicina al tetto può far diradare proprio
   * quella scelta: cercarla di nuovo per numero, dopo, la troverebbe sparita e
   * il ripristino fallirebbe per una revisione che al momento del clic c'era.
   * La copia è profonda: nessuno deve poter mutare ciò che è stato scelto.
   */
  const fotografaRevisione = useCallback(
    (n) => structuredClone((salvatoRif.current.versioni || []).find((v) => v.n === n).dati),
    [],
  );

  /**
   * Torna a una revisione, e la rende persistente.
   *
   * Parte dalla **base davvero sul disco**, non dalla fotografia in memoria:
   * se si è scelto «Scarta modifiche», quelle modifiche non devono entrare
   * nella cronologia come «stato prima del ripristino». Scartare vuol dire
   * buttarle, non archiviarle.
   */
  const ripristinaSenzaChiedere = useCallback(
    async (n, dati, seqPrima) => {
      const fallisci = (codice) => {
        if (vivoRif.current) setEsito({ codice });
        throw new Error(codice);
      };

      const base = salvatoRif.current;
      if (!base) fallisci(CODICI.nessunaBozza);

      /*
       * Se il disco porta già quello stato, il ripristino è compiuto: rifarlo
       * aggiungerebbe alla cronologia una voce senza cambiamenti. Succede dopo
       * un «Salva e continua» che ha appena persistito proprio lo stato
       * richiesto — e quel salvataggio può essere andato a buon fine con
       * l'elenco rimasto indietro: il suo esito non va coperto.
       */
      if (giaRipristinata(base, dati)) {
        const sua = ultimaScritturaRif.current;
        const suoFallimento = sua.seq > seqPrima && sua.codice !== CODICI.salvata;
        if (vivoRif.current && !suoFallimento) {
          setEsito({ codice: CODICI.revisioneRipristinata });
        }
        return;
      }

      // Le stesse esclusioni del salvataggio: il ripristino è una scrittura.
      if (eliminazioneRif.current === base.id) fallisci(CODICI.operazioneInConflitto);
      if (scritturaRif.current) fallisci(CODICI.operazioneInConflitto);

      /*
       * Si preferisce il motore finché la revisione è ancora al suo posto; se il
       * diradamento l'ha tolta si compone dalla fotografia, con la stessa voce
       * forzata che il motore avrebbe registrato.
       */
      const ancoraLi = (base.versioni || []).find((v) => v.n === n)?.dati;
      const ripristinato = ancoraLi
        ? ripristinaRevisione(base, n)
        : {
            ...registraRevisione(base, base, {
              forza: true,
              etichetta: `stato prima del ripristino della v${n}`,
            }),
            ...dati,
            modificato: new Date().toISOString(),
          };
      ripristinoPendenteRif.current = { id: base.id, n, sessione: sessioneRif.current };
      modificheRif.current += 1;
      setContenuto(ripristinato);
      contenutoRif.current = ripristinato;
      segnaSporco(true);

      scritturaIdRif.current = base.id;
      const mia = scrivi(ripristinato, { giaRegistrata: true }).finally(() => {
        if (scritturaRif.current === mia) {
          scritturaRif.current = null;
          scritturaIdRif.current = null;
        }
      });
      scritturaRif.current = mia;

      const salvato = await mia;
      if (!salvato) {
        // Il motivo vero lo conosce `scrivi`: convertirlo in un generico
        // «errore di scrittura» perderebbe proprio la distinzione utile.
        throw new Error(ultimaScritturaRif.current.codice || CODICI.erroreScrittura);
      }
      /*
       * L'esito lo ha già posto `scrivi`, e può essere `errore-elenco`: il
       * ripristino è riuscito, è l'elenco a essere rimasto indietro.
       * Sovrascriverlo con «ripristinata» cancellerebbe quell'informazione.
       */
      if (vivoRif.current && ultimaScritturaRif.current.codice === CODICI.salvata) {
        setEsito({ codice: CODICI.revisioneRipristinata });
      }
    },
    [scrivi, segnaSporco],
  );

  const apriSenzaChiedere = useCallback(
    async (id) => {
      /*
       * Quella bozza sta sparendo: applicarla adesso lascerebbe in memoria un
       * contenuto dichiarato pulito la cui base è già stata eliminata. È lo
       * stesso conflitto del salvataggio, e si chiude allo stesso modo — per
       * id, così eliminarne una non impedisce di aprirne un'altra.
       */
      if (eliminazioneRif.current === id) {
        if (vivoRif.current) setEsito({ codice: CODICI.operazioneInConflitto });
        throw new Error(CODICI.operazioneInConflitto);
      }

      aperturaIdRif.current = id;
      try {
        const modificheAllInizio = modificheRif.current;

        let letto = null;
        try {
          letto = await archivio.leggi(id);
        } catch {
          if (vivoRif.current) setEsito({ codice: CODICI.erroreLettura });
          throw new Error(CODICI.erroreLettura);
        }
        if (!vivoRif.current) return;

        /*
         * Un id che non è una bozza TOUR non apre niente e **non sostituisce**
         * il lavoro corrente. Vale anche per un id EVENTI passato di mano: il
         * filtro dell'elenco non è una difesa, è una comodità.
         */
        if (!letto || letto.categoria !== CATEGORIA) {
          setEsito({ codice: CODICI.nonUnaBozzaTour });
          throw new Error(CODICI.nonUnaBozzaTour);
        }

        // Fra la richiesta e la risposta si può aver scritto: applicare adesso
        // cancellerebbe quelle battute.
        if (modificheRif.current !== modificheAllInizio) {
          setEsito({ codice: CODICI.superataDaModifiche });
          throw new Error(CODICI.superataDaModifiche);
        }

        modificheRif.current += 1;
        sessioneRif.current += 1;
        setContenuto(letto);
        contenutoRif.current = letto;
        salvatoRif.current = letto;
        segnaSporco(false);
        setEsito({ codice: CODICI.aperta });
      } finally {
        // Ogni blocco lo libera soltanto l'operazione che l'ha preso.
        if (aperturaIdRif.current === id) aperturaIdRif.current = null;
      }
    },
    [archivio, segnaSporco],
  );

  /**
   * Accetta la fonte: aggiorna l'istantanea del tour, e nient'altro.
   *
   * Il sito cambia, e la bozza deve poterlo registrare senza che questo
   * significhi **reimportare**. §17.4 lo dice già per il contenuto: riallineare
   * tocca solo `fonte` — tipo, slug, istantanea e `importatoIl` — e lascia
   * intatti fatti, provenienze, copy, media, visual, mappa, formato, variante e
   * revisioni. Il lavoro editoriale non si perde per aver preso atto che il
   * sito è cambiato.
   *
   * Non legge il sito da sé: il tour normalizzato arriva da chi chiama. E non
   * salva: il riallineamento è una modifica come le altre, che diventa
   * persistente solo con `salva`.
   *
   * @param {object} tourAttuale il tour già normalizzato, dal chiamante
   * @returns {{codice: string}} esito esplicito, senza eccezioni
   */
  const riallineaAllaFonte = useCallback(
    (tourAttuale) => {
      if (!tourAttuale) return { codice: CODICI.fonteAssente };
      // Dal riferimento, non dallo stato: chi chiama può aver appena scritto.
      const corrente = contenutoRif.current;
      if (!corrente) return { codice: CODICI.nessunaBozza };

      if (!identitaCompatibile(corrente, tourAttuale)) {
        return { codice: CODICI.fonteNonCorrispondente };
      }

      /*
       * `riallineaTourAllaFonte` genera `importatoIl`, quindi non è pura: si
       * chiama **una volta sola**, qui fuori, e all'aggiornatore si dà una
       * trasformazione che sostituisce soltanto il ramo `fonte`. Così React può
       * rieseguirla — sotto `StrictMode` lo fa — senza che l'istante cambi e
       * senza cancellare scritture già accodate.
       */
      const nuovaFonte = riallineaTourAllaFonte(corrente, tourAttuale).fonte;
      aggiorna((c) => ({ ...c, fonte: nuovaFonte }));
      // `aggiorna` azzera l'esito: questo viene dopo, e resta.
      setEsito({ codice: CODICI.fonteAccettata });
      return { codice: CODICI.fonteAccettata };
    },
    [aggiorna],
  );

  /**
   * Dice se il sito è cambiato rispetto all'istantanea, e in che cosa.
   *
   * **Non tocca niente**: né contenuto, né «non salvato», né esito, né
   * archivio, né revisioni. È una domanda, non un'operazione — e non legge il
   * sito da sé: il tour normalizzato arriva da chi chiama.
   *
   * Gli scostamenti vengono da `confrontaTourConLaFonte`, che resta l'unico
   * posto dove quella logica vive.
   *
   * Nei casi in cui il confronto non si può fare, `allineato` è `null` e non
   * `false`: non si sa, e fingere di sapere sarebbe peggio che ammetterlo.
   * Nessuno di quei casi viene mai presentato come «fonte allineata», e nessuno
   * inventa scostamenti.
   *
   * @param {object} tourAttuale il tour già normalizzato, dal chiamante
   * @returns {{codice: string, allineato: boolean|null, scostamenti: Array}}
   */
  const confrontaConLaFonte = useCallback((tourAttuale) => {
    const vuoto = { allineato: null, scostamenti: [] };
    if (!tourAttuale) return { codice: CODICI.fonteAssente, ...vuoto };
    // Dal riferimento: chi chiama può aver appena riallineato nello stesso giro.
    const corrente = contenutoRif.current;
    if (!corrente) return { codice: CODICI.nessunaBozza, ...vuoto };
    if (!identitaCompatibile(corrente, tourAttuale)) {
      return { codice: CODICI.fonteNonCorrispondente, ...vuoto };
    }
    if (!fonteConfrontabile(corrente, tourAttuale)) {
      // La fonte corrisponde: è l'istantanea a mancare.
      return { codice: CODICI.fonteNonConfrontabile, ...vuoto };
    }

    const { allineato, scostamenti } = confrontaTourConLaFonte(corrente, tourAttuale);
    return {
      codice: allineato ? CODICI.fonteAllineata : CODICI.fonteCambiata,
      allineato,
      scostamenti,
    };
  }, []);

  /**
   * Elimina una bozza TOUR. Definitiva, e quindi cauta.
   *
   * **Non passa dal dialogo delle transizioni**: quello offre «Salva e
   * continua», che qui significherebbe salvare proprio la bozza che si sta
   * cancellando. Con lavoro non salvato su *quella* bozza il gesto si rifiuta
   * e basta; per eliminarla si salva o si scarta prima, deliberatamente. Una
   * bozza diversa invece si elimina anche mentre la corrente è sporca: non ha
   * niente a che vedere con lei.
   *
   * L'appartenenza si verifica **nell'archivio**, non nell'elenco: quello è
   * una comodità, e può essere vecchio.
   *
   * @param {string} id
   * @returns {Promise<{codice: string}>} esito esplicito, senza eccezioni
   */
  const elimina = useCallback(
    async (id) => {
      // Una alla volta: due richieste ravvicinate non devono cancellare due
      // volte, e la difesa sta qui, non in un pulsante disabilitato.
      if (eliminazioneRif.current) return { codice: CODICI.eliminazioneOccupata };
      if (!id) return { codice: CODICI.nonUnaBozzaTour };

      /*
       * Una scrittura in volo sulla **stessa** bozza esclude l'eliminazione, e
       * viceversa: altrimenti chi finisce per ultimo vince, e un salvataggio
       * tardivo ricrea un record appena cancellato. Una bozza diversa non è
       * toccata da questo, e resta eliminabile.
       */
      if (scritturaIdRif.current === id || aperturaIdRif.current === id) {
        if (vivoRif.current) setEsito({ codice: CODICI.operazioneInConflitto });
        return { codice: CODICI.operazioneInConflitto };
      }

      const corrente = contenutoRif.current;
      if (corrente?.id === id && sporcoRif.current) {
        if (vivoRif.current) setEsito({ codice: CODICI.modificheNonSalvate });
        return { codice: CODICI.modificheNonSalvate };
      }

      const sessioneAllInizio = sessioneRif.current;
      const modificheAllInizio = modificheRif.current;
      eliminazioneRif.current = id;
      try {
        let letto = null;
        try {
          letto = await archivio.leggi(id);
        } catch {
          if (vivoRif.current) setEsito({ codice: CODICI.erroreLettura });
          return { codice: CODICI.erroreLettura };
        }
        if (!letto || letto.categoria !== CATEGORIA) {
          if (vivoRif.current) setEsito({ codice: CODICI.nonUnaBozzaTour });
          return { codice: CODICI.nonUnaBozzaTour };
        }

        try {
          await archivio.elimina(id);
        } catch {
          if (vivoRif.current) setEsito({ codice: CODICI.erroreEliminazione });
          return { codice: CODICI.erroreEliminazione };
        }

        /*
         * Dopo l'attesa si guarda il contenuto **di adesso** e la sessione: nel
         * frattempo si può aver aperto un'altra bozza, e svuotare quella
         * sarebbe cancellare lavoro che nessuno ha chiesto di cancellare.
         */
        const dopo = contenutoRif.current;
        if (
          vivoRif.current &&
          dopo?.id === id &&
          sessioneRif.current === sessioneAllInizio
        ) {
          modificheRif.current += 1;
          salvatoRif.current = null;
          if (modificheRif.current - 1 !== modificheAllInizio) {
            /*
             * Si è scritto mentre spariva. L'archivio non ce l'ha più, la
             * memoria sì: svuotare adesso perderebbe quelle battute in
             * silenzio. Si tiene quello che c'è, dichiarandolo non salvato.
             */
            segnaSporco(true);
          } else {
            setContenuto(null);
            contenutoRif.current = null;
            segnaSporco(false);
          }
        }

        /*
         * L'elenco è l'ultimo passo, e un suo fallimento non rende fallita la
         * cancellazione: dire il contrario manderebbe a ripetere un gesto su un
         * record che non c'è più.
         */
        const esitoElenco = await ricarica();
        const codice = esitoElenco.codice
          ? CODICI.eliminataElencoNonAggiornato
          : CODICI.eliminata;
        if (vivoRif.current) setEsito({ codice });
        return { codice };
      } finally {
        eliminazioneRif.current = null;
      }
    },
    [archivio, ricarica, segnaSporco],
  );

  /* ================================================================ *
   * La protezione del lavoro non salvato
   * ================================================================ */

  useRegistraGuardia({
    // Dal riferimento, non dallo stato: vedi `sporcoRif`.
    sporco: () => sporcoRif.current,
    salva: async () => Boolean(await salva()),
    etichetta: "Questa azione",
  });

  /** Creare da un altro tour sostituisce il lavoro in corso: si chiede prima. */
  const creaDaTour = useCallback(
    (tour) =>
      richiedi(() => creaSenzaChiedere(tour), {
        etichetta: "Creare una bozza da un altro tour",
      }),
    [richiedi, creaSenzaChiedere],
  );

  const apri = useCallback(
    (id) => richiedi(() => apriSenzaChiedere(id), { etichetta: "Aprire un'altra bozza" }),
    [richiedi, apriSenzaChiedere],
  );

  /*
   * Ripristinare sostituisce il lavoro in corso come aprire un'altra bozza:
   * stessa protezione, stesso dialogo.
   */
  const ripristina = useCallback(
    (n) => {
      /*
       * Prima del dialogo: una richiesta impossibile non deve far scegliere se
       * salvare o scartare, e soprattutto non deve produrre scritture. Chiedere
       * «Salva e continua» per poi scoprire che la revisione non esiste
       * salverebbe il lavoro per niente.
       */
      const ostacolo = ostacoloAlRipristino(n);
      if (ostacolo) {
        setEsito(ostacolo);
        return Promise.resolve({
          esito: ESITI.fallito,
          errore: new Error(ostacolo.codice),
        });
      }
      /*
       * La fotografia e il numero di sequenza si prendono **adesso**, prima del
       * dialogo: la revisione scelta dev'essere quella richiesta per tutta la
       * transizione, e l'esito da non coprire è quello della scrittura che
       * questa transizione provoca, non di una qualunque.
       */
      const dati = fotografaRevisione(n);
      const seqPrima = ultimaScritturaRif.current.seq;
      return richiedi(() => ripristinaSenzaChiedere(n, dati, seqPrima), {
        etichetta: "Ripristinare una revisione",
      });
    },
    [richiedi, ripristinaSenzaChiedere, ostacoloAlRipristino, fotografaRevisione],
  );

  return {
    contenuto,
    sporco,
    bozze,
    esito,
    ESITI,
    creaDaTour,
    apri,
    salva,
    scriviEditoriale,
    scriviFattuale,
    riallineaAllaFonte,
    confrontaConLaFonte,
    elimina,
    revisioni,
    ripristina,
    ricarica,
  };
}
