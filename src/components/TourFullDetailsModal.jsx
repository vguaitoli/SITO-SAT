import React from "react";
import { createPortal } from "react-dom";
import { X, Clock, Gauge, TrendingUp, ShieldCheck, Send } from "lucide-react";
import { fotoProps } from "@/data/foto-helpers";

const EQUIPAGGIAMENTO = [
  "Mezzo con gomme tassellate o miste in buono stato, tagliando recente e paramotore/paracolpi montati",
  "Casco integrale o cross con occhiali/maschera",
  "Giacca e pantaloni da enduro con protezioni su spalle, gomiti, schiena e ginocchia",
  "Stivali da motocross e guanti rinforzati",
  "Zaino idrico o borraccia, kit riparazione forature e attrezzi essenziali",
  "Ricambio camera d'aria e batteria/power bank per il telefono",
];

export default function TourFullDetailsModal({ tour, color, onClose }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-[#1C1814]/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#252019] border border-[#F5EBD9]/15 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#252019] border-b border-[#F5EBD9]/10 p-6 flex items-center justify-between z-10">
          <div>
            <span
              className="inline-block font-button text-[10px] tracking-[0.2em] uppercase text-[#1C1814] px-3 py-1 mb-2"
              style={{ backgroundColor: color }}
            >
              {tour.type}
            </span>
            <h3 className="font-heading text-3xl text-[#F5EBD9] tracking-wide">{tour.name}</h3>
          </div>
          <button onClick={onClose} className="text-[#F5EBD9]/60 hover:text-[#A0612A]" aria-label="Chiudi">
            <X size={22} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-6 mb-6 font-body text-sm text-[#F5EBD9]/80">
            <span className="flex items-center gap-1.5"><Clock size={14} style={{ color }} /> {tour.durata}</span>
            <span className="flex items-center gap-1.5"><Gauge size={14} style={{ color }} /> {tour.km}</span>
            <span className="flex items-center gap-1.5"><TrendingUp size={14} style={{ color }} /> {tour.livello}</span>
          </div>

          <p className="font-body text-sm text-[#F5EBD9]/70 leading-relaxed mb-8">{tour.descrizione}</p>

          {tour.tappe && tour.tappe.length > 0 ? (
            <div className="space-y-6">
              {tour.tappe.map((tappa, i) => {
                const foto = fotoProps(tappa.foto);
                return (
                <div key={i} className="flex flex-col sm:flex-row gap-4 border-t border-[#F5EBD9]/10 pt-6 first:border-0 first:pt-0">
                  {foto && (
                    <img
                      src={foto.src}
                      srcSet={foto.srcSet}
                      sizes="(min-width: 640px) 160px, 100vw"
                      alt={foto.alt}
                      loading="lazy"
                      decoding="async"
                      className="w-full sm:w-40 h-32 object-cover flex-shrink-0"
                    />
                  )}
                  <div>
                    <span className="font-button text-[10px] tracking-[0.15em] uppercase" style={{ color }}>
                      Giorno {i + 1}
                    </span>
                    <h4 className="font-heading text-xl text-[#F5EBD9] tracking-wide mb-1">{tappa.title}</h4>
                    <p className="font-body text-sm text-[#F5EBD9]/70 leading-relaxed">{tappa.desc}</p>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <p className="font-body text-sm text-[#F5EBD9]/50 italic">
              Itinerario giornaliero personalizzato, da definire insieme a te.
            </p>
          )}

          <div className="border-t border-[#F5EBD9]/10 mt-8 pt-6">
            <h4 className="font-heading text-xl text-[#F5EBD9] tracking-wide flex items-center gap-2 mb-4">
              <ShieldCheck size={18} style={{ color }} />
              Come equipaggiarsi
            </h4>
            <ul className="space-y-2">
              {EQUIPAGGIAMENTO.map((item, i) => (
                <li key={i} className="font-body text-sm text-[#F5EBD9]/70 leading-relaxed flex gap-2">
                  <span style={{ color }}>•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <a
            href="/#contatti"
            onClick={onClose}
            className="btn-mech mt-8 w-full bg-[#A0612A] hover:bg-[#b87033] text-[#F5EBD9] px-8 py-4 text-base flex items-center justify-center gap-3"
          >
            Iscriviti a questo tour
            <Send size={16} />
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
