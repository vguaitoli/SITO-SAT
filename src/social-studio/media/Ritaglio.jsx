import React, { useCallback, useRef, useState } from "react";
import { Maximize2, RotateCcw } from "lucide-react";
import { FOTO } from "../design/tokens";

/**
 * Editor di ritaglio non distruttivo.
 *
 * Non tocca il file: produce soltanto tre numeri — zoom e punto focale x/y — che
 * i template applicano via CSS. L'originale nella libreria resta quello
 * caricato, e cambiare inquadratura non lo degrada mai.
 *
 * Il punto focale si sposta trascinando: è il gesto che corrisponde a ciò che
 * si vede, invece di due campi numerici da indovinare.
 *
 * **Le zone sono quelle vere.** Un riquadro 4:5 generico non rappresenta nulla:
 * la stessa fotografia finisce in una fascia da 1080×700 nel Post, 1080×1040
 * nella Story e 1080×560 nella slide CTA, e lo stesso punto focale dà tre
 * inquadrature diverse. Qui si vedono tutte, con le misure che i template
 * dichiarano in `template/rubriche/eventi/zone.js`.
 */
export default function Ritaglio({ sorgente, valore, onCambia, zone = [] }) {
  const [trascina, setTrascina] = useState(false);
  const riquadro = useRef(null);
  const zoom = valore?.zoom ?? 1;
  const x = valore?.x ?? 0.5;
  const y = valore?.y ?? 0.5;

  // La zona su cui si trascina è la prima: è quella dominante dello slot.
  const principale = zone[0] || { nome: "Ritaglio", larghezza: 1080, altezza: 1350 };
  const secondarie = zone.slice(1);

  const aggiorna = useCallback(
    (patch) => onCambia({ ...valore, zoom, x, y, ...patch }),
    [onCambia, valore, zoom, x, y],
  );

  const daEvento = (e) => {
    const r = riquadro.current?.getBoundingClientRect();
    if (!r) return null;
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const muovi = (e) => {
    if (!trascina) return;
    const p = daEvento(e);
    if (p) aggiorna(p);
  };

  if (!sorgente) {
    return (
      <p className="border border-[var(--border-on-dark)] p-4 font-body text-xs text-granite-mist/50">
        Nessuna immagine selezionata.
      </p>
    );
  }

  return (
    <div>
      <div
        ref={riquadro}
        onPointerDown={(e) => {
          setTrascina(true);
          const p = daEvento(e);
          if (p) aggiorna(p);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={muovi}
        onPointerUp={() => setTrascina(false)}
        onPointerCancel={() => setTrascina(false)}
        style={{
          aspectRatio: `${principale.larghezza} / ${principale.altezza}`,
          cursor: trascina ? "grabbing" : "grab",
        }}
        className="relative w-full select-none overflow-hidden border border-[var(--border-on-dark)]"
      >
        <ImmagineInquadrata sorgente={sorgente} zoom={zoom} x={x} y={y} />
        {/* Il mirino mostra dove cade il punto focale. */}
        <span
          aria-hidden="true"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--accent)] shadow-[0_0_0_1px_rgba(28,24,20,0.6)]"
        />
        <span className="pointer-events-none absolute inset-x-0 top-0 bg-obsidian/70 px-2 py-1 font-button text-[9px] uppercase tracking-[0.2em] text-[var(--accent-soft)]">
          {principale.nome} · {principale.larghezza}×{principale.altezza}
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-obsidian/70 px-2 py-1 text-center font-button text-[9px] uppercase tracking-[0.2em] text-granite-mist/60">
          trascina per scegliere il punto focale
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Maximize2 size={14} aria-hidden="true" className="text-granite-mist/45" />
        <input
          type="range"
          min={1}
          max={2.5}
          step={0.05}
          value={zoom}
          onChange={(e) => aggiorna({ zoom: Number(e.target.value) })}
          className="flex-1 accent-[var(--accent)]"
          aria-label="Zoom"
        />
        <span className="w-12 font-body text-xs text-granite-mist/55">{zoom.toFixed(2)}×</span>
        <button
          type="button"
          onClick={() => onCambia({ ...valore, zoom: 1, x: 0.5, y: 0.5 })}
          title="Ripristina inquadratura"
          className="p-1.5 text-granite-mist/50 transition-colors hover:text-[var(--accent)]"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>

      {secondarie.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 font-button text-[9px] uppercase tracking-[0.2em] text-granite-mist/40">
            Lo stesso punto focale nelle altre zone
          </p>
          <div className="flex flex-wrap items-start gap-2">
            {secondarie.map((z) => (
              <div key={z.id} style={{ width: 96 }}>
                <div
                  style={{ aspectRatio: `${z.larghezza} / ${z.altezza}` }}
                  className="relative overflow-hidden border border-[var(--border-on-dark)]"
                >
                  <ImmagineInquadrata sorgente={sorgente} zoom={zoom} x={x} y={y} />
                </div>
                <p className="mt-1 font-body text-[9px] leading-tight text-granite-mist/45">
                  {z.nome}
                  <br />
                  {z.larghezza}×{z.altezza}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * L'immagine con la stessa geometria che applica `template/Foto.jsx`.
 *
 * Le due implementazioni devono coincidere: se qui il calcolo fosse diverso,
 * l'anteprima del ritaglio mostrerebbe un'inquadratura che l'esportazione non
 * produce. Sono le stesse quattro proprietà, nello stesso ordine.
 */
function ImmagineInquadrata({ sorgente, zoom, x, y }) {
  return (
    <img
      src={sorgente}
      alt=""
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: `${x * 100}% ${y * 100}%`,
        transform: `scale(${zoom})`,
        transformOrigin: `${x * 100}% ${y * 100}%`,
        filter: FOTO.filtro,
        display: "block",
      }}
    />
  );
}
