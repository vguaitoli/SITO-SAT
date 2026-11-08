# Modulo pubblico per la Via del Granito

Pagina separata: /richiesta-tour.html. Nessun collegamento aggiunto ai menu, nessuna attivazione di Social Studio. Le richieste non sono conferme di posto. Nessun pagamento online.

## Email

Il modulo effettua due POST indipendenti a Web3Forms con le stesse informazioni. Non è un BCC: ciascuna chiave consegna alla casella associata e nessun indirizzo dell'altro destinatario compare nel payload.

Variabili Vercel necessarie:
- VITE_WEB3FORMS_ACCESS_KEY: chiave verificata per sardegnatrailavventura@gmail.com.
- VITE_WEB3FORMS_ACCESS_KEY_2: chiave verificata per vguaito4@gmail.com.
- VITE_TOUR_FORM_RECIPIENTS_VERIFIED=true: attivare solo dopo aver verificato entrambi gli abbinamenti in dashboard.

La chiave primaria esistente va verificata prima di riutilizzarla. Non cambiarne l'abbinamento: è già usata dal modulo contatti del sito. Se appartiene alla casella personale, predisporre chiavi dedicate e adeguare il mapping prima della pubblicazione.

Le chiavi Web3Forms sono chiavi pubbliche per form, non credenziali amministrative. La configurazione viene emessa dal plugin in scripts/tour-form-config.mjs nel file modulo-tour/config.json. In assenza di configurazione completa l'invio resta disabilitato.

Se la richiesta principale è accettata e la copia fallisce, il visitatore non deve reinviare la prenotazione. Se l'esito è ambiguo (rete interrotta), non si ripete automaticamente: il servizio non offre qui una garanzia di idempotenza. Il riferimento della richiesta serve a riconciliare eventuali doppioni. L'accettazione API non prova la consegna finale nella casella.

## Prima dell'attivazione

Verificare i destinatari, completare l'informativa applicabile al modulo e provare una consegna reale con dati di fantasia alle due caselle. Solo dopo pubblicare con il servizio attivo. La pagina non è stata pubblicata in produzione.

## Verifiche

node --test scripts/tour-form-delivery.test.mjs
pnpm run typecheck
pnpm run lint
pnpm run build

Non pubblicare le altre modifiche pendenti del sito/Social Studio. Preparare una build isolata dal codice attualmente pubblicato, aggiungendo soltanto i file del modulo e il plugin di configurazione.
