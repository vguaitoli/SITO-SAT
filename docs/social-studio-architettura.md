# STA Social Studio — Architettura (Fase 2)

Documento di decisione. Non è codice implementato: definisce come si costruisce
Social Studio nelle fasi successive e perché.

Stato: **proposta**, in attesa di approvazione della Fase 2.

---

## 1. Principi non negoziabili

1. **Il sito resta la fonte primaria.** Social Studio legge eventi, tour, guide e
   servizi tramite un adapter; non ne diventa il CMS e non ne duplica i dati
   commerciali.
2. **Dati fattuali e testi editoriali restano separati** anche nel modello dati,
   non solo nell'interfaccia. Ciò che è fattuale non transita mai come materiale
   modificabile dall'AI.
3. **Local-first.** Fotografie e GPX non lasciano il browser nella prima
   versione.
4. **Un solo albero di componenti** serve anteprima ed esportazione. Non esistono
   due implementazioni dello stesso template.
5. **Modifica minima al sito pubblico.** Social Studio è isolato; tocca il
   frontend pubblico solo per la rotta protetta.

---

## 2. Verifica tecnica eseguita (spike export)

Il requisito «preview = export» dipende interamente da html2canvas. È stato
verificato con un campione che contiene tutti i casi critici
(`docs/spike-export.html`):

| Elemento | Esito |
|---|---|
| Bebas Neue, Oswald, Montserrat self-hosted | riprodotti, accenti compresi |
| SVG inline: polygon, path curvi, stroke, marker | riprodotto fedelmente |
| `<text>` dentro SVG con letter-spacing | riprodotto, minime differenze di crenatura |
| Gradienti CSS | riprodotti |
| `document.fonts.check()` come guardia | funziona: consente il requisito §53 |

**Costo rilevato:** 983 ms per una cattura 540×675. A 1080×1350 sono quattro
volte i pixel: si stimano 2–4 s per slide, quindi **20–30 s per un carosello di
otto slide**. Conseguenza architetturale: l'export è asincrono con avanzamento
visibile e cancellabile, non un pulsante che blocca l'interfaccia.

**Decisione:** html2canvas è adeguato. Nessuna libreria di rendering alternativa.

---

## 3. Albero delle directory

```
src/social-studio/
  fondamenta/
    schema.js            schema zod + versione + migrazioni
    migrazioni.js        catena di migrazioni v1→v2→…, mai distruttive
    archivio.js          SocialStorage: interfaccia astratta
    archivio-locale.js   implementazione IndexedDB (l'unica in v1)
    adapter-sito.js      lettura da useSiteContent(): eventi, tour, guide, servizi
    brand-lock.js        stato e regole del blocco identità

  design/
    tokens.js            colori, tipografia, spaziature (dai token del sito)
    categorie.js         le 8 rubriche: pesi foto/grafica, accento, varianti
    formati.js           post 1080×1350, story 1080×1920, carosello, safe area

  media/
    libreria.js          CRUD immagini + tag + ricerca
    ritaglio.js          crop, zoom, punto focale (non distruttivo)

  motori/
    gpx.js               parser + metriche          ← dal prototipo, invariato
    proiezione.js        Web Mercator + fit         ← dal prototipo, invariato
    altimetria.js        profilo dal GPX                            (nuovo)
    caption/
      provider.js        interfaccia CaptionProvider                (nuovo)
      fact-lock.js       estrazione dati fattuali + verifica         (nuovo)
    export/
      cattura.js         html2canvas + guardia font ← dal prototipo, esteso
      zip.js             archivio store-only        ← dal prototipo, invariato
    preflight.js         controlli pre-esportazione                 (nuovo)

  template/
    telaio.jsx           cornice comune per formato   ← dal prototipo, generalizzato
    primitivi.jsx        testo adattivo, celle, icone ← dal prototipo, corretto
    foto.jsx             fotografia in slide          ← dal prototipo, invariato
    mappa.jsx            mappa topografica            ← dal prototipo, invariato
    profilo-alt.jsx      profilo altimetrico                        (nuovo)
    rubriche/
      eventi/            post · story · carosello 8 slide · preset
      tour/  trail/  sardegna/  guide/  garage/  crew/  info/

  app/
    Studio.jsx           guscio e navigazione
    Dashboard.jsx
    Composer.jsx         nuovo contenuto, suggerimenti
    Planner.jsx          calendario e stati
    ProfiloPreview.jsx   griglia feed, drag & drop
    Impostazioni.jsx     design system, brand lock, backup
```

Il prototipo in `src/admin/instagram/` **non viene spostato in blocco**: i moduli
migrano uno per uno quando la fase corrispondente li richiede, e la cartella
originale si rimuove solo quando è vuota di contenuti utili.

---

## 4. Data model

### 4.1 La separazione fattuale / editoriale

Ogni contenuto tiene i due mondi in rami distinti:

```js
{
  id, versioneSchema: 1,
  categoria: "eventi",          // una delle 8 rubriche
  formato: "post" | "story" | "carosello",
  variante: "standard",         // variante approvata della rubrica
  stato: "bozza" | "pronto" | "programmato" | "pubblicato" | "archiviato",

  // --- ciò che viene dal sito: riferimento, non copia ---
  fonte: {
    tipo: "evento" | "tour" | "guida" | "nessuna",
    slug: "la-via-dei-giganti-2026",
    istantanea: { … },      // copia di sola lettura al momento dell'import
    importatoIl: "2026-08-15T…",
  },

  // --- dati fattuali effettivamente usati nelle grafiche ---
  fattuali: {
    date, prezzo, km, durata, sterrato, livello,
    partecipantiMin, partecipantiMax, tappe: [], inclusi: [], requisiti: [],
    // ogni campo sa da dove viene
    origine: { prezzo: "sito", km: "manuale", … },
  },

  // --- ciò che appartiene solo al social ---
  editoriale: {
    titoloBreve, claim, highlight: [], caption: { testo, paragrafiBloccati: [] },
    cta, statoPosti,
  },

  media: { … },        // riferimenti alla libreria + crop
  mappa: { … },         // configurazione, riferimento al GPX
  visual: { tono, tipo, soggetto, intento },   // Visual History
  versioni: [ { n, quando, etichetta, dati } ],
  creato, modificato, dataPrevista,
}
```

`fonte.istantanea` è deliberatamente una copia **di sola lettura**: serve a
sapere che cosa diceva il sito al momento dell'import e a segnalare quando il
sito è cambiato («il prezzo sul sito ora è 620 €, nel contenuto è 580 €»). Non è
una seconda fonte di verità: si aggiorna solo con un reimport esplicito.

`fattuali.origine` è ciò che rende verificabile il Fact Lock: per ogni valore si
sa se viene dal sito o è stato scritto a mano.

### 4.2 Versionamento dello schema

`versioneSchema` su ogni record. All'apertura, `migrazioni.js` applica in catena
le migrazioni mancanti. Regole: **mai cancellare campi**, mai riscrivere in
luogo. Ogni migrazione produce un nuovo oggetto e, prima di scrivere, l'archivio
salva un'istantanea di sicurezza esportabile.

Validazione con **zod**, già in dipendenze: definisce lo schema una volta e serve
sia a validare l'input dell'editor sia a verificare i backup importati.

---

## 5. SocialStorage — livello di astrazione

Requisito esplicito: la scelta fra IndexedDB e altre API non deve propagarsi nei
componenti. L'interfaccia è deliberatamente povera e asincrona, così qualunque
implementazione futura (file system, backend) la può soddisfare.

```js
// fondamenta/archivio.js — interfaccia, nessuna implementazione
export const SocialStorage = {
  // contenuti
  elenca(filtro),            // → [{id, categoria, stato, titolo, modificato}]
  leggi(id),                 // → contenuto completo
  salva(contenuto),          // → id
  elimina(id),
  duplica(id),

  // binari: foto e GPX, tenuti separati dai metadati
  salvaBlob(tipo, blob, meta),   // tipo: "immagine" | "gpx"
  leggiBlob(idBlob),             // → Blob
  urlTemporaneo(idBlob),         // → object URL, da revocare
  eliminaBlob(idBlob),

  // manutenzione
  esportaBackup(opzioni),    // → JSON (+ GPX solo se richiesto)
  importaBackup(json, modo), // modo: "unisci" | "sostituisci"
  spazioUsato(),             // → {byte, quota}
};
```

I componenti UI ricevono l'archivio da un contesto React e non importano mai
`archivio-locale.js`. Un test di architettura può verificarlo con una semplice
regola: nessun file sotto `app/` o `template/` importa `archivio-locale`.

**Implementazione v1: IndexedDB.** Motivo: è l'unica API browser che regge
centinaia di MB di fotografie, è asincrona e transazionale. `localStorage` è
escluso (limite ~5 MB, sincrono). L'accesso avviene tramite un wrapper scritto in
casa di poche decine di righe: `idb` come dipendenza non si giustifica.

**Nota su quota e persistenza:** il browser può liberare IndexedDB sotto
pressione. All'avvio si chiede `navigator.storage.persist()` e si mostra lo
spazio usato. È la ragione per cui il backup JSON non è un accessorio ma parte
del flusso normale.

---

## 6. Modello di sicurezza

### 6.1 Superficie reale con local-first

| Bene | Dove sta | Esposizione |
|---|---|---|
| Fotografie originali | IndexedDB del browser | nessuna: mai caricate |
| GPX | IndexedDB del browser | nessuna: mai caricato |
| Bozze, caption, planner | IndexedDB del browser | nessuna |
| Codice dello studio | bundle pubblico | l'interfaccia è visibile, i dati no |

Chi apre `/admin/social` senza essere l'utente vede **uno studio vuoto**, non i
contenuti altrui. Il rischio residuo non è la fuga di dati ma l'esposizione
dell'interfaccia.

### 6.2 Protezione della rotta

Tre livelli, dal più semplice:

1. **Oggi:** `robots.txt` Disallow + `X-Robots-Tag: noindex` già attivi su
   `/admin/*`. La rotta è fuori da sitemap e prerendering, e il chunk è caricato
   in lazy: non pesa sul sito pubblico.
2. **Consigliato in Fase 3:** Vercel Deployment Protection sul path, oppure una
   Edge Middleware con Basic Auth da variabili d'ambiente. Nessuna dipendenza,
   protezione lato server, una decina di righe.
3. **Solo se servirà multi-utente:** un vero provider di identità. Fuori scope.

### 6.3 GPX

Vincoli rispettati per costruzione: il GPX non entra in `/public`, non entra nel
repository, non finisce nel bundle, non compare nell'HTML pubblico, non è
scaricabile dal frontend pubblico, non è incluso nell'export Instagram.

Alla mappa serve solo la geometria proiettata: il file resta nell'archivio, e
alla slide arrivano coordinate già trasformate.

Per ogni GPX l'utente sceglie **conserva** oppure **elimina dopo l'export**.
Il backup lo include solo con una spunta esplicita e separata.

### 6.4 Endpoint AI — come si autentica il frontend

Il primo disegno prevedeva un token Bearer permanente per il client. **Era
sbagliato:** qualunque segreto consegnato al browser è un segreto pubblico, sia
che stia nel bundle sia in `localStorage`. Corretto così:

**Lo studio non possiede alcun segreto.** Chiama
`/admin/social/api/caption`, che sta sotto il prefisso già protetto dal
middleware. Il browser, avendo autenticato `/admin/social`, rimanda da sé le
credenziali Basic alle risorse dello stesso spazio di protezione: la `fetch`
parte con `credentials: "same-origin"` e nient'altro.

```
POST /admin/social/api/caption   → riscritto su /api/caption (Vercel Function, edge)
  ├─ middleware                    stessa autenticazione dello studio
  ├─ la funzione riverifica        stessa implementazione: api/_autenticazione.js
  ├─ limite di frequenza           finestra scorrevole in memoria
  ├─ validazione zod .strict()     un campo imprevisto fa fallire la richiesta
  ├─ tetto di 32 KB                controllato prima e dopo la lettura
  ├─ chiama il provider            CAPTION_API_KEY solo lato server
  └─ risposta                      solo testo; il nome del fornitore non esce
```

Studio e API condividono **una sola implementazione** dell'autenticazione: due
copie divergerebbero, ed è sulla divergenza che si aprono i buchi. La funzione
riverifica per conto proprio, così una chiamata diretta a `/api/caption` che
scavalcasse il routing troverebbe lo stesso controllo.

Fotografie, GPX e coordinate non possono attraversare l'endpoint per
costruzione: lo schema accetta solo stringhe brevi, e un campo `gpx` fa
rispondere 400.

### 6.5 Il filtro delle rotte sta nel codice, non nel matcher

Questo è un progetto Vite, non Next.js. Con `config.matcher` la CLI di Vercel
non riesce a interpretare i percorsi con parametri (`Unhandled type:
"ColonToken"`) e il middleware va in errore su **ogni** richiesta: provato con
`vercel dev`, e il risultato è l'intero sito pubblico a 500.

Il filtro è quindi una funzione esportata e verificata dai test,
`eProtetta(percorso)`, che confronta segmenti interi — `/admin/socialmente` non
è `/admin/social`. In caso di errore imprevisto il middleware chiude sulle
rotte riservate e prosegue su quelle pubbliche: sbagliare in direzione opposta
significherebbe, nel primo caso, lasciare entrare; nel secondo, rompere il sito.

---

## 7. Prototipo: cosa riutilizzare, migrare, eliminare

| Modulo | Righe | Decisione | Perché |
|---|---|---|---|
| `gpx.js` | 229 | **riusare invariato** | Parser completo (trk/trkseg/trkpt, rte, wpt), metriche con soglia anti-rumore di 3 m, Douglas-Peucker iterativo. Nessuna dipendenza, nessun legame con React. |
| `proiezione.js` | 130 | **riusare invariato** | Web Mercator, fit al riquadro con rotazione, funzioni pure. |
| `zip.js` | 110 | **riusare invariato** | ZIP store-only corretto. Evita una libreria da ~100 KB. |
| `slide/MappaPercorso.jsx` | 236 | **riusare** | Renderer cartografico completo. Va solo reso indipendente dal formato. |
| `slide/FotoSlide.jsx` | 72 | **riusare** | Crop non distruttivo, già conforme. |
| `esporta.js` | 91 | **migrare, esteso** | Manca la guardia sui font richiesta da §53 e il formato story. Lo spike ha dimostrato che `document.fonts.check()` risolve il primo punto. |
| `slide/tokens.js` | 89 | **migrare** | Diventa `design/`: servono le 8 rubriche, i pesi foto/grafica, le varianti e l'accento `#E18A3C` specifico degli EVENTI. |
| `slide/primitivi.jsx` | 351 | **migrare, con una correzione** | Buone le idee di `Telaio`, `TestoAdattivo` e `ControlloCapienza`. Ma `TestoAdattivo` esegue un `useLayoutEffect` senza array di dipendenze e muta `style.fontSize` in un ciclo a ogni render: funziona, è fragile. Da riscrivere con misurazione unica e memoizzata. |
| `slide/Slides.jsx` | 907 | **migrare, non finalizzare** | La struttura delle 8 slide è giusta e riusabile. Il trattamento grafico resta provvisorio finché non arriva il sorgente della locandina. |
| `modello.js` | 232 | **sostituire in parte** | Il modello piatto del carosello non regge 8 rubriche, 3 formati, versioni e stati. Si conserva `daEventoDelSito()`, che diventa il cuore di `adapter-sito.js`. |
| `src/lib/rilievo-sardegna.js` + `src/data/mappa-sardegna.json` + `scripts/build-mappa-instagram.mjs` | 277 + dati | **riusare invariati** | Base cartografica già generata e verificata. |

**Da eliminare: nulla.** Il prototipo non contiene codice morto.

---

## 8. Dipendenze

### Già presenti, riutilizzate

`html2canvas` export · `lucide-react` icone · `zod` schema e validazione ·
`@hello-pangea/dnd` planner e riordino feed · `date-fns` calendario ·
`react-hook-form` form dell'editor · componenti `src/components/ui`.

### Da aggiungere

| Pacchetto | Tipo | Perché | Alternative scartate |
|---|---|---|---|
| **vitest** | dev | Non esiste alcun test runner. Condivide la configurazione di Vite, quindi zero setup aggiuntivo. | Jest: richiederebbe una toolchain separata. |
| SDK del provider AI | prod, **solo lato server** | Solo quando si abilita l'endpoint caption. Sta nella funzione serverless, non nel bundle. | Chiamata HTTP diretta: possibile, valutabile per evitare del tutto la dipendenza. |

### Deliberatamente non aggiunte

`idb` (wrapper IndexedDB: bastano poche decine di righe) · `jszip`/`fflate`
(risolto in casa) · qualsiasi parser GPX · qualsiasi libreria cartografica
(`leaflet` è già in dipendenze ma richiederebbe tile esterni e porterebbe
un'estetica da mappa stradale) · librerie di grafici per l'altimetria (è un
`path` SVG di poche righe).

---

## 9. Flusso GPX

```
file .gpx
   ↓  analizzaGpx()            DOMParser, nessuna dipendenza
segmenti [{lon, lat, quota}]   ← geometria ESCLUSIVAMENTE dal file
   ↓  calcolaMetriche()        distanza, D+, D−, quota min/max
suggerimenti                   mostrati accanto ai campi, mai applicati da soli
   ↓  utente conferma o ignora
   │
   ├─ mappa ──────────────────────────────────────────────────────────
   │    ↓  riquadro() + creaVista()   Web Mercator, fit con margine
   │    ↓  proietta()                 da gradi a pixel
   │    ↓  semplificaProiettato()     Douglas–Peucker IN PIXEL, 0,5 px
   │    ↓  tracciaPath()              coordinate per intero, nessun arrotondamento
   │  path SVG
   │
   └─ profilo altimetrico (opzionale) ─────────────────────────────────
        ↓  profiloAltimetrico()       distanza cumulativa + quota, per tratti
        ↓  proiettaProfilo()          da metri a pixel dentro il riquadro
        ↓  semplificaProiettato()     stessa funzione, stesso limite
        ↓  tracciaPath()              un path per tratto, mai un collegamento
      path SVG
```

Il GPX non viene mai riscritto. La semplificazione è derivata e ricalcolata a
ogni cambio di zoom; se si esporta a scala maggiore, la traccia guadagna
dettaglio invece di perderlo.

L'ordine **proietta prima, semplifica dopo** non è una preferenza: «errore
massimo mezzo pixel» è una frase che ha senso solo in pixel. In gradi
dipenderebbe da latitudine, scala, zoom, rotazione e misura della tela, e
cambierebbe a ogni formato. E le coordinate si scrivono per intero, perché il
limite deve valere sul path **realmente serializzato**: quantizzarle a un
decimale aggiungeva un errore che la tolleranza non comprendeva.

Le località sono **solo etichette**: non partecipano alla geometria. Si possono
aggiungere a mano o proporre dai waypoint del file, sempre modificabili.

### 9.1 Profilo altimetrico

Opzionale, spento per default (`contenuto.mappa.mostraAltimetria`), e presente
in un solo posto: la **slide 03 del carosello**. Non è una nona slide — il
carosello resta di otto e il pacchetto di sedici file. Accendendolo si ridispone
soltanto l'interno della banda del percorso: la mappa si accorcia esattamente di
quanto occupano il profilo e la sua aria, così filetto, tappe, sterrato e
marchio non si spostano di un pixel. Le misure stanno in `zone.js`
(`PROFILO_ALTIMETRICO`) e la loro somma è verificata da un test.

Quello che il file non dice, il grafico non lo disegna:

| Situazione | Comportamento |
|---|---|
| quota mancante | il tratto **si interrompe**; nessuna interpolazione |
| due segmenti GPX | due path distinti; nessuna linea di collegamento |
| distanza fra segmenti | **non** si conta: quel tratto non è stato registrato |
| quota `0` | è un dato valido — il controllo è `=== null`, mai la verità del valore |
| quote negative | valide |
| profilo piatto | disegnato a metà altezza, non a zero |
| nessuna quota utilizzabile | il componente segnala un **errore** che ferma l'export |
| quote parziali | **avviso**: il grafico avrà interruzioni, e sono reali |

Le letture mostrate — quota minima e massima, D+, D−, chilometri — vengono dal
GPX e sono etichettate come tali. I chilometri commerciali dell'evento sono un
altro dato e restano intoccati; l'avviso che confronta i due non cambia.

**Dove vive il giudizio.** Il pre-flight controlla ciò che si vede nel
contenuto: opzione accesa senza GPX è un errore. Le quote invece le legge solo
il componente che prova a disegnarle, e la sua segnalazione arriva al pre-flight
attraverso `sfori`, sia nell'editor sia in `esporta()`. Il motivo è che né
`preflight()` né `esporta()` ricevono la traccia analizzata: duplicare quel
giudizio in due punti significherebbe farlo divergere. Un profilo richiesto e
impossibile non esce mai in silenzio.

**Quando `Altimetria` viene montato.** Tre condizioni distinte, e la distinzione
è il punto:

| | dove vive | |
|---|---|---|
| `richiesto` | contenuto | l'ha chiesto chi scrive |
| `haRiferimento` | contenuto | nella bozza c'è un GPX salvato |
| `segmenti` | stato dell'editor | la traccia è ricostruita **adesso** |

La regola è `richiesto && haRiferimento`. I `segmenti` **non** entrano nella
condizione di montaggio, e non è una svista: fra il riferimento e la traccia
c'è una finestra in cui il primo esiste e la seconda no — la reidratazione
dall'archivio è asincrona, il blob può essere stato sfrattato, il file può
essere illeggibile. Montare solo con `segmenti.length > 0` significava non
montare proprio nei casi in cui il profilo era **richiesto ma impossibile**:
senza componente non c'era nessuno a dirlo, il pre-flight vedeva un `gpx.idBlob`
regolare, e l'opzione spariva in silenzio dall'esportazione.

Montando comunque, `Altimetria` riceve un elenco vuoto, non disegna, e registra
l'errore. Che si ritira da sé — `useSegnalazione` lo toglie allo smontaggio e
al cambio di stato — appena la traccia arriva o l'opzione viene spenta. Senza
riferimento GPX il componente non si monta affatto: lì l'errore è del pre-flight
puro, che lo dice già due volte, e una terza voce sarebbe rumore.

**Una segnalazione per grafica, non per istanza.** Il registro indicizza per
istanza React, e deve farlo: durante un'esportazione del pacchetto la slide 03
è montata due volte — l'anteprima visibile come `carosello/03`, la copia fuori
schermo come `pacco/carosello/03` — e se condividessero una chiave lo
smontaggio dell'una cancellerebbe la segnalazione dell'altra.

Ma di slide 03 ce n'è **una**. `sfori()` normalizza la chiave togliendo il solo
prefisso iniziale `pacco/` e deduplica su **livello + chiave logica +
messaggio**, poi costruisce l'id come `sforo-<chiave logica>`. Senza, lo stesso
errore compariva due volte, e il conteggio dipendeva dalla vista aperta
nell'editor: col carosello a schermo due copie, col Post o la Story una sola —
lo stesso export riportava numeri diversi a seconda di dove si stava guardando.

I tre campi servono tutti e tre. Lo stesso messaggio su grafiche diverse sono
due problemi da sistemare; la stessa grafica con messaggi diversi pure; e la
stessa grafica con lo stesso messaggio ma livelli diversi resta doppia, perché
un errore blocca e un avviso no, e fonderli ne perderebbe uno.

---

## 10. Flusso AI e Fact Lock

```
contenuto
   ↓  estraiFattuali()      costruisce un oggetto separato, congelato
   ↓  costruisciPrompt()    rubrica + lunghezza + fattuali come sola lettura
   ↓  CaptionProvider.genera()
   ↓  verificaFattuale()    confronta i numeri nel testo con l'oggetto congelato
   ↓  esito                 testo + eventuali discordanze evidenziate
```

L'interfaccia è agnostica rispetto al fornitore:

```js
// motori/caption/provider.js
export const CaptionProvider = {
  nome,                                   // etichetta mostrata nell'interfaccia
  disponibile(),                          // → bool, senza effetti collaterali
  genera({ rubrica, lunghezza, fattuali, editoriale, paragrafiBloccati }),
};
```

Implementazioni previste: `ProviderManuale` (nessuna AI: restituisce una
struttura da compilare, ed è il default) e `ProviderRemoto` (chiama
`/api/caption`). Social Studio non conosce alcun fornitore per nome.

`verificaFattuale()` estrae dal testo generato numeri, valute, percentuali e
date, e li confronta con l'oggetto congelato. Una discordanza produce un
avviso, mai una correzione automatica: il testo resta dell'autore.

---

## 11. Piano dei test (vitest)

In ordine di priorità: sono le parti dove un errore è silenzioso e costoso.

1. **Parser GPX e metriche** — file con track multipli, segmenti, rotte,
   waypoint, quote mancanti, XML malformato. Distanza verificata contro un
   percorso a distanza nota; dislivello con e senza soglia anti-rumore.
2. **Fact Lock** — la verifica deve intercettare prezzo, date, km, percentuali e
   partecipanti alterati; e non produrre falsi allarmi su numeri legittimi
   presenti nel testo.
3. **Migrazioni e schema** — una catena v1→v2 non deve perdere campi; il
   backup esportato e reimportato deve restituire un oggetto identico.
4. **SocialStorage** — contratto dell'interfaccia verificato con
   un'implementazione in memoria, così i test non dipendono da IndexedDB.
5. **Pre-flight** — ogni controllo scatta quando deve e non quando non deve.
6. **Proiezione** — coordinate note proiettate e riproiettate tornano al punto
   di partenza; il fit contiene sempre l'intero percorso.
7. **Coerenza anteprima/export** — le dimensioni del nodo catturato coincidono
   con il formato dichiarato e i font risultano caricati.

---

## 12. Controllo anti-commit dello snapshot Tina

Il dev server riscrive `src/content/tina-snapshot.json` sostituendo gli URL del
CDN Tina con percorsi locali `/media/cms/…`. Committarlo romperebbe le immagini
in produzione. È già successo in questa sessione.

Proposta: uno script `scripts/controlla-snapshot.mjs` che fallisce se il file in
stage contiene `"/media/cms/`, aggiunto come script npm e installabile come hook
`pre-commit` con un comando. Nessuna dipendenza, nessun husky.

Da realizzare in Fase 3 insieme al resto delle fondamenta di sicurezza.

---

## 13. Trade-off principali

| Scelta | Si guadagna | Si perde |
|---|---|---|
| **Local-first** | Privacy per costruzione, zero backend, zero costi, nessuna chiave | Un solo dispositivo; il backup diventa responsabilità dell'utente; il browser può liberare lo spazio |
| **html2canvas** | Un solo albero di componenti, WYSIWYG strutturale, dipendenza già presente | 2–4 s per slide; alcune proprietà CSS moderne non supportate, da evitare nei template |
| **Cartografia propria** | Nessuna chiave API, nessun costo, estetica pienamente controllata, nessun vincolo di attribution oltre OSM | Il rilievo è stilizzato, non un modello altimetrico: va detto e non spacciato per dato |
| **ZIP e GPX scritti in casa** | ~150 KB di dipendenze evitati, nessun aggiornamento da inseguire | Codice nostro da mantenere e testare |
| **8 rubriche con varianti fisse** | Coerenza garantita, nessuna deriva grafica | Meno libertà creativa nel singolo post: le varianti nuove vanno progettate |
| **Istantanea della fonte** | Si vede quando il sito cambia sotto un contenuto già pronto | Una copia in più da tenere allineata, con un reimport esplicito |

---

## 14. Cosa resta bloccato

- **Template grafico EVENTI**: sbloccato. `Locandina-Via-dei-Giganti.dc.html` è
  accessibile dal progetto Claude Design integrato — vedi la sezione 15, che è
  ora la fonte del linguaggio visuale EVENTI. Restano da allineare Story,
  carosello e slide 08.
- **Endpoint AI in produzione**: non si abilita prima di autenticazione e rate
  limiting.


---

## 15. Fonte del linguaggio visuale EVENTI

### 15.1 Fonte primaria

Il **progetto Claude Design «La via dei giganti»**
(`027c20d9-bd4b-4afc-b0c9-3d770f26185c`), letto tramite lo strumento
`DesignSync`, è la fonte primaria e vincolante del linguaggio visuale EVENTI:
composizione, colori, fondi, gradienti, overlay, trattamento fotografico,
tipografia, dimensioni, proporzioni, spaziature, gerarchie, badge, marchio,
mappa sovrapposta, mood.

`/format` **non** è una fonte. Non è un riferimento, non è un fallback, e non
fornisce proporzioni.

### 15.2 Gerarchia delle fonti

1. **Progetto Claude Design integrato** — **composizione, geometria, colori,
   parametri**. È il bersaglio.
2. **PNG esportato** (`post-instagram-1080x1350-2.png`, master 2160×2700 a 2×) —
   **solo riferimento atmosferico**. Non entra nel repository né nel bundle.
3. **Design system STA** — solo per ciò che il progetto non definisce.

**Il PNG è un'iterazione diversa dal `.dc.html`.** Confrontati, differiscono
nella struttura: il PNG ha una sola striscia `date │ itinerario` sopra il
titolo, non ha le quattro colonne dei dati, non ha i servizi inclusi, non ha il
piede con telefono e sito, e lascia vuoto il terzo inferiore.

Il `.dc.html` prevale. Il PNG si usa **soltanto** per giudicare atmosfera,
trattamento fotografico, profondità, equilibrio fra fotografia e velo,
leggibilità e carattere generale. **Non è un riferimento geometrico** e non si
usa per spostare i blocchi.

### 15.3 Risorse analizzate

Da `list_files` sul progetto:

| Percorso | Leggibile | Contenuto |
|---|---|---|
| `Locandina-Via-dei-Giganti.dc.html` | sì | **struttura, token e parametri del Post.** Fonte del sistema |
| `Stories-Via-dei-Giganti.dc.html` | sì | sei schermate 1080×1920. **Fonte del sistema Story**, implementato nel capitolo 5.3 |
| `doc-page.js` | sì | runtime di impaginazione (scaffold «omelette»). **Nessun valore di design** |
| `support.js` | sì | runtime `<x-dc>`. Non letto: la logica dei `{{ }}` è inline nei due `.dc.html` |
| `logo-512.png` | parziale | marchio del progetto, 512×512. Non copiato: in `public/` c'è già `logo-sardegna-trail-avventura.png`, anch'esso 512×512 |
| `uploads/La via dei giganti.png` | parziale | traccia come immagine, 2400×1800. Non copiata: la mappa si disegna dal GPX |
| `uploads/la-via-dei-giganti-hero-realistico.png` | parziale | fotografia dell'evento, 1122×1402. Non copiata: le foto vengono dalla Media Library |
| `uploads/ChatGPT Image 9 lug 2026…png` | — | non usata dai due `.dc.html` |

**I tre binari non sono decodificabili per intero.** `get_file` ne ha
restituiti 196.608 byte ciascuno — **192 KiB**, non 256 — con `truncated: true`.
Un PNG troncato non si apre: nessuno dei tre è stato renderizzato. Quello che
sopravvive al troncamento è l'intestazione IHDR nei primi 33 byte, e da lì
vengono le dimensioni dichiarate qui sopra.

Non è stato un giro a vuoto. La mappa è **2400×1800, cioè 4:3**, e il
riferimento la dispone con `width: 1240px` lasciando l'altezza automatica: il
riquadro reale è **1240×930**. Era stato ipotizzato quadrato — leggere
l'intestazione ha corretto l'ipotesi, ed è il valore che sta in `MAPPA_STORY`.

Nessuno di questi file è stato copiato nel repository o sotto `public/`.

### 15.4 Palette estratta

| Ruolo | Valore | Dichiarazione d'origine |
|---|---|---|
| Fondo | `#14120F` | `background: #14120F` della sezione |
| Testo primario | `#F7F0E6` | titolo, valori, itinerario, sito |
| Testo secondario | `#B4A691` | etichette, payoff, inclusi, piede |
| Testo su velo | `#DCD1BF` | claim |
| Etichetta kicker | `#E4DACB` | `NORD SARDEGNA · GALLURA` |
| Filetti | `rgba(228,218,203,.24)` | `border-top`/`border-bottom` |
| Accento | `#E08A3C` | `default` della prop `accent` |
| Accenti alternativi | `#C25A18`, `#D9C27E`, `#8FA36B` | `options` della prop `accent` |

**Accento: una sola definizione.** In conversazione era stato scritto `#E18A3C`;
il progetto dichiara `#E08A3C`. Vale il progetto, e il valore vive in **un solo
posto**: `ACCENTO_EVENTI` in `design/tokens.js`.

Prima esisteva in **quattro** copie scritte a mano, tutte `#E18A3C`:
`COLORI.accentoEventi`, `MAPPA.tracciaEventi`, `ALTIMETRIA.linea` e
`ACCENTO` in `template/rubriche/eventi/parti.jsx`. Ora tutte leggono la
costante, e `design/eventi.js` la ri-esporta come `ACCENTO`. La dipendenza va in
un verso solo — `eventi.js` → `tokens.js` — perché i token globali sono la base
e non possono dipendere da una rubrica.

Conseguenza dichiarata: Story, carosello, traccia della mappa e profilo
altimetrico cambiano accento da `#E18A3C` a `#E08A3C`. **Solo il colore**:
struttura e layout non sono stati toccati.

### 15.5 Tipografia estratta

Tre famiglie, con i ruoli che il progetto assegna. Il punto che i template
precedenti sbagliavano: **Oswald porta anche i valori dei dati**, non solo le
etichette.

| Elemento | Famiglia | Corpo | Tracking | Interlinea |
|---|---|---|---|---|
| Titolo | Bebas Neue | 150 / **132** / 116 | `.015em` | `.84` |
| Kicker | Oswald | 20 | `.3em` | — |
| Badge disciplina | Oswald | 30 | `.2em` | — |
| «Posti limitati» | Oswald | 13 | `.2em` | — |
| Nome del marchio | Bebas Neue | 30 | `.06em` | `1.06` |
| Payoff del marchio | Oswald | 12 | `.26em` | — |
| Etichetta dato | Oswald | 12 | `.24em` | — |
| **Valore dato** | **Oswald 500** | **27** | `.02em` | — |
| Itinerario | Oswald | 23 | `.08em` | `1.35` |
| Claim | Montserrat 300 | 26 | — | `1.4` |
| Inclusi | Montserrat 300 | 19 | — | `1.45` |
| Piede | Montserrat | 17 | — | — |

Ombra del titolo: `0 8px 40px rgba(0,0,0,.55)`.

### 15.6 Fondo, trattamento fotografico, gradienti, overlay

**Il fondo di EVENTI non è un colore.** È una pila di quattro strati, e il
grigio caldo visibile al centro della locandina non è dipinto da nessuno: è la
fotografia desaturata vista attraverso il velo al 34% in quel punto. Cambiando
fotografia cambia il grigio, e restano costanti leggibilità, atmosfera e
gerarchia — che un `background` non saprebbe fare.

| z | Strato | Parametri |
|---|---|---|
| 0 | Fotografia a pieno campo | `inset: 0`, `object-fit: cover`, `object-position: 50% 42%`, filtro dal mood |
| 1 | Traccia cartografica | `opacity: .22`, `mix-blend-mode: luminosity`, maschera radiale, riquadro `-105 / -7 / 1335×848` |
| 2 | Velo verticale | gradiente a cinque tappe dal mood |
| 3 | Contenuto | — |

Maschera della mappa: `radial-gradient(120% 100% at 50% 42%, #000 32%,
rgba(0,0,0,.35) 66%, transparent 60%)`. Il file dichiara anche una variante
`-webkit-` a `100% 78%`: vale la standard.

### 15.7 Mood

Un mood è una **coppia** filtro + velo: non sono separabili, perché il velo di
Polvere è caldo in quanto la fotografia sotto è virata seppia.

| Mood | Filtro fotografico | Velo |
|---|---|---|
| **Notte** (predefinito) | `grayscale(.28) contrast(1.06) saturate(.9)` | `.78 / .34 / .72 / .96 / 1` a `0 / 26 / 52 / 76 / 100%` su `rgba(20,18,15)` |
| Polvere | `sepia(.4) saturate(1.1) contrast(1.08)` | `.74 / .26 / .78 / .97 / 1`, prime due tappe su `rgba(28,20,12)` e `rgba(70,40,16)` |
| Inchiostro | `grayscale(1) contrast(1.14)` | `.88 / .6 / .86 / 1` su `rgba(16,15,13)` |

Nessun mood cambia l'accento: un test lo verifica.

### 15.8 Struttura del Post

Tela 1080×1350, padding `58 / 62 / 52`.

| Blocco | Ordinata | Contenuto |
|---|---|---|
| Intestazione | 58 | marchio a sinistra, badge disciplina + «posti limitati» a destra |
| Kicker | 328 | barra `56×8` in accento + etichetta spaziata |
| Titolo | 392 | due righe, **l'ultima parola in accento** |
| Claim | 681 | larghezza 405 |
| Dati | fino a 1298 | quattro colonne fra due filetti: `DATE · PARTENZA · STERRATO · LIVELLO` |
| Itinerario | idem | etichetta + tappe in sequenza; servizi inclusi a destra |
| Piede | idem | contatti a sinistra, sito a destra, sopra un filetto |

**Allineamento ottico.** Titolo, claim e kicker non stanno sul margine di 62 ma
a 46, 53 e 45. Non è un trascinamento imperfetto ripetuto tre volte: è
l'allineamento ottico che i caratteri display richiedono.

### 15.9 Traduzione in sistema

Il `.dc.html` non è stato incorporato. È un documento: una fotografia, un
evento, coordinate trascinate. Il sistema vive in:

- `src/social-studio/design/eventi.js` — token, mood, velo, scala tipografica,
  griglia, safe area, regole di badge, kicker, dati, itinerario, mappa, e
  l'elenco esplicito di ciò che **non** contiene;
- `src/social-studio/template/rubriche/eventi/TelaioEvento.jsx` — la pila dei
  quattro strati, condivisibile dalle future varianti;
- `src/social-studio/template/rubriche/eventi/PostEvento.jsx` — la variante
  `EVENTO STANDARD / EDITORIAL`.

I token globali in `design/tokens.js` non sono stati modificati. Brand Lock
continua a proteggere `palette`, `font`, `scalaTipografica`,
`strutturaTemplate`, `proporzioni` e `areaSicura`; `ritaglio` resta libero, e il
ribaltamento orizzontale vive lì.

### 15.10 Vincoli applicativi

- **Preview = Export**: un solo albero di componenti, fotografato alla misura
  reale. Nessuna variante «da esportazione».
- **Ribaltamento**: nel riferimento la fotografia è specchiata, ma è una scelta
  su quella fotografia. `ritaglio.specchiata` è non distruttivo, configurabile,
  persistente e **spento per definizione**; le bozze salvate prima ricevono
  `false` dalla convalida, senza migrazione.
- **Crop**: la zona fotografica del Post è ora tutta la tela. `zonePerSlot`
  riporta 1080×1350 per il Post, 1080×1920 per la Story — anch'essa a pieno
  campo dal capitolo 5.3 — e 1080×700 per la slide 01 del carosello, che non è
  stata toccata. Le fasce della Story sono due sole: 1080×620 per la schermata
  02 e 1080×560 per la 05, ciascuna con il proprio slot (§15.17).

### 15.11 Elementi non presenti, quindi esclusi

Il riferimento non li contiene e il sistema non li introduce:
vignettatura laterale, texture, cornici, marcatore di rubrica in alto,
numerazione delle slide. Sono elencati in `ASSENTI` e un test verifica che
nessun token li reintroduca.

### 15.12 Kicker

La riga spaziata sopra il titolo, accanto alla barra in accento, è un dato
**editoriale**: `editoriale.kicker`. «NORD SARDEGNA · GALLURA» è una scelta di
racconto, non la località di partenza.

Non si deriva e non si compone: vuoto per definizione, con un preset per
`la-via-dei-giganti-2026` preso dal riferimento. Se manca, il template **non
disegna il blocco** e il pre-flight avvisa — un testo composto dai dati
riempirebbe la locandina di una geografia che nessuno ha scritto. Il blocco non
dipende dalla presenza del claim. Il kicker non entra fra i dati fattuali
inviati al provider di caption.

### 15.13 Story: sei schermate

Fonte: `Stories-Via-dei-Giganti.dc.html`, letto integralmente. Sei schermate
1080×1920, in sequenza fissa. Prevale sull'ipotesi manuale a due schermate
discussa in conversazione.

#### Ruoli delle risorse del progetto

| Risorsa | Ruolo | Nell'app |
|---|---|---|
| `Stories-Via-dei-Giganti.dc.html` | **vincolante**: struttura, geometria, colori, tipografia, sequenza | tradotto in parametri |
| `doc-page.js` | impianto di impaginazione. Pagina fissa 1080×1920 con `overflow: hidden` | **non copiato**, nessuna dipendenza |
| `support.js` | runtime `<x-dc>`, interpolazione `{{ }}`. Unici colori: cornice del runtime | **non copiato**, nessuna dipendenza |
| `logo-512.png` | riferimento del marchio | si usa il logo STA già in `public/` |
| `la-via-dei-giganti-hero-realistico.png` | riferimento di crop e trattamento | fotografia dalla Media Library |
| `La via dei giganti.png` | riferimento visuale del tracciato | mappa disegnata dal GPX locale |

Nessun `.dc.html`, runtime, immagine, URL o identificativo del progetto entra
nel repository, in `public/` o nel bundle.

#### Fondi, che non sono uno solo

Quattro fondi diversi, e vanno distinti perché il fondo è la firma della
schermata:

| Schermata | Fondo | Padding |
|---|---|---|
| 01 Cover | `#14120F` | `190 / 80 / 200` |
| 02 Numeri | `#14120F` | `0` (fascia foto + corpo) |
| 03 Mappa | **`#E9E2D6`, chiaro** | `190 / 80 / 200` |
| 04 Tappe | **`#17140F`** | `220 / 80` |
| 05 Incluso | `#14120F` | `0` (fascia foto + corpo) |
| 06 Prenota | `#14120F` | `190 / 80 / 200` |

La 03 è su carta: inchiostri `#1F1B16`, `#4A4034`, `#7A6A55`, filetti
`rgba(31,27,22,.28)`.

#### Veli, uno per schermata

Ogni schermata ha il proprio gradiente. Non sono varianti dello stesso: la 01
si apre scura, si schiarisce al 22–40% per lasciare respirare la fotografia, e
richiude in fondo.

| Schermata | Tappe del velo |
|---|---|
| 01 | `.72` 0% · `.12` 22% · `.1` 40% · `.74` 62% · `.97` 82% · pieno 100% |
| 02 (fascia) | `.5` 0% · `0` 34% · `.9` 88% · pieno 100% |
| 03 (chiaro) | `.92` 0% · `.2` 20% · `0` 46% · `.86` 76% · pieno 92% |
| 05 (fascia) | `.55` 0% · `.05` 30% · `.85` 86% · pieno 100% |
| 06 | `.68` 0% · `.18` 24% · `.82` 54% · `.99` 76% · pieno 100% |

#### Fotografia

| Schermata | Inquadratura | Ribaltata | Filtro |
|---|---|---|---|
| 01 | `50% 58%` piena tela | sì | dal mood |
| 02 | `50% 78%`, fascia 620 | sì | `saturate(.9) contrast(1.06)` |
| 05 | `50% 30%`, fascia 560 | **no** | `saturate(.88) contrast(1.05)` |
| 06 | `50% 46%` piena tela | sì | dal mood |

Il ribaltamento resta un dato del ritaglio, spento per definizione: nel
riferimento è una scelta su quella fotografia.

#### Mood della Story — diversi da quelli del Post

| Mood | Filtro Story | Filtro Post (Locandina) |
|---|---|---|
| **Naturale** | `saturate(.92) contrast(1.08)` | *non esiste* |
| **Notte** | *non esiste* | `grayscale(.28) contrast(1.06) saturate(.9)` |
| Polvere | `sepia(.3) saturate(1.12) contrast(1.08)` | `sepia(.4) saturate(1.1) contrast(1.08)` |
| Inchiostro | `grayscale(1) contrast(1.14)` | `grayscale(1) contrast(1.14)` |

**Tutti e tre differiscono.** Solo `Inchiostro` coincide. I due insiemi restano
separati e dichiarati: unirli richiederebbe una decisione, non un'inferenza.
Nel file la prop dichiara `default: "Inchiostro"` mentre il codice ricade su
`Naturale`: contraddizione del riferimento, risolta scegliendo `Naturale` come
predefinito e dichiarandolo qui.

#### Tipografia

Bebas ai titoli, Oswald a kicker/etichette/valori, Montserrat al corpo — la
stessa divisione della locandina, a corpi più grandi perché la tela è 1920.

| Ruolo | Famiglia | Corpo | Tracking | Interlinea |
|---|---|---|---|---|
| Titolo cover | Bebas | 168 | `.015em` | `.84` |
| Titolo schermata | Bebas | 104 / 100 | — | `.88` |
| Valore dato | Bebas | 80 (64 se va a capo) | — | `.95` / `1` |
| Prezzo | Bebas | 150 | — | `.9` |
| Numero tappa | Bebas | 62 | — | `1` |
| Valore mappa | Bebas | 58 | — | `1` |
| Kicker | Oswald | 24 | `.28em` | — |
| Etichetta sezione | Oswald | 20 | `.28em` | — |
| Etichetta dato | Oswald | 18 / 17 | `.24em` | — |
| Badge | Oswald | 26 | `.2em` | — |
| Data | Oswald | 30 | `.06em` | — |
| Titolo tappa | Oswald | 38 | `.06em` | — |
| Itinerario (03) | Oswald | 34 | `.07em` | `1.35` |
| Etichetta dei posti | Oswald 600 | 40 | `.1em` | — |
| Claim cover | Montserrat 300 | 36 | — | `1.4` |
| Corpo | Montserrat 300 | 32 / 30 / 29 / 27 | — | `1.45` / `1.5` / `1.4` |
| Voce inclusi | Montserrat | 32 | — | — |
| Piede | Montserrat | 26 | — | — |

Marchio: logo 118 (108 sulla 06), nome Bebas 34 `.06em` `lh 1.05`, payoff
Oswald 15 `.26em` colore `#574F40`. Kicker: barra `64×8` in accento.

#### Griglia dei numeri (02)

Due colonne, `gap: 1px` su fondo `rgba(228,218,203,.2)`: **il filetto è lo
spazio fra le celle**, non un bordo. Celle `#14120F`, padding `44 / 38`.

#### Animazioni: solo a schermo

Il riferimento anima ken burns e ingresso dei testi. `doc-page.js` le azzera in
stampa (`animation-duration: .001s`, `fill-mode: both`), quindi lo stato
statico è **quello finale** — per il ken burns, `scale(1.12)`.

Le Story esportate sono immagini ferme: le animazioni non si traducono. Lo zoom
finale del ken burns **non** viene incorporato, perché competerebbe con lo zoom
del ritaglio che l'utente controlla. Decisione dichiarata, non inferita.

### 15.14 Mapping: progetto Claude Design → campi di Social Studio

Nessun testo e nessun numero dell'evento è scritto nel codice. Ogni elemento
del riferimento corrisponde a un campo generico.

| Elemento del riferimento | Nel riferimento | Campo |
|---|---|---|
| Kicker | «NORD SARDEGNA · GALLURA» | `editoriale.kicker` |
| Titolo | «La via dei giganti» | `editoriale.titoloBreve` → `fattuali.nome` |
| Claim | «Quattro giorni di sterrato…» | `editoriale.claim` |
| Badge disciplina | «MAXIENDURO» | `fattuali.categoria` → `fattuali.mezzo` |
| Data | «29 ott — 1 nov» | `periodoBreve(fattuali)` |
| Titolo 02 | «Un anello di 550 km» | `editoriale.fraseNumeri` |
| Durata | «4 giorni» | `fattuali.durata` |
| Sterrato | «85%» | `fattuali.sterrato` |
| Partenza | «Olbia» | `fattuali.partenza` |
| Livello | «Medio avanzato» | `fattuali.livello` |
| Chiusura 02 | «Dalle spiagge…» | `editoriale.descrizione` |
| Titolo 03 | «L'anello dei giganti» | `editoriale.titoloBreve` |
| Itinerario | «Olbia · Tempio · …» | `fattuali.tappe` → `fattuali.puntiInteresse` |
| KM | «550» | `fattuali.km` |
| Tappe (conteggio) | «4» | `fattuali.tappe.length` |
| Punti di interesse | «Punta Contratta, …» | `fattuali.puntiInteresse` |
| Elenco tappe | quattro righe | `fattuali.tappe[]` |
| Inclusi | quattro voci | `fattuali.inclusi[]` |
| «Cosa serve a te» | requisiti | `fattuali.requisiti[]` |
| Prezzo | «580 €» | `fattuali.prezzo` |
| Nota prezzo | «Mezza pensione…» | `editoriale.fraseNumeri` → primi inclusi |
| Etichetta dei posti | «Posti limitati» | `editoriale.statoPosti`, quattro stati (§15.15) |
| CTA | «Scrivici in DM…» | `editoriale.cta` |
| Contatti | telefono e handle | `editoriale.whatsapp` |
| Sito | dominio | `fattuali.url` |
| Fotografie | hero del progetto | Media Library, per schermata |
| Mappa | PNG del progetto | disegnata dal GPX locale |
| Marchio | `logo-512.png` | logo STA in `public/` |

Dove un campo manca, il blocco **non si disegna**: non si inventa e non si
compone da altri dati. Il pre-flight segnala ciò che è assente.

### 15.15 Adattamenti deliberati al riferimento

Il progetto Claude Design è vincolante, ma è stato composto su **una**
fotografia. La Media Library non garantisce niente di quella fotografia, e in
tre punti la trascrizione fedele produceva un risultato peggiore del
riferimento invece che uguale. Sono deviazioni dichiarate, non sviste.

| Elemento | Riferimento | In Social Studio | Perché |
|---|---|---|---|
| Payoff del marchio, Cover | `#574F40` | `#B4A691` (`INCHIOSTRO.secondario`) | Sulla foto del progetto quell'area è scura e il grigio-bruno si legge. Su una cover luminosa scompare: il payoff resta nel DOM e non nell'immagine. Nessun token nuovo — è un colore della palette canonica |
| Inquadratura della foto in prestito | una foto per schermata | il punto focale della schermata, non quello della cover | Quando una schermata ripiega sulla cover, il punto focale scelto sulla tela intera inquadra un pezzo di cielo dentro una fascia alta 620 px |
| Etichetta dei posti | «Posti limitati» | quattro stati, con tre risalti | Il riferimento mostra un solo caso. Lo schema ne dichiara quattro, e un evento esaurito non deve sembrare prenotabile |

`PAYOFF_RIFERIMENTO` resta esportato accanto al valore che lo sostituisce: il
dato del progetto non si perde, si dichiara come non usato.

### 15.16 Capienza delle schermate

Le schermate 04 e 05 sono costruite su **cinque righe**. La sesta non si
stringe: esce dalla tela. Il template tagliava a cinque con `slice(0, 5)` e non
lo diceva a nessuno — il PNG usciva pulito, con tre tappe in meno, e il difetto
si scopriva pubblicando.

| Voce | Capienza | Dove è dichiarata |
|---|---|---|
| Tappe, schermata 04 | 5 elementi | `CAPIENZA.tappe` |
| Voci di «incluso», schermata 05 | 5 elementi | `CAPIENZA.inclusi` |
| Requisiti, schermata 05 | 5 righe (~305 caratteri) | `CAPIENZA.righeRequisiti` |
| Descrizione di una tappa | 2 righe (~116 caratteri) | `CAPIENZA.righeDescrizioneTappa` |

I limiti in caratteri non sono misure: `capienzaCaratteri()` li ricava dal corpo
del carattere e dalla larghezza utile con un fattore medio di glifo, e servono a
**avvisare prima** che il template venga montato. La misura vera la fa
`TestoAdattivo` sul nodo reale, e le sue segnalazioni restano l'ultima parola.

Il controllo `capienzaStory` del pre-flight produce **avvisi**, non errori. È
una scelta: un errore renderebbe la Story inesportabile per qualunque evento
con sei tappe, che è un caso normale e non un guasto. Un avviso non si supera
per sbaglio — ferma l'esportazione finché non si preme «Esporta comunque» — e
quindi l'omissione resta una decisione presa, mai un effetto collaterale.

A differenza del carosello, che usa il primitivo `ControlloCapienza` durante il
disegno, la Story controlla **i dati**: così il pre-flight dice la verità anche
sul pacchetto, dove conta ciò che i sei nodi conterranno e non ciò che è già
montato.

### 15.17 Slot fotografici

Una sola tabella, in `media/slot.js`, e nessun ripiego per esclusione.

| Slot | Dove vive | Schermata |
|---|---|---|
| `cover` | `media.cover` | Post, Story 01, carosello 01 |
| `esperienza-0…3` | `media.esperienza[N]` | carosello 05 |
| `cta` | `media.sfondi.cta` | carosello 08 |
| `storyNumeri` | `media.sfondi.storyNumeri` | Story 02 |
| `storyIncluso` | `media.sfondi.storyIncluso` | Story 05 |
| `storyPrenota` | `media.sfondi.storyPrenota` | Story 06 |

Prima questa logica esisteva in tre copie dentro l'editor — `ritaglioAttivo`,
`riferimentoSlot`, `conRitaglio` — e tutte e tre finivano con lo stesso
ripiego: qualunque slot non fosse `cover` o `cta` veniva trattato come
`esperienza-N`. Per i tre slot della Story quel ripiego calcolava
`Number("storyNumeri".split("-")[1])`, cioè `NaN`. L'assegnazione scriveva in
`esperienza[NaN]`, la lettura tornava `undefined`, l'indicatore restava spento e
il crop non si applicava. Nessun errore, nessun messaggio: la fotografia
semplicemente non arrivava.

Il **ripiego sulla cover** vale solo dove manca una fotografia dedicata, e
riguarda il disegno, non l'indicatore: chi compone deve vedere quali slot ha
davvero riempito.

### 15.18 Guida del Link Sticker

`ZONA_STICKER` (200 px) è la banda che Instagram copre col campo «rispondi» e
con lo sticker del link. Ogni schermata la lascia libera col padding basso, ma
finché non si vedeva bisognava fidarsi.

La schermata 06 mostra una guida tratteggiata con la scritta «Spazio per il
Link Sticker», marcata `data-solo-anteprima="true"`. È lo stesso segno che
`cattura` spegne prima di fotografare: si vede componendo, e non esiste nel PNG.

### 15.19 Il pre-flight del pacchetto vede ciò che nasce montando

Un difetto discendeva dalla correzione precedente, ed è il tipo di difetto che
non lascia tracce: **produce un file, e il file sembra a posto.**

La sequenza è questa. Si preme «Esporta pacchetto evento»; nasce la richiesta;
nel render successivo le quindici grafiche vengono montate fuori schermo; e
sono proprio quelle a generare le loro segnalazioni, perché `TestoAdattivo`
misura sul nodo reale. L'effetto di `useLavoroExport` dipende dal **solo id** —
e deve continuare a dipenderne, altrimenti torna il difetto monta → cattura del
5.2.1 — quindi tratteneva la `esegui` del render in cui l'id era cambiato, cioè
di *prima* che quelle grafiche esistessero. Dentro quella chiusura l'array
`problemi` era ancora quello vecchio.

Risultato: uno sforo presente soltanto in una Story o in una slide nascosta non
raggiungeva il pre-flight. Il pacchetto veniva catturato, lo ZIP scaricato, e
dentro c'era una grafica con un testo che non entra.

**Tre pezzi, e servono tutti e tre.**

| Pezzo | Dove | Cosa garantisce |
|---|---|---|
| `lettore` del registro | `FornitoreProblemi` | lettura **sincrona** dei problemi, senza passare dal raggruppamento da 80 ms né da uno stato di React |
| `misure` in sospeso | `FornitoreProblemi` ← `TestoAdattivo` | distingue «tutto misurato e niente sfora» da «nessuno ha ancora misurato» |
| `attendiPronto` | `useLavoroExport` ← editor | non si decide finché le tre condizioni non valgono, e **dichiara** se non ci riesce |
| `eseguiRif` | `useLavoroExport` | si chiama sempre l'ultima `esegui`, restando dipendenti dal solo id |

Il registro aveva già due letture possibili, e la scelta fra le due era il
punto: `onProblemi` raggruppa 80 ms ed è giusto per ridisegnare un pannello;
sbagliato per decidere se esportare, perché la decisione si prende mezzo frame
dopo il montaggio. `lettore` è la stessa mappa letta adesso.

#### Le tre condizioni della prontezza

`attendiPronto` **non è un tempo**. Guarda una volta per frame, e prosegue solo
quando valgono tutte e tre:

1. **i nodi esistono** — ogni grafica richiesta è nel DOM;
2. **nessuna misura è in sospeso** — ogni `TestoAdattivo` montato ha misurato
   davvero, coi caratteri veri;
3. **il registro non cambia più** — due letture consecutive coincidono.

La seconda condizione è quella che mancava, ed è quella che le altre due non
sanno dare. Un registro vuoto è ambiguo: «tutto misurato e niente sfora» e
«nessuno ha ancora misurato» si assomigliano fino a essere indistinguibili, e
sono opposti. Due letture vuote consecutive capitano benissimo mentre i font
stanno ancora arrivando — e `TestoAdattivo` non misura finché non sono
arrivati, perché misurare col carattere di sistema dà metriche sbagliate. Ogni
`TestoAdattivo` si dichiara quindi in sospeso dal montaggio e si toglie dentro
lo stesso effetto di layout in cui misura, **dopo** aver segnalato: chiudere
prima lascerebbe una finestra in cui il registro sembra assestato e non lo è.

#### La scadenza è un fallimento, non un via libera

Il giro è limitato a `FRAME_DI_ATTESA` (30). Alla scadenza `attendiPronto`
restituisce `{ pronto: false }` con il motivo — nodi mancanti, misure in
sospeso, registro ancora in movimento — e `useLavoroExport` si ferma lì:
nessuna `esegui`, nessun `html2canvas`, nessuno ZIP, nessun download. Il
pannello lo dice e offre «Riprova».

Prima usciva in silenzio, e una risoluzione silenziosa veniva letta come un via
libera: si producevano quindici PNG senza poter dimostrare che il pre-flight
avesse davanti lo stato completo. **Se non possiamo dimostrarlo, il file non si
fa** — un PNG di cui non sappiamo il contenuto è peggio di un PNG mancante.

Il pre-flight gira comunque **prima** della cattura, in `esporta` e in
`esportaPacchetto`: quando un problema nuovo blocca o richiede conferma, non
viene eseguito `html2canvas` e non viene scaricato niente.

### 15.20 Conflitto fra riferimento e master funzionale

Il Post canonico **non contiene prezzo né CTA**: al loro posto, in fondo, ci
sono contatti e sito. Il master funzionale di Social Studio li richiede. Non
sono stati compressi nella composizione e la gerarchia del riferimento non è
stata alterata: il conflitto è aperto e si risolverà nelle varianti di
conversione (Iscrizioni aperte, Ultimi posti, Sold Out, Lista d'attesa,
Reminder, Partenza imminente). Il pre-flight continua a esigere il prezzo come
dato dell'evento, indipendentemente dal fatto che il Post standard lo mostri.
