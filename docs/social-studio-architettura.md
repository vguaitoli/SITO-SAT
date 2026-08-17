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
   ↓  riquadro() + creaVista() Web Mercator, fit automatico con margine
   ↓  semplificaPerDisegno()   tolleranza = mezzo pixel alla scala corrente
path SVG                       i punti originali restano intatti nell'archivio
```

Il GPX non viene mai riscritto. La semplificazione è derivata e ricalcolata a
ogni cambio di zoom; se si esporta a scala maggiore, la traccia guadagna
dettaglio invece di perderlo.

Le località sono **solo etichette**: non partecipano alla geometria. Si possono
aggiungere a mano o proporre dai waypoint del file, sempre modificabili.

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

- **Template grafico EVENTI**: non si finalizza finché non arriva
  `Locandina-Via-dei-Giganti.dc.html`. Il PNG resta riferimento provvisorio per
  gerarchia e proporzioni.
- **Endpoint AI in produzione**: non si abilita prima di autenticazione e rate
  limiting.
