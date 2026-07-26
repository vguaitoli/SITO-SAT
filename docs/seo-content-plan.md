# Piano contenuti SEO — Sardegna Trail Avventura

Documento di lavoro per l'arricchimento dei **contenuti testuali** del sito
in funzione delle intenzioni di ricerca del pubblico target. Riguarda solo
il *contenuto* (testi in `src/data/categorie.js` e `src/data/blogPosts.js`).

SEO tecnica, metadati per pagina, indicizzazione, sitemap, robots e
prestazioni sono **fuori da questo documento**: se ne occupa un lavoro
parallelo (Codex) su file diversi (componenti React, `index.html`,
configurazione, script).

## Principio guida

Nessun dato viene inventato: durate, chilometraggi, percentuali di sterrato,
date, prezzi, recensioni o luoghi non confermati restano quelli già presenti
nel codice (`src/components/TourDetails.jsx` per i tour, `blogPosts.js` per
gli articoli). Le modifiche di questo lavoro sono solo **rifrasature e
inserimenti naturali di parole chiave già pertinenti al contenuto esistente**
— mai nuove affermazioni fattuali.

## Mappa intenzione di ricerca → contenuto

| Intenzione di ricerca | Dove viene coperta | Tipo di intento |
|---|---|---|
| tour off-road Sardegna | Home (Hero, Categorie) — fuori scope di questo documento | Generico, esplorativo |
| Maxienduro Sardegna | `categorie.js` → categoria `maxienduro` (intro); `blogPosts.js` → "Supramonte Extreme" | Specifico per mezzo, alta intenzione |
| Enduro Sardegna | `categorie.js` → categoria `enduro` (intro) | Specifico per mezzo, alta intenzione |
| tour 4x4 | `categorie.js` → categoria `4x4` (intro) | Specifico per mezzo |
| Quad (Sardegna) | `categorie.js` → categoria `quad` (intro); `blogPosts.js` → "Costa & Dune Expedition" | Specifico per mezzo |
| SSV | `categorie.js` → categoria `ssv` (intro) | Specifico per mezzo, di nicchia |
| e-bike (Sardegna) | `categorie.js` → categoria `e-bike` (intro) | Specifico per mezzo, comfort/famiglia |

Le categorie `4x4-experience` e `tour-stradali` non erano tra le intenzioni
di ricerca indicate: i loro testi restano invariati in questo intervento.

## Modifiche effettuate

### `src/data/categorie.js`

Per ciascuna delle categorie target, il campo `intro` è stato rifrasato per
includere in modo naturale il nome del mezzo abbinato a "tour" e "Sardegna"
(o "isola"), senza alterare tono, lunghezza o contenuto informativo:

- **Maxienduro**: aggiunto "Un tour in maxienduro in Sardegna..." in apertura.
- **Enduro**: aggiunto "Un tour enduro in Sardegna..." in apertura.
- **Quad**: aggiunto "Un tour in quad in Sardegna...".
- **SSV**: aggiunto "Un'esperienza in SSV in Sardegna..."; la formula evita
  di presentare come già a catalogo un tour che oggi rimanda alla richiesta
  di informazioni.
- **4x4**: aggiunto "un tour in 4x4...".
- **E-Bike**: aggiunto "Un tour in e-bike in Sardegna...".

Nessun campo fattuale è stato toccato: `id`, `tourType`, `fotoCard`,
`fotoHero`, `carosello`, `claim` e `adatto` restano invariati (il `claim` è
una tagline breve, non il punto giusto per densità di parole chiave; il
rischio di keyword stuffing è più alto lì che nell'`intro`).

### `src/data/blogPosts.js`

Solo il campo `excerpt` dei due articoli esistenti è stato leggermente
rifrasato per includere una parola chiave già presente nel titolo o nel
corpo dell'articolo (mai un dato nuovo):

- **Supramonte Extreme**: l'excerpt ora specifica "tour in maxienduro"
  (il titolo e il corpo già nominano "Maxienduro").
- **Costa & Dune Expedition**: l'excerpt ora specifica "in Sardegna"
  (il corpo dell'articolo già apre con "Ci sono zone della Sardegna...").

Titolo e corpo degli articoli non sono stati modificati: erano già ben
allineati alle rispettive intenzioni di ricerca.

## Cosa resta scoperto (richiede dati reali, non contenuto in questo lavoro)

Le intenzioni di ricerca "Enduro Sardegna", "tour 4x4" e "SSV" non hanno
oggi un articolo di blog dedicato. Scrivere un
nuovo articolo-tour per queste categorie, nello stesso formato di
"Supramonte Extreme"/"Costa & Dune Expedition", richiederebbe dati reali
(durata, chilometraggio, percentuale sterrato, tappe, periodo) che oggi non
sono disponibili per SSV, mentre per 4x4 andrebbero prima verificati e
approvati i dati già presenti in `TourDetails.jsx`. Un nuovo articolo di blog
andrebbe scritto solo quando l'itinerario reale è stato confermato, per non
introdurre contenuti non veritieri.

## File toccati da questo lavoro

- `docs/seo-content-plan.md` (nuovo)
- `src/data/categorie.js`
- `src/data/blogPosts.js`

Nessun componente React, `index.html`, `App.jsx`, configurazione, script o
`package.json` è stato modificato. Nessun commit o push è stato eseguito.
