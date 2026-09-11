# Sardegna Trail Avventura

Sito pubblico di Sardegna Trail Avventura, realizzato con React e Vite e distribuito su Vercel.

## Sviluppo locale

Requisiti:

- Node.js 22
- pnpm 11

Installazione e avvio:

```bash
cp .env.example .env
pnpm install
pnpm run dev
```

Il sito è disponibile su `http://localhost:5173/`; l'editor TinaCMS su
`http://localhost:5173/admin`.

## Contenuti con TinaCMS

TinaCMS gestisce i contenuti senza spostare layout e grafica fuori dal codice:

- homepage, FAQ, servizi, guide e galleria: `content/homepage/index.json`;
- tour, descrizioni, prezzi e programmi: `content/tours/index.json`;
- eventi, partenze, date, prezzi e servizi specifici: `content/events/index.json`;
- testi della pagina Noleggio: `content/rental/index.json`;
- contatti e impostazioni comuni: `content/settings/index.json`.

Lo schema dell'editor è in `tina/config.ts`. In locale, il pulsante **Save**
scrive direttamente nei file JSON. In produzione, dopo il collegamento a
Tina Cloud, il salvataggio crea una modifica nel repository GitHub.

La procedura completa è in [`docs/tinacms-operativa.md`](docs/tinacms-operativa.md).

## Controlli

Prima di pubblicare:

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
```

La build di produzione viene generata in `dist/`. Lo script `scripts/build-seo.mjs` crea le
pagine HTML con metadati dedicati e aggiorna la sitemap.

## Variabili d'ambiente

Il modulo contatti usa Web3Forms:

```bash
VITE_WEB3FORMS_ACCESS_KEY=your_access_key
```

Tina Cloud richiede inoltre:

```bash
NEXT_PUBLIC_TINA_CLIENT_ID=your_client_id
TINA_TOKEN=your_read_only_token
NEXT_PUBLIC_TINA_BRANCH=main
```

Impostare le variabili nei tre ambienti Vercel necessari: Production, Preview e
Development. Non inserire chiavi o altri segreti nel repository.

La dashboard privata `/admin/feedback` riusa l'autenticazione HTTP Basic del
Social Studio e legge le risposte Tally esclusivamente tramite una funzione
server-side:

```bash
SOCIAL_STUDIO_UTENTE=your_admin_user
SOCIAL_STUDIO_PASSWORD=your_long_password
TALLY_API_KEY=your_tally_api_key
```

Queste tre variabili devono essere configurate almeno per l'ambiente Preview
prima di verificare la dashboard. `TALLY_API_KEY` non deve avere prefisso
`VITE_`: in questo modo non entra mai nel bundle del browser.

## Pubblicazione

Il repository è collegato al progetto Vercel `sito-sat-1dzv`, che serve:

- `https://www.sardegnatrailavventura.it`
- `https://sardegnatrailavventura.it`

Un push su `main` avvia automaticamente il deploy di produzione. Per collegare esplicitamente
una nuova copia locale:

```bash
vercel link --yes --project sito-sat-1dzv --scope vguaito4-8707s-projects
```

Deploy manuale, solo quando necessario:

```bash
vercel deploy --prod
```
