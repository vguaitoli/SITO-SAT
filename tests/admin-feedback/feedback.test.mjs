import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import handler, {
  calcolaKpi,
  caricaTutteLeSubmission,
  indicizzaDomande,
  normalizzaSubmission,
} from "../../api/feedback.js";

const UTENTE = "prova";
const PASSWORD = "password-di-prova";
const TALLY_KEY = "tally-secret-di-prova";
const AUTH = `Basic ${Buffer.from(`${UTENTE}:${PASSWORD}`).toString("base64")}`;
const originalFetch = globalThis.fetch;

const questions = [
  {
    id: "nome",
    type: "INPUT_TEXT",
    title: "Nome",
    fields: [{ uuid: "nome-field", title: "Nome", questionType: "INPUT_TEXT" }],
  },
  {
    id: "nps",
    type: "LINEAR_SCALE",
    title: "Quanto consiglieresti Sardegna Trail Avventura?",
    fields: [],
  },
  {
    id: "qualita",
    type: "MATRIX",
    title: "Come valuti questi aspetti?",
    fields: [
      { uuid: "percorso", title: "Percorso", type: "MATRIX_ROW" },
      { uuid: "guida", title: "Guida", type: "MATRIX_ROW" },
      { uuid: "organizzazione", title: "Organizzazione", type: "MATRIX_ROW" },
      { uuid: "v2", title: "2 — Da migliorare", type: "MATRIX_COLUMN" },
      { uuid: "v3", title: "3 — Buono", type: "MATRIX_COLUMN" },
      { uuid: "v4", title: "4 — Molto buono", type: "MATRIX_COLUMN" },
      { uuid: "v5", title: "5 — Eccellente", type: "MATRIX_COLUMN" },
    ],
  },
  {
    id: "commento",
    type: "TEXTAREA",
    title: "Cosa ti è piaciuto di più?",
    fields: [],
  },
];

const rawSubmissions = [
  {
    id: "sub-2",
    submittedAt: "2026-09-10T12:00:00.000Z",
    previewUrl: "https://tally.so/submissions/sub-2",
    responses: [
      { questionId: "nome", answer: "Anna" },
      { questionId: "nps", answer: 10 },
      {
        questionId: "qualita",
        answer: { percorso: "v5", guida: "v4", organizzazione: "v3" },
      },
      { questionId: "commento", answer: "Paesaggi splendidi" },
    ],
  },
  {
    id: "sub-1",
    submittedAt: "2026-09-09T10:00:00.000Z",
    previewUrl: "javascript:alert(1)",
    responses: [
      { questionId: "nps", answer: "6" },
      {
        questionId: "qualita",
        answer: { percorso: "v3", guida: "v2", organizzazione: "v5" },
      },
    ],
  },
];

const payload = (submissions, hasMore = false) => ({
  page: 1,
  limit: 500,
  hasMore,
  totalNumberOfSubmissionsPerFilter: {
    all: submissions.length,
    completed: submissions.length,
    partial: 0,
  },
  questions,
  submissions,
});

function request({ auth = AUTH, method = "GET" } = {}) {
  return new Request(
    "https://www.sardegnatrailavventura.it/admin/feedback/api/submissions",
    { method, headers: auth ? { authorization: auth } : {} },
  );
}

function sequenceFetch(...responses) {
  const calls = [];
  const fetchFn = async (...args) => {
    calls.push(args);
    const response = responses.shift();
    if (!response) throw new Error("Unexpected fetch call");
    return response;
  };
  fetchFn.calls = calls;
  return fetchFn;
}

describe("normalizzazione Tally", () => {
  it("espande la matrice, conserva le etichette e limita i link a Tally", () => {
    const indice = indicizzaDomande(questions);
    const first = normalizzaSubmission(rawSubmissions[0], indice);
    const second = normalizzaSubmission(rawSubmissions[1], indice);

    assert.equal(first.respondent, "Anna");
    assert.equal(first.nps, 10);
    assert.deepEqual(
      {
        value: first.answers.find((answer) => answer.label === "Percorso")?.value,
        score: first.answers.find((answer) => answer.label === "Percorso")?.score,
      },
      { value: "5 — Eccellente", score: 5 },
    );
    assert.equal(first.previewUrl, "https://tally.so/submissions/sub-2");
    assert.equal(second.respondent, "Risposta anonima");
    assert.equal(second.previewUrl, null);
  });

  it("calcola NPS e medie principali", () => {
    const indice = indicizzaDomande(questions);
    const submissions = rawSubmissions.map((item) => normalizzaSubmission(item, indice));
    assert.deepEqual(calcolaKpi(submissions), {
      responses: 2,
      nps: { value: 0, responses: 2, promoters: 1, passives: 0, detractors: 1 },
      averages: {
        route: { value: 4, responses: 2 },
        guide: { value: 3, responses: 2 },
        organization: { value: 4, responses: 2 },
      },
    });
  });
});

describe("lettura paginata", () => {
  it("segue hasMore e invia la chiave solo nell'header server-side", async () => {
    const fetchFn = sequenceFetch(
      new Response(JSON.stringify(payload([rawSubmissions[0]], true)), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
      new Response(JSON.stringify(payload([rawSubmissions[1]], false)), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await caricaTutteLeSubmission(TALLY_KEY, fetchFn);
    assert.equal(result.submissions.length, 2);
    assert.equal(fetchFn.calls.length, 2);

    const [firstUrl, firstOptions] = fetchFn.calls[0];
    const [secondUrl] = fetchFn.calls[1];
    assert.equal(firstUrl.searchParams.get("page"), "1");
    assert.equal(secondUrl.searchParams.get("page"), "2");
    assert.equal(firstOptions.headers.Authorization, `Bearer ${TALLY_KEY}`);
    assert.equal(firstOptions.headers["tally-version"], "2025-02-01");
    assert.equal(firstUrl.href.includes(TALLY_KEY), false);
  });
});

describe("endpoint feedback", () => {
  beforeEach(() => {
    process.env.SOCIAL_STUDIO_UTENTE = UTENTE;
    process.env.SOCIAL_STUDIO_PASSWORD = PASSWORD;
    process.env.TALLY_API_KEY = TALLY_KEY;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SOCIAL_STUDIO_UTENTE;
    delete process.env.SOCIAL_STUDIO_PASSWORD;
    delete process.env.TALLY_API_KEY;
  });

  it("nega l'accesso prima di contattare Tally", async () => {
    const fetchFn = sequenceFetch();
    globalThis.fetch = fetchFn;
    const response = await handler(request({ auth: "" }));
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate"), /^Basic /);
    assert.equal(fetchFn.calls.length, 0);
  });

  it("si chiude se manca la configurazione Basic Auth", async () => {
    delete process.env.SOCIAL_STUDIO_PASSWORD;
    const response = await handler(request());
    assert.equal(response.status, 503);
  });

  it("non contatta Tally se manca la chiave server", async () => {
    delete process.env.TALLY_API_KEY;
    const fetchFn = sequenceFetch();
    globalThis.fetch = fetchFn;
    const response = await handler(request());
    assert.equal(response.status, 503);
    assert.equal(fetchFn.calls.length, 0);
  });

  it("restituisce il contratto normalizzato senza esporre la chiave", async () => {
    globalThis.fetch = sequenceFetch(new Response(JSON.stringify(payload(rawSubmissions)), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    const response = await handler(request());
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(body.formId, "Xx600V");
    assert.equal(body.kpis.responses, 2);
    assert.equal(body.submissions[0].id, "sub-2");
    assert.equal(JSON.stringify(body).includes(TALLY_KEY), false);
  });

  it("traduce gli errori Tally senza inoltrarne il corpo", async () => {
    globalThis.fetch = sequenceFetch(new Response("token invalid: secret", { status: 401 }));
    const response = await handler(request());
    const body = await response.text();
    assert.equal(response.status, 502);
    assert.match(body, /chiave API/);
    assert.equal(body.includes("secret"), false);
  });

  it("accetta solo GET", async () => {
    const response = await handler(request({ method: "POST" }));
    assert.equal(response.status, 405);
  });
});
