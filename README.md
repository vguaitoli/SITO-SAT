# Sardegna Trail Avventura

Sito pubblico di Sardegna Trail Avventura, realizzato con React e Vite e distribuito su Vercel.

## Sviluppo locale

Requisiti:

- Node.js 20 o successivo
- pnpm 10

Installazione e avvio:

```bash
pnpm install
pnpm run dev
```

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

Impostare la variabile nei tre ambienti Vercel necessari: Production, Preview e Development.
Non inserire chiavi o altri segreti nel repository.

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
