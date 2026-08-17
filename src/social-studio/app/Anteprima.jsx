import React, { useLayoutEffect, useRef, useState } from "react";
import { FORMATI } from "../design/formati";

/**
 * Anteprima dal vivo.
 *
 * La grafica viene disegnata alla sua misura reale — 1080×1350 o 1080×1920 — e
 * poi rimpicciolita con una trasformazione CSS. Non è un dettaglio tecnico: è
 * ciò che rende l'anteprima **lo stesso oggetto** che verrà fotografato
 * dall'esportazione. Non esistono due implementazioni del template, quindi non
 * c'è nulla da tenere allineato.
 *
 * Il nodo a misura reale è raggiungibile dall'esterno tramite `riferimento`:
 * l'esportazione fotografa quello, non la versione scalata.
 */
export default function Anteprima({ formato = "post", children, riferimento, massimaAltezza = 620 }) {
  const f = FORMATI[formato];
  const contenitore = useRef(null);
  const [scala, setScala] = useState(0.4);

  useLayoutEffect(() => {
    const el = contenitore.current;
    if (!el) return undefined;

    const calcola = () => {
      const larghezzaDisponibile = el.clientWidth || f.larghezza;
      setScala(Math.min(larghezzaDisponibile / f.larghezza, massimaAltezza / f.altezza));
    };

    calcola();
    const osservatore = new ResizeObserver(calcola);
    osservatore.observe(el);
    return () => osservatore.disconnect();
  }, [f.larghezza, f.altezza, massimaAltezza]);

  return (
    <div ref={contenitore} style={{ width: "100%" }}>
      <div
        style={{
          width: f.larghezza * scala,
          height: f.altezza * scala,
          overflow: "hidden",
          // Il fondo si vede solo mentre i font arrivano.
          background: "#1C1814",
        }}
      >
        <div
          ref={riferimento}
          style={{
            width: f.larghezza,
            height: f.altezza,
            transform: `scale(${scala})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Contenitore fuori schermo per l'esportazione.
 *
 * L'esportazione ha bisogno del nodo a misura reale, senza trasformazioni: una
 * `scale()` verrebbe fotografata così com'è. Lo si tiene fuori dalla vista con
 * un `position: fixed` a coordinate negative invece di `display: none`, perché
 * un nodo nascosto non ha dimensioni e html2canvas non saprebbe cosa ritagliare.
 */
export function FuoriSchermo({ formato = "post", children, riferimento }) {
  const f = FORMATI[formato];
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -99999,
        top: 0,
        width: f.larghezza,
        height: f.altezza,
        pointerEvents: "none",
        opacity: 0,
      }}
    >
      <div ref={riferimento} style={{ width: f.larghezza, height: f.altezza }}>
        {children}
      </div>
    </div>
  );
}
