const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { Phone, Mail, Instagram, Facebook, MessageCircle } from "lucide-react";

const galleryRibbon = [
  "/media/hero-trail.png?v=real2",
  "/media/coast-trail.png?v=real2",
  "/media/hero-trail.png?v=real2",
  "/media/sunset-group.png?v=real2",
  "/media/nuraghe-stop.png?v=real2",
  "/media/sunset-group.png?v=real2",
];

export default function Footer() {
  return (
    <footer className="bg-[#1C1814] border-t border-[#A0612A]/30">
      {/* Gallery ribbon */}
      <div className="overflow-hidden border-b border-[#F5EBD9]/10 py-4">
        <div className="flex gap-2 animate-[scroll_30s_linear_infinite] hover:[animation-play-state:paused]">
          {[...galleryRibbon, ...galleryRibbon].map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-20 w-32 object-cover flex-shrink-0 grayscale hover:grayscale-0 transition-all"
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-heading text-4xl text-[#F5EBD9] tracking-wider">STA</span>
              <span className="font-button text-xs text-[#E4D4B0] tracking-[0.2em] uppercase leading-tight border-l border-[#A0612A] pl-3">
                Sardegna<br />Trail Avventura
              </span>
            </div>
            <p className="font-heading text-2xl text-[#A0612A] tracking-wide leading-tight">
              "La Sardegna che non ti aspetti."
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-button text-xs tracking-[0.2em] uppercase text-[#E4D4B0] mb-5">Navigazione</h4>
            <ul className="space-y-3">
              {[
                { label: "Home", href: "#hero" },
                { label: "Tour", href: "#tour" },
                { label: "Chi Siamo", href: "#chi-siamo" },
                { label: "Gallery", href: "#gallery" },
                { label: "FAQ", href: "#faq" },
                { label: "Contatti", href: "#contatti" },
              ].map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="font-body text-sm text-[#F5EBD9]/70 hover:text-[#A0612A] transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="font-button text-xs tracking-[0.2em] uppercase text-[#E4D4B0] mb-5">Contatti</h4>
            <ul className="space-y-4">
              <li>
                <a href="tel:+393490000000" className="flex items-center gap-3 font-body text-sm text-[#F5EBD9]/70 hover:text-[#A0612A] transition-colors">
                  <Phone size={16} /> +39 349 000 0000
                </a>
              </li>
              <li>
                <a href="mailto:info@sardegnatrailavventura.it" className="flex items-center gap-3 font-body text-sm text-[#F5EBD9]/70 hover:text-[#A0612A] transition-colors">
                  <Mail size={16} /> info@sardegnatrailavventura.it
                </a>
              </li>
              <li>
                <a href="https://wa.me/393490000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-body text-sm text-[#F5EBD9]/70 hover:text-[#A0612A] transition-colors">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </li>
              <li>
                <a href="https://instagram.com/sardegnatrailavventura" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-body text-sm text-[#F5EBD9]/70 hover:text-[#A0612A] transition-colors">
                  <Instagram size={16} /> @sardegnatrailavventura
                </a>
              </li>
              <li>
                <a href="https://facebook.com/sardegnatrailavventura" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-body text-sm text-[#F5EBD9]/70 hover:text-[#A0612A] transition-colors">
                  <Facebook size={16} /> Sardegna Trail Avventura
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="fissure-light mb-8" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body text-xs text-[#F5EBD9]/40 text-center md:text-left">
            © {new Date().getFullYear()} Sardegna Trail Avventura. Tutti i diritti riservati.
          </p>
          <p className="font-body text-xs text-[#F5EBD9]/40">
            Tour Maxienduro · Enduro · Quad in Sardegna
          </p>
        </div>
      </div>
    </footer>
  );
}
