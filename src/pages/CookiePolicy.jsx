import React from "react";
import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { SITE } from "@/config/site";

// Cookie Policy. Il sito è volutamente "cookie-free": non imposta cookie,
// non usa analytics né strumenti di profilazione. L'unico dato conservato nel
// browser è un valore tecnico in localStorage necessario al funzionamento.
// Per questo NON è previsto (né richiesto) un banner di consenso.

const Sezione = ({ n, titolo, children }) => (
  <section className="mb-10">
    <h2 className="font-heading text-2xl lg:text-3xl text-[#F5EBD9] mb-3 tracking-wide">
      <span className="text-[#A0612A]">{n}.</span> {titolo}
    </h2>
    <div className="space-y-3 font-body text-sm leading-relaxed text-[#F5EBD9]/70">
      {children}
    </div>
  </section>
);

export default function CookiePolicy() {
  const { legale } = SITE;
  return (
    <div className="bg-[#1C1814] min-h-screen topo-dark">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-32 lg:pt-40 pb-16 lg:pb-24">
        <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">Cookie</p>
        <h1 className="font-heading text-5xl lg:text-6xl text-[#F5EBD9] leading-none mb-4">
          COOKIE <span className="text-[#A0612A]">POLICY</span>
        </h1>
        <p className="font-body text-[#F5EBD9]/50 text-sm mb-12">
          Come questo sito utilizza cookie e strumenti di archiviazione locale.
        </p>

        <Sezione n="1" titolo="Questo sito non usa cookie di profilazione">
          <p>
            Sardegna Trail Avventura ha scelto un approccio rispettoso della tua privacy:
            il sito <strong className="text-[#F5EBD9]">non installa cookie di profilazione,
            di marketing o di tracciamento</strong>, non utilizza strumenti di analisi
            statistica (come Google Analytics) e non condivide i tuoi dati di navigazione con
            terze parti a fini pubblicitari.
          </p>
          <p>
            Per questo motivo <strong className="text-[#F5EBD9]">non è presente alcun banner
            di consenso ai cookie</strong>: non essendoci cookie che richiedono il tuo
            consenso, non c'è nulla da accettare.
          </p>
        </Sezione>

        <Sezione n="2" titolo="Cosa sono i cookie">
          <p>
            I cookie sono piccoli file di testo che i siti salvano sul dispositivo dell'utente.
            Possono essere "tecnici" (necessari al funzionamento del sito) oppure "di
            profilazione" (usati per tracciare la navigazione e proporre pubblicità mirata).
            La normativa richiede il consenso preventivo solo per questi ultimi.
          </p>
        </Sezione>

        <Sezione n="3" titolo="Strumenti tecnici utilizzati">
          <p>
            Per il solo funzionamento del sito viene utilizzato un valore tecnico salvato
            nella memoria locale del browser (localStorage):
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-[#F5EBD9]">base44_from_url</strong> — valore tecnico
              impostato dalla piattaforma su cui è realizzato il sito, utile al corretto
              caricamento delle pagine. Non contiene dati personali e non traccia la tua
              navigazione.
            </li>
          </ul>
          <p>
            Questi strumenti tecnici non richiedono consenso e possono essere rimossi in ogni
            momento cancellando i dati di navigazione dalle impostazioni del tuo browser.
          </p>
        </Sezione>

        <Sezione n="4" titolo="Font e risorse esterne">
          <p>
            I caratteri tipografici del sito sono ospitati direttamente sui nostri server
            (self-hosted): il sito <strong className="text-[#F5EBD9]">non effettua chiamate a
            Google Fonts</strong> né ad altri servizi esterni durante la navigazione, evitando
            così il trasferimento del tuo indirizzo IP a terze parti.
          </p>
        </Sezione>

        <Sezione n="5" titolo="Modulo di contatto">
          <p>
            Quando invii una richiesta tramite il modulo di contatto, i dati vengono
            trasmessi via email tramite un servizio esterno (Web3Forms). Questa operazione
            avviene solo su tua azione volontaria e non comporta l'installazione di cookie di
            tracciamento. Il trattamento dei dati inviati è descritto nell'{" "}
            <Link to="/privacy" className="text-[#A0612A] underline">Informativa Privacy</Link>.
          </p>
        </Sezione>

        <Sezione n="6" titolo="Come gestire i cookie dal browser">
          <p>
            Anche se questo sito non usa cookie di profilazione, puoi in ogni momento
            controllare e cancellare cookie e dati salvati dai siti tramite le impostazioni
            del tuo browser (sezione "Privacy" o "Cronologia").
          </p>
        </Sezione>

        <Sezione n="7" titolo="Titolare e contatti">
          <p>
            Titolare del trattamento: <strong className="text-[#F5EBD9]">{legale.ragioneSociale}</strong>{" "}
            ({legale.formaGiuridica}), P.IVA {legale.partitaIva}, {legale.sede}. Per
            informazioni scrivi a{" "}
            <a href={`mailto:${SITE.email}`} className="text-[#A0612A] underline">{SITE.email}</a>.
          </p>
        </Sezione>

        <Link
          to="/privacy"
          className="btn-mech inline-flex bg-[#A0612A] hover:bg-[#b87033] text-[#F5EBD9] px-8 py-4 text-base mt-4"
        >
          Leggi l'Informativa Privacy
        </Link>
      </div>
      <Footer />
    </div>
  );
}
