import { z } from "zod";
import { rispostaChiediCredenziali, rispostaNonConfigurato, verifica } from "./_autenticazione.js";

/**
 * Endpoint per la generazione delle caption.
 *
 * **Come si autentica il frontend.** Non con un segreto proprio: non ne ha.
 * Lo studio chiama `/admin/social/api/caption`, che sta sotto il prefisso già
 * protetto dal middleware; il browser, avendo autenticato /admin/social,
 * rimanda le credenziali Basic da solo. Nessun token viene incorporato nel
 * bundle, salvato in localStorage o trasmesso da codice JavaScript.
 *
 * La verifica avviene comunque anche qui, con la stessa funzione che usa il
 * middleware: se qualcuno chiamasse direttamente /api/caption aggirando il
 * routing, troverebbe lo stesso controllo.
 *
 * CAPTION_PROVIDER e CAPTION_API_KEY restano esclusivamente lato server: non
 * compaiono in nessuna risposta e non escono da questa funzione.
 *
 * Stato attuale: **le protezioni ci sono, il fornitore no.** Senza provider
 * configurato l'endpoint risponde 501. È voluto: le difese si costruiscono
 * prima di ciò che devono difendere.
 *
 * Variabili d'ambiente:
 *   SOCIAL_STUDIO_UTENTE / SOCIAL_STUDIO_PASSWORD  obbligatorie (condivise con lo studio)
 *   CAPTION_PROVIDER                               opzionale — se manca, 501
 *   CAPTION_API_KEY                                opzionale — mai esposta
 *   CAPTION_LIMITE_ORA                             opzionale — predefinito 60
 */

export const config = { runtime: "edge" };

/** Tetto al corpo della richiesta: 32 KB bastano ampiamente per una caption. */
const BYTE_MASSIMI = 32 * 1024;

const RUBRICHE = ["tour", "eventi", "trail", "sardegna", "guide", "garage", "crew", "info"];

/**
 * Schema chiuso: un campo non previsto fa fallire la richiesta invece di
 * passare al fornitore senza controllo. Accetta solo testo e dati strutturati
 * brevi — fotografie, GPX e coordinate non possono attraversarlo.
 */
const richiestaSchema = z.object({
  rubrica: z.enum(RUBRICHE),
  lunghezza: z.enum(["breve", "standard", "storytelling"]).default("standard"),
  fattuali: z.record(z.union([z.string().max(400), z.number(), z.boolean()])).default({}),
  editoriale: z.object({
    titolo: z.string().max(200).default(""),
    claim: z.string().max(400).default(""),
    note: z.string().max(2000).default(""),
  }).default({}),
  paragrafiBloccati: z.array(z.string().max(2000)).max(10).default([]),
}).strict();

/**
 * Limite di frequenza in memoria, a finestra scorrevole.
 *
 * L'istanza edge è effimera e non condivisa: argina l'abuso banale, non un
 * attacco distribuito. Con un solo utente è sufficiente e non introduce
 * dipendenze né servizi esterni.
 */
const finestre = new Map();

function fuoriLimite(chiave, limite) {
  const ora = Date.now();
  const inizio = ora - 60 * 60 * 1000;
  const colpi = (finestre.get(chiave) || []).filter((t) => t > inizio);
  if (colpi.length >= limite) return true;
  colpi.push(ora);
  finestre.set(chiave, colpi);
  return false;
}

const risposta = (corpo, stato) =>
  new Response(JSON.stringify(corpo), {
    status: stato,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });

export default async function handler(request) {
  if (request.method !== "POST") {
    return risposta({ errore: "Metodo non consentito." }, 405);
  }

  // 1. Autenticazione, la stessa dello studio.
  const { esito } = verifica(request.headers.get("authorization"));
  if (esito === "non-configurato") return rispostaNonConfigurato();
  if (esito !== "ok") return rispostaChiediCredenziali("Accesso riservato.");

  // 2. Limite di frequenza, per utente e indirizzo.
  const limite = Number(process.env.CAPTION_LIMITE_ORA || 60);
  const impronta = request.headers.get("x-forwarded-for") || "locale";
  if (fuoriLimite(impronta, limite)) {
    return risposta({ errore: `Limite di ${limite} richieste all'ora superato.` }, 429);
  }

  // 3. Dimensione del corpo, controllata prima e dopo la lettura.
  if (Number(request.headers.get("content-length") || 0) > BYTE_MASSIMI) {
    return risposta({ errore: "Richiesta troppo grande." }, 413);
  }
  const testo = await request.text();
  if (testo.length > BYTE_MASSIMI) {
    return risposta({ errore: "Richiesta troppo grande." }, 413);
  }

  // 4. Validazione.
  let dati;
  try {
    dati = richiestaSchema.parse(JSON.parse(testo));
  } catch (errore) {
    return risposta(
      { errore: "Richiesta non valida.", dettagli: String(errore.message).slice(0, 500) },
      400,
    );
  }

  // 5. Fornitore. Finché non c'è, l'endpoint lo dichiara apertamente.
  if (!process.env.CAPTION_PROVIDER || !process.env.CAPTION_API_KEY) {
    return risposta(
      {
        errore: "Nessun fornitore AI configurato.",
        nota: "Le protezioni sono attive; mancano CAPTION_PROVIDER e CAPTION_API_KEY. Social Studio funziona con il provider manuale.",
        rubricaRicevuta: dati.rubrica,
      },
      501,
    );
  }

  // Il nome del fornitore non viene rimandato al client: è informazione
  // di configurazione del server.
  return risposta({ errore: "Fornitore non ancora implementato." }, 501);
}
