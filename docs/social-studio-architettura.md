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

---

## 16. Fase 6 — audit multi-rubrica e registro fail-closed

### 16.1 Che cosa era già multi-rubrica, e che cosa non lo era

L'audit del capitolo 6.1 ha letto il sorgente invece di dedurlo. Il risultato è
meno drammatico del previsto: buona parte dell'impianto è già generico.

| Già pronto | Perché |
|---|---|
| `template/Telaio.jsx` | legge `CATEGORIE[categoria]`, ricava accento, velo, fondo chiaro e densità grafica da `pesoFoto`, e **lancia** su rubrica sconosciuta |
| `motori/export/*` | zero riferimenti a `"eventi"`: ricevono elementi e caption, non conoscono il format |
| `template/primitivi.jsx`, `Foto`, `Mappa`, `Altimetria` | prendono dati, non categoria |
| `fondamenta/archivio-locale.js` | `elenca(filtro)` è già generico; è l'editor a passare `{categoria:"eventi"}` |
| `fondamenta/migrazioni.js` | catena e test presenti, `MIGRAZIONI` vuoto: la strada per una v2 esiste |
| `design/tokens.js`, `formati.js`, `categorie.js` | tutte e otto le rubriche già dichiarate |

| Ancora legato a EVENTI | Dove |
|---|---|
| `app/EditorEvento.jsx` | 1 412 righe; importa `SCHERMATE`, `SLIDE_CAROSELLO`, `PACCHETTO`, `daEvento` |
| `app/pacchetto.js` | `PACCHETTO` è una costante di modulo: Post + 6 Story + 8 slide |
| `media/slot.js` | i nove slot sono nomi di schermate EVENTI |
| `fondamenta/adapter-sito.js` | espone solo `daEvento` |
| `fondamenta/schema.js` | `fattuali` mescola comune, commerciale e specifico EVENTI |
| `design/formati.js` | `carosello.slide = 8` è un numero unico globale |
| `template/rubriche/` | esiste solo `eventi/` |

### 16.2 Perché lo schema **non** è stato migrato in 6.2

L'audit aveva proposto di spostare i campi EVENTI sotto `specifico.eventi` con
una migrazione v1 → v2 «additiva». Non lo è: `contenuto.fattuali` è letto
direttamente da editor, template, pre-flight, caption engine, archivio e test.
Spostare la chiave rompe i consumer anche se nessun dato va perso — e
`z.record(z.unknown())` non è una convalida per rubrica, è l'assenza di
convalida.

Quindi: `VERSIONE_SCHEMA` resta **1**, `MIGRAZIONI` resta vuoto, `fattuali`
resta dov'è. Lo schema si estenderà quando il primo modulo nuovo porterà campi
concreti non rappresentabili, e allora la migrazione avrà un caso d'uso vero da
soddisfare invece di un'astrazione da inseguire. EVENTI conserva integralmente
la forma attuale.

### 16.3 Varianti previste contro template implementati

`design/categorie.js` dichiara **ventidue varianti** su otto rubriche. Sono
approvate: è il piano editoriale del profilo. I template costruiti sono **tre**.

Confondere le due cose ha una conseguenza precisa: il pre-flight autorizza
l'esportazione di una combinazione senza renderer, e il difetto si scopre
davanti a un PNG vuoto — o peggio, davanti a una grafica ripiegata su un'altra
rubrica, che sembra giusta.

`design/registro-template.js` tiene le due liste separate. È un modulo **puro**,
senza React, e dichiara le sole combinazioni con un renderer reale:

```
eventi / post      / standard
eventi / story     / standard
eventi / carosello / standard
```

`locandina` e `minimale` **non** ci sono: sono approvate per EVENTI, ma oggi non
esiste un dispatch verso renderer distinti. Il registro si convalida da sé
all'import — una voce che nomina rubrica, formato o variante non approvati in
`categorie.js` impedisce il caricamento del modulo.

**Niente ripieghi.** `templateDisponibile` risponde `false`; `richiediTemplate`
lancia nominando la combinazione chiesta e quelle esistenti;
`formatiImplementati` e `variantiImplementate` restituiscono elenchi vuoti. Una
combinazione mancante non diventa `standard` e non diventa EVENTI.

`COMBINAZIONI_IMPLEMENTATE` è **lo stesso** array che il registro usa, non una
copia: congelato, con ogni descrittore congelato. Una copia si sarebbe potuta
modificare senza toccare il registro, e l'elenco pubblico avrebbe potuto
raccontare qualcosa di diverso dal comportamento reale — il difetto peggiore di
un registro. Congelando l'originale non c'è nulla da tenere in sincronia. La
convalida vive in `costruisciIndice`, esportata perché è il mestiere del modulo
e non un gancio per i test: rifiuta rubriche, formati e varianti non approvati,
**e** le combinazioni dichiarate due volte, che altrimenti il `Set`
assorbirebbe in silenzio facendo dire all'elenco un numero sbagliato.

### 16.3.1 I due registri, e perché servono entrambi

`app/registro-editor.js` sta in un file separato per una ragione tecnica:
quello dei template è puro e lo legge il pre-flight, questo importa componenti.
Uniti, `preflight.js` si tirerebbe dietro `EditorEvento`, che importa il
pre-flight, e il ciclo si chiuderebbe. La catena reale è aciclica:
`registro-editor → EditorEvento → preflight → registro-template → categorie`.

Una rubrica è **disponibile** solo quando possiede tutti e due i lati: un
editor registrato **e** almeno un template implementato. I due registri possono
divergere, e nessuno dei due stati intermedi è utile a chi lavora:

- **editor senza template** — si apre una schermata, si scrive una bozza, e
  l'esportazione viene fermata dal pre-flight con `template-non-implementato`:
  dopo che il lavoro è stato fatto;
- **template senza editor** — la grafica esiste e non c'è modo di riempirla.

Dichiarare «disponibile» in uno di quei due stati promette un flusso che si
interrompe a metà. `editorDisponibile` verifica entrambi i registri,
`editorPerRubrica` restituisce `null` se manca un lato, e `statoRubrica`
distingue tre casi — `disponibile`, `pianificata`, `sconosciuta` — perché
«prevista e non ancora completa» e «id inesistente» sono due cose diverse per
chi legge.

Il pre-flight, in `coerenzaTemplate`, aggiunge l'errore
`template-non-implementato` **solo** se rubrica, formato e variante erano già
validi: altrimenti la stessa mancanza verrebbe detta due volte.

### 16.4 Prima di abilitare un secondo editor

`EditorEvento` tiene stato non salvato al proprio interno. Passare da una
rubrica all'altra lo smonterebbe, e il lavoro in corso andrebbe perso senza un
avviso. La navigazione fra editor **non è abilitata** in 6.2: prima serve una
protezione esplicita per le modifiche non salvate, o un keep-alive verificato.
Per questo lo Studio mostra le sette rubriche come «Da implementare» e non
apribili, invece di offrire un selettore che funziona a metà.

Quella protezione è arrivata in 6.3B: vedi §18. Resta un prerequisito tecnico —
esiste il meccanismo, non un secondo editor.

### 16.5 Autorità visive

- **EVENTI** conserva esclusivamente la grafica derivata dal progetto Claude
  Design integrato. Non si trasferisce alle altre rubriche: né il layout, né
  l'accento `#E08A3C`, né i mood, né la struttura delle otto slide, né i badge
  e le CTA specifici.
- **TOUR** userà come riferimento il sistema visivo del sito, in particolare
  «Scegli la tua avventura» (`src/components/Categorie.jsx`).
- Le altre rubriche useranno il design system STA, i pesi foto/grafica di
  `categorie.js` e le indicazioni del prompt master. Dove manca una decisione
  visiva significativa, va sottoposta e non inventata.

### 16.6 Fonti dei dati, per rubrica

| Rubrica | Fonte | Nota |
|---|---|---|
| **TOUR** | `content/tours/index.json` — 9 itinerari reali | `normalizeTours` già rinomina in `durata, km, livello, sterrato, periodo, prezzo, descrizione, tappe`. `src/data/categorie.js` resta fonte **editoriale/visiva** e non va fusa con gli itinerari: contiene anche voci che non sono tour |
| **GUIDE** | `content/homepage/index.json → guides.items` | due persone, con `name, role, description, image`. Citazione, specializzazione, mezzo o territorio, se serviranno, saranno **campi manuali espliciti**: mai dedotti |
| **INFO** | `homepage.faq` (7 Q&A), `homepage.included`, `homepage.journey`, `content/settings` | il sito resta la fonte delle risposte già pubblicate. Carosello **da 3 a 6 slide**: incompatibile con l'attuale `FORMATI.carosello.slide = 8`, da risolvere quando INFO verrà costruita |
| **TRAIL, SARDEGNA, GARAGE, CREW** | nessuna fonte fattuale | inserimento **manuale**. Nessun adapter fittizio, nessun dato dedotto dalle fotografie. TRAIL potrà riusare GPX, mappa e altimetria, senza renderli obbligatori |

### 16.7 Il perimetro esterno, aggiornato

Il worktree contiene lavoro che non appartiene a Social Studio e che non va
assorbito. Al 2 settembre 2026 gli elementi esterni sono **40**:

| Insieme | File | Impronta |
|---|---|---|
| esterni originari | 28 | `aeb9bb08ab657196` |
| nuovi | 12 | `56c14df79f40e6ba` |
| **complessivi** | **40** | **`372f72192f98a21c`** |

I 12 nuovi sono `scripts/build-stories.mjs` e gli 11 file sotto `docs/stories/`.
Appartengono a un flusso diverso — la produzione delle Story su pagina HTML — e
non fanno parte del Social Studio: non vanno modificati, ripristinati, spostati
né inclusi nei suoi commit.

**Sugli asset.** `docs/stories/assets/` contiene copie di asset del progetto
Claude Design (`logo-512.png`, `hero-la-via-dei-giganti.jpg`,
`mappa-la-via-dei-giganti.jpg`). Sono file **non tracciati** appartenenti a
quell'altro perimetro. La politica del Social Studio non cambia: nel suo
sorgente e nei suoi commit gli asset Claude Design restano esclusi, e di quel
progetto entrano solo citazioni testuali. Un eventuale commit di
`docs/stories/` richiede un'autorizzazione a parte.

---

## 17. TOUR — il contratto con i dati del sito

Il capitolo 6.3A implementa **solo** il contratto: l'adapter e l'estensione
minima dello schema. Nessun editor, template, preview, export, caption o Media
Library, e TOUR non è selezionabile.

### 17.1 Chi è la fonte, e di che cosa

| | |
|---|---|
| **fonte primaria dei dati** | il sito, attraverso `normalizeTours()` |
| **autorità visiva futura** | il sistema del sito, in particolare «Scegli la tua avventura» (`src/components/Categorie.jsx` su `src/data/categorie.js`) |
| **fuori gioco in questo capitolo** | il progetto Claude Design: la direzione visiva TOUR viene dal sito STA |

L'adapter riceve un tour **già normalizzato** e non legge
`content/tours/index.json` in produzione. Quel file entra solo nel test di
contratto, dove serve a dimostrare che il catalogo reale passa la convalida.

`src/data/categorie.js` e `Categorie.jsx` descrivono **dieci categorie di
esperienza** — carattere della disciplina, claim, foto — e due di quelle voci
(`Corsi Off-road`, `Noleggio`) non sono nemmeno tour. Sono autorità visive, non
dati operativi del singolo itinerario: claim, descrizioni generali e fotografie
di categoria **non** vengono importati nella scheda. Il file stesso lo dichiara:
«senza inventare dati operativi dei tour».

Nessun asset, fotografia o file del sito viene copiato nel Social Studio, e
nessun binario viene generato o spostato.

### 17.2 `area`, e perché resta vuota

Il brief TOUR prevede un campo `area`. Il sito non lo espone con semantica
affidabile: `interest` è un elenco di punti di interesse, non un'area, e
ricavarla dal nome o dalle tappe significherebbe inventare un dato che sembra
misurato. Quindi `fattuali.area` esiste nello schema con valore predefinito `""`
e si compila a mano.

L'aggiunta è **additiva**: `VERSIONE_SCHEMA` resta **1**, `migrazioni.js` non
viene toccato, e le bozze EVENTI già salvate continuano a convalidarsi
ricevendo `area: ""` dalla convalida in lettura. Nessun altro valore predefinito
cambia.

### 17.3 Che cosa l'adapter importa, e che cosa lascia vuoto

`fondamenta/adapter-tour.js` è un modulo indipendente: `adapter-sito.js` resta
l'adapter EVENTI e non diventa generico, così il comportamento EVENTI non può
cambiare per un lavoro fatto su TOUR.

I campi lasciati vuoti non sono dimenticanze. `mezzo` non si copia da `type`
perché `Su Misura` dimostra che i due concetti non coincidono; `dataFine` non si
calcola dalla durata; `lunchIncluded` non diventa una frase italiana dentro
`inclusi`; i titoli delle tappe non si spezzano in partenza e arrivo — sul sito
sono titoli editoriali, non tratte. `fattuali.origine` marca `"sito"` **solo** i
campi realmente importati e valorizzati: un campo vuoto o manuale non deve
sembrare importato.

La `descrizione` del sito diventa il testo editoriale iniziale, e resta separata
dai fatti. `claim`, `kicker`, `fraseNumeri` e `cta` restano vuoti: sono scelte
di scrittura, non dati.

### 17.4 L'istantanea e lo scostamento

`fonte.istantanea` conserva la forma confrontabile del tour, senza `updatedAt`
— che cambia a ogni salvataggio del CMS e renderebbe il confronto rumoroso.
Delle tappe conserva `title`, `desc`, `foto` e `fotoAlt`: quattro campi, perché
una foto di tappa sostituita è un cambiamento reale che l'istantanea EVENTI, che
tiene solo il titolo, non vedrebbe.

Il percorso fotografico nell'istantanea è **solo un riferimento testuale**: non
entra in `media`, non entra in IndexedDB, non entra in `public/`.

`riallineaTourAllaFonte` aggiorna soltanto `fonte` — tipo, slug, istantanea e
`importatoIl`. Non tocca `fattuali`, `editoriale`, `media`, `visual` o `mappa`:
riallineare non è reimportare, e il lavoro editoriale non si perde per aver
accettato che il sito è cambiato. Nessuna funzione muta gli oggetti ricevuti.


## 18. Il lavoro non salvato non si perde cambiando schermo

6.3B chiude il prerequisito annunciato in §16.4. **Non** implementa TOUR, non lo
rende selezionabile e non aggiunge un secondo editor: TOUR resta «Da
implementare» nel registro, e `statoRubrica("tour")` continua a rispondere
`pianificata`. Quello che esiste ora è il meccanismo che rende sicuro
aggiungerne uno.

### 18.1 Il contratto

`src/social-studio/app/transizione.jsx` tiene tre pezzi:

- `FornitoreTransizione` avvolge lo Studio e possiede il dialogo;
- `useRegistraGuardia({ sporco, salva, etichetta })` è come un editor dichiara
  di avere lavoro non salvato e come lo salva. La guardia è tenuta in un ref
  aggiornato a ogni render: si registra una volta sola, e chi la interroga legge
  sempre l'ultimo stato senza che la registrazione cambi identità;
- `useRichiediTransizione()` restituisce `richiedi(azione, { etichetta })`, che
  ogni gesto distruttivo deve attraversare invece di agire subito.

`richiedi` restituisce un esito esplicito — `fatto`, `annullato`, `occupato`,
`fallito` — perché il chiamante non deve dedurre dal silenzio se l'azione è
avvenuta. **`fatto` significa azione completata**: si risolve dopo che l'azione
è finita, non prima. Se l'azione lancia o rigetta, l'esito è `fallito` e porta
con sé l'errore, invece di diventare una rejection che nessuno raccoglie.

### 18.2 Una richiesta alla volta, con fasi esplicite

La richiesta attiva vive in un ref, non nello stato, e il ref **è** il blocco.
Lo stato arriverebbe al render successivo: troppo tardi, perché il corpo di una
funzione asincrona gira sincrono solo fino al primo `await`, ed è quella
finestra che deve restare indivisibile. Il blocco si prende quindi prima di
qualunque attesa, **anche quando l'editor è pulito e non c'è niente da
chiedere**: altrimenti due aperture lente si sovrapporrebbero.

Ogni richiesta porta un numero progressivo e una fase — `apre`, `chiede`,
`salva`, `agisce`, `congedata`. Da lì discendono tre regole:

- **Dopo ogni `await` si verifica l'identità.** Al ritorno da una scrittura, se
  quella non è più la richiesta attiva non si applica alcun effetto. È il
  controllo che rende innocua la continuazione di un'operazione che nessuno
  aspetta più.
- **Le risposte non sono rientranti.** Salvare e scartare si accettano solo in
  fase `chiede`. Due clic su «Salva e continua» producono una scrittura sola e
  un'azione sola. I pulsanti si disabilitano, ma la difesa non sta
  nell'attributo: sta nella fase.
- **Il dialogo si tocca per numero.** Lo stato che lo disegna è una proiezione
  identificata dal numero della richiesta, così la continuazione di
  un'operazione lenta non può chiudere il dialogo di un'altra né scriverci
  dentro il proprio errore.

Si congeda una richiesta una volta sola: `risolvi` viene azzerato nell'atto di
usarlo, e il blocco si rilascia solo se quella è ancora la richiesta attiva.

**Annullare durante la scrittura.** «Annulla» ed `Escape` restano attivi mentre
si salva, perché è lì che servono. La scrittura già partita non si può
ritirare — e finisce — ma la sua continuazione trova la richiesta annullata e
**non** avvia l'azione. Chi ha chiesto riceve `annullato` soltanto quando la
scrittura è finita: fino ad allora il blocco resta, perché l'archivio sta
cambiando e una nuova transizione partirebbe da una base in movimento. Il
dialogo lo dice invece di sparire.

**Smontaggio.** Se il fornitore sparisce mentre qualcosa è in volo, il
riferimento si azzera: le continuazioni non si riconosceranno più come attive e
non applicheranno nulla. Una richiesta ancora in attesa si risolve `annullato`;
una la cui azione è già partita la conclude chi l'ha avviata, per non rispondere
due volte.

### 18.3 Chi decide, e dove

L'editor dichiara *se* ha lavoro non salvato e sa salvarlo. Non decide *se* la
transizione può avvenire: quella decisione sta nel fornitore, un livello sopra,
perché è lì che si sa quale azione si sta per eseguire. Un salvataggio fallito —
che restituisca falso o che lanci — lascia il dialogo aperto, la transizione non
avviene, e si può ancora decidere, scarto compreso. Il motivo lo mostra
l'editor, che è l'unico a sapere che cosa è andato storto; se a lanciare è la
guardia stessa, il messaggio lo mostra il dialogo.

Per rendere leggibile quel motivo è stato corretto un difetto vero in
`EditorEvento`: lo stato del salvataggio era reso **solo a editor pulito**, cioè
mai nel caso che conta. Un salvataggio fallito lascia l'editor sporco, e
«non salvato: disco pieno» restava invisibile sotto «modifiche non salvate».
Ora, mentre l'editor è sporco, ogni stato diverso da «in corso» si legge
accanto al marcatore.

### 18.4 Le corse dentro l'editor

`scriviNellArchivio` fotografa, prima della scrittura, l'identità del contenuto
e un contatore di modifiche. Al ritorno confronta:

- se nel frattempo è cambiato contenuto, dice «salvataggio completato su
  un'altra bozza: riprova su questa»;
- se nel frattempo si è scritto ancora, dice «salvato, ma nel frattempo hai
  modificato altro: salva di nuovo».

In entrambi i casi **non** azzera «modifiche non salvate», perché non lo sono.

`apriBozzaSenzaChiedere` difende la stessa finestra con lo stesso contatore. Fra
la richiesta all'archivio e la sua risposta il dialogo è già chiuso e l'editor
risponde di nuovo alla tastiera: applicare la bozza letta cancellerebbe le
battute arrivate nel frattempo. Se il contatore è cambiato l'apertura non
avviene, lo dice, e lancia — così la transizione riporta `fallito` invece di un
`fatto` che non è vero.

**Il salvataggio non finisce con la rilettura.** Dopo aver applicato il
contenuto riletto, `scriviNellArchivio` aggiorna l'elenco delle bozze e lo
spazio occupato: due attese come le altre, in cui si può scrivere o aprire
un'altra bozza. Il controllo di prima non le copriva, e il valore restituito da
lì autorizzava la transizione — la battuta arrivata durante l'ultimo
aggiornamento non era nell'archivio e l'azione la sovrascriveva. Ora identità e
contatore si ricontrollano **dopo tutte le attese**, e se la risposta è superata
si restituisce `null`: l'editor non viene toccato, ciò che si è scritto resta
dov'è, `aggiorna` ha già rimesso «modifiche non salvate», e si dice perché non
si prosegue — distinguendo «hai modificato altro» da «hai cambiato bozza», che
manderebbero a fare cose diverse.

La garanzia è precisa: **quel controllo è l'ultima istruzione prima del
ritorno**. Da lì fino all'avvio dell'azione non c'è più alcuna attesa su
operazioni esterne — solo continuazioni di promesse — e un evento di tastiera è
un task, che non può inserirsi fra microtask. Non ci sono quindi altre finestre
dopo l'ultimo controllo. La protezione non si appoggia ai pulsanti disabilitati
né a una trappola per il fuoco: il dialogo, di fatto, non impedisce di
raggiungere i campi da tastiera, ed è proprio per questo che la difesa sta nel
dato.

Una riga sostiene quel controllo: dopo `setContenuto(riletto)` il riferimento al
contenuto corrente viene allineato subito, senza aspettare il render. Serve a
non far dipendere il confronto di identità dai tempi con cui React svuota la
coda: senza, un salvataggio di bozza nuova potrebbe leggere l'identità
precedente e rifiutare una transizione legittima. Nessuna prova la distingue —
nei test il render è sempre già avvenuto — e resta quindi una difesa dichiarata,
non una difesa verificata.

### 18.4.1 Il cestino

Eliminare è distruttivo quanto sostituire, e più definitivo: non c'è un annulla.
Era però l'unico gesto rimasto fuori dal contratto. `eliminaBozza` cancellava
nell'archivio e poi decideva che cosa svuotare guardando il contenuto catturato
**prima** dell'attesa. Da lì due modi di perdere lavoro: buttare via modifiche
non salvate senza chiedere nulla, e — se nel frattempo si apriva un'altra
bozza — svuotare quella, che nessuno aveva chiesto di cancellare. Il codice
veniva da prima di 6.3B: non una regressione, una lacuna del perimetro protetto.

**Non passa da `richiedi`.** Quel dialogo offre «Salva e continua», che qui
significherebbe salvare esattamente ciò che si sta per cancellare: una
promessa di conservazione che l'azione successiva annulla. Con lavoro non
salvato su quella bozza l'eliminazione si **rifiuta**, dicendo perché; per
eliminarla si salva o si scarta prima, deliberatamente. È una scelta di
comportamento visibile, non una conseguenza tecnica.

Il resto segue le stesse regole del capitolo: una eliminazione alla volta, con
il controllo nella logica e non solo nel pulsante disabilitato; l'errore
dell'archivio diventa un messaggio, non una rejection che esce da un gestore di
clic; e dopo l'attesa si guarda il contenuto **di adesso**, non quello del clic.
Se nel frattempo si è scritto su quella stessa bozza, l'editor non si svuota:
l'archivio non ce l'ha più, la memoria sì, e si dice che quel lavoro adesso non
è salvato. Un'eliminazione già partita non si dichiara annullabile.

**L'operazione non finisce con la cancellazione.** Dopo aver cancellato si
ricarica l'elenco, e anche quella è una chiamata all'archivio che può
rifiutare: restava fuori dal `try`, e la promessa usciva scoperta da un gestore
di clic. Ora il blocco copre tutta l'operazione — rilasciarlo prima del
ricaricamento lascerebbe una finestra in cui si avvia un'altra eliminazione — e
si rilascia sempre, anche in errore. I due fallimenti si distinguono: se a
fallire è la cancellazione si dice «non eliminata» e nulla cambia; se a fallire
è solo l'elenco, la bozza **è** stata eliminata, e dirlo altrimenti manderebbe a
riprovare su un record che non c'è più. In quel caso l'editor già riallineato
non si tocca, e il messaggio si **aggiunge** a quello che c'era invece di
coprirlo: sapere che il lavoro è ancora in memoria conta più che sapere
dell'elenco.

Il messaggio ha dove comparire anche quando l'editor è rimasto vuoto: la barra
di salvataggio esiste solo con un contenuto aperto, ma è proprio l'eliminazione
a svuotarlo, e lo stato si legge nel riquadro «Apri una bozza o creane una».

### 18.5 Che cosa è verificato

`transizione.test.jsx` — 24 prove — prova il contratto su una guardia finta, con
**promesse pilotate dal test**, non con attese temporali: annullamento durante
la scrittura (con clic e con `Escape`), blocco che resta finché la scrittura
annullata non finisce, doppio «Salva» e «Scarta» durante la scrittura, blocco
che copre l'intera azione anche da editor pulito, esito che non anticipa il
completamento, azione che lancia, salvataggio che rigetta, smontaggio durante
l'attesa. Le prove che riguardano gli errori verificano anche che **non restino
rejection non gestite**.

`EditorEvento.transizione.test.jsx` — 29 prove — monta l'editor vero dentro
`FornitoreArchivio` e `FornitoreTransizione`, non un aiutante isolato: modifica
davvero un campo e guarda che cosa succede provando a sostituire il contenuto.
Copre i casi asincroni sul dato vero, contando le scritture e rileggendo
l'archivio: annullamento durante una scrittura lenta, che conserva identità e
contenuto e non scrive due volte; apertura lenta di un'altra bozza, che non
copre le modifiche sopraggiunte e non tocca il disco; e le due attese finali del
salvataggio — aggiornamento dell'elenco e dello spazio — fermate una per volta,
scrivendo proprio lì dentro. In quei casi la prova verifica che la destinazione
**non** si apra, che il testo scritto resti, che il lavoro resti sporco, che il
dialogo lasci decidere di nuovo, che l'archivio contenga la versione davvero
salvata e non quella sopraggiunta, e che un secondo «Salva e continua» senza
concorrenza salvi il testo nuovo e compia **una sola** transizione. Una prova a
parte controlla che cambiare bozza in quella finestra venga detto per quello che
è, e non con il messaggio dell'altro caso.

Undici prove coprono il cestino: rifiuto su bozza sporca senza alcuna chiamata
all'archivio; eliminazione pulita che riallinea l'editor; eliminazione di
un'altra bozza che non tocca quella aperta e sporca; eliminazione lenta con
apertura di un'altra bozza nel frattempo, che non la svuota **né la marca**;
scrittura durante l'eliminazione, che non sparisce; errore dell'archivio
visibile e senza rejection scoperte; doppio clic che cancella una volta sola;
elenco che rifiuta dopo una cancellazione riuscita, con messaggio veritiero e
leggibile a editor vuoto; stessa cosa con lavoro scritto durante l'attesa, dove
si leggono **entrambe** le notizie; blocco che resta fino alla fine del
ricaricamento; blocco che si libera anche dopo un errore.

### 18.5.1 Perché i clic ripetuti stanno nello stesso giro

Provare una difesa contro i clic ripetuti richiede una cautela che non è
ovvia. **React filtra i click sui pulsanti che considera disabilitati guardando
le proprie props, non l'attributo del DOM:** rimettere `disabled = false` sul
nodo e cliccare non raggiunge mai il gestore, e la prova passa senza aver
provato niente.

Tre prove erano scritte così e sono state rifatte — due sulle risposte ripetute
del dialogo, una sul doppio clic del cestino. Il loro mordente era venuto solo
dalla corsa *prima* della correzione, quando i pulsanti non erano ancora
disabilitati; come guardie di regressione non tenevano. Ora i clic ripetuti
vanno nello stesso giro, prima che React ridisegni: in quell'istante il pulsante
è abilitato anche per React, il secondo clic entra davvero, ed è poi il doppio
clic vero. Lo stato `disabled` si verifica a parte, dopo il ridisegno, per quello
che è: una cortesia verso chi guarda, non una difesa.

Dove il pulsante è già disabilitato per forza di cose — durante il ricaricamento
dell'elenco — la difesa si esercita dall'unica via che resta aperta: il cestino
di un'**altra** bozza, che disabilitato non è.

`Studio.test.jsx` — 17 prove — copre il cambio rubrica: le destinazioni non
disponibili sono respinte **prima** di chiedere, così non smontano mai l'editor.

Il mordente è stato verificato reintroducendo ogni difetto. Le undici prove
asincrone sono state scritte **prima** della correzione e fallivano tutte sul
codice difettoso. Poi, una mutazione alla volta: senza guardia registrata
falliscono 9 prove montate; senza il controllo di identità dopo la scrittura, 1;
senza il controllo di annullamento, 1; senza la difesa della finestra di
apertura, 1; senza il controllo di concorrenza nel salvataggio, 1; senza
`beforeunload`, 1; facendo procedere un salvataggio fallito, 1; senza il
controllo dopo le attese finali, 3; senza distinguere il cambio di bozza nel
messaggio, 1. Nessuna mutazione è rimasta nel codice.

### 18.6 I limiti, dichiarati

- **Una guardia alla volta, per fornitore.** Il `FornitoreTransizione` ne tiene
  una: per i suoi dialoghi va bene, perché mentre si decide su una transizione
  non ce ne sono altre. Con due editor sotto lo **stesso** fornitore varrebbe
  ancora l'ultimo registrato, e il limite resta: è per questo che il banco TOUR
  ha un fornitore suo (§19.14.1). Da 6.3L.2 le guardie si iscrivono **anche** a
  un registro globale, che non appartiene a nessun fornitore e serve alla
  navigazione (§18.7): lì nessuna guardia può essere ignorata perché registrata
  dall'altra parte.
- **Una richiesta alla volta, senza coda.** Un secondo gesto mentre una
  transizione è in corso riceve `occupato`: chi chiama deve ripeterlo. Nessun
  chiamante oggi mostra quel rifiuto, perché il gesto semplicemente non ha
  effetto; con un secondo editor andrà comunicato.
- **Una scrittura partita non si ritira.** Annullare impedisce la transizione,
  non la scrittura: ciò che era già stato mandato all'archivio ci resta.
- **Nessuna fusione automatica.** Su scrittura concorrente o apertura
  sopraggiunta il sistema segnala e chiede di ripetere. Non prova a unire due
  versioni.
- **Il cestino rifiuta invece di chiedere.** Con modifiche non salvate su
  quella bozza non si elimina affatto: bisogna salvare o scartare prima. È più
  rigido di un dialogo, ed è deliberato — l'alternativa prometterebbe di
  conservare ciò che si sta cancellando.
- **Il rifiuto costa un secondo salvataggio.** Quando una modifica arriva
  durante le attese finali, quella precedente è già sul disco: riprovando si
  scrive di nuovo, e si registra una revisione in più. È il prezzo di non
  perdere lavoro, ed è deliberato.
- **Il dialogo non è una trappola per il fuoco.** Il fuoco parte su «Annulla» ed
  `Escape` annulla, ma `Tab` può uscire dal dialogo. Basta per un pannello
  interno; non basterebbe per un componente pubblico.
- **`beforeunload` è del browser.** Il testo dell'avviso lo decide il browser,
  non noi, e non si accende su ogni forma di chiusura. Protegge il ricarico e la
  chiusura della scheda; la navigazione dentro l'applicazione la protegge la
  sentinella (§18.7), e i gesti dell'interfaccia il dialogo del fornitore.
- **Fuori dallo Studio non c'è protezione.** `useRichiediTransizione` senza
  fornitore esegue senza chiedere. È deliberato — un componente montato altrove
  non deve rompersi — ma significa che la protezione vale dentro lo Studio.


### 18.7 La navigazione, che il fornitore non vedeva

Il fornitore intercetta i **gesti**: creare una bozza, aprirne un'altra,
chiudere un editor passano tutti da `richiedi`. La navigazione no. Un link
interno, un `navigate()` o il tasto Indietro smontano l'albero senza chiedere
niente a nessuno, e il lavoro non ancora nell'archivio se ne andava in silenzio.
Il difetto è stato osservato sul renderer vero in 6.3L.1, con EVENTI pulito e
TOUR sporco: nessun dialogo, nessun avviso, niente da recuperare.

`app/SentinellaNavigazione.jsx` chiude quel percorso, e lo chiude **dal
router**. Un ascoltatore dei clic coprirebbe i link e nient'altro — `navigate()`
non è un clic, e Indietro nemmeno — e toccare `history` a mano romperebbe il
router, che su quella API costruisce il proprio stato. `useBlocker` li copre
tutti e tre, e interviene **prima** dello smontaggio.

**Serve un router di dati.** `useBlocker` chiede il contesto che solo
`RouterProvider` fornisce; `BrowserRouter` non ce l'ha, e la chiamata solleva.
`src/App.jsx` è passato a `createBrowserRouter` con **una sola rotta che prende
tutto** (`path: '*'`), il cui elemento è esattamente l'albero che prima stava
dentro `<BrowserRouter>`: `SiteRoutes` continua a dichiarare le proprie rotte
come discendenti, e nessuna pagina pubblica cambia. È il passaggio minimo al
runtime del data router, non una migrazione alle sue API dati: non introduce
loader né action e serve esclusivamente a rendere possibile questa protezione.

**Guarda tutte le guardie vive**, non quella del proprio fornitore: uscire dalla
pagina smonta insieme lo Studio e il banco TOUR, che hanno fornitori distinti.
Con due editor sporchi li salva entrambi, uno alla volta — due scritture in
parallelo sullo stesso archivio sono la corsa che il resto del sistema evita con
cura — e una guardia che solleva mentre le si chiede se è sporca viene contata
come sporca: nel dubbio si chiede.

Le tre uscite sono quelle di sempre. **Annulla** ripristina, URL compreso: su un
Indietro il browser ha già cambiato indirizzo, e senza `reset()` resterebbe un
URL che non corrisponde a ciò che si vede. **Scarta** procede senza scrivere, ed
è l'unica autorizzazione esplicita a uscire con lavoro non salvato. **Salva e
continua** scrive e poi procede — e se una scrittura fallisce **non si naviga**:
il lavoro resta dov'è, il dialogo torna a poter decidere, e chi legge sa perché.

Quando non c'è lavoro non salvato la navigazione è libera, e un cambio di sola
query sulla stessa rotta non blocca niente: non smonta nessun editor.

#### 18.7.1 Quel che succede mentre si salva

Fra il clic su «Salva e continua» e la fine delle scritture passa tempo reale, e
6.3L.2 quella finestra la lasciava scoperta in due punti.

**Annullare non annullava.** `rispondi` usciva subito appena il salvataggio era
in corso — prima ancora di guardare quale risposta fosse arrivata — mentre il
dialogo lasciava «Annulla» premibile. Chi annullava non annullava niente: la
scrittura finiva e si navigava lo stesso. Ora vale la stessa disciplina del
fornitore (§18.4): l'annullamento si **registra subito**, la scrittura già
partita **non si dichiara interrotta** e la si lascia finire, i salvataggi
successivi non partono, e alla fine non si naviga. Il blocco resta preso fino
allora — lasciarlo prima farebbe entrare un'altra navigazione mentre l'archivio
si sta ancora muovendo — e mentre si aspetta il dialogo lo dice. `Escape` fa
esattamente quello che fa «Annulla».

**L'elenco delle guardie era una fotografia.** Si salvava ciò che era sporco al
primo istante e poi si navigava, senza riguardare: un editor già salvato poteva
essere tornato sporco, o un editor pulito essersi sporcato, proprio nella
finestra che il dialogo esiste per coprire. Ora, prima di autorizzare, le
guardie si **rileggono**. Se ne resta o ne compare una sporca non si naviga: si
dice che sono sopraggiunte modifiche e si lascia scegliere di nuovo. **Non si
risalva da soli** — sarebbe un ciclo che può non finire, e nessuno l'ha chiesto —
e «Scarta modifiche» resta l'unica uscita esplicita.

**La richiesta vive in un riferimento**, non in uno stato di React, e la sua fase
cambia **prima** di qualunque `await`: due clic ravvicinati arrivano entrambi
prima di qualsiasi ridisegno, e il secondo trova già una fase diversa da
`chiede`. Ogni continuazione, al ritorno dalla propria attesa, verifica di
appartenere ancora alla richiesta viva prima di toccare il dialogo o di chiamare
`proceed`/`reset`: una risposta tardiva non interferisce con la richiesta
successiva, e dopo lo smontaggio non tocca un router che non la aspetta più.
`proceed()` parte una volta sola, perché azzerare il riferimento viene **prima**
della chiamata al router.

Il `Dialogo` condiviso ha guadagnato due campi facoltativi, `messaggio` e `nota`,
che il fornitore non passa: gli servono per dire cose — «stai lasciando questa
pagina», «sono sopraggiunte modifiche» — che dentro la frase del fornitore
sarebbero false. Una prova di regressione tiene fermo che per il fornitore non
sia cambiato niente.

## 19. Il ciclo delle bozze TOUR, senza interfaccia

6.3C prepara il modello di stato che il futuro `EditorTour` monterà: creare una
bozza da un tour già normalizzato, scriverla, salvarla, riaprirla. Vive in
`src/social-studio/app/useBozzaTour.js`.

**Non rende TOUR disponibile.** Il registro continua a dichiararla
`pianificata`, non esiste un editor né un template, e niente di quanto sta qui è
raggiungibile dallo Studio — una prova lo verifica sui registri veri. Il modulo
TOUR non è completato. Il nucleo — creare, scrivere, salvare, riaprire — è di
6.3C; 6.3D vi ha aggiunto il riallineamento esplicito alla fonte (§19.6), 6.3H
gli slot fotografici (§19.10), 6.3I il ciclo GPX (§19.11), 6.3J i prototipi
diagnostici Post e Story (§19.12), 6.3K il pre-flight TOUR (§19.13), 6.3L il
primo nucleo dell'editor, anch'esso diagnostico (§19.14), e 6.3M il resto di
quell'editor — media, GPX, anteprima della bozza, fonte, cronologia ed
eliminazione (§19.15).

Conviene tenere separate quattro cose che è facile scambiare l'una per l'altra:

- **il ciclo dati della bozza** — *disponibile*. Persistenza, fonte, media e
  GPX: i dati di una bozza TOUR si creano, si scrivono, si salvano, si
  riaprono, si confrontano con il sito, si cancellano e si ripristinano;
- **i prototipi Post e Story** — *presenti, e diagnostici*. §19.12. Esistono, si
  guardano a misura reale e producono due PNG dal banco di prova. **Non sono
  registrati**: il registro dei template non li contiene, quindi nessun flusso
  normale li raggiunge;
- **il pre-flight TOUR** — *introdotto*. §19.13. Controlli specifici della
  rubrica, con lo stesso contratto del pre-flight generale, usati dal banco come
  cancello prima della cattura;
- **l'editor TOUR** — *completo sul lavoro della bozza, e diagnostico*. §19.14 e
  §19.15. Fonte, creazione, apertura, campi editoriali, salvataggio, fotografie
  con i due ritagli, GPX locale, anteprima reale di Post e Story, confronto e
  riallineamento con il sito, cronologia con ripristino ed eliminazione — su un
  archivio isolato e dietro un'apertura esplicita nel banco. **L'export non
  c'è**, e la rubrica resta pianificata;
- **registrazione ed export normale** — *ancora assenti*. Mancano la
  registrazione dell'editor e dei template, la mappa e il profilo altimetrico, e
  l'esportazione del pacchetto. Finché manca la registrazione, allo Studio TOUR
  resta `pianificata`.

L'export non è quindi l'unico lavoro residuo: è l'ultimo di un elenco che
comincia dall'interfaccia. §19.5 tiene i limiti per esteso.

### 19.1 Che cosa espone, e perché come codici

L'hook restituisce `contenuto`, `sporco`, `bozze` (le sole bozze TOUR), `esito`,
e le operazioni `creaDaTour`, `apri`, `salva`, `scriviEditoriale`,
`scriviFattuale`, `riallineaAllaFonte`, `confrontaConLaFonte`, `elimina`,
`revisioni`, `ripristina`, `slotMediaDisponibili`, `leggiMedia` e `scriviMedia`
— i cui esiti stanno in §19.6, §19.7, §19.8, §19.9 e §19.10 — e `ricarica`.
Il ciclo GPX (§19.11) aggiunge `tracciaGpx`, `esitoGpx`, `caricaGpx`,
`ricaricaGpx`, `rimuoviGpx` e `impostaConservaGpx`: `esitoGpx` è un **secondo
canale**, distinto da `esito`, perché la ricostruzione della traccia è asincrona
e arriva dopo un'apertura o un ripristino — sullo stesso canale ne coprirebbe
l'esito.

`ricarica()` è pubblica e **non rigetta**: riporta `{ codice: null }` oppure
`{ codice: "errore-elenco" }`. Chi la chiama non deve ricordarsi di metterci un
`catch` attorno, o un archivio momentaneamente indisponibile diventerebbe una
rejection che nessuno raccoglie. `salva()` restituisce, per due chiamate
concorrenti, **la stessa promessa** — identica, non equivalente: è questo che
garantisce una scrittura sola, e per averlo la funzione non è `async`, perché
una funzione asincrona avvolge sempre il ritorno in una promessa nuova.

`esito` è un **codice**, non una frase: `creata`, `aperta`, `salvata`,
`superata-da-modifiche`, `superata-da-altro-contenuto`, `non-una-bozza-tour`,
`errore-lettura`, `errore-scrittura`, `errore-elenco`, `rilettura-fallita`,
`base-non-recuperata`. Che cosa si legge a
schermo è una decisione editoriale, e non spetta a questo livello: l'interfaccia
tradurrà. Il vantaggio pratico è che il comportamento si verifica senza leggere
testi, e i testi si potranno cambiare senza toccare le prove.

Le operazioni che sostituiscono il contenuto — `creaDaTour` e `apri` — passano
per `useRichiediTransizione` e restituiscono gli esiti del contratto 6.3B,
`occupato` compreso, perché la futura interfaccia possa comunicarli.

### 19.2 Che cosa riusa, e che cosa lascia vuoto

`daTour` sui dati già normalizzati che il chiamante fornisce — l'hook non va a
prendersi il sito — e `contenutoVuoto` con categoria `tour` e formato `post`. I
rami importati si **combinano** con i default dello schema: quello che l'adapter
lascia vuoto resta vuoto (§17.3), non sparisce. `urlBase` è un'opzione: nessun
URL di tour reale sta nel codice.

Scrivere un fatto a mano porta la sua `origine` a `manuale`, e non tocca quella
degli altri campi: è ciò che permette di sapere se un cambiamento sul sito
riguarda ancora quel dato. Scrivere un testo non entra in `origine`, perché un
testo non è un fatto.

Il salvataggio usa l'archivio esistente attraverso `useArchivio` — SocialStorage
resta l'unico accesso alla persistenza, nessun IndexedDB diretto — e registra la
revisione con lo stesso contratto Version History di EVENTI. Il record si
rilegge convalidato: ciò che si vede è ciò che è sul disco.

### 19.3 Le stesse difese di 6.3B, sugli stessi punti

L'elenco filtra la categoria, ma **il filtro non è la difesa**: `apri` rifiuta un
id che non è una bozza TOUR anche se glielo si passa di mano, e rifiutandolo non
sostituisce il lavoro corrente.

Identità del contenuto e contatore delle modifiche proteggono ogni attesa: fra
la richiesta di lettura e la sua risposta, fra la scrittura e la rilettura, e
fra quella e l'aggiornamento dell'elenco. Una risposta tardiva non cancella
battute, non applica un'altra bozza e non dichiara pulito lavoro che non è
persistito. L'ultimo controllo è l'ultima istruzione prima del ritorno utile.

Due `salva()` per lo stesso gesto ricevono **la stessa** promessa invece di
aprire due scritture: due revisioni per una modifica sola sarebbero una bugia
sulla storia del documento.

**Una scrittura superata lascia comunque qualcosa sul disco**, e la storia deve
tenerne conto. Se la scrittura riesce ma il lavoro corrente è già più avanti,
restituire `null` non basta: in archivio adesso c'è quello stato intermedio, e
le sue revisioni sono la storia vera. Il contenuto in memoria non si tocca —
nessuna fusione dei campi, è più nuovo e ha ragione lui — ma eredita quella
catena, perché `registraRevisione` la legge da `contenuto.versioni`. Senza, il
tentativo successivo ripartirebbe da una catena vecchia e `archivio.salva`, che
sostituisce l'intero record, farebbe sparire uno stato che *era* ripristinabile:
si salva A, si modifica in B con una scrittura lenta, si scrive C nel frattempo,
e al secondo salvataggio B non esisterebbe più in nessuna revisione. Se nel
frattempo cambia identità non si adotta nulla: la storia di una bozza non
appartiene a un'altra.

**Una scrittura confermata ma non riletta è il caso più insidioso.**
`archivio.salva` ha restituito un id: sul disco quel record c'è. Se però la
rilettura fallisce — o torna vuota — non lo si può far passare per convalidato,
e soprattutto non si può riscriverci sopra: la catena in memoria è ancora quella
di prima, e `archivio.salva` sostituisce l'intero record. Scrivere A, poi B con
la sola rilettura guasta, poi C, cancellerebbe B dalla storia.

Scrittura e rilettura hanno quindi `catch` distinti — condividerne uno faceva
passare per «errore di scrittura» un record già persistito — e il fallimento
della rilettura lascia un **debito**: `rilettura-fallita`, lavoro non salvato,
transizione bloccata dalla guardia. Al tentativo successivo il debito si salda
per primo, rileggendo quella base prima di qualunque scrittura; se non ci si
riesce ancora, il codice è `base-non-recuperata` e **non si scrive affatto** —
meglio non scrivere che scrivere sopra, ed è riprovabile. Se nel frattempo si è
passati a un'altra bozza il debito non la riguarda e non la blocca: quando si
riaprirà la prima, `apri` rileggerà la sua base dal disco.

**Il recupero appartiene alla bozza per cui è iniziato.** Anche quella lettura è
un'attesa, e fra il suo avvio e la risposta si può cambiare bozza: adottare
allora la base recuperata travaserebbe la storia di una nell'altra, e la
fotografia subito dopo scriverebbe quell'altra senza che nessuno l'abbia
chiesto — con `archivio.salva` che sostituisce l'intero record, la bozza
arrivata dopo perderebbe la propria Version History.

Per riconoscerlo l'identità non basta: abbandonare una bozza e riaprirla dà lo
stesso `id` ma è un'altra **sessione** di lavoro. L'hook tiene quindi un
contatore di sessione, che cambia solo quando il contenuto viene sostituito —
creato o aperto — e **non** quando lo si scrive. Dopo ogni attesa si confronta
quello, oltre all'identità. La distinzione è sostanziale: usare il contatore
delle modifiche butterebbe via il recupero per una battitura, mentre restando
sulla stessa bozza il lavoro più recente dev'essere conservato e salvato.

Errori di lettura, scrittura ed elenco diventano
codici di esito, mai rejection scoperte. Dopo lo smontaggio nessun effetto
tardivo: un solo controllo di vita, collocato nell'ultimo punto in cui si può
ancora restituire `null` invece di annunciare un salvataggio a un albero che non
c'è più.

### 19.3.1 La finestra prima del render

Fra una modifica e l'operazione che la segue, **nello stesso giro**, React non
ha ancora ridisegnato: lo stato è quello di prima. Chi legge lo stato invece di
un riferimento aggiornato subito lavora quindi su dati vecchi — e il contatore
delle modifiche, già incrementato, lo fa passare per buono. Sono due modi di
perdere lavoro senza nemmeno un avviso:

- `scriviEditoriale(...)` seguito da `salva()` persisteva il contenuto
  *precedente*, poi la rilettura riscriveva sopra la modifica e l'editor si
  dichiarava pulito;
- una modifica seguita da `creaDaTour` o `apri` non incontrava il dialogo,
  perché la guardia leggeva `sporco` dal render precedente, e la sostituzione
  passava in silenzio.

La correzione è minima e sta tutta nell'hook: ogni modifica allinea **subito**
il riferimento al contenuto, e lo stato «non salvato» vive anche in un
riferimento che la guardia interroga. Non si usano `flushSync`, attese o
`respiro` nei chiamanti: nascondere il difetto dietro un'attesa obbligatoria
avrebbe lasciato la superficie pubblica altrettanto fragile.

La funzione di modifica viene applicata due volte — al riferimento e allo stato
— e per questo dev'essere pura. Non è una precauzione teorica: sotto
`StrictMode` React invoca gli aggiornatori due volte di suo, e una prova monta
l'hook proprio lì per verificarlo.

### 19.4 Che cosa è verificato

`useBozzaTour.test.jsx` monta l'hook sotto `FornitoreArchivio` e
`FornitoreTransizione` con archivio in memoria e promesse pilotate, e confronta
**i dati**: che cosa finisce nell'archivio e che cosa resta in memoria, non i
messaggi. Copre creazione da tour sintetico con i campi non pubblicati ancora
vuoti; il tour ricevuto non mutato; separazione fra testi e fatti con `origine`
manuale; salvataggio, rilettura e revisione; elenco filtrato; rifiuto di un id
EVENTI senza perdere il lavoro; annulla, scarto e «salva e continua» durante una
sostituzione; salvataggio fallito che non lascia procedere; `occupato`;
scrittura durante lettura, durante salvataggio e durante l'aggiornamento
dell'elenco; doppio salvataggio senza duplicazioni; errore di lettura;
smontaggio in due punti diversi; elenco che rifiuta dopo una scrittura riuscita;
e i registri veri ancora chiusi per TOUR.

Sei prove riguardano la storia e i contratti pubblici: il caso A→B→C fino al
secondo salvataggio, con B conservato come revisione ripristinabile e la
numerazione coerente; lo stesso per una bozza mai salvata prima; un cambio di
identità durante la scrittura, dopo il quale la nuova bozza non eredita né base
né storia; `ricarica()` chiamata da fuori con l'archivio che rifiuta, che
riporta un codice invece di rigettare e lascia il lavoro intatto; due `salva()`
nello stesso giro confrontati con `toBe`, cioè per identità della promessa e non
per valore; una scrittura fallita che libera il blocco e permette di riprovare.

Cinque prove riguardano la rilettura fallita, con la scrittura che riesce
davvero e il disco verificato scavalcando il guasto simulato: A→B→C con A e B
conservati come revisioni; lo stesso al primo salvataggio di una bozza nuova;
una rilettura che torna vuota trattata come fallita; un recupero che fallisce
ancora, dopo il quale non si sovrascrive, il lavoro resta sporco e «Salva e
continua» non passa; un cambio di bozza che non si fa bloccare dal debito
dell'altra.

Cinque prove coprono la corsa del recupero, fermando esattamente la lettura di
recupero e non la prima rilettura: passaggio a una bozza nuova, che non eredita
né storia né scritture; apertura di una bozza già persistita, che conserva
intatte le proprie revisioni; riapertura dello stesso `id`, dove solo la
sessione distingue; permanenza sulla stessa bozza, dove le battiture più recenti
vengono conservate e salvate; smontaggio durante l'attesa.

Otto prove coprono la finestra prima del render, **senza alcun respiro fra le
chiamate**: scrivere e salvare nello stesso giro; più modifiche di fila, testi e
fatti, con la provenienza giusta e i fatti non toccati invariati; lo stesso
sotto `StrictMode`; scrivere e poi creare da un altro tour, dove il dialogo
deve comparire e «Annulla» conserva identità e modifica; scrivere e poi aprire
un'altra bozza; «Salva e continua», che porta sul disco l'ultima modifica prima
di sostituire; «Scarta modifiche», che sostituisce solo dopo la scelta
esplicita; e un'apertura dopo la quale l'editor è davvero pulito, così che
sostituire non chieda più nulla.

Nove prove coprono il riallineamento: cambia solo `fonte`, con tutti gli altri
rami confrontati uno per uno e i fatti manuali intatti; è una modifica non
salvata e non tocca l'archivio; salvando e riaprendo la nuova istantanea resta e
la storia pure; tour assente, bozza assente e slug diverso non cambiano nulla;
modifica, riallineamento e salvataggio **nello stesso giro** finiscono tutti sul
disco; dopo un riallineamento sostituire la bozza chiede prima e «Annulla»
conserva; sotto `StrictMode` l'istante resta quello e ciò che si vede è ciò che
si salva; riallineamento durante una scrittura lenta e durante l'aggiornamento
dell'elenco, dove la risposta vecchia non lo cancella e il secondo salvataggio
riesce.

Il mordente è stato verificato con mutazioni temporanee limitate ai file nuovi:
senza il filtro di rubrica, senza il contatore in apertura, senza il primo o
l'ultimo controllo del salvataggio, senza la fusione delle scritture, senza
`origine` manuale falliscono una prova ciascuna; senza guardia registrata ne
falliscono cinque; senza il controllo di vita, due; senza l'adozione della base
persistita, due; ereditando la base senza la catena di revisioni, una; senza
aggiornare la base, due; con `ricarica` che torna a rigettare, due; con `salva`
di nuovo `async`, una; senza segnare il debito, quattro; senza saldarlo prima
di scrivere, quattro; con un recupero che non adotta la base, tre; con un
recupero fallito che lascia scrivere comunque, una; con il `catch` di nuovo
condiviso, tre; con il debito che ignora l'identità, una. Sulla sessione:
togliendo il controllo nel recupero falliscono tre prove, facendola cambiare a
ogni battitura ne falliscono cinque, non incrementandola all'apertura o alla
creazione una ciascuna. Sulla finestra prima del render: senza allineare il
riferimento nella modifica falliscono tre prove, con la guardia che torna a
leggere lo stato quattro, e mancando l'aggiornamento del riferimento «non
salvato» nella modifica otto, nel salvataggio riuscito undici, nella creazione
quattro, nell'apertura una. Sul riallineamento: leggendo lo stato invece del riferimento
falliscono nove prove, senza marcare la modifica sei, reimportando anche i fatti
due, senza il controllo di identità della fonte una. Nessuna mutazione è
rimasta.

### 19.5 I limiti

- **L'editor c'è, ma non è registrato.** Da 6.3L esiste un primo nucleo di
  `EditorTour` (§19.14), raggiungibile solo dal banco diagnostico e su un
  archivio isolato. `registro-editor.js` non lo contiene e
  `registro-template.js` non contiene i prototipi (§19.12): TOUR resta
  `pianificata` e non selezionabile, e il pre-flight **generale** continua a
  rispondere `template-non-implementato`.
- **Una guardia sola.** Il fornitore ne tiene una (§18.6): questo hook ne
  registra una, quindi **non va montato insieme a `EditorEvento`** sotto lo
  stesso fornitore finché quel limite non è risolto. È il vincolo da chiudere
  prima di avere due editor, non dopo.
- **Niente export.** Deliberatamente fuori: porta con sé difese proprie, e vanno
  aggiunte con le loro prove. Riallineamento (§19.6), confronto (§19.7),
  eliminazione (§19.8), cronologia (§19.9), slot fotografici (§19.10) e ciclo
  GPX (§19.11) invece ci sono.
- **Il GPX si carica, non si disegna.** §19.11 tiene riferimento, binario e
  geometria; non esiste nessuna mappa e nessun profilo altimetrico. I prototipi
  non li disegnano, quindi il pre-flight TOUR **non li richiede**: pretendere un
  GPX bloccherebbe l'esportazione per qualcosa che nessuno sta disegnando.
- **Nessuna fusione automatica.** Su risposta superata si segnala con un codice
  e si chiede di ripetere.
- **Il riallineamento non è sorvegliato da Version History.** Accettare una
  fonte nuova non genera una revisione, quindi tornare all'istantanea
  precedente non è previsto. Va deciso quando l'editor esisterà.
- **Il confronto dice che cosa è cambiato, non come mostrarlo.** `§19.7` espone
  gli scostamenti grezzi; la loro presentazione — quali evidenziare, con quali
  parole — resta una scelta da fare quando l'interfaccia esisterà.
- **Un archivio che non si lascia rileggere blocca il salvataggio di quella
  bozza.** È deliberato: finché non si sa da dove ripartire, scrivere
  cancellerebbe uno stato che è sul disco. Il lavoro resta in memoria e
  l'operazione è riprovabile, ma finché il guasto dura quella bozza non si
  salva.
- **Un elenco che non si aggiorna non annulla il salvataggio.** La scrittura è
  riuscita, quindi `salva()` restituisce il record e l'esito è `errore-elenco`
  invece di `salvata`: dire che è fallita manderebbe a riscrivere qualcosa che è
  già sul disco. È la stessa scelta fatta per il cestino di EVENTI (§18.4.1).

### 19.6 Accettare che il sito è cambiato

`riallineaAllaFonte(tourAttuale)` aggiorna l'istantanea della fonte, e nient'altro.
Riusa `riallineaTourAllaFonte` (§17.4): tocca solo `fonte` — tipo, slug,
istantanea e `importatoIl` — e lascia intatti fatti, provenienze, copy, media,
visual, mappa, formato, variante e revisioni. **Accettare la fonte non è
reimportare**: il lavoro editoriale non si perde per aver preso atto che il sito
è cambiato.

Non legge il sito da sé — il tour normalizzato arriva da chi chiama — e non
salva: è una modifica come le altre, che diventa persistente solo con `salva`.
Restituisce un codice, come `ricarica()`: `fonte-accettata`, oppure
`fonte-assente`, `nessuna-bozza`, `fonte-non-corrispondente`. In quei tre casi
non cambia nulla — né contenuto, né stato «non salvato», né archivio — e non
lancia.

**L'identità dev'essere la stessa, e dichiarata.** Serve una bozza TOUR corrente
la cui fonte sia di tipo `tour` con uno slug non vuoto uguale a quello del tour
ricevuto. Senza slug non si sa da quale tour venga la bozza, e accettare
l'istantanea di un altro le farebbe dire di descrivere un percorso che non
descrive. È il requisito che `identitaCompatibile` condivide con il confronto
(§19.7).

**Non serve invece un'istantanea già presente**, ed è deliberato: una bozza
compatibile ma senza istantanea — da un backup o da un record vecchio — si
ripara proprio riallineandola. Chiedere l'istantanea anche qui chiuderebbe la
porta all'unica operazione capace di ricostruirla.

Il contenuto si legge dal riferimento, non dallo stato: chi chiama può aver
appena scritto nello stesso giro (§19.3.1). Il riallineamento incrementa il
contatore delle modifiche e accende «non salvato» subito, così la guardia lo
vede; **non** cambia la sessione, perché la bozza resta la stessa, e non tocca
`salvatoRif`, perché non è ancora sul disco. Una scrittura già in volo che
ritorna dopo lo trova e si dichiara superata invece di cancellarlo.

Version History non sorveglia `fonte`, e questo capitolo non lo estende: un
riallineamento da solo non genera una revisione. La storia esistente resta
intatta.

`riallineaTourAllaFonte` genera `importatoIl`, quindi non è pura: si chiama una
volta sola fuori dall'aggiornatore, e all'aggiornatore si passa una
trasformazione che sostituisce soltanto il ramo `fonte`. Va detto con
precisione: **questa purezza non è distinguibile da una prova**. Le due
chiamate cadrebbero nello stesso millisecondo, e sotto orologio finto il tempo è
fermo — una prova che tentasse di coglierla passerebbe comunque. È una
correttezza di costruzione, non verificata. Quello che le prove verificano è
l'effetto osservabile: che ciò che si vede sia ciò che si salva.

### 19.7 Chiedere se il sito è cambiato

`confrontaConLaFonte(tourAttuale)` risponde a una domanda e **non tocca niente**:
né contenuto, né «non salvato», né esito, né archivio, né revisioni. Una prova lo
verifica per riferimento — il contenuto non viene nemmeno ricreato. Non legge il
sito da sé: il tour normalizzato arriva da chi chiama.

Gli scostamenti vengono da `confrontaTourConLaFonte` (§17.4), che resta l'unico
posto dove quella logica vive: `{ campo, nome, prima, adesso }`. Restituisce
`{ codice, allineato, scostamenti }` — `fonte-allineata` con `allineato: true`,
oppure `fonte-cambiata` con `allineato: false` e gli scostamenti veri.

**Quando il confronto non si può fare, `allineato` è `null` e non `false`:** non
si sa, e fingere di saperlo sarebbe peggio che ammetterlo. Succede con tour
assente (`fonte-assente`), nessuna bozza aperta (`nessuna-bozza`), e identità
incompatibile (`fonte-non-corrispondente`) — categoria diversa, fonte senza tipo
`tour`, slug mancante o diverso da quello del tour. Nessuno di questi casi viene
mai presentato come «fonte allineata», e nessuno inventa scostamenti.

**Identità e confrontabilità non sono la stessa cosa**, e il quarto codice serve
a non confonderle. Una bozza senza istantanea — da un backup o da un record
vecchio — ha una fonte che *corrisponde* perfettamente, ma non c'è niente con
cui confrontarla: l'esito è `fonte-non-confrontabile`, non
`fonte-non-corrispondente`. Il motore in quel caso risponderebbe «allineato»
perché non ha nulla da paragonare — una risposta vuota che, presa per buona,
direbbe che il sito non è cambiato quando non se ne sa nulla.

`identitaCompatibile` è condivisa con il riallineamento (§19.6), così i due non
possono divergere; `fonteConfrontabile` vi aggiunge l'istantanea, e quel
requisito vale **solo qui**. Una bozza non confrontabile si ripara
riallineandola, e da quel momento è confrontabile.

Il contenuto si legge dal riferimento, non dallo stato: una prova riallinea e
confronta **nello stesso giro**, e il confronto deve vedere il riallineamento
appena fatto (§19.3.1).

### 19.8 Eliminare una bozza

`elimina(id)` è definitiva — non c'è un annulla — e per questo è cauta.

**Non passa dal dialogo delle transizioni.** Quello offre «Salva e continua»,
che qui significherebbe salvare proprio la bozza che si sta cancellando: una
promessa di conservazione che l'azione successiva annulla. Con lavoro non
salvato su *quella* bozza il gesto si **rifiuta** (`modifiche-non-salvate`) e
l'archivio non viene nemmeno interrogato; per eliminarla si salva o si scarta
prima, deliberatamente. Una bozza **diversa** invece si elimina anche mentre la
corrente è sporca: non ha niente a che vedere con lei.

**L'appartenenza si verifica nell'archivio**, rileggendo il record: l'elenco è
una comodità e può essere vecchio. Un id EVENTI, uno inesistente o nullo danno
`non-una-bozza-tour` senza che nulla venga cancellato.

Una eliminazione alla volta: una seconda richiesta riceve
`eliminazione-occupata` prima ancora di leggere, e il blocco si rilascia sempre,
anche in errore. Lettura ed eliminazione hanno `catch` distinti, quindi esiti
distinti — `errore-lettura` ed `errore-eliminazione` — e da entrambi si può
riprovare.

Dopo l'attesa si guardano contenuto e **sessione** di adesso (§19.3.1, §19.5):

- se la bozza eliminata è ancora aperta, pulita e nella stessa sessione, si
  svuota l'editor e la base persistita;
- se nel frattempo si è scritto su quella stessa bozza, il lavoro **resta in
  memoria** dichiarato non salvato: l'archivio non ce l'ha più, la memoria sì, e
  svuotare perderebbe quelle battute in silenzio;
- se nel frattempo è stata aperta o creata un'altra bozza, non si tocca niente:
  una risposta tardiva non cancella lavoro nuovo.

L'elenco è l'ultimo passo, e un suo fallimento **non rende fallita la
cancellazione**: l'esito è `eliminata-elenco-non-aggiornato`, non un errore, e
non suggerisce di ripetere un gesto su un record che non c'è più.

**Salvataggio ed eliminazione della stessa bozza si escludono a vicenda.** La
promessa di scrittura da sola dice *che* si sta scrivendo, non *su cosa*: senza
l'id, un salvataggio sospeso e un'eliminazione della stessa bozza non si vedono,
e vince chi finisce per ultimo — un salvataggio tardivo **ricrea** un record
appena cancellato. Un riferimento all'id in scrittura chiude le due direzioni:
con una scrittura in volo su quella bozza `elimina` si ferma prima di leggere o
cancellare; con un'eliminazione in corso su quella bozza `salva()` non avvia
alcuna scrittura e riporta `null`. In entrambi i casi l'esito è
`operazione-in-conflitto`, ed è **riprovabile**: finita l'operazione in corso, il
gesto rifiutato riesce.

**Anche apertura ed eliminazione si escludono**, per lo stesso motivo e in
entrambi gli ordini. Se `elimina(id)` è in corso, `apri(id)` non legge e non
applica; se `apri(id)` è in corso, `elimina(id)` non cancella. Senza questo si
ottiene il caso peggiore: una bozza che resta in memoria **dichiarata pulita**
mentre la sua base sul disco è già stata eliminata — l'editor sembra allineato
all'archivio e non lo è, e non avvisa di nulla. Un controllo della sessione non
basterebbe: l'apertura conta come sessione nuova, e la cancellazione la
lascerebbe intatta proprio perché «è un'altra bozza».

Il blocco è per **id**: eliminare una bozza diversa mentre si salva la corrente
resta consentito, e così eliminarne una mentre se ne apre un'altra. E ogni blocco lo libera soltanto l'operazione che l'ha preso.
Due `salva()` concorrenti continuano a condividere la stessa promessa: quel
controllo resta il primo, e l'interblocco non lo tocca.

I codici sono codici, non frasi: che cosa si legga a schermo resta una scelta
editoriale.

**Un limite dichiarato.** I ripari dallo smontaggio (`vivoRif`) soddisfano il
requisito di non aggiornare stato React dopo l'uscita, ma **nessuna prova li
distingue**: React rende inerti quelle chiamate, e il valore osservabile resta
l'ultimo reso. Sono correttezza di costruzione, non verificata — a differenza
delle altre sei difese, per cui una mutazione fa fallire la prova corrispondente.

### 19.9 Cronologia e ripristino

`revisioni()` restituisce il riepilogo di `elencoRevisioni` — dalla più recente,
con `ripristinabile` che dice quali portano davvero uno stato: il punto di
creazione non lo porta.

`ripristina(n)` torna a una revisione e **rende persistente** il ritorno.
Sostituisce il lavoro in corso, quindi passa da `richiedi` come aprire un'altra
bozza: «Annulla» non cambia nulla, «Salva e continua» salva prima e poi
ripristina, «Scarta modifiche» butta.

**Due punti valgono più del resto.**

Il primo: **una revisione sola per un gesto solo**. `ripristinaRevisione` scrive
già la propria voce — «stato prima del ripristino» — e farla ripassare da
`registraRevisione` ne creerebbe due, sporcando la storia proprio dove serve
leggerla. Per questo `scrivi` accetta `giaRegistrata`. Ne segue che il ripristino
è a sua volta reversibile: lo stato precedente resta conservato.

Il secondo: **scartare vuol dire buttare, non archiviare**. Il ripristino parte
dalla base davvero sul disco (`salvatoRif`), non dalla fotografia sporca rimasta
in memoria. Partendo dalla memoria, le modifiche appena scartate finirebbero
nella cronologia come «stato prima del ripristino» — conservate proprio da chi
aveva chiesto di eliminarle.

**Le condizioni impossibili si riconoscono prima del dialogo.** Revisione
inesistente, revisione senza dati e assenza di una base persistita vengono
riconosciute da `ripristina` *prima* di chiamare `richiedi`: altrimenti, con una
bozza sporca, comparirebbe la scelta fra salvare e scartare, e «Salva e
continua» salverebbe davvero il lavoro per poi scoprire che non c'è nulla da
ripristinare. In quei casi non compare alcun dialogo, non si scrive, e il codice
specifico arriva sia in `esito` sia nel risultato pubblico, senza rigettare.

**Il motivo del fallimento non si appiattisce.** `scrivi` conosce la ragione
vera — `rilettura-fallita`, `base-non-recuperata`, `superata-da-modifiche`,
`superata-da-altro-contenuto`, `errore-scrittura` — e la espone a chi l'ha
chiesta: `esito.codice`, `risultato.esito` e `risultato.errore.message` restano
coerenti. Convertire tutto in un generico «errore di scrittura» perderebbe la
distinzione proprio dove serve decidere se riprovare o recuperare.

**Un elenco non aggiornato non cancella il ripristino riuscito.** Se la scrittura
è andata e solo `ricarica` fallisce, il disco è aggiornato, la bozza è pulita e
la transizione risulta eseguita, ma l'esito resta `errore-elenco`: non viene
sovrascritto con `revisione-ripristinata`, e non si suggerisce di ripetere.

Un ripristino fallito lascia in memoria lo stato ripristinato e **non salvato**:
è corretto, e per questo il tentativo successivo passa di nuovo dal dialogo. Ma
quello stato porta **già** la propria voce «stato prima del ripristino», quindi
un salvataggio ordinario non deve registrarla di nuovo: finché il ripristino è
pendente, `salva` scrive senza registrare. E se il disco porta già lo stato
richiesto — per esempio dopo un «Salva e continua» che l'ha appena persistito —
il ripristino riconosce di essere compiuto e non aggiunge una voce senza
cambiamenti. Il risultato osservabile è che una sola «stato prima del ripristino»
compare per ciascun ripristino davvero persistito, e che una modifica aggiunta
dopo un fallimento non si perde.

**Il pendente appartiene a una sessione, non a un id.** Riaprire la stessa bozza
comincia una sessione nuova, il cui contenuto viene dal disco e **non** porta la
voce forzata: ereditare lì il marcatore sopprimerebbe una revisione ordinaria, e
lo stato precedente sparirebbe dalla cronologia. Il marcatore vale quindi solo
finché dura la sessione che l'ha creato.

**Il codice dell'operazione è legato alla propria scrittura.** Ogni scrittura
conclusa lascia `{ seq, codice }`: il numero progressivo dice *se quella
scrittura è la propria*. Serve nel percorso di ritentativo — «Salva e continua»
persiste lo stato richiesto, la continuazione riconosce il ripristino già
compiuto, e senza il numero coprirebbe l'`errore-elenco` di quel salvataggio con
un `revisione-ripristinata` che non descrive nulla. Un codice globale, da solo,
potrebbe anche appartenere a un'operazione precedente.

**L'uguaglianza è strutturale, non per stringa.** `JSON.stringify` dichiara
diversi due oggetti con le stesse coppie in ordine diverso; `versione.dati` è
`z.unknown()`, quindi la convalida non normalizza ciò che sta dentro, e un
backup o un record migrato può arrivare proprio così. Il confronto ignora
l'ordine delle chiavi e rispetta quello degli elementi negli array.

**La revisione scelta sopravvive al dialogo.** I suoi dati si fotografano prima,
con una copia profonda. Un «Salva e continua» aggiunge una revisione e, con la
cronologia al tetto, il diradamento può togliere proprio quella scelta: cercarla
di nuovo per numero la troverebbe sparita, e il ripristino fallirebbe per una
revisione che al momento del clic c'era. Finché il numero è ancora al suo posto
si usa `ripristinaRevisione`; quando non c'è più, si compone dalla fotografia
con la stessa voce forzata che il motore avrebbe registrato. `versioni.js` e
`MASSIME_REVISIONI` restano intatti.

Il ripristino è una scrittura, e usa gli stessi blocchi: non può sovrapporsi a un
salvataggio o a un'eliminazione della stessa bozza (§19.8), e le difese di
identità, sessione, modifiche sopraggiunte e smontaggio sono quelle di §19.3.1 e
§19.5. `revisione-inesistente` e `revisione-non-ripristinabile` sono distinti
perché il motore lancia per entrambi: un codice solo non direbbe se la revisione
non c'è o se c'è ma non porta uno stato.

### 19.10 Gli slot fotografici

**Il registro degli slot è per rubrica.** `media/slot.js` dichiarava i nove slot
EVENTI; ora tiene una tabella per rubrica, con una sola implementazione — gli
export storici (`SLOT_MEDIA`, `leggiSlot`, `scriviSlot`, `slotPieno`,
`conRipiegoCover`, `SLOT_SFONDO`) delegano a quella, e EVENTI non cambia di una
virgola.

Una rubrica sconosciuta **non ha slot e non ne eredita**. È lo stesso principio
per cui questo file esiste: il ripiego per esclusione — «se non è questo, allora
sarà quello» — scriveva in `esperienza[NaN]` e faceva sparire le fotografie
senza un errore. Far ripiegare una rubrica sconosciuta su EVENTI ricreerebbe
quel difetto a un livello più alto.

TOUR dichiara **due soli slot**: `cover` per il Post, in `media.cover`, e
`story` per la Story, in `media.sfondi.tourStory`. Sono due ritagli distinti
perché il Post è 4:5 e la Story 9:16: la stessa fotografia vuole inquadrature
diverse, e condividerne una sola obbligherebbe a sacrificare un formato. La
Story ripiega sulla cover quando non ha la propria, ma **solo per il
rendering**: `slotDellaRubricaPieno` continua a dire che lo slot è vuoto, perché
lo è. Nessun carosello e nessuno slot «esperienza» in questo capitolo.

**Il registro si convalida alla costruzione**, non all'uso: `costruisciRegistroSlot`
è esportata e provata da sola. Rifiuta id mancanti, vuoti o duplicati, nomi
vuoti, destinazioni diverse da `cover`, `esperienza` e `sfondi`, più di una
cover, indici non interi o negativi, chiavi vuote — e soprattutto **due id che
puntano alla stessa destinazione**: sarebbero due comandi che modificano lo
stesso dato, e chi li usa non capirebbe perché l'uno cancella l'altro. Elenchi
e descrittori sono congelati, e uno slot sconosciuto non legge e non scrive.
Scoprire questi errori durante l'uso significherebbe scoprirli a fotografia
sparita.

**Il registro pubblico è `{ elenco, descrizione(id) }`, e niente altro.** Prima
usciva anche la tabella di ricerca, come `Map`, dentro un oggetto congelato:
`Object.freeze` congela l'involucro, non il contenuto di una Map, e `set`,
`delete` e `clear` restavano a disposizione di chiunque avesse il registro in
mano. Un `registro.perId.set("intruso", …)` produceva due viste discordi dello
stesso registro — lo slot compariva alla ricerca e mancava dall'elenco — e il
valore dichiarato «congelato» risultava modificato dall'esterno. La mappa ora
resta nella chiusura e fuori esce una funzione di sola lettura, che non ha
`set`, `delete` né `clear` e non dà modo di raggiungere quel che consulta.
`elenco` e descrittori restano gli stessi riferimenti congelati, `SLOT_MEDIA`
resta **lo stesso** elenco del registro EVENTI, e gli export storici continuano
a delegare.

**Nell'hook**: `slotMediaDisponibili()` restituisce quei due slot,
`leggiMedia(slot)` legge dal riferimento corrente, `scriviMedia(slot, ritaglio)`
assegna, sostituisce o — con `null` — rimuove. Esiti: `media-assegnato`,
`slot-media-non-valido`, `nessuna-bozza`. È una modifica come le altre: marca la
bozza non salvata, **non** scrive da sola nell'archivio, e produce la normale
revisione al salvataggio successivo. Il riferimento si allinea subito, così un
`salva` chiamato nello stesso giro persiste la fotografia appena assegnata
(§19.3.1).

**Il ritaglio si convalida al confine pubblico**, con lo schema `ritaglio` che
già esiste — non una seconda definizione di che cosa sia valido. Filtrare i nomi
dei campi non bastava: valori fuori dominio e tipi sbagliati entravano in
memoria e fallivano soltanto al salvataggio, come generico «errore di
scrittura», *dopo* che l'hook aveva già accettato e mostrato la modifica. Un
ritaglio non valido riceve subito `ritaglio-media-non-valido`, e contenuto,
riferimento, contatore, stato «non salvato», archivio e revisioni restano
identici.

Si rifiutano zoom e coordinate fuori dominio, tipi sbagliati, primitivi e array.
`Blob` e `File` hanno una guardia esplicita, e non è ridondante: non avendo
nessuna delle proprietà del ritaglio, uno schema fatto di soli campi con valore
predefinito li accetterebbe trasformandoli in un ritaglio **vuoto** — il modo
peggiore di fallire.

**`idBlob` è una chiave opaca di SocialStorage**, non un modo per portarsi
dentro l'immagine né per indicare un file altrove. La regola non è più un elenco
di prefissi vietati — era una lista di casi noti, e `ftp://server/foto.jpg`,
`cartella/foto.jpg`, `C:/foto.jpg`, un percorso UNC, la stringa vuota e quella
di soli spazi ci passavano attraverso — ma la **forma di ciò che è ammesso**:
una stringa non vuota, senza spazi ai bordi, senza `/` né `\` e senza schema
URI. Così cadono in un colpo solo URL, percorsi POSIX, Windows, UNC e relativi,
`data:`, `blob:`, `file:`, `http(s):`, `ftp:` e qualunque schema non previsto,
mentre gli id che l'archivio produce davvero — `img-1757000000000-a1b2c3` —
continuano a passare.

Un oggetto con `idBlob` assente o `null` **non è un'assegnazione valida**: lo
schema gli darebbe `null` per difetto e lascerebbe entrare un ritaglio che non
indica nessuna fotografia. Per togliere una fotografia si passa `null` come
valore intero, non un ritaglio svuotato.

**Nel contenuto entrano solo `idBlob`, `zoom`, `x`, `y` e `specchiata`**, e nulla
di più: quel che arriva viene filtrato. Nessun Blob, data URL o byte fotografico,
perché il contenuto finisce nei record convalidati, nei backup e in ogni
revisione, e una fotografia dentro lo farebbe crescere senza che nessuno se ne
accorga. I byte stanno in SocialStorage; qui resta il modo di ritrovarli.

**Le fotografie del sito restano sul sito.** Creare una bozza da un tour non
copia, non scarica e non assegna niente: `media.cover` resta `null`,
`media.sfondi.tourStory` non viene creato, e i percorsi fotografici del sito
compaiono soltanto nell'istantanea della fonte, dove §17.4 li ammette come
riferimento testuale.

### 19.11 Il ciclo GPX

**Tre cose distinte, e conviene chiamarle con tre nomi diversi.**

1. Il **riferimento persistito**: `mappa.gpx = { idBlob, nome, byte }`. È l'unica
   parte che entra nel record salvato, nelle revisioni e nei backup. Lo schema
   `riferimentoBlob` esisteva già e non è stato toccato.
2. Il **binario privato**: il file vero, in SocialStorage, sotto un `idBlob`.
   Non esce dal browser: `esportaBackup()` lo include solo con `includiGpx`,
   perché un GPX è un asset dell'attività, non un allegato del contenuto.
3. La **geometria derivata**: segmenti, waypoint, origine e metriche, che
   `analizzaGpx` ricava dal file. Vive **soltanto in memoria**, in `tracciaGpx`,
   e si ricostruisce ogni volta che serve.

Copiare la geometria nel contenuto sarebbe più rapido, e sarebbe il modo più
sicuro di far crescere senza controllo record, revisioni e backup: una traccia
di qualche migliaio di punti pesa più di tutta la bozza messa insieme, e
verrebbe duplicata a ogni revisione. Nel contenuto non entrano coordinate,
segmenti, metriche né XML: una prova serializza la bozza e lo verifica.

**Caricare: prima si analizza, poi si salva.** `caricaGpx(file)` accetta solo un
`Blob`, ne legge il testo, lo passa ad `analizzaGpx` e **solo se regge** chiama
`archivio.salvaBlob("gpx", …)`. L'ordine inverso lascerebbe nell'archivio il
binario di ogni file sbagliato — un XML rotto, un PDF rinominato — senza nessun
contenuto che lo riferisca e senza nessuno che se ne ricordi. È una modifica
come le altre: marca la bozza non salvata e **non** scrive da sola. Non tocca
fatti, media, fonte o testi editoriali, e i waypoint restano etichette della
traccia: non diventano località né tappe, perché un dato derivato da un file non
è un dato dichiarato dal sito.

**Ricostruire: dopo l'apertura e dopo il ripristino.** Il riferimento dice dove
ritrovare il file, e la geometria si rifà da lì. Non si aspetta: un binario
lento o mancante non deve tenere in sospeso un'apertura che è già riuscita.
Ricostruire non modifica la bozza e non la sporca. Un fallimento **non cancella
il riferimento**: il file manca o è rotto, ma il fatto che quella bozza abbia
quel GPX resta un dato, e buttarlo via toglierebbe l'unica traccia di che cosa
ricaricare. Esiti distinti per ogni causa — `gpx-blob-assente`,
`gpx-illeggibile`, `errore-archivio-gpx` — e `ricaricaGpx()` per riprovare senza
riaprire la bozza, cioè senza passare dal dialogo del lavoro non salvato.

**Le risposte tardive non parlano per la sessione nuova.** Una risposta si
applica solo se sono ancora suoi la generazione del ciclo GPX, la sessione della
bozza e l'`idBlob` che stava leggendo. Aprire un'altra bozza, sostituire il file,
toglierlo o avviare un'altra operazione rendono innocua quella di prima, che
torna `gpx-superato` **senza toccare né la traccia né l'esito** di chi è
arrivato dopo. Le operazioni chieste da fuori sono una alla volta:
`caricaGpx` e `ricaricaGpx` prendono un blocco e la seconda riceve
`gpx-occupato` invece di partire alla cieca.

**I binari vecchi non si cancellano.** Togliere il riferimento con `rimuoviGpx()`
— o sostituirlo con un altro file — lascia il binario dov'è, di proposito: la
versione già salvata può ancora riferirlo, una revisione della cronologia può
riportarlo, e chi scarta le modifiche deve ritrovare la base di prima.
Cancellarlo qui renderebbe impossibili quei tre ritorni indietro, e in silenzio.

**Togliere vince anche contro un caricamento partito prima.** Guardare solo il
riferimento non bastava: durante il primo caricamento di una bozza vuota,
riferimento e traccia sono ancora entrambi nulli, e il gesto rispondeva «nessun
GPX» senza invalidare niente — la risposta di `salvaBlob` arrivava dopo e
assegnava il file a una bozza da cui era appena stato tolto. `rimuoviGpx()`
distingue quindi tre situazioni:

- **rimozione di un riferimento esistente** — con o senza un caricamento in
  volo: il riferimento sparisce, la traccia si azzera, la bozza diventa non
  salvata, e l'esito è `gpx-rimosso`;
- **annullamento di un caricamento non ancora applicato** — nel contenuto non
  c'era ancora niente da togliere: la traccia si azzera, il **contenuto non si
  tocca** e la bozza non diventa «non salvata» per una modifica che non c'è
  stata; l'esito è `gpx-caricamento-annullato`;
- **niente riferimento e niente in volo** — `nessun-gpx`, e nulla cambia:
  marcare non salvato per un gesto senza effetti renderebbe falso proprio lo
  stato che serve a decidere.

Il lavoro sottostante **non viene interrotto** — una lettura o una scrittura già
partita non si può richiamare indietro — ma viene **invalidato**: chi annulla
incrementa la generazione del ciclo GPX, e il risultato che arriverà è innocuo.
`rimuoviGpx()` non libera il blocco: lo libera nel proprio `finally` solo
l'operazione che l'ha preso, quindi finché quella non finisce un nuovo
`caricaGpx`/`ricaricaGpx` continua a ricevere `gpx-occupato`. Rilasciarlo prima
farebbe partire un secondo caricamento mentre il primo è ancora in volo, cioè
esattamente la corsa che il blocco esiste per impedire.

**Un caricamento invalidato finisce in due modi diversi**, e la differenza è
quanto sporco lascia dietro:

- **prima di `salvaBlob`** — il controllo sta un istante prima della scrittura,
  appena dopo la lettura del file e l'analisi: il binario non nasce nemmeno, e
  non c'è niente da ripulire;
- **dopo che `salvaBlob` è partito** — se ne attende la risposta, il nuovo
  binario **non** viene collegato al contenuto, e si tenta di eliminarlo come
  orfano appena creato: è l'unico caso in cui cancellare è sicuro, perché
  nessuno lo riferisce e nessuno lo riferirà. È un tentativo, non una garanzia —
  un orfano è meno grave di un riferimento applicato alla bozza sbagliata — e un
  fallimento della pulizia non produce una rejection.

In entrambi i casi il caricamento torna `gpx-superato` e **non sostituisce**
l'esito prodotto da chi ha annullato.

**La politica di conservazione.** `impostaConservaGpx(valore)` accetta solo un
booleano e scrive `mappa.conservaGpx`, come qualunque altra modifica: marca non
salvato e non scrive da sola. Qui si registra soltanto l'intenzione; **chi
cancella davvero sarà il capitolo dell'export**, che non esiste ancora.

**Version History.** `mappa.gpx` e `mappa.conservaGpx` passano dal normale ciclo
di salvataggio: caricare non crea revisioni, salvare ne crea una sola, e
ripristinare una revisione con un altro riferimento — o senza — ricostruisce la
traccia che le corrisponde. `versioni.js` non è stato toccato.

### 19.12 I prototipi Post e Story, e perché restano diagnostici

6.3J ha costruito le due grafiche. La geometria sta in `design/tour.js`, in
numeri e non in prosa: blocchi a posizione fissa ancorati in basso, area di
sicurezza, zone che Instagram copre davvero nella Story, priorità e numero dei
dati per formato. **TOUR non eredita nulla da EVENTI** — né palette, né
struttura, né componenti — e una prova legge i file per verificarlo.

Il telaio comune ha guadagnato `conIntestazione`, che solo TOUR spegne: il
telaio mette la propria intestazione fuori dall'area di sicurezza, e per TOUR il
marcatore è informazione leggibile che sta dentro l'area utile. Chi il telaio lo
usa già non vede cambiare un pixel.

**La fotografia non poteva restare a `object-fit`.** html2canvas 1.4.1 non lo
legge, e nel solo PNG l'immagine usciva deformata: `template/geometria-foto.js`
rifà la copertura in pixel espliciti — una scala sola per i due assi — e `Foto`
la usa quando riceve le dimensioni del riquadro. Il percorso `object-fit` resta
intatto per EVENTI.

`app/AnteprimaTour.jsx` è il banco: monta **lo stesso componente con le stesse
prop** per l'anteprima ridotta e per la copia catturata, con due ambiti di
segnalazione distinti, e lavora su una fixture dichiaratamente sintetica.

Resta diagnostico per una ragione precisa: `registro-template.js` non contiene
nessuna voce `tour`, quindi `statoRubrica("tour")` risponde `pianificata` e il
pre-flight generale risponde `template-non-implementato`. Registrare i template
senza editor prometterebbe un flusso che si interrompe a metà.

### 19.13 Il pre-flight TOUR

`motori/preflight-tour.js`. Stesso contratto del pre-flight generale — voci con
`livello`, `id` e `messaggio`, errori che bloccano e avvisi che si superano solo
consapevolmente — e due controlli comuni **riusati invece che riscritti**:
`controlloSfori`, da cui arrivano le misure vere dei template, e `controlloFont`.
Riscriverli avrebbe prodotto due giudizi sullo stesso fatto, liberi di divergere.

**Non registra TOUR e non la abilita.** Il pre-flight generale continua a
rispondere `template-non-implementato`; questo modulo non lo aggira e non espone
nessun interruttore per farlo. Il banco usa direttamente il controllo specifico,
sui prototipi montati.

**Due domande diverse, due gruppi di controlli.**

*Sul contenuto* si risponde leggendo la bozza: titolo effettivamente disegnato
non vuoto (§19.13.2); CTA editoriale non vuota, mai ricavata dall'URL, che è un
dato operativo e resta fuori dalla grafica; almeno due dati visibili nel Post e
uno nella Story, senza inventarne e senza aggiungere unità a valori che non ne
hanno; la cover per il Post, che non ripiega sulla fotografia della Story; per la
Story la propria fotografia oppure la cover di ripiego, che è un avviso; i
rettangoli canonici dentro l'area di sicurezza e, nella Story, sopra le due fasce
di Instagram — sticker 1580–1760, risposta 1760–1920. La selezione dei dati e
delle fotografie è quella di `design/tour.js`: nessuna seconda implementazione
delle priorità.

*Sulle evidenze del renderer* si risponde solo guardando che cosa è successo
mentre si disegnava, ed è la parte che non si può dedurre. **Un `idBlob` presente
dimostra che qualcuno ha scelto una fotografia, non che il binario esista o che
l'immagine si carichi; e un registro vuoto può voler dire «nessun problema»
oppure «nessuno ha ancora misurato», che sono situazioni opposte.** Evidenze
assenti, in sospeso, malformate o riferite a un'altra sorgente non producono mai
un via libera. Fra le evidenze c'è anche la **risoluzione disegnata**
(§19.13.3), che dipende da come la fotografia viene ritagliata e non dalla sua
larghezza nominale.

**Il claim.** Vuoto è un'assenza legittima e non produce niente; omesso perché
non entra è un **avviso del template**, che quella misura la fa sui font
caricati e alla larghezza reale. Qui non c'è nessuna soglia di caratteri che
possa contraddirlo. Stessa logica per titolo, dati e CTA che non entrano: sono
errori, e arrivano dalle misure vere attraverso `controlloSfori`.

**Nessun requisito GPX, mappa o altimetria**: i prototipi non li disegnano.

**Nessun errore non è autorizzazione.** `senzaErrori` dice che niente blocca;
`puoiCatturare` richiede in più che gli avvisi siano stati confermati **per
questa** configurazione. La conferma porta l'impronta di ciò che è stato
verificato — formato, testi, dati, fotografia con il suo ritaglio, condizioni
osservate nel renderer, avvisi superati — e qualunque cambiamento la rende
inservibile. Nel banco: gli errori non offrono nessuna scorciatoia, gli avvisi
mostrano «Esporta comunque», e «Riprova» rifà i controlli **tutti**, senza
portarsi dietro la conferma.

#### 19.13.1 Tre difetti del banco, corretti prima di collegarlo

**Sorgente e ritaglio di due fotografie diverse.** Con lo slot Story assegnato e
la sua sorgente non risolta, `fotoDellaStory` arrivava al ripiego, che — vedendo
lo slot pieno — restituiva il ritaglio *della Story* applicato all'URL *della
cover*: zoom e punto focale scelti su una fotografia, addosso a un'altra, con
`ripiego: true` a raccontare un ripiego mai avvenuto. Ora il ripiego esiste solo
dove è una scelta — slot Story vuoto — e uno slot assegnato che non si risolve
si dichiara `irrecuperabile`, che il pre-flight rende errore bloccante. La
selezione espone `stato` (`propria`, `ripiego`, `irrecuperabile`, `assente`) e
`quale`, e **sorgente e ritaglio appartengono sempre allo stesso file**.

**La configurazione cambiava mentre la si fotografava.** I bottoni erano
disabilitati durante la cattura, la casella del ripiego no. html2canvas legge il
DOM mentre il PNG si forma: spuntarla a metà strada sostituiva la fotografia
sotto la macchina fotografica, e il file usciva con una grafica che non è né
quella di prima né quella di dopo. Il blocco sta in un ref — vale subito, non al
render successivo — e si libera nel `finally` di chi l'ha preso, anche in errore.

**Due registri, una chiave sola.** Il pannello concatenava i problemi dei due
formati e usava la chiave del registro come `key` di React, ma i due registri
sono separati e le chiavi nascono uguali: la fotografia del Post è `foto` e
quella della Story è `foto`. Due voci diverse con la stessa identità. Il registro
condiviso resta com'è; l'identità del formato si aggiunge dove la lista si
costruisce.

#### 19.13.2 Il titolo giudicato è quello disegnato

`PostTour` e `StoryTour` scelgono il titolo con `titoloBreve || nome || ""`, e in
JavaScript **una stringa di spazi è truthy**: con `editoriale.titoloBreve` a
`" "` il ripiego su `fattuali.nome` non scatta, e la grafica esce con il blocco
più grande vuoto.

Il pre-flight applicava `trim` *prima* del ripiego, quindi selezionava il nome e
approvava «Nome Di Prova» mentre il PNG non conteneva nessun titolo: giudicava un
titolo diverso da quello pubblicato. Adesso **seleziona esattamente come il
renderer**, carattere per carattere, e solo dopo verifica che il risultato non
sia vuoto una volta ripulito. In quel caso blocca, e non ripiega per conto
proprio: dire «va bene, uso il nome» significherebbe promettere una grafica
diversa da quella che uscirà. Il messaggio distingue i due casi, perché sono
problemi diversi da risolvere: campo assente, oppure campo pieno di spazi da
svuotare.

#### 19.13.3 La risoluzione che conta è quella disegnata

La larghezza del file non dice niente da sola. Una fotografia **1800×10** ha 1800
px di larghezza e passa qualunque soglia; ma su una Story 1080×1920 deve coprire
1920 px di altezza partendo da 10, quindi viene ingrandita **192 volte** e
disegnata a 345600×1920: nella larghezza visibile ci finiscono **sei pixel** del
file. Giudicare sull'asse lungo significa non guardare quello che rovina
l'immagine.

La scala la calcola `geometriaCover` — la stessa funzione pura che disegna, non
una seconda copia del sistema di ritaglio — e comprende lo **zoom del ritaglio**,
perché ingrandire peggiora la risoluzione. `larghezza della tela / scala` è la
**larghezza equivalente**: quanti pixel originali si spalmano sui 1080 che si
vedranno. Le soglie restano quelle della libreria — sotto il 75% errore, sotto il
100% avviso — applicate a quel numero: cambia il valore confrontato, non il
metro. Quando la Story ripiega si misura il ritaglio **della cover**, che è la
fotografia effettivamente disegnata. Una geometria non calcolabile è un errore:
una risoluzione che non si è potuta calcolare non è una risoluzione adeguata.

**Conseguenza dichiarata sulla fotografia diagnostica.**
`public/media/reali/4x4-guado-1800.webp` è 1800×832, cioè 2,16:1. Sul Post viene
ingrandita 1,79× e sulla Story 3,12×: nella larghezza della tela restano 605 e
347 px su 1080, sotto la soglia d'errore in entrambi i casi. Con il controllo
corretto **il banco non la fotografa**. È un fatto sul file, non una soglia da
abbassare; scegliere una fotografia adeguata è una decisione editoriale che
questo capitolo non prende.

### 19.14 Il primo nucleo dell'editor TOUR

`app/EditorTour.jsx`, montato da `app/BancoTour.jsx`. Fa cinque cose: sceglie un
tour vero dalla fonte del sito, ne crea la bozza con `creaDaTour`, elenca e apre
le sole bozze TOUR, scrive i campi editoriali già previsti dall'adapter, salva.
Nient'altro.

**Non duplica niente dell'hook.** Persistenza, importazione, interblocchi e
transizioni restano in `useBozzaTour`: il componente traduce i suoi **codici** in
frasi — che è la parte che l'hook lascia deliberatamente all'interfaccia — e
aggiunge solo lo stato delle *operazioni*, cioè quale gesto è in volo. Non tiene
nessuna copia dei testi: gli input leggono da `contenuto.editoriale` e scrivono
con `scriviEditoriale`, quindi non esiste una seconda verità che possa divergere
da quella che finisce nell'archivio — ed è ciò che tiene veritiero «non
salvato».

**I fatti sono in sola lettura, e staccati.** Non è una scelta estetica:
scrivere a mano un campo fattuale ne cambia l'`origine` in `manuale` e il
confronto con la fonte smette di riguardarlo, e non deve poter capitare per aver
cliccato nel riquadro sbagliato. Ogni fatto mostra la propria provenienza — dal
sito, a mano, dal GPX, oppure non importato — e i campi che l'adapter lascia
vuoti per principio (§17.2, §17.3) si vedono vuoti: `mezzo` non si copia da
`type`, `area` non si deduce dai luoghi.

**Tre codici non sono successi**, e l'interfaccia non li racconta come tali:
`superata-da-modifiche`, `superata-da-altro-contenuto` e `rilettura-fallita`
dicono che la scrittura è andata ma ciò che si ha davanti non è ciò che sta sul
disco. Un `errore-scrittura` lascia il lavoro dov'è, `sporco` acceso e il
pulsante attivo: mai una bozza dichiarata salvata quando la scrittura è fallita.

**Uscire è una transizione.** Creare e aprire sono già protette dentro l'hook;
la chiusura nasce nel componente e passa da `useRichiediTransizione`. Il pulsante
di chiusura sta **dentro** l'editor e non nel guscio: se lo smontaggio lo
comandasse chi sta fuori, il lavoro non salvato se ne andrebbe senza che nessuno
lo chieda. Restano l'avviso `beforeunload` per il ricarico e la chiusura della
scheda, come in EVENTI, e la sentinella (§18.7) per la navigazione — che in
6.3L.1 era il percorso ancora scoperto.

#### 19.14.1 Perché il banco ha fornitori propri

`BancoTour` monta un `FornitoreArchivio` con un **archivio in memoria** e un
`FornitoreTransizione` suo. Sono due decisioni, e nessuna delle due è comodità.

L'archivio dello Studio è quello vero, su IndexedDB: una bozza di prova finirebbe
in mezzo al lavoro, e cancellarla sarebbe un gesto che nessuno dovrebbe dover
fare. Qui l'archivio è in memoria e **dura quanto la scheda**.

La durata è cambiata in 6.3L.2, e per una ragione precisa. Quando si lascia la
pagina con lavoro non salvato la sentinella (§18.7) offre «Salva e continua»; se
l'archivio morisse insieme al componente, quel salvataggio scriverebbe in un
registro che sta per essere distrutto — cioè prometterebbe di aver messo al
sicuro qualcosa che un istante dopo non esiste più. Tenendolo a livello di
modulo, chiudere e riaprire il banco, o uscire e tornare su `/admin/social`,
ritrova le bozze di prova dov'erano. **Ricaricare la pagina o chiudere la scheda
le cancella**, ed è scritto nell'interfaccia invece che lasciato intendere.

Il fornitore delle transizioni tiene **una guardia sola** (§18.6). `EditorEvento`
ne registra una e `useBozzaTour` un'altra: sotto lo stesso fornitore la seconda
registrazione cancellerebbe la prima, e il lavoro non salvato di EVENTI
smetterebbe di essere protetto per il solo fatto di aver aperto questo banco. Una
prova monta una guardia esterna sporca, il banco con l'editor pulito e una
transizione di fuori, e pretende che il dialogo compaia: è ciò che tiene ferma la
decisione finché quel limite non sarà risolto.

#### 19.14.2 Che cosa restava fuori dal primo nucleo

Media e GPX — che l'hook sapeva già gestire — cronologia e ripristino,
eliminazione, confronto e riallineamento alla fonte e anteprima collegata alla
bozza. Ognuno porta difese proprie, e andavano aggiunte con le loro prove: è
quello che fa 6.3M (§19.15). Resta fuori l'**export**, che è un capitolo suo.
L'editor non è nel registro, i template non sono registrati, e dallo Studio non
ci si arriva.

### 19.15 L'editor TOUR completo, e quel che ancora non fa

6.3M collega le sei aree che l'hook esponeva e l'interfaccia non usava:
fotografie e ritagli, GPX locale, anteprima reale di Post e Story, confronto e
riallineamento con la fonte, cronologia con ripristino, eliminazione. Restano
fuori l'export e la registrazione della rubrica: nessun pulsante produce un PNG
o un pacchetto, `EDITOR` contiene ancora la sola `eventi`, e `statoRubrica`
risponde `pianificata`.

Il principio che tiene insieme tutte e sei è lo stesso, ed è quello di §19.14:
**l'hook è l'autorità**. L'interfaccia traduce codici e mostra stati. Non tiene
un secondo contenuto, non rianalizza GPX, non riscrive revisioni, non confronta
la fonte per conto proprio, non tocca l'archivio, non replica la scelta degli
slot e non inventa ripieghi diversi da quelli del motore. Soprattutto: **non
dichiara riuscita un'operazione perché la promessa è terminata** — si guarda il
codice, e `superata-da-*`, `rilettura-fallita`, `base-non-recuperata` ed
`eliminata-elenco-non-aggiornato` dicono cose diverse fra loro.

#### 19.15.1 Gli slot fotografici, per rubrica

`media/SelettoreSlot.jsx` prende la rubrica come parametro, con `eventi` per
difetto: nessuna chiamata esistente cambia comportamento, e i nove slot di
EVENTI restano quelli. TOUR ne dichiara due — `cover` per il Post, `story` per
la Story — e sono **due ritagli distinti** (§19.10): il Post è 4:5, la Story
9:16, e la stessa fotografia vuole due inquadrature.

Il rischio da evitare era quello che `media/slot.js` esiste per eliminare: un
**ripiego per esclusione**. Un selettore che, non trovando gli slot della
rubrica, disegnasse quelli di EVENTI mostrerebbe «Vivrai 1…4» dentro una bozza
TOUR, e ogni clic scriverebbe in un ramo che quella bozza non ha — la fotografia
sparirebbe senza un errore. Una rubrica che il registro non dichiara non ha slot
e **non ne eredita**: qui si traduce in nessun pulsante.

Il ritaglio si inquadra sulle **tele vere** dei due formati, lette da
`design/tour.js`: gli stessi numeri con cui i template disegnano. Riscriverli
nell'editor sarebbe la premessa della divergenza — si inquadrerebbe su un
rettangolo e si esporterebbe su un altro.

Ogni gesto passa da `scriviMedia`, che convalida il riferimento e marca la bozza
non salvata senza scrivere niente: un ritaglio rifiutato non cambia contenuto,
«non salvato» né archivio, e il codice (`ritaglio-media-non-valido`,
`slot-media-non-valido`) si legge invece di vedere la fotografia sparire. Il
**ripiego Story → cover** resta di solo rendering: lo slot continua a risultare
vuoto, perché lo è, e l'anteprima dichiara di star ripiegando.

Nel contenuto va l'`idBlob`, che è una chiave opaca. Le immagini si disegnano
dalle **URL temporanee dell'archivio**, che è l'unico a saperle creare e a
liberarle: mai un data URL, mai un percorso, mai byte dentro la bozza.

#### 19.15.2 Il GPX, tre cose distinte

Il pannello non analizza niente: l'analisi, la scrittura del binario e le difese
contro le risposte tardive stanno in `useBozzaTour` (§19.11). Quello che
l'interfaccia fa è **tenere separate tre cose** che confonderle significa
raccontarne una per un'altra:

1. il **riferimento persistibile** `{ nome, byte }`, l'unica parte che entra nel
   record, nelle revisioni e nei backup;
2. la **geometria in memoria** — segmenti, punti, distanza, dislivelli, quote —
   che non è mai stata nel contenuto e non ci va: una traccia di poche migliaia
   di punti pesa più di tutta la bozza, e verrebbe duplicata a ogni revisione;
3. lo **stato della ricostruzione**, che è un fatto sul file e non sulla bozza:
   il riferimento può esserci e il binario no.

`gpx-blob-assente` **lascia il riferimento dov'è** — è l'unica traccia di che
cosa ricaricare — e offre «Riprova la lettura», che rilegge senza costringere a
riaprire la bozza. I waypoint non diventano fatti, tappe o località: in EVENTI
la prima versione del caricamento ne copiava dieci in `mappa.localita`, e nomi
presi da un file diventavano dati della scheda senza che nessuno li avesse
scritti. «Conserva GPX» scrive un'intenzione su cui deciderà il capitolo
dell'export: togliere la spunta non cancella niente adesso.

Una sola scelta di interfaccia merita di essere detta: **«Togli il GPX» non si
disabilita mentre una lettura è in volo**. Il contratto di 6.3I.1 dice che chi
toglie vince — il caricamento partito prima viene invalidato e il suo risultato
diventa innocuo — e disabilitare il pulsante lascerebbe invece arrivare quel
risultato su una bozza da cui si stava cercando di togliere il file. Quel che si
blocca è **partire di nuovo**, non ritirarsi.

Il file resta locale e privato: non entra nel repository, in `public/`, nel
bundle né in nessun output. I prototipi Post e Story non disegnano mappa né
profilo altimetrico, e questo capitolo collega i dati senza inventare grafica.

#### 19.15.3 L'anteprima è la bozza, non una fixture

`app/AnteprimaBozzaTour.jsx` monta `PostTour` e `StoryTour` — quelli approvati,
con le stesse prop — sul contenuto **davvero aperto** e sulle sorgenti risolte
dall'archivio. È la differenza che conta rispetto al banco visivo di 6.3J: lì si
guarda un contenuto sintetico per giudicare la grafica, qui si guarda il proprio
lavoro. Un'anteprima che disegnasse la fixture mentre si scrive il titolo
sarebbe peggio di nessuna anteprima: mostrerebbe con precisione qualcosa che non
è il proprio contenuto, e nessuno se ne accorgerebbe finché il PNG non uscisse
diverso da quel che si era visto.

Il banco sintetico **resta**, con i suoi due pulsanti diagnostici: serve a
guardare la composizione a misura reale, ed è un altro mestiere. Quel che non
diventa due è il **modo di osservare il renderer**, estratto in
`app/anteprima-tour-nucleo.jsx` e usato da entrambi: l'esito del caricamento di
una sorgente, il filtro per ambito del registro, i riferimenti stabili per
formato e la forma del pannello. Due implementazioni dello stesso giudizio
finirebbero per dire cose diverse sulla stessa grafica.

Quale fotografia disegni ciascun formato — e se la Story stia ripiegando — lo
decide `design/tour.js` e lo si **chiede** al pre-flight (`selezione`) invece di
ricalcolarlo. L'evidenza del caricamento si cerca **per sorgente**: cambiando
immagine, la misura precedente resta un fatto vero su un altro file, e il
pre-flight rifiuta comunque un'evidenza che parli di un'altra sorgente
(`evidenze-obsolete`). Finché il file non è stato osservato lo stato è «in
corso» — mai «pronta» per omissione.

Le **misure tipografiche in sospeso non entrano nel rapporto**, ed è la stessa
scelta che il banco sintetico fa già per il proprio pannello: sono una
condizione istantanea della cattura, non un problema del contenuto da elencare.
Il cancello che le legge in modo sincrono resta dove serve, cioè davanti a uno
scatto — e qui non si scatta.

#### 19.15.4 La fonte: una domanda e una decisione

Sono due gesti, e restano distinti apposta. **Confrontare è una domanda**: non
tocca contenuto, «non salvato», esito, archivio né revisioni. Deve essere
gratuito, altrimenti non lo si fa — ed è il motivo per cui l'esito del confronto
vive nell'interfaccia e non nell'hook: metterlo lì lo farebbe passare per
qualcosa che è successo alla bozza.

**Riallineare è una decisione**, e la prende chi scrive. Aggiorna solo il ramo
`fonte` (§19.6), marca non salvato e non salva: testi, fatti, provenienze,
fotografie, mappa e revisioni restano dove sono. Prendere atto che il sito è
cambiato non è reimportare.

I cinque stati non si appiattiscono su «non allineata»: «fonte assente» è un
tour che non c'è più nel catalogo, «non corrispondente» è una bozza che viene da
un altro percorso, «non confrontabile» è l'identità che torna con l'istantanea
che manca — ed è l'unico caso in cui il riallineamento **ripara** invece di
aggiornare. Il tour lo si cerca per slug, quindi dall'interfaccia o è il proprio
o non c'è: `fonte-non-corrispondente` non è raggiungibile da un clic, e il
confine lo rifiuta lo stesso.

I fatti restano in sola lettura: questo capitolo non li rende modificabili.

#### 19.15.5 Cronologia e ripristino

L'elenco arriva da `revisioni()` già dalla più recente: non si riordina e non si
ricalcola. Ogni voce dice se è **ripristinabile**, e non è decorazione — il
punto di creazione esiste nella storia ma non porta uno stato, quindi non c'è
dove tornare, e offrire il pulsante lo farebbe scoprire dopo il clic.

Il ripristino passa dalle transizioni (§19.9): sostituisce il lavoro in corso
come aprire un'altra bozza, e la stessa protezione vale. Un gesto produce
**una** revisione — la voce «stato prima del ripristino» la registra il motore,
e il salvataggio che segue sa di non doverne aggiungere un'altra — e gli esiti
specifici non diventano un generico successo. Il GPX in memoria si riallinea al
riferimento ripristinato: la revisione può portarne un altro, o nessuno, e la
geometria di prima apparterrebbe a uno stato che non c'è più.

#### 19.15.6 L'eliminazione, e perché non passa dal dialogo

Conferma in due tempi, **dentro la pagina**: il primo gesto apre un pannello che
nomina la bozza e dice la conseguenza, il secondo cancella. Niente
`window.confirm` — non si legge, non si prova e non nomina nulla — e nessun
timer: non c'è gesto che diventi distruttivo per il solo passare del tempo.

L'eliminazione **non passa dal dialogo delle transizioni**, e non è una
dimenticanza: quel dialogo offre «Salva e continua», che qui significherebbe
scrivere proprio il record che si sta cancellando. Con lavoro non salvato *su
quella* bozza il gesto si rifiuta con `modifiche-non-salvate`; una bozza diversa
resta eliminabile anche mentre la corrente è sporca.
`eliminata-elenco-non-aggiornato` significa **eliminata**: dire il contrario
manderebbe a ripetere un gesto su un record che non c'è più. Le fotografie e il
GPX restano nell'archivio: eliminare una bozza non li tocca.

#### 19.15.7 Le operazioni hanno un'identità

Un solo `inCorso` globale era una verità fragile: due operazioni concorrenti se
lo sovrascrivevano, e la seconda a finire spegneva lo stato della prima — o
peggio, una risposta tardiva mostrava il proprio esito al posto di quello
corrente. Ogni operazione riceve adesso un numero, entra e esce dall'elenco
**per numero**, e può scrivere un messaggio solo se è ancora la più recente. Il
blocco si libera in un `finally`, sempre: un'interfaccia che resta bloccata su
un fallimento è un fallimento in più.

I gesti si disabilitano **per incompatibilità**, non in blocco: confrontare con
la fonte non tocca niente e resta possibile anche mentre si salva; togliere il
GPX resta possibile mentre una lettura è in volo, per la ragione di §19.15.2.

#### 19.15.8 Uno stato locale vale finché vale il suo contesto

6.3M.1 corregge tre difetti della stessa famiglia, e la famiglia conviene
nominarla: **uno stato dell'interfaccia che sopravvive al contesto che lo
rendeva vero**. Non è un ritardo di un fotogramma — è un messaggio che resta lì
e che chi legge attribuisce a quello che ha davanti.

`FonteTour` teneva la risposta del confronto in un `useState`. Cambiando bozza
il pannello mostrava già lo slug della nuova e accanto il verdetto calcolato
sulla precedente; cambiando i dati del sito sotto un componente che non veniva
smontato, la risposta continuava a descrivere un'istantanea che nessuno stava
più guardando.

`MediaTour` teneva l'esito dell'ultimo gesto sulle fotografie. Aprendo un'altra
bozza restava a schermo «Fotografia aggiornata. Non è ancora sul disco: salva.»
sotto un contenuto su cui non era stato fatto niente, con un invito a salvare
che non aveva oggetto; e dopo un salvataggio conviveva con «Salvata.», dicendo
il contrario nella stessa schermata.

La correzione è la stessa in tutti e due i casi, e ha due metà.

**La prima: non tenere una copia di ciò che l'hook pubblica.** `media-assegnato`
e `ritaglio-media-non-valido` viaggiano già su `esito`, che l'hook azzera alla
modifica successiva e sostituisce aprendo, creando, salvando o ripristinando.
Quella durata è già quella giusta, e una seconda copia poteva solo essere più
lunga. Vale anche per il riallineamento **riuscito**, che è un fatto della
bozza: al pannello restano i soli **rifiuti**, che per definizione non cambiano
niente.

**La seconda: legare esplicitamente ciò che resta locale agli ingressi che
l'hanno prodotto.** Il confronto è una funzione di tre cose — quale bozza, quale
istantanea, quale tour del sito — e la sua risposta è vera di quella terna e di
nessun'altra. Il legame è per **identità degli ingressi**, non dell'oggetto
contenuto: scrivere un claim non tocca `fonte`, quindi non invalida una risposta
ancora vera, ed è un requisito quanto l'altro. Il confronto si fa **durante il
render**: un effetto che azzera arriverebbe dopo, e per un fotogramma il
verdetto di prima starebbe sotto il contenuto nuovo.

E quando il contesto cambia **non si riesegue niente**: si torna a «non ancora
confrontato». Rifare da soli una domanda che nessuno ha ripetuto è il modo di
far comparire risposte che nessuno ha chiesto.

Rileggendo gli altri stati locali di 6.3M, l'audit ha trovato un terzo caso e ha
assolto il resto. Il caso: l'esito dell'eliminazione restava sotto l'elenco
mentre si creava o si apriva altro — è il resoconto di un gesto, e cede il posto
al gesto successivo. Assolti: slot attivo e selezione nella libreria, che sono
**preferenze di chi lavora** e non attribuiscono nessun fatto a nessuna bozza;
`GpxTour` e `CronologiaTour`, che non tengono stato proprio; il pannello di
conferma, che vive dentro la riga della bozza a cui si riferisce.

#### 19.15.9 Il ritaglio si ferma davvero

La catena del blocco durante una scrittura si fermava a metà: `EditorTour`
passava `disabilitato` a `MediaTour`, che disabilitava assegnazione, rimozione e
specchiatura — e lasciava `Ritaglio` com'era. Trascinare il punto focale,
muovere lo slider o premere «Ripristina inquadratura» continuavano a chiamare
`scriviMedia` mentre la scrittura era in volo: sul disco finiva un'inquadratura
diversa da quella che si era chiesto di salvare, e il tentativo tornava
`superata-da-modifiche` per un gesto che l'interfaccia dichiarava impossibile.

`Ritaglio` prende adesso `bloccato`, e il blocco sta in **tre punti**. Gli
attributi `disabled` su slider e reset sono la parte visibile. Il controllo
dentro `aggiorna` — l'unico punto da cui si scrive — è quello che conta: una
trascinata già cominciata tiene il proprio gestore e non passa da nessun
attributo. E lo stato del trascinamento si azzera quando il blocco si accende,
così il dito rimasto giù non riprende da dove aveva lasciato appena il blocco si
spegne. `MediaTour` rifiuta comunque al proprio confine, perché una callback già
consegnata può ancora essere invocata.

`bloccato` è `false` per difetto: EVENTI e ogni altro chiamante non cambiano di
un pixel, e una prova isolata lo verifica gesto per gesto — compreso il reset,
che adesso passa da `aggiorna` e deve produrre lo stesso identico valore di
prima, campi estranei compresi.

#### 19.15.10 I limiti, dichiarati

- **Nessun export.** Niente PNG, niente pacchetto, nessun pulsante che li
  produca. Il cancello sincrono sulle misure in sospeso arriverà con lo scatto.
- **La rubrica resta pianificata.** `EDITOR = { eventi: EditorEvento }`, nessun
  template TOUR registrato, `statoRubrica("tour") === "pianificata"`.
- **`/admin/social` non ha nessun collegamento interno all'applicazione.** Se ne
  esce con Indietro, con la barra degli indirizzi o chiudendo la scheda: tutti
  cambi di **documento**, cioè territorio di `beforeunload`, non di
  `useBlocker`. La sentinella (§18.7) resta la difesa per la navigazione SPA,
  verificata dalla sua suite su un data router vero; in browser, oggi, da quella
  pagina non esiste il gesto che la fa scattare. Lo farà appena lo Studio avrà
  un collegamento interno.
- **La fotografia diagnostica del repository non basta.** `4x4-guado-1800.webp`
  è 1800×832: con il controllo di risoluzione corretto (§19.13) non regge né il
  Post né la Story, ed è quello che il pannello dice. È una constatazione, non
  una soglia da abbassare.
