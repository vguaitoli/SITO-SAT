import React, { useMemo } from "react";
import base from "@/data/mappa-sardegna.json";
import { riquadro, semplificaPerDisegno } from "../motori/gpx";
import { creaVista, riquadroMinimo, tracciaPath } from "../motori/proiezione";
import { COLORI, FONT, MAPPA } from "../design/tokens";

/**
 * Mappa topografica con la traccia del percorso.
 *
 * La base è nostra: profilo costiero reale da OpenStreetMap e curve di livello
 * generate a build time (src/data/mappa-sardegna.json). Nessun tile esterno,
 * nessuna chiave API, nessuna estetica da mappa stradale.
 *
 * La traccia è quella del GPX. Viene semplificata solo per il disegno, con una
 * tolleranza pari a mezzo pixel alla scala corrente: a schermo è indistinguibile
 * dall'originale, e i punti originali restano intatti nel modello.
 */
export default function MappaPercorso({
  segmenti = [],
  configurazione,
  larghezza,
  altezza,
  bordi = true,
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

  const { proietta, scala } = vista;
  const proiettaAnello = (anello) => anello.map(([lon, lat]) => proietta(lon, lat));

  // Mezzo pixel espresso in gradi di longitudine: sotto questa soglia due punti
  // finiscono comunque sullo stesso pixel.
  const tolleranza = 0.5 / scala / 360;

  const tracce = useMemo(
    () =>
      segmenti
        .map((seg) => semplificaPerDisegno(seg, tolleranza))
        .filter((seg) => seg.length > 1)
        .map((seg) => tracciaPath(seg.map((p) => proietta(p.lon, p.lat)))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segmenti, tolleranza, vista],
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
        <rect x={0} y={0} width={larghezza} height={altezza} fill={MAPPA.mare} />

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
