const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Phone, MessageCircle, Mail, Instagram, Facebook, MapPin, Send, Check } from "lucide-react";
import { SITE } from "@/config/site";
import { tours } from "@/components/TourDetails.jsx?modalfix=1";

const contacts = [
  { label: "Telefono", value: SITE.telefono.display, href: SITE.telefono.href, icon: Phone },
  { label: "WhatsApp", value: "Chat immediata", href: SITE.whatsapp.href, icon: MessageCircle },
  { label: "Email", value: SITE.email, href: `mailto:${SITE.email}`, icon: Mail },
  { label: "Instagram", value: "@sardegnatrailavventura", href: SITE.social.instagram, icon: Instagram },
  { label: "Facebook", value: SITE.nome, href: SITE.social.facebook, icon: Facebook },
  { label: "Dove siamo", value: SITE.luogo.regione, href: SITE.luogo.mapsHref, icon: MapPin },
];

// Finché i recapiti non sono verificati mostriamo solo i canali reali (la
// posizione): telefono/WhatsApp/email/social restano nascosti ed è il modulo
// a raccogliere le richieste.
const visibleContacts = SITE.contattiVerificati
  ? contacts
  : contacts.filter((c) => c.label === "Dove siamo");

// Elenco tour reale, con il tipo per orientare la richiesta.
const tourOptions = tours.map((t) => `${t.name} (${t.type})`);

export default function Contact() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefono: "",
    tour: "",
    data: "",
    messaggio: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const body = `Nuova richiesta di prenotazione:\n\nNome: ${form.nome}\nEmail: ${form.email}\nTelefono: ${form.telefono}\nTour: ${form.tour}\nData desiderata: ${form.data}\n\nMessaggio:\n${form.messaggio}`;
      await db.integrations.Core.SendEmail({
        to: "info@sardegnatrailavventura.it",
        subject: `Nuova richiesta: ${form.tour || "Tour"} - ${form.nome}`,
        body,
      });
      setSent(true);
      setForm({ nome: "", email: "", telefono: "", tour: "", data: "", messaggio: "" });
    } catch (err) {
      setError(
        SITE.contattiVerificati
          ? "Si è verificato un errore. Riprova o contattaci via WhatsApp."
          : "Si è verificato un errore. Riprova tra qualche istante.",
      );
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    "w-full bg-transparent border-b border-[#F5EBD9]/20 focus:border-[#A0612A] py-3 px-0 font-body text-[#F5EBD9] placeholder-[#F5EBD9]/40 outline-none transition-colors";

  return (
    <section id="contatti" className="bg-[#1C1814] topo-dark py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-16">
          <p className="font-button text-[#E4D4B0] text-xs tracking-[0.3em] uppercase mb-4">Contatti</p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none">
            PRENOTA LA TUA<br />
            <span className="text-[#A0612A]">PROSSIMA AVVENTURA</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Contact info */}
          <div>
            <h3 className="font-heading text-3xl text-[#F5EBD9] mb-8 tracking-wide">Raggiungici</h3>
            {!SITE.contattiVerificati && (
              <p className="mb-6 font-body text-sm leading-relaxed text-[#F5EBD9]/60">
                Telefono e WhatsApp in aggiornamento: compila il modulo qui a
                fianco e ti ricontattiamo al più presto.
              </p>
            )}
            <div className="space-y-1">
              {visibleContacts.map((c) => {
                const Icon = c.icon;
                return (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 py-4 border-b border-[#F5EBD9]/10 hover:border-[#A0612A] transition-colors"
                  >
                    <span className="w-11 h-11 border border-[#6B7A3E]/50 group-hover:border-[#A0612A] group-hover:bg-[#A0612A] flex items-center justify-center transition-all flex-shrink-0">
                      <Icon size={18} className="text-[#E4D4B0] group-hover:text-[#F5EBD9] transition-colors" />
                    </span>
                    <div className="flex-1">
                      <p className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50">{c.label}</p>
                      <p className="font-body text-[#F5EBD9] group-hover:text-[#A0612A] transition-colors">{c.value}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div className="bg-[#6B7A3E]/20 border border-[#6B7A3E] p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#6B7A3E] flex items-center justify-center mb-6">
                  <Check size={32} className="text-[#F5EBD9]" />
                </div>
                <h3 className="font-heading text-3xl text-[#F5EBD9] mb-3 tracking-wide">Richiesta inviata!</h3>
                <p className="font-body text-[#F5EBD9]/70 mb-6">
                  Ti contatteremo entro 24 ore.
                  {SITE.contattiVerificati && " Per una risposta immediata, scrivici su WhatsApp."}
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="btn-mech border border-[#F5EBD9]/30 text-[#F5EBD9] hover:bg-[#A0612A] hover:border-[#A0612A] px-6 py-3 text-sm"
                >
                  Nuova richiesta
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contact-nome" className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50 block mb-1">Nome *</label>
                    <input
                      id="contact-nome"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      placeholder="Il tuo nome"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-telefono" className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50 block mb-1">Telefono</label>
                    <input
                      id="contact-telefono"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Numero"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-email" className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50 block mb-1">Email *</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder="La tua email"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contact-tour" className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50 block mb-1">Tour</label>
                    <select
                      id="contact-tour"
                      name="tour"
                      value={form.tour}
                      onChange={handleChange}
                      className={inputClass + " text-[#F5EBD9]"}
                    >
                      <option value="" className="bg-[#1C1814]">Seleziona...</option>
                      {tourOptions.map((t) => (
                        <option key={t} value={t} className="bg-[#1C1814]">
                          {t}
                        </option>
                      ))}
                      <option value="Non so ancora / consigliatemi voi" className="bg-[#1C1814]">
                        Non so ancora / consigliatemi voi
                      </option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-data" className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50 block mb-1">Data desiderata</label>
                    <input
                      id="contact-data"
                      name="data"
                      type="date"
                      value={form.data}
                      onChange={handleChange}
                      className={inputClass + " text-[#F5EBD9]"}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-messaggio" className="font-button text-[10px] tracking-[0.2em] uppercase text-[#F5EBD9]/50 block mb-1">Messaggio</label>
                  <textarea
                    id="contact-messaggio"
                    name="messaggio"
                    value={form.messaggio}
                    onChange={handleChange}
                    rows={4}
                    className={inputClass + " resize-none"}
                    placeholder="Raccontaci la tua avventura ideale..."
                  />
                </div>
                {error && <p className="font-body text-sm text-[#A0612A]">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-mech w-full bg-[#A0612A] hover:bg-[#b87033] disabled:opacity-50 text-[#F5EBD9] px-8 py-4 text-base flex items-center justify-center gap-3"
                >
                  {sending ? "Invio in corso..." : "Invia richiesta"}
                  {!sending && <Send size={16} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}