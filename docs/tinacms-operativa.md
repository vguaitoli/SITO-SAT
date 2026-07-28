# Guida operativa TinaCMS — Sardegna Trail Avventura

## 1. Cosa è stato verificato

Il repository locale è:

```text
/Users/vittorioguaitoli/Documents/STA
```

Il repository remoto è `vguaitoli/SITO-SAT`, il ramo principale è `main` e il
progetto Vercel già collegato è `sito-sat-1dzv`.

Il sito **non usa Next.js**. La verifica di `package.json` e della struttura del
repository mostra:

- React `18.2`;
- Vite `6.1`;
- React Router `6.26`;
- output di produzione in `dist/`;
- Node.js fissato a `22.x`;
- pnpm fissato a `11.9.0`.

TinaCMS è stato quindi integrato con la modalità adatta a un'applicazione React
e Vite. Layout, colori, animazioni, componenti e impaginazione restano nel
codice React; Tina controlla soltanto i dati editoriali.

## 2. Cosa si può modificare

Nel pannello sono presenti quattro raccolte.

| Voce nel pannello | Contenuto | File |
|---|---|---|
| Homepage | hero, sezioni, guide, chi siamo, galleria, servizi inclusi, FAQ e introduzione ai contatti | `content/homepage/index.json` |
| Tour, date e prezzi | descrizioni, mezzo, durata, chilometri, difficoltà, sterrato, periodo, prossima data, prezzo, programma giornaliero e immagini | `content/tours/index.json` |
| Eventi e partenze | date di inizio e fine, prezzo, soggiorno, servizi inclusi, programma, immagini e fonte dell'evento | `content/events/index.json` |
| Contatti e impostazioni | email, telefono, WhatsApp, social, luogo, testi dei pulsanti, dimensione gruppi e dati legali | `content/settings/index.json` |

Le immagini caricate dal Media Manager vengono salvate in:

```text
public/media/cms/
```

La definizione di tutti i campi si trova in:

```text
tina/config.ts
```

La grafica rimane invece in `src/components/`, `src/pages/` e nei fogli di
stile del progetto. Tina non permette di cancellare o spostare liberamente i
componenti strutturali del sito.

## 3. Preparare il computer

Aprire un terminale nella cartella del sito:

```bash
cd /Users/vittorioguaitoli/Documents/STA
```

Verificare le versioni:

```bash
node --version
pnpm --version
```

Usare Node.js 22. Se il Mac usa `nvm`:

```bash
nvm install 22
nvm use 22
```

Installare le dipendenze:

```bash
pnpm install
```

Il progetto dichiara Node `22.x` in `package.json`. Questa scelta è
intenzionale: la configurazione è stata verificata con Node 22 e la versione
locale Node 24 ha mostrato un errore del database di indicizzazione di Tina.

## 4. Configurazione locale

Creare il file locale delle variabili partendo dall'esempio:

```bash
cp .env.example .env
```

Per lavorare soltanto in locale non sono necessarie credenziali Tina Cloud.
Se il modulo contatti deve inviare davvero le richieste, compilare anche la
chiave Web3Forms già usata dal sito:

```dotenv
VITE_WEB3FORMS_ACCESS_KEY=valore_web3forms
```

Il file `.env` non deve essere aggiunto a Git. `.env.example`, invece, contiene
soltanto nomi e valori dimostrativi e può restare nel repository.

## 5. Avvio locale e accesso a `/admin`

Avviare sito ed editor insieme:

```bash
pnpm run dev
```

Aprire:

- sito: `http://localhost:5173/`;
- editor: `http://localhost:5173/admin`;
- API locale, utile solo per diagnosi: `http://localhost:4001/graphql`.

`/admin` reindirizza automaticamente a `/admin/index.html`, l'indirizzo
statico generato da TinaCMS.

Nel pannello:

1. premere **Enter Edit Mode**;
2. aprire il menu in alto a sinistra;
3. scegliere **Homepage**, **Tour, date e prezzi**, **Eventi e partenze**
   oppure **Contatti e impostazioni**;
4. modificare i campi nella colonna sinistra;
5. verificare il risultato nell'anteprima reale a destra;
6. premere **Save**.

In modalità locale, **Save modifica direttamente i file JSON nella cartella
`content/`**. Non crea un commit e non pubblica il sito. Prima di chiudere il
lavoro è possibile controllare cosa è cambiato con:

```bash
git status
git diff
```

## 6. Modificare testi, date e prezzi

### Homepage

Aprire **Homepage**. Le sezioni sono organizzate come nel sito:

- Apertura;
- Sezione esperienze;
- Tour in evidenza;
- Cosa vivrai;
- Guide;
- Chi siamo;
- Galleria;
- Servizi inclusi;
- FAQ;
- Sezione contatti.

Fare clic su una zona evidenziata nell'anteprima porta al relativo gruppo di
campi. I testi possono essere cambiati senza toccare JSX, classi CSS o
componenti.

### Tour

Aprire **Tour, date e prezzi** e poi il tour desiderato. Per ogni tour sono
modificabili:

- nome e tipo di mezzo;
- durata, distanza, percentuale di sterrato e difficoltà;
- punti di interesse e periodo;
- data e ora;
- prezzo;
- descrizione;
- formati del tour;
- tappe giornaliere con titolo, descrizione e foto.

I prezzi attuali sono impostati come `Su richiesta`, perché nel sito non erano
presenti importi confermati. È possibile sostituire questo testo con un prezzo
reale quando approvato.

### Eventi e partenze

Aprire **Eventi e partenze** per modificare le uscite con una data precisa,
come il Wild Camp di Ferragosto e Maxienduro Sardegna. Ogni evento conserva:

- data di inizio e di fine;
- prezzo;
- pernottamento o soggiorno;
- servizi compresi;
- equipaggiamento;
- programma giornaliero;
- collegamento alla fonte originale.

La pagina `/eventi` usa questa raccolta separata, così un evento temporaneo non
viene aggiunto automaticamente al catalogo generale degli itinerari.

### Contatti

Aprire **Contatti e impostazioni**. Il numero internazionale va scritto con
prefisso paese e sole cifre, per esempio:

```text
393481234567
```

Il numero formattato può invece contenere spazi:

```text
+39 348 123 4567
```

Prima di rendere pubblici nuovi riferimenti, controllare email, telefono,
WhatsApp e dati legali.

## 7. Caricare e sostituire immagini

Aprire il menu TinaCMS e scegliere **Media Manager**.

1. caricare il file;
2. tornare alla raccolta desiderata;
3. scegliere il file nel campo immagine;
4. compilare sempre il testo alternativo;
5. controllare il taglio nell'anteprima;
6. salvare.

Usare preferibilmente WebP o AVIF, nomi descrittivi senza spazi e immagini già
ottimizzate. Non eliminare dal Media Manager un file ancora usato in altre
sezioni.

## 8. Collegare Tina Cloud e GitHub

Questa parte richiede l'accesso all'account GitHub proprietario del repository.
Non eseguirla finché le modifiche TinaCMS non sono state approvate e pubblicate
nel repository.

1. Accedere a `https://app.tina.io`.
2. Creare un nuovo progetto Tina Cloud.
3. Collegare GitHub e autorizzare il repository `vguaitoli/SITO-SAT`.
4. Selezionare il ramo `main`.
5. Nel progetto Tina, copiare:
   - il **Client ID** dalla scheda Overview;
   - un **Read Only Token** dalla scheda Tokens.
6. Nella cartella del sito eseguire:

```bash
npx @tinacms/cli init backend
```

7. Quando richiesto, inserire Client ID e Read Only Token. Se il comando non
   aggiorna il file già esistente, compilare manualmente `.env`:

```dotenv
NEXT_PUBLIC_TINA_CLIENT_ID=client_id_tina
TINA_TOKEN=read_only_token_tina
NEXT_PUBLIC_TINA_BRANCH=main
```

8. Riavviare:

```bash
pnpm run dev
```

9. Aprire `http://localhost:5173/admin` e verificare che il progetto sia
   riconosciuto.

Il file `tina/tina-lock.json`, generato e già predisposto, deve essere incluso
nel futuro commit: Tina Cloud lo usa per indicizzare correttamente lo schema.
Non mettere mai `TINA_TOKEN` o il contenuto di `.env` nel repository.

Quando l'editor è usato sul sito pubblicato, un salvataggio Tina Cloud scrive
la modifica nei file JSON del repository GitHub e crea un commit. Con
l'integrazione Git di Vercel attiva, quel commit avvia normalmente un nuovo
deploy.

## 9. Configurare Vercel

Aprire il progetto Vercel `sito-sat-1dzv` e andare in:

```text
Settings → Environment Variables
```

Aggiungere:

| Nome | Valore | Ambienti |
|---|---|---|
| `NEXT_PUBLIC_TINA_CLIENT_ID` | Client ID Tina Cloud | Production, Preview, Development |
| `TINA_TOKEN` | Read Only Token Tina Cloud | Production, Preview, Development |
| `NEXT_PUBLIC_TINA_BRANCH` | `main` | Production, Preview, Development |
| `VITE_WEB3FORMS_ACCESS_KEY` | chiave Web3Forms già in uso | Production, Preview, Development |

Controllare in **Build & Development Settings**:

```text
Framework Preset: Vite
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: dist
Node.js: 22.x
```

Lo script di build è già predisposto:

```text
tinacms build
→ generazione dello snapshot dei contenuti
→ vite build
→ generazione delle pagine SEO
```

`tinacms build` crea il pannello statico in `public/admin/`; Vite lo copia in
`dist/admin/`. La regola in `vercel.json` rende disponibile anche l'indirizzo
breve `/admin`.

Non avviare un deploy finché:

- il progetto Tina Cloud non vede correttamente `main`;
- le variabili Vercel non sono complete;
- i controlli locali non sono tutti verdi;
- il commit e il push non sono stati approvati.

## 10. Controlli prima della pubblicazione

Con Node 22 attivo:

```bash
pnpm run typecheck
pnpm run lint
pnpm exec tinacms audit --verbose
pnpm run build
```

Poi controllare il riepilogo:

```bash
git status
git diff --stat
git diff
```

Verificare manualmente almeno:

- homepage desktop e mobile;
- `http://localhost:5173/admin`;
- anteprima visuale della homepage;
- apertura di tutti i tour;
- formato delle date;
- prezzo visualizzato;
- pulsanti telefono e WhatsApp;
- caricamento delle immagini;
- FAQ;
- modulo contatti.

Solo dopo approvazione esplicita:

```bash
git add .
git commit -m "Integra TinaCMS per la gestione visuale dei contenuti"
git push origin main
```

Il push su `main` attiverà il normale deploy Vercel del progetto.

## 11. Risoluzione dei problemi

### `/admin` mostra la pagina 404

Riavviare `pnpm run dev` e provare direttamente:

```text
http://localhost:5173/admin/index.html
```

Verificare che il file `public/admin/index.html` sia stato generato. La
cartella `public/admin/` è intenzionalmente ignorata da Git perché viene
rigenerata durante sviluppo e build.

### Tina segnala Client ID o token mancanti

In locale senza Tina Cloud è normale poter lavorare in **local mode**. Per la
build destinata alla produzione servono invece:

```text
NEXT_PUBLIC_TINA_CLIENT_ID
TINA_TOKEN
```

Controllare che siano in `.env`, non in `.env.local`: il processo di build di
Tina legge il file `.env`.

### Errore di indicizzazione o connessione al database locale

Controllare:

```bash
node --version
```

Se non è Node 22, eseguire:

```bash
nvm use 22
pnpm install
pnpm run dev
```

### Il contenuto salvato non compare sul sito pubblico

Controllare nell'ordine:

1. che Tina Cloud abbia creato il commit su `main`;
2. che Vercel abbia avviato il deploy di quel commit;
3. che il deploy sia terminato senza errori;
4. che non si stia visualizzando una vecchia scheda o una cache del browser.

### L'immagine non compare

Verificare che il percorso inizi con `/media/cms/` e che il file esista nel
Media Manager. Per i media gestiti nel repository, il salvataggio deve essere
arrivato su GitHub prima che Vercel possa servirli.

## 12. Stato della consegna

La configurazione è stata verificata localmente con:

- audit dello schema e dei quattro documenti;
- typecheck;
- lint;
- build Vite;
- apertura della homepage;
- apertura di `/admin`;
- visual editor a due pannelli con homepage reale;
- controllo degli errori del browser.

Nessun commit, push o deploy è parte di questa procedura senza consenso
esplicito.

## 13. Riferimenti ufficiali

- [Configurazione TinaCMS per framework diversi da Next.js](https://tina.io/docs/frameworks/other)
- [Anteprima visuale e routing verso le pagine reali](https://tina.io/docs/contextual-editing/router)
- [Collegamento a Tina Cloud e GitHub](https://tina.io/docs/tinacloud/overview)
- [Deploy di TinaCMS su Vercel](https://tina.io/docs/tinacloud/deployment-options/vercel)
- [Versioni Node.js supportate da Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
