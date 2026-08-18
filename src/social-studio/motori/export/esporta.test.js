import { describe, expect, it } from "vitest";
import { vietaAssetSensibili } from "./esporta";
import { creaZip } from "./zip";

/**
 * Ciò che entra in un pacchetto.
 *
 * Il requisito «il GPX non finisce mai in un export» è la ragione per cui il
 * controllo esiste come funzione invece che come commento: si può verificare.
 */

describe("vietaAssetSensibili", () => {
  const vuoto = new Uint8Array([0]);

  it("lascia passare i PNG e la caption", () => {
    const file = [
      { nome: "01-cover.png", dati: vuoto },
      { nome: "story-1080x1920.png", dati: vuoto },
      { nome: "caption.txt", dati: vuoto },
    ];
    expect(vietaAssetSensibili(file)).toHaveLength(3);
  });

  it("rifiuta un GPX, anche mascherato", () => {
    expect(() => vietaAssetSensibili([{ nome: "percorso.gpx", dati: vuoto }]))
      .toThrow(/percorso\.gpx/);
    expect(() => vietaAssetSensibili([{ nome: "TRACCIA.GPX", dati: vuoto }]))
      .toThrow(/ammessi solo PNG/);
  });

  it("rifiuta qualsiasi altro allegato", () => {
    for (const nome of ["dati.json", "backup.zip", "note.txt", "foto.jpg"]) {
      expect(() => vietaAssetSensibili([{ nome, dati: vuoto }])).toThrow();
    }
  });
});

describe("creaZip", () => {
  it("produce un archivio con la firma ZIP e una voce per file", async () => {
    const codifica = new TextEncoder();
    const zip = creaZip([
      { nome: "01-cover.png", dati: codifica.encode("finto png") },
      { nome: "caption.txt", dati: codifica.encode("Quattro giorni di sterrato.") },
    ]);
    const byte = new Uint8Array(await zip.arrayBuffer());

    // "PK\x03\x04": intestazione locale del primo file.
    expect([...byte.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // Il record di fine dichiara due voci.
    const fine = byte.length - 22;
    expect(byte[fine + 8] + (byte[fine + 9] << 8)).toBe(2);
    expect(zip.type).toBe("application/zip");
  });
});
