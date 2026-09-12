import { useCallback, useEffect, useRef, useState } from "react";
import { useArchivio } from "./ContestoArchivio";
import { ESITI, useRegistraGuardia, useRichiediTransizione } from "./transizione";
import { contenutoVuoto } from "../fondamenta/schema";
import { daTour, riallineaTourAllaFonte } from "../fondamenta/adapter-tour";
import { registraRevisione } from "../fondamenta/versioni";

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
};

const CATEGORIA = "tour";

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
   * Il debito lasciato da una scrittura confermata ma non riletta: `{ id }`.
   *
   * Finché c'è, la base in memoria è più vecchia di quella sul disco, e
   * riscriverci sopra farebbe sparire dalla storia lo stato appena persistito.
   */
  const recuperoRif = useRef(null);
  /** Falso dopo lo smontaggio: nessun effetto tardivo. */
  const vivoRif = useRef(true);

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
    async (iniziale) => {
      if (!iniziale) return null;

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
            setEsito({ codice: CODICI.superataDaAltroContenuto });
            return null;
          }
          if (!recuperato) {
            // Non si è ancora in grado di sapere da dove ripartire: meglio non
            // scrivere che scrivere sopra. Si può riprovare.
            setEsito({ codice: CODICI.baseNonRecuperata });
            return null;
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
        const conStoria = registraRevisione(daSalvare, salvatoRif.current);
        idSalvato = await archivio.salva(conStoria);
      } catch {
        if (vivoRif.current) setEsito({ codice: CODICI.erroreScrittura });
        return null;
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
        setEsito({ codice: CODICI.riletturaFallita });
        return null;
      }

      // Prima delle ultime attese: applicare un record su un contenuto che non
      // è più quello cancellerebbe lavoro.
      if (
        (contenutoRif.current?.id ?? null) !== idDiPartenza ||
        sessioneRif.current !== sessioneDiPartenza
      ) {
        setEsito({ codice: CODICI.superataDaAltroContenuto });
        return null;
      }
      if (modificheRif.current !== modificheAllInizio) {
        // La scrittura è riuscita: quello stato è sul disco, e la sua storia
        // dev'essere la base del prossimo tentativo.
        adottaBasePersistita(riletto);
        setEsito({ codice: CODICI.superataDaModifiche });
        return null;
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
        setEsito({ codice: CODICI.superataDaAltroContenuto });
        return null;
      }
      if (modificheRif.current !== modificheAllInizio) {
        setEsito({ codice: CODICI.superataDaModifiche });
        return null;
      }

      setEsito({ codice: elencoAggiornato ? CODICI.salvata : CODICI.erroreElenco });
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
    // promessa condivisa dev'essere la **stessa**.
    if (scritturaRif.current) return scritturaRif.current;
    const mia = scrivi(contenutoRif.current).finally(() => {
      if (scritturaRif.current === mia) scritturaRif.current = null;
    });
    scritturaRif.current = mia;
    return mia;
  }, [scrivi]);

  const apriSenzaChiedere = useCallback(
    async (id) => {
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

      /*
       * L'identità dev'essere la stessa, e dichiarata: senza uno slug non si sa
       * da quale tour venga la bozza, e accettare l'istantanea di un altro le
       * farebbe dire di descrivere un percorso che non descrive.
       */
      const suo = corrente.fonte;
      if (
        corrente.categoria !== CATEGORIA ||
        suo?.tipo !== "tour" ||
        !suo?.slug ||
        suo.slug !== tourAttuale.slug
      ) {
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
    ricarica,
  };
}
