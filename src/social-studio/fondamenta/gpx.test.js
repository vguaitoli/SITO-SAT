import { describe, expect, it } from "vitest";
import {
  analizzaGpx, calcolaMetriche, distanzaFra, riquadro, semplificaPerDisegno,
} from "@/admin/instagram/gpx";

/**
 * Il parser GPX è la parte dove un errore passerebbe inosservato: una traccia
 * sbagliata di poco sembra comunque una traccia. Questi test fissano il
 * comportamento su casi reali e su file malformati.
 */

const gpx = (interno, attributi = 'xmlns="http://www.topografix.com/GPX/1/1"') =>
  `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" ${attributi}>${interno}</gpx>`;

const punto = (lon, lat, ele) =>
  `<trkpt lat="${lat}" lon="${lon}">${ele === undefined ? "" : `<ele>${ele}</ele>`}</trkpt>`;

describe("analizzaGpx", () => {
  it("legge la traccia da trk > trkseg > trkpt", () => {
    const testo = gpx(`<trk><name>Giro di prova</name><trkseg>
      ${punto(9.5, 40.9, 10)}${punto(9.6, 40.95, 120)}${punto(9.7, 41.0, 80)}
    </trkseg></trk>`);
    const esito = analizzaGpx(testo);

    expect(esito.origine).toBe("traccia");
    expect(esito.nome).toBe("Giro di prova");
    expect(esito.segmenti).toHaveLength(1);
    expect(esito.segmenti[0]).toHaveLength(3);
    expect(esito.segmenti[0][0]).toMatchObject({ lon: 9.5, lat: 40.9, quota: 10 });
  });

  it("tiene distinti i segmenti multipli invece di fonderli", () => {
    const testo = gpx(`<trk>
      <trkseg>${punto(9.0, 40.0)}${punto(9.1, 40.1)}</trkseg>
      <trkseg>${punto(9.5, 40.5)}${punto(9.6, 40.6)}</trkseg>
    </trk>`);
    const esito = analizzaGpx(testo);
    expect(esito.segmenti).toHaveLength(2);
  });

  it("unisce le tracce multiple mantenendone i segmenti", () => {
    const testo = gpx(`
      <trk><trkseg>${punto(9.0, 40.0)}${punto(9.1, 40.1)}</trkseg></trk>
      <trk><trkseg>${punto(9.5, 40.5)}${punto(9.6, 40.6)}</trkseg></trk>`);
    expect(analizzaGpx(testo).segmenti).toHaveLength(2);
  });

  it("usa la rotta solo quando non esiste alcuna traccia", () => {
    const conEntrambe = gpx(`
      <trk><trkseg>${punto(9.0, 40.0)}${punto(9.1, 40.1)}</trkseg></trk>
      <rte><rtept lat="41" lon="8"/><rtept lat="41.1" lon="8.1"/></rte>`);
    expect(analizzaGpx(conEntrambe).origine).toBe("traccia");

    const soloRotta = gpx(`<rte><rtept lat="41" lon="8"/><rtept lat="41.1" lon="8.1"/></rte>`);
    const esito = analizzaGpx(soloRotta);
    expect(esito.origine).toBe("rotta");
    expect(esito.segmenti[0]).toHaveLength(2);
  });

  it("tiene i waypoint fuori dalla geometria: sono solo etichette", () => {
    const testo = gpx(`
      <wpt lat="40.9" lon="9.5"><name>Olbia</name></wpt>
      <trk><trkseg>${punto(9.0, 40.0)}${punto(9.1, 40.1)}</trkseg></trk>`);
    const esito = analizzaGpx(testo);

    expect(esito.waypoint).toEqual([{ lon: 9.5, lat: 40.9, nome: "Olbia" }]);
    expect(esito.segmenti.flat()).toHaveLength(2);
    expect(esito.segmenti.flat().some((p) => p.lat === 40.9)).toBe(false);
  });

  it("funziona anche senza dichiarazione di namespace", () => {
    const testo = gpx(`<trk><trkseg>${punto(9.0, 40.0)}${punto(9.1, 40.1)}</trkseg></trk>`, "");
    expect(analizzaGpx(testo).segmenti[0]).toHaveLength(2);
  });

  it("regge i punti senza quota", () => {
    const testo = gpx(`<trk><trkseg>${punto(9.0, 40.0)}${punto(9.1, 40.1)}</trkseg></trk>`);
    const esito = analizzaGpx(testo);
    expect(esito.segmenti[0][0].quota).toBeNull();
    expect(esito.metriche.conQuota).toBe(false);
    expect(esito.metriche.dislivelloPositivo).toBeNull();
  });

  it("scarta i segmenti con un solo punto: non sono una traccia", () => {
    const testo = gpx(`<trk><trkseg>${punto(9.0, 40.0)}</trkseg></trk>`);
    expect(analizzaGpx(testo).segmenti).toHaveLength(0);
    expect(analizzaGpx(testo).origine).toBe("nessuna");
  });

  it("rifiuta un XML malformato con un messaggio comprensibile", () => {
    expect(() => analizzaGpx("<gpx><trk>")).toThrow(/GPX valido|malformato/i);
  });

  it("rifiuta un XML valido che non è un GPX", () => {
    expect(() => analizzaGpx("<?xml version='1.0'?><kml><Document/></kml>")).toThrow(/non è un GPX/i);
  });
});

describe("distanzaFra", () => {
  it("misura una distanza nota con scarto inferiore allo 0,5%", () => {
    // Olbia → Cagliari, circa 210 km in linea d'aria.
    const metri = distanzaFra({ lon: 9.4964, lat: 40.9236 }, { lon: 9.1217, lat: 39.2238 });
    expect(metri / 1000).toBeGreaterThan(189);
    expect(metri / 1000).toBeLessThan(192);
  });

  it("restituisce zero fra un punto e se stesso", () => {
    expect(distanzaFra({ lon: 9.5, lat: 40.9 }, { lon: 9.5, lat: 40.9 })).toBe(0);
  });
});

describe("calcolaMetriche", () => {
  it("somma la distanza lungo i segmenti senza saldare gli stacchi", () => {
    // Due segmenti lontani fra loro: il salto NON va conteggiato.
    const a = [{ lon: 9.0, lat: 40.0, quota: null }, { lon: 9.01, lat: 40.0, quota: null }];
    const b = [{ lon: 9.5, lat: 40.0, quota: null }, { lon: 9.51, lat: 40.0, quota: null }];
    const insieme = calcolaMetriche([a, b]).distanzaKm;
    const separate = calcolaMetriche([a]).distanzaKm + calcolaMetriche([b]).distanzaKm;
    expect(insieme).toBeCloseTo(separate, 6);
  });

  it("ignora le oscillazioni di quota sotto la soglia anti-rumore", () => {
    // Salite e discese di 1 m: rumore GPS, non dislivello.
    const seg = Array.from({ length: 40 }, (_, i) => ({
      lon: 9 + i * 0.001, lat: 40, quota: 100 + (i % 2),
    }));
    expect(calcolaMetriche([seg]).dislivelloPositivo).toBe(0);
  });

  it("conta il dislivello quando supera la soglia", () => {
    const seg = [
      { lon: 9.0, lat: 40, quota: 100 },
      { lon: 9.01, lat: 40, quota: 200 },
      { lon: 9.02, lat: 40, quota: 150 },
    ];
    const m = calcolaMetriche([seg]);
    expect(m.dislivelloPositivo).toBe(100);
    expect(m.dislivelloNegativo).toBe(50);
    expect(m.quotaMin).toBe(100);
    expect(m.quotaMax).toBe(200);
  });
});

describe("riquadro", () => {
  it("contiene tutti i punti di tutti i segmenti", () => {
    const r = riquadro([
      [{ lon: 9.0, lat: 40.0 }, { lon: 9.5, lat: 40.5 }],
      [{ lon: 8.5, lat: 41.0 }],
    ]);
    expect(r).toEqual({ minLon: 8.5, maxLon: 9.5, minLat: 40.0, maxLat: 41.0 });
  });

  it("restituisce null se non ci sono punti", () => {
    expect(riquadro([])).toBeNull();
  });
});

describe("semplificaPerDisegno", () => {
  it("conserva sempre il primo e l'ultimo punto", () => {
    const punti = Array.from({ length: 200 }, (_, i) => ({
      lon: 9 + i * 0.001, lat: 40 + Math.sin(i / 8) * 0.01, quota: null,
    }));
    const ridotti = semplificaPerDisegno(punti, 0.002);
    expect(ridotti.length).toBeLessThan(punti.length);
    expect(ridotti[0]).toBe(punti[0]);
    expect(ridotti.at(-1)).toBe(punti.at(-1));
  });

  it("non tocca nulla con tolleranza zero", () => {
    const punti = [{ lon: 9, lat: 40 }, { lon: 9.1, lat: 40.1 }, { lon: 9.2, lat: 40 }];
    expect(semplificaPerDisegno(punti, 0)).toHaveLength(3);
  });

  it("regge tracce lunghe senza esaurire lo stack", () => {
    // Il caso che ha imposto la versione iterativa invece di quella ricorsiva.
    const punti = Array.from({ length: 60000 }, (_, i) => ({
      lon: 9 + i * 0.00001, lat: 40 + Math.sin(i / 500) * 0.02, quota: null,
    }));
    expect(() => semplificaPerDisegno(punti, 0.0001)).not.toThrow();
  });
});
