import React, { useMemo } from "react";
import base from "@/data/mappa-sardegna.json";
import { riquadro } from "../motori/gpx";
import { creaVista, riquadroMinimo, semplificaProiettato, tracciaPath } from "../motori/proiezione";
import { COLORI, FONT, MAPPA } from "../design/tokens";

/**
 * Errore massimo ammesso fra la traccia disegnata e quella vera, in pixel.
 *
 * Mezzo pixel: sotto la soglia in cui l'occhio o il PNG possano distinguerli.
 * È il numero che dà la garanzia, e per questo sta qui con un nome invece di
 * comparire dentro un'espressione.
 */
export const TOLLERANZA_DISEGNO_PX = 0.5;

/**
 * Mappa topografica con la traccia del percorso.
 *
 * La base è nostra: profilo costiero reale da OpenStreetMap e curve di livello
 * generate a build time (src/data/mappa-sardegna.json). Nessun tile esterno,
 * nessuna chiave API, nessuna estetica da mappa stradale.
 *
 * La traccia è quella del GPX. Viene semplificata **solo per il disegno**, e la
 * semplificazione avviene dopo la proiezione, in pixel: l'errore massimo sul
 * canvas è mezzo pixel, e resta mezzo pixel a qualunque latitudine, scala,
 * zoom, spostamento, rotazione e misura di tela. I punti originali restano
 * intatti nel modello, nell'archivio e nelle metriche.
 */
export default function MappaPercorso({
  segmenti = [],
  configurazione,
  larghezza,
  altezza,
  bordi = true,
  /**
   * Fondo del mare. `null` lo rende trasparente: serve alla schermata su carta
   * della Story, dove la mappa deve galleggiare sul fondo chiaro invece di
   * stendere il proprio rettangolo scuro sopra.
   */
  fondo = MAPPA.mare,
}) {
  const cfg = configurazione;

  const vista = useMemo(() => {
    const daTraccia = riquadro(segmenti);
    // Senza GPX si inquadra tutta la Sardegna: la slide resta comunque leggibile.
    const daIsola = {
      minLon: Math.min(...base.costa.map((p) => p[0])),
      maxLon: Math.max(...base.costa.map((p) => p[0])),
      minLat: Math.min(...base.costa.map((p) => p[1])),
      maxLat: Math.max(...base.costa.map((p) => p[1])),
    };
    return creaVista({
      riquadro: riquadroMinimo(daTraccia || daIsola),
      larghezza,
      altezza,
      margine: cfg.margine,
      zoom: cfg.zoom,
      spostamento: cfg.spostamento,
      rotazione: cfg.rotazione,
    });
  }, [segmenti, cfg.margine, cfg.zoom, cfg.spostamento, cfg.rotazione, larghezza, altezza]);

  const { proietta } = vista;
  const proiettaAnello = (anello) => anello.map(([lon, lat]) => proietta(lon, lat));

  /*
   * Si proietta prima e si semplifica dopo.
   *
   * L'ordine è la correzione. Semplificare in gradi obbligava a convertire
   * mezzo pixel in una distanza geografica, e quella conversione era sbagliata
   * di un fattore 360 — `mercatore` normalizza già la longitudine, quindi
   * `scala` è pixel per unità di mondo e non serviva dividere di nuovo. Ne
   * risultava una tolleranza infinitesima, che lasciava in piedi quasi tutti i
   * vertici della traccia e costringeva la cattura a ridisegnarli due volte per
   * ogni grafica con la mappa.
   *
   * In pixel la conversione non serve affatto: la tolleranza **è** già
   * l'errore che si vuole garantire, e `tracciaPath` scrive le coordinate per
   * intero perché il limite valga sul path davvero disegnato.
   */
  const tracce = useMemo(
    () =>
      segmenti
        .map((seg) => seg.map((p) => proietta(p.lon, p.lat)))
        .map((punti) => semplificaProiettato(punti, TOLLERANZA_DISEGNO_PX))
        .filter((punti) => punti.length > 1)
        .map(tracciaPath),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segmenti, vista],
  );

  const primoPunto = segmenti[0]?.[0];
  const ultimoSegmento = segmenti[segmenti.length - 1];
  const ultimoPunto = ultimoSegmento?.[ultimoSegmento.length - 1];

  const idClip = `mappa-clip-${larghezza}x${altezza}`;

  return (
    <svg
      width={larghezza}
      height={altezza}
      viewBox={`0 0 ${larghezza} ${altezza}`}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={idClip}>
          <rect x={0} y={0} width={larghezza} height={altezza} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${idClip})`}>
        {/* Mare */}
        {fondo && <rect x={0} y={0} width={larghezza} height={altezza} fill={fondo} />}

        {cfg.mostraIsola && (
          <>
            {/* Terra */}
            <polygon points={proiettaAnello(base.costa).map((p) => p.join(",")).join(" ")} fill={MAPPA.terra} />
            {base.isolette.map((iso, i) => (
              <polygon
                key={`iso-${i}`}
                points={proiettaAnello(iso).map((p) => p.join(",")).join(" ")}
                fill={MAPPA.terra}
              />
            ))}

            {/* Curve di livello: più scure e più marcate salendo di quota */}
            {base.curve.map((livello, i) => {
              const t = (i + 1) / base.curve.length;
              return (
                <g key={livello.soglia}>
                  {livello.anelli.map((anello, k) => (
                    <polygon
                      key={k}
                      points={proiettaAnello(anello).map((p) => p.join(",")).join(" ")}
                      fill={MAPPA.terraScura}
                      fillOpacity={0.16 + t * 0.2}
                      stroke={t > 0.55 ? MAPPA.curvaForte : MAPPA.curva}
                      strokeWidth={0.9}
                      strokeLinejoin="round"
                    />
                  ))}
                </g>
              );
            })}

            {/* Linea di costa, sopra tutto il resto della terra */}
            <polygon
              points={proiettaAnello(base.costa).map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke={MAPPA.costa}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
            {base.isolette.map((iso, i) => (
              <polygon
                key={`isob-${i}`}
                points={proiettaAnello(iso).map((p) => p.join(",")).join(" ")}
                fill="none"
                stroke={MAPPA.costa}
                strokeWidth={1.2}
              />
            ))}
          </>
        )}

        {/* Traccia GPX: prima l'alone scuro, poi la linea di accento */}
        {tracce.map((d, i) => (
          <path
            key={`alone-${i}`}
            d={d}
            fill="none"
            stroke={MAPPA.tracciaAlone}
            strokeWidth={cfg.spessoreTraccia + 7}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
          />
        ))}
        {tracce.map((d, i) => (
          <path
            key={`traccia-${i}`}
            d={d}
            fill="none"
            stroke={MAPPA.traccia}
            strokeWidth={cfg.spessoreTraccia}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Partenza e arrivo */}
        {cfg.mostraMarker && primoPunto && (
          <MarcatorePartenza punto={proietta(primoPunto.lon, primoPunto.lat)} />
        )}
        {cfg.mostraMarker && ultimoPunto && (
          <MarcatoreArrivo punto={proietta(ultimoPunto.lon, ultimoPunto.lat)} />
        )}

        {/* Località: solo etichette, non toccano la geometria del percorso */}
        {cfg.localita.map((l) => {
          const [x, y] = proietta(l.lon, l.lat);
          if (x < -80 || x > larghezza + 80 || y < -40 || y > altezza + 40) return null;
          return (
            <g key={l.id}>
              <circle cx={x} cy={y} r={5} fill={MAPPA.marker} />
              <circle cx={x} cy={y} r={5} fill="none" stroke={MAPPA.costa} strokeWidth={1.5} />
              {cfg.mostraNomi && (
                <text
                  x={x + 12}
                  y={y + 6}
                  style={{
                    fontFamily: FONT.etichetta,
                    fontSize: 21,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fill: MAPPA.etichetta,
                    paintOrder: "stroke",
                    stroke: "rgba(232, 220, 194, 0.85)",
                    strokeWidth: 5,
                    strokeLinejoin: "round",
                  }}
                >
                  {l.nome}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {bordi && (
        <rect
          x={0.5}
          y={0.5}
          width={larghezza - 1}
          height={altezza - 1}
          fill="none"
          stroke={COLORI.filo}
          strokeWidth={1}
        />
      )}
    </svg>
  );
}

function MarcatorePartenza({ punto: [x, y] }) {
  return (
    <g>
      <circle cx={x} cy={y} r={15} fill={COLORI.verde} stroke={MAPPA.costa} strokeWidth={3} />
      <circle cx={x} cy={y} r={5} fill={MAPPA.costa} />
    </g>
  );
}

function MarcatoreArrivo({ punto: [x, y] }) {
  return (
    <g>
      <circle cx={x} cy={y} r={15} fill={COLORI.accento} stroke={MAPPA.costa} strokeWidth={3} />
      <rect x={x - 4} y={y - 4} width={8} height={8} fill={MAPPA.costa} />
    </g>
  );
}
