const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, MessageCircle } from "lucide-react";

const navLinks = [
{ label: "Home", href: "#hero" },
{ label: "Tour", href: "#tour" },
{ label: "Chi Siamo", href: "#chi-siamo" },
{ label: "Racconti e Avventure", href: "#blog" },
{ label: "News", href: "#news" },
{ label: "Gallery", href: "#gallery" },
{ label: "Recensioni", href: "#recensioni" },
{ label: "FAQ", href: "#faq" },
{ label: "Contatti", href: "#contatti" }];

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
      scrolled ?
      "bg-[#1C1814]/95 backdrop-blur-md border-b border-[#A0612A]/30 py-3" :
      "bg-transparent py-5"}`
      }>
      
      <div className="max-w-7xl mx-auto px-5 lg:px-8 flex items-center justify-between">
        <Link to="/#hero" className="flex items-center gap-2 sm:gap-3 group shrink-0">
          <img
            src="/media/logo-sardegna-trail-avventura.png"
            alt="Sardegna Trail Avventura"
            className="h-9 w-9 sm:h-12 sm:w-12 lg:h-14 lg:w-14 object-contain shrink-0" />
          
          <span className="block font-button text-[10px] sm:text-xs text-[#E4D4B0] tracking-[0.15em] sm:tracking-[0.2em] uppercase leading-tight border-l border-[#A0612A] pl-2 sm:pl-3">
            Sardegna<br />Trail Avventura
          </span>
        </Link>

        <nav className="hidden lg:flex items-center justify-evenly flex-1 gap-6 px-4">
          {navLinks.map((l) =>
          <Link
            key={l.href}
            to={`/${l.href}`}
            className="font-button text-sm text-[#F5EBD9]/80 hover:text-[#A0612A] transition-colors uppercase tracking-wider relative group text-center leading-tight">
            
              {l.label === "Racconti e Avventure" ?
            <span className="inline-block max-w-[80px]">RACCONTI, AVVENTURE</span> :

            l.label
            }
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#A0612A] group-hover:w-full transition-all duration-300" />
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 ml-3 sm:ml-8">
          <a
            href="https://wa.me/393490000000?text=Ciao,%20vorrei%20informazioni%20sui%20vostri%20tour%20in%20Sardegna"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex btn-mech items-center gap-2.5 bg-[#6B7A3E] hover:bg-[#7E8F4A] text-[#F5EBD9] px-6 py-3 text-sm">
            
            <MessageCircle size={16} />
            WhatsApp
          </a>
          <Link
            to="/#contatti"
            className="hidden md:flex btn-mech items-center bg-[#A0612A] hover:bg-[#b87033] text-[#F5EBD9] px-5 py-2.5 text-sm">
            
            Prenota il Tour
          </Link>
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden text-[#F5EBD9] p-2 shrink-0"
            aria-label="Menu">
            
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open &&
      <div className="lg:hidden bg-[#1C1814] border-t border-[#A0612A]/30">
          <nav className="flex flex-col px-5 py-4">
            {navLinks.map((l) =>
          <Link
            key={l.href}
            to={`/${l.href}`}
            onClick={() => setOpen(false)}
            className="font-button text-base text-[#F5EBD9]/90 hover:text-[#A0612A] py-3 border-b border-[#F5EBD9]/10 uppercase tracking-wider">
            
                {l.label}
              </Link>
          )}
            <Link
            to="/#contatti"
            onClick={() => setOpen(false)}
            className="btn-mech bg-[#A0612A] text-[#F5EBD9] px-5 py-3 mt-4 text-center text-sm">
            
              Prenota il Tour
            </Link>
          </nav>
        </div>
      }
    </header>);

}