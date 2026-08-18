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
| `Stories-Via-dei-Giganti.dc.html` | sì | sei schermate 1080×1920. Letto per capire i token condivisi; **non implementato** |
| `doc-page.js` | sì | runtime di impaginazione (scaffold «omelette»). **Nessun valore di design** |
| `support.js` | sì | runtime `<x-dc>`. Non letto: la logica dei `{{ }}` è inline nei due `.dc.html` |
| `logo-512.png` | sì | marchio del progetto. Non scaricato: in `public/` c'è già `logo-sardegna-trail-avventura.png` |
| `uploads/La via dei giganti.png` | sì | traccia come immagine. Non scaricata: la mappa si disegna dal GPX |
| `uploads/la-via-dei-giganti-hero-realistico.png` | sì | fotografia dell'evento. Non scaricata: le foto vengono dalla Media Library |
| `uploads/ChatGPT Image 9 lug 2026…png` | sì | non usata dai due `.dc.html` |

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
  riporta 1080×1350 per il Post, 1080×940 per la Story, 1080×700 per la slide 01
  del carosello, che non è stata toccata.

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

### 15.13 Story: sei schermate, non due

`Stories-Via-dei-Giganti.dc.html` contiene una Story canonica da **sei
schermate** 1080×1920: `01 Cover`, `02 Numeri`, `03 Mappa` (su fondo chiaro
`#E9E2D6`), `04 Tappe`, `05 Incluso`, `06 Prenota`. Questa risorsa prevale
sull'ipotesi manuale a due schermate discussa in conversazione. Il capitolo
Story partirà da qui. Non implementata.

### 15.14 Conflitto fra riferimento e master funzionale

Il Post canonico **non contiene prezzo né CTA**: al loro posto, in fondo, ci
sono contatti e sito. Il master funzionale di Social Studio li richiede. Non
sono stati compressi nella composizione e la gerarchia del riferimento non è
stata alterata: il conflitto è aperto e si risolverà nelle varianti di
conversione (Iscrizioni aperte, Ultimi posti, Sold Out, Lista d'attesa,
Reminder, Partenza imminente). Il pre-flight continua a esigere il prezzo come
dato dell'evento, indipendentemente dal fatto che il Post standard lo mostri.
