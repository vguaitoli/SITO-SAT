# Format nuovo tour / evento

Modulo da compilare quando si aggiunge una partenza al calendario eventi.
Serve a due cose insieme: creare la scheda sul sito (`content/events/index.json`)
e generare la locandina, così tutte le locandine restano identiche fra loro.

Copia il blocco qui sotto, compilalo e passamelo. I campi vuoti non bloccano:
sotto è spiegato cosa succede se manca qualcosa.

## Blocco da compilare

```
NOME:                Honda XR Tour
SOTTOTITOLO:         Tour dedicato alle Honda XR
TIPO:                Enduro
DATE:                19–22 novembre 2026
PARTENZA DA:         Olbia
DURATA:              4 giorni
KM:
STERRATO:            100%
LIVELLO:             Medio-Avanzato
PUNTI DI INTERESSE:  Sardegna più selvaggia e autentica
PERNOTTAMENTO:       Pernottamenti in agriturismo
PREZZO:
DESCRIZIONE:
  Quattro giorni di pura avventura dedicati alla mitica Honda XR...

COSA COMPRENDE:
  - Guida esperta per tutta la durata del viaggio
  - Trasporto bagagli
  - Pranzo tipico dal pastore

ESCLUSIONI:
  - Pranzi
  - Carburante

EQUIPAGGIAMENTO:
  - Honda XR in perfette condizioni meccaniche

TAPPE:
  1. Olbia > Tempio Pausania — si parte dalla Gallura tra graniti e panorami
  2. ...

NOTA PROGRAMMA:
FONTE:               link al post Facebook/Instagram
FOTO LOCANDINA:      percorso del file, oppure allegala in chat
```

## Cosa significa ogni campo

**Obbligatori** (senza questi la scheda non si può pubblicare):

| Campo | Note |
|---|---|
| `NOME` | Solo il titolo, senza il sottotitolo. |
| `TIPO` | Uno di: Maxienduro, Enduro, Quad, 4x4, E-Bike, Su Misura. Decide il colore della scheda. Non esiste "SSV": usa Quad. |
| `DATE` | Come vuoi che appaiano, es. `19–22 novembre 2026`. Da qui ricavo data di inizio e fine. |
| `PARTENZA DA` | Città di ritrovo. |
| `DURATA` | Es. `4 giorni`. |
| `KM` | Vedi sotto se non lo sai. |
| `STERRATO` | Percentuale, es. `100%`. |
| `LIVELLO` | Es. `Facile-Medio`, `Medio`, `Medio-Avanzato`. |
| `PUNTI DI INTERESSE` | Una riga sintetica: zone o paesaggi attraversati. |
| `DESCRIZIONE` | Il testo di presentazione, quello che si legge sulla pagina. |

**Facoltativi:**

| Campo | Se lo lasci vuoto |
|---|---|
| `SOTTOTITOLO` | La scheda mostra solo il titolo. |
| `PERNOTTAMENTO` | La riga non compare. |
| `PREZZO` | Non compare (va bene per i tour "su richiesta"). |
| `COSA COMPRENDE` / `ESCLUSIONI` / `EQUIPAGGIAMENTO` | La sezione non compare. Le righe vuote vengono scartate. |
| `TAPPE` | La pagina mostra la sola `NOTA PROGRAMMA` al posto del programma giorno per giorno. Usalo per i tour senza traccia GPS. |
| `NOTA PROGRAMMA` | Se ci sono le tappe fa da introduzione; se non ci sono le sostituisce. |
| `FONTE` | Solo riferimento interno, non si vede sul sito. |

## Cosa ricavo io, non serve scriverlo

- **slug** (indirizzo della pagina): dal nome + anno, es. `honda-xr-tour-2026`
- **data inizio / fine**: dal campo `DATE`
- **pranzo incluso**: se compare fra le voci di "cosa comprende"
- **nota sui gruppi** in locandina: presa dalle impostazioni del sito
  (oggi "Da 5 a 10 partecipanti"), così resta allineata ovunque

## Se non conosci i km

Regola concordata: **circa 150 km al giorno**. Quattro giorni → 600 km.
Dimmi solo la durata e faccio il conto. Se hai il dato vero, quello vince.

## Per la locandina serve una foto

È l'unica cosa che il sito non ha già: una **foto orizzontale** che fa da sfondo
alla metà alta della locandina (formato quadrato 1080×1080 per Instagram).
Meglio se il soggetto sta al centro e non ha testo sopra.

Tutto il resto della locandina — logo, colori, font, disposizione — arriva dal
template in `docs/locandina-template.html`, che non va modificato: è quello che
garantisce che le locandine siano tutte uguali.

## Cosa ti restituisco

1. La scheda aggiunta a `content/events/index.json` e visibile su `/eventi`
2. La locandina 1080×1080 pronta da pubblicare
3. L'elenco dei campi che ho dovuto stimare, così puoi correggerli
