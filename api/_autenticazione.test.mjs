import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leggiBasic, ugualiATempoCostante, verifica } from "./_autenticazione.js";
import * as middlewareModule from "../middleware.js";

const AMBIENTE = {
  SOCIAL_STUDIO_UTENTE: "vittorio",
  SOCIAL_STUDIO_PASSWORD: "segreto-lungo-abc",
};
const basic = (utente, password) => `Basic ${btoa(`${utente}:${password}`)}`;
const { eProtetta } = middlewareModule;

describe("autenticazione Basic condivisa", () => {
  it("confronta le stringhe senza scorciatoie sulla lunghezza", () => {
    assert.equal(ugualiATempoCostante("abc", "abc"), true);
    assert.equal(ugualiATempoCostante("abc", "abd"), false);
    assert.equal(ugualiATempoCostante("abc", "abcd"), false);
  });

  it("decodifica utente e password, inclusi i due punti nella password", () => {
    assert.deepEqual(leggiBasic(basic("vittorio", "a:b:c")), {
      utente: "vittorio",
      password: "a:b:c",
    });
  });

  it("chiude l'accesso se l'ambiente non è configurato", () => {
    assert.equal(verifica(basic("v", "p"), {}).esito, "non-configurato");
    assert.equal(
      verifica(basic("v", "p"), { SOCIAL_STUDIO_UTENTE: "v" }).esito,
      "non-configurato",
    );
  });

  it("rifiuta credenziali mancanti, illeggibili o errate", () => {
    assert.equal(verifica(null, AMBIENTE).esito, "mancante");
    assert.equal(verifica("Bearer token", AMBIENTE).esito, "illeggibile");
    assert.equal(verifica(basic("vittorio", "sbagliata"), AMBIENTE).esito, "errate");
  });

  it("accetta solo la coppia corretta", () => {
    assert.equal(verifica(basic("vittorio", "segreto-lungo-abc"), AMBIENTE).esito, "ok");
  });
});

describe("perimetro del middleware", () => {
  it("protegge dashboard, alias API e endpoint diretto", () => {
    for (const path of [
      "/admin/feedback",
      "/admin/feedback/",
      "/admin/feedback/api/submissions",
      "/api/feedback",
    ]) {
      assert.equal(eProtetta(path), true, path);
    }
  });

  it("mantiene il perimetro del Social Studio", () => {
    assert.equal(eProtetta("/admin/social"), true);
    assert.equal(eProtetta("/api/caption"), true);
  });

  it("non protegge sito pubblico e pannello Tina", () => {
    for (const path of [
      "/",
      "/feedback",
      "/prenotazioni",
      "/eventi",
      "/admin",
      "/admin/index.html",
      "/api/feedback-altro",
      "/admin/feedback-altro",
    ]) {
      assert.equal(eProtetta(path), false, path);
    }
  });

  it("non usa config.matcher", () => {
    assert.equal(middlewareModule.config, undefined);
  });
});
