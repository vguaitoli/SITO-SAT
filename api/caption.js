import { z } from "zod";

/**
 * Endpoint per la generazione delle caption.
 *
 * Non è utilizzabile in forma anonima e non contiene alcuna chiave lato
 * client: la chiave del fornitore vive solo qui, fra le variabili d'ambiente
 * della funzione.
 *
 * Stato attuale: **le protezioni ci sono, il fornitore no.** Senza
 * CAPTION_PROVIDER configurato l'endpoint risponde 501. È voluto: le difese si
 * costruiscono prima di ciò che devono difendere, non dopo.
 *
 * Variabili d'ambiente:
 *   CAPTION_TOKEN        obbligatoria — token condiviso con lo studio
 *   CAPTION_PROVIDER     opzionale    — identificativo del fornitore; se manca, 501
 *   CAPTION_API_KEY      opzionale    — chiave del fornitore, mai esposta
 *   CAPTION_LIMITE_ORA   opzionale    — richieste all'ora per token (predefinito 60)
 *
 * Cosa NON attraversa mai questo endpoint: fotografie, file GPX, coordinate
 * della traccia. Solo testo e dati strutturati, come previsto dallo schema.
 */

export const config = { runtime: "edge" };

/** Tetto al corpo della richiesta: 32 KB bastano ampiamente per una caption. */
const BYTE_MASSIMI = 32 * 1024;

const RUBRICHE = ["tour", "eventi", "trail", "sardegna", "guide", "garage", "crew", "info"];

/**
 * Lo schema è volutamente chiuso (`.strict()`): un campo non previsto fa
 * fallire la richiesta invece di passare al fornitore senza controllo.
 */
const richiestaSchema = z.object({
  rubrica: z.enum(RUBRICHE),
  lunghezza: z.enum(["breve", "standard", "storytelling"]).default("standard"),
  // Dati fattuali: contesto in sola lettura. Solo stringhe brevi.
  fattuali: z.record(z.union([z.string().max(400), z.number(), z.boolean()])).default({}),
  // Materiale editoriale su cui il modello può lavorare.
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
 * L'istanza edge è effimera e non condivisa: questo argina l'abuso banale, non
 * un attacco distribuito. Per una difesa seria servirebbe un contatore esterno
 * (Vercel KV o equivalente); finché lo studio ha un solo utente, questo basta
 * e non introduce dipendenze.
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

function ugualiATempoCostante(a, b) {
  const ba = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let diverso = ba.length ^ bb.length;
  for (let i = 0; i < Math.max(ba.length, bb.length); i += 1) {
    diverso |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diverso === 0;
}

const risposta = (corpo, stato) =>
  new Response(JSON.stringify(corpo), {
    status: stato,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export default async function handler(request) {
  if (request.method !== "POST") {
    return risposta({ errore: "Metodo non consentito." }, 405);
  }

  // 1. Autenticazione. Senza token configurato l'endpoint resta chiuso.
  const tokenAtteso = process.env.CAPTION_TOKEN;
  if (!tokenAtteso) {
    return risposta({ errore: "Endpoint non configurato." }, 503);
  }
  const intestazione = request.headers.get("authorization") || "";
  const tokenRicevuto = intestazione.toLowerCase().startsWith("bearer ")
    ? intestazione.slice(7).trim()
    : "";
  if (!tokenRicevuto || !ugualiATempoCostante(tokenRicevuto, tokenAtteso)) {
    return risposta({ errore: "Non autorizzato." }, 401);
  }

  // 2. Limite di frequenza, per token e per indirizzo.
  const limite = Number(process.env.CAPTION_LIMITE_ORA || 60);
  const impronta = `${tokenRicevuto.slice(0, 8)}:${request.headers.get("x-forwarded-for") || "ignoto"}`;
  if (fuoriLimite(impronta, limite)) {
    return risposta({ errore: `Limite di ${limite} richieste all'ora superato.` }, 429);
  }

  // 3. Dimensione del corpo, controllata prima di leggerlo tutto.
  const dichiarata = Number(request.headers.get("content-length") || 0);
  if (dichiarata > BYTE_MASSIMI) {
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
    return risposta({ errore: "Richiesta non valida.", dettagli: String(errore.message).slice(0, 500) }, 400);
  }

  // 5. Fornitore. Finché non è configurato, l'endpoint dichiara di non esserlo.
  const fornitore = process.env.CAPTION_PROVIDER;
  if (!fornitore || !process.env.CAPTION_API_KEY) {
    return risposta(
      {
        errore: "Nessun fornitore AI configurato.",
        nota: "Le protezioni sono attive; manca CAPTION_PROVIDER/CAPTION_API_KEY. Social Studio funziona con il provider manuale.",
        rubricaRicevuta: dati.rubrica,
      },
      501,
    );
  }

  return risposta({ errore: `Fornitore «${fornitore}» non ancora implementato.` }, 501);
}
