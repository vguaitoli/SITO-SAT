import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AmbitoProblemi, ControlloCapienza, FornitoreProblemi } from "./primitivi";

/**
 * Il registro delle segnalazioni.
 *
 * È la parte del pre-flight che sbagliava in silenzio: una mappa per chiave,
 * chiavi globali, e nessun ritiro allo smontaggio. Il risultato era un pannello
 * che mostrava problemi di grafiche non più a schermo, e — peggio — errori veri
 * cancellati da un template diverso che scriveva `null` sulla stessa chiave.
 *
 * Questi test montano e smontano davvero i componenti: è l'unico modo di
 * verificare un ciclo di vita.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenitore;
let radice;

beforeEach(() => {
  contenitore = document.createElement("div");
  document.body.appendChild(contenitore);
  radice = createRoot(contenitore);
});

afterEach(() => {
  act(() => radice.unmount());
  contenitore.remove();
});

/** L'attesa copre il raggruppamento da 80 ms di `FornitoreProblemi`. */
const assesta = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 140));
  });
};

/** Sonda: raccoglie l'ultimo elenco di problemi emesso. */
function montaggio(albero) {
  const stato = { ultimo: null };
  const elemento = (
    <FornitoreProblemi onProblemi={(p) => { stato.ultimo = p; }}>
      {albero}
    </FornitoreProblemi>
  );
  return { stato, elemento };
}

/** Una voce che sfora: `quante > massimo` produce un avviso. */
const Sfora = ({ chiave = "voci", quante = 9 }) => (
  <ControlloCapienza chiave={chiave} etichetta="Voci" quante={quante} massimo={4} />
);

const chiavi = (elenco) => (elenco || []).map((p) => p.chiave).sort();

describe("registro dei problemi", () => {
  it("registra una segnalazione con la chiave completa dell'ambito", async () => {
    const { stato, elemento } = montaggio(
      <AmbitoProblemi nome="post"><Sfora /></AmbitoProblemi>,
    );
    await act(async () => { radice.render(elemento); });
    await assesta();

    expect(chiavi(stato.ultimo)).toEqual(["post/voci"]);
    expect(stato.ultimo[0].livello).toBe("avviso");
  });

  it("ritira la segnalazione quando il componente viene smontato", async () => {
    const Albero = ({ mostra }) => (
      <AmbitoProblemi nome="post">{mostra ? <Sfora /> : null}</AmbitoProblemi>
    );
    const stato = { ultimo: null };
    const rendi = (mostra) =>
      radice.render(
        <FornitoreProblemi onProblemi={(p) => { stato.ultimo = p; }}>
          <Albero mostra={mostra} />
        </FornitoreProblemi>,
      );

    await act(async () => { rendi(true); });
    await assesta();
    expect(chiavi(stato.ultimo)).toEqual(["post/voci"]);

    await act(async () => { rendi(false); });
    await assesta();
    // Il problema non esiste più perché il componente non c'è più.
    expect(chiavi(stato.ultimo)).toEqual([]);
  });

  it("passando da Story a Post non restano gli errori della Story", async () => {
    const stato = { ultimo: null };
    const rendi = (vista) =>
      radice.render(
        <FornitoreProblemi onProblemi={(p) => { stato.ultimo = p; }}>
          {vista === "story" ? (
            <AmbitoProblemi nome="story"><Sfora quante={12} /></AmbitoProblemi>
          ) : (
            <AmbitoProblemi nome="post"><Sfora quante={2} /></AmbitoProblemi>
          )}
        </FornitoreProblemi>,
      );

    await act(async () => { rendi("story"); });
    await assesta();
    expect(chiavi(stato.ultimo)).toEqual(["story/voci"]);

    await act(async () => { rendi("post"); });
    await assesta();
    // Il Post non sfora e la Story non è più montata: il registro è vuoto.
    expect(chiavi(stato.ultimo)).toEqual([]);
  });

  it("tiene distinti i template montati insieme", async () => {
    const { stato, elemento } = montaggio(
      <>
        <AmbitoProblemi nome="post"><Sfora /></AmbitoProblemi>
        <AmbitoProblemi nome="story"><Sfora /></AmbitoProblemi>
        <AmbitoProblemi nome="carosello/05"><Sfora /></AmbitoProblemi>
      </>,
    );
    await act(async () => { radice.render(elemento); });
    await assesta();

    // Stessa chiave interna, tre ambiti: tre segnalazioni, non una.
    expect(chiavi(stato.ultimo)).toEqual(["carosello/05/voci", "post/voci", "story/voci"]);
  });

  it("un Post senza errori non cancella l'errore vero di una Story", async () => {
    const { stato, elemento } = montaggio(
      <>
        <AmbitoProblemi nome="story"><Sfora quante={12} /></AmbitoProblemi>
        <AmbitoProblemi nome="post"><Sfora quante={1} /></AmbitoProblemi>
      </>,
    );
    await act(async () => { radice.render(elemento); });
    await assesta();

    // È il difetto originale: con chiavi globali il Post scriveva `null` sulla
    // chiave della Story e l'errore spariva senza che nessuno lo avesse risolto.
    expect(chiavi(stato.ultimo)).toEqual(["story/voci"]);
    expect(stato.ultimo).toHaveLength(1);
  });

  it("le copie fuori schermo del pacchetto non si confondono con l'anteprima", async () => {
    const stato = { ultimo: null };
    const rendi = (conPacchetto) =>
      radice.render(
        <FornitoreProblemi onProblemi={(p) => { stato.ultimo = p; }}>
          <AmbitoProblemi nome="post"><Sfora /></AmbitoProblemi>
          {conPacchetto && (
            <AmbitoProblemi nome="pacco">
              <AmbitoProblemi nome="post"><Sfora /></AmbitoProblemi>
              <AmbitoProblemi nome="story"><Sfora /></AmbitoProblemi>
            </AmbitoProblemi>
          )}
        </FornitoreProblemi>,
      );

    await act(async () => { rendi(true); });
    await assesta();
    expect(chiavi(stato.ultimo)).toEqual(["pacco/post/voci", "pacco/story/voci", "post/voci"]);

    // Finita l'esportazione le copie si smontano: non restano segnalazioni
    // obsolete di grafiche che non esistono più.
    await act(async () => { rendi(false); });
    await assesta();
    expect(chiavi(stato.ultimo)).toEqual(["post/voci"]);
  });

  it("una segnalazione risolta viene rimossa senza smontare nulla", async () => {
    const stato = { ultimo: null };
    const rendi = (quante) =>
      radice.render(
        <FornitoreProblemi onProblemi={(p) => { stato.ultimo = p; }}>
          <AmbitoProblemi nome="post"><Sfora quante={quante} /></AmbitoProblemi>
        </FornitoreProblemi>,
      );

    await act(async () => { rendi(9); });
    await assesta();
    expect(chiavi(stato.ultimo)).toEqual(["post/voci"]);

    // Si toglie una voce: il problema è risolto e deve sparire dallo stato.
    await act(async () => { rendi(3); });
    await assesta();
    expect(chiavi(stato.ultimo)).toEqual([]);
  });
});
