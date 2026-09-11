import {
  rispostaChiediCredenziali,
  rispostaNonConfigurato,
  verifica,
} from "./_autenticazione.js";

export const config = { runtime: "edge" };

const TALLY_FORM_ID = "Xx600V";
const TALLY_API_BASE = `https://api.tally.so/forms/${TALLY_FORM_ID}/submissions`;
const TALLY_API_VERSION = "2025-02-01";
const PAGE_LIMIT = 500;
const MAX_PAGES = 20;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function rispostaJson(corpo, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: JSON_HEADERS });
}

function testo(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (["number", "boolean", "bigint"].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return value.map(testo).filter(Boolean).join(", ");
  if (typeof value === "object") {
    if ("value" in value) return testo(value.value);
    return Object.values(value).map(testo).filter(Boolean).join(", ");
  }
  return String(value);
}

function normalizzaPerRicerca(value) {
  return testo(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it");
}

function punteggioDa(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = testo(value).match(/(?:^|\s)(10|[0-9])(?:\s|$|[—–-])/);
  return match ? Number(match[1]) : null;
}

function urlTallySicuro(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "tally.so" || host.endsWith(".tally.so"))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Costruisce un indice sia per le domande sia per i campi interni (es. matrice). */
export function indicizzaDomande(questions = []) {
  const indice = new Map();

  for (const question of Array.isArray(questions) ? questions : []) {
    const titolo = testo(question?.title) || "Domanda senza titolo";
    const base = {
      label: titolo,
      group: titolo,
      type: testo(question?.type) || "UNKNOWN",
    };
    if (question?.id) indice.set(String(question.id), base);

    for (const field of Array.isArray(question?.fields) ? question.fields : []) {
      const id = field?.uuid || field?.id;
      if (!id) continue;
      indice.set(String(id), {
        label: testo(field?.title) || titolo,
        group: titolo,
        type: testo(field?.questionType || field?.type || question?.type) || "UNKNOWN",
      });
    }
  }

  return indice;
}

function valoreConEtichette(value, indice) {
  if (Array.isArray(value)) {
    return value
      .map((item) => indice.get(String(item))?.label || testo(item))
      .filter(Boolean)
      .join(", ");
  }
  return indice.get(String(value))?.label || testo(value);
}

function normalizzaUnaRisposta(response, indice) {
  const meta = indice.get(String(response?.questionId)) || {
    label: "Domanda non più disponibile",
    group: "Domanda non più disponibile",
    type: "UNKNOWN",
  };
  const answer = response?.answer;

  if (
    answer &&
    typeof answer === "object" &&
    !Array.isArray(answer) &&
    !("value" in answer)
  ) {
    return Object.entries(answer).map(([fieldId, value]) => {
      const field = indice.get(String(fieldId)) || meta;
      const displayValue = valoreConEtichette(value, indice) || "—";
      return {
        questionId: String(fieldId),
        label: field.label,
        group: meta.group,
        type: field.type,
        value: displayValue,
        score: punteggioDa(displayValue),
      };
    });
  }

  const displayValue =
    testo(response?.formattedAnswer) || valoreConEtichette(answer, indice) || "—";
  return [{
    questionId: String(response?.questionId || response?.id || ""),
    label: meta.label,
    group: meta.group,
    type: meta.type,
    value: displayValue,
    score: punteggioDa(answer) ?? punteggioDa(displayValue),
  }];
}

function eDomandaNps(item) {
  const label = normalizzaPerRicerca(`${item.label} ${item.group}`);
  return label.includes("nps") || label.includes("consiglieresti") || label.includes("raccomanderesti");
}

function trovaNps(risposte) {
  const item = risposte.find((risposta) =>
    eDomandaNps(risposta) && risposta.score != null && risposta.score >= 0 && risposta.score <= 10,
  );
  return item?.score ?? null;
}

function titoloRispondente(risposte) {
  const trova = (etichette) => risposte.find((risposta) => {
    const label = normalizzaPerRicerca(risposta.label);
    return etichette.includes(label);
  })?.value;
  const nome = trova(["nome", "name", "first name"]);
  const cognome = trova(["cognome", "surname", "last name"]);
  return [nome, cognome].filter((value) => value && value !== "—").join(" ") || "Risposta anonima";
}

/** Normalizza la risposta Tally in un contratto piccolo e stabile per il frontend. */
export function normalizzaSubmission(submission, indice) {
  const risposte = (Array.isArray(submission?.responses) ? submission.responses : [])
    .flatMap((response) => normalizzaUnaRisposta(response, indice));

  return {
    id: String(submission?.id || ""),
    submittedAt: submission?.submittedAt || submission?.createdAt || null,
    previewUrl: urlTallySicuro(submission?.previewUrl),
    respondent: titoloRispondente(risposte),
    nps: trovaNps(risposte),
    answers: risposte,
  };
}

function mediaMetrica(submissions, parole) {
  const punteggi = [];
  for (const submission of submissions) {
    const risposta = submission.answers.find((item) => {
      const label = normalizzaPerRicerca(`${item.label} ${item.group}`);
      return !eDomandaNps(item) && parole.some((parola) => label.includes(parola)) && item.score != null;
    });
    if (risposta) punteggi.push(risposta.score);
  }

  return {
    value: punteggi.length
      ? Math.round((sommaPunteggi(punteggi) / punteggi.length) * 10) / 10
      : null,
    responses: punteggi.length,
  };
}

function sommaPunteggi(punteggi) {
  return punteggi.reduce((totale, valore) => totale + valore, 0);
}

/** Calcola NPS e medie senza dipendere dagli ID interni modificabili del form. */
export function calcolaKpi(submissions) {
  const valoriNps = submissions
    .map((submission) => submission.nps)
    .filter((value) => value != null);
  const promotori = valoriNps.filter((value) => value >= 9).length;
  const passivi = valoriNps.filter((value) => value >= 7 && value <= 8).length;
  const detrattori = valoriNps.filter((value) => value <= 6).length;
  const nps = valoriNps.length
    ? Math.round(((promotori - detrattori) / valoriNps.length) * 100)
    : null;

  return {
    responses: submissions.length,
    nps: {
      value: nps,
      responses: valoriNps.length,
      promoters: promotori,
      passives: passivi,
      detractors: detrattori,
    },
    averages: {
      route: mediaMetrica(submissions, ["percorso", "itinerario", "tracciato"]),
      guide: mediaMetrica(submissions, ["guida", "guide"]),
      organization: mediaMetrica(submissions, ["organizzazione", "logistica", "accoglienza"]),
    },
  };
}

export async function caricaTutteLeSubmission(apiKey, fetchFn = fetch) {
  const submissions = [];
  let questions = [];
  let page = 1;
  let hasMore = true;
  let totals = null;

  while (hasMore && page <= MAX_PAGES) {
    const url = new URL(TALLY_API_BASE);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("filter", "completed");

    const response = await fetchFn(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "tally-version": TALLY_API_VERSION,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const error = new Error("Tally API error");
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.submissions) || !Array.isArray(payload?.questions)) {
      throw new Error("Tally API payload non valido");
    }

    if (page === 1) {
      questions = payload.questions;
      totals = payload.totalNumberOfSubmissionsPerFilter || null;
    }
    submissions.push(...payload.submissions);
    hasMore = payload.hasMore === true;

    if (hasMore && payload.submissions.length === 0) {
      throw new Error("Tally API pagination non valida");
    }
    page += 1;
  }

  if (hasMore) throw new Error("Tally API pagination oltre il limite di sicurezza");
  return { questions, submissions, totals };
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return rispostaJson({ error: "Metodo non consentito." }, 405);
  }

  const { esito } = verifica(request.headers.get("authorization"));
  if (esito === "non-configurato") return rispostaNonConfigurato();
  if (esito !== "ok") return rispostaChiediCredenziali("Accesso riservato.");

  const apiKey = process.env.TALLY_API_KEY?.trim();
  if (!apiKey) {
    return rispostaJson({
      error: "Dashboard non configurata: manca TALLY_API_KEY nell'ambiente server.",
    }, 503);
  }

  try {
    const dati = await caricaTutteLeSubmission(apiKey);
    const indice = indicizzaDomande(dati.questions);
    const submissions = dati.submissions
      .map((submission) => normalizzaSubmission(submission, indice))
      .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));

    return rispostaJson({
      formId: TALLY_FORM_ID,
      fetchedAt: new Date().toISOString(),
      totalAvailable: dati.totals?.completed ?? submissions.length,
      kpis: calcolaKpi(submissions),
      submissions,
    });
  } catch (error) {
    const status = Number(error?.status || 0);
    const message = status === 401 || status === 403
      ? "Tally ha rifiutato la chiave API configurata."
      : status === 429
        ? "Tally ha temporaneamente limitato le richieste. Riprova tra poco."
        : "Non è stato possibile leggere le risposte da Tally.";
    return rispostaJson({ error: message }, 502);
  }
}
