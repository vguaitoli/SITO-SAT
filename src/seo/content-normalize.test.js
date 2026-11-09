import { describe, expect, it } from "vitest";
import { normalizeEvents, normalizeMediaPath } from "../content/normalize";

describe("normalizeMediaPath", () => {
  it("rimuove soltanto il prefisso Tina duplicato", () => {
    expect(normalizeMediaPath("/media/cms/media/reali/foto.webp")).toBe(
      "/media/reali/foto.webp",
    );
  });

  it("mantiene intatti upload Tina e asset pubblici validi", () => {
    expect(normalizeMediaPath("/media/cms/guida.webp")).toBe("/media/cms/guida.webp");
    expect(normalizeMediaPath("/media/reali/foto.webp")).toBe("/media/reali/foto.webp");
  });

  it("normalizza anche le immagini delle tappe evento", () => {
    const [event] = normalizeEvents({
      events: [
        {
          name: "Evento di prova",
          stages: [{ image: "/media/cms/media/reali/tappa.webp" }],
        },
      ],
    });

    expect(event.tappe[0].foto).toBe("/media/reali/tappa.webp");
  });
});
