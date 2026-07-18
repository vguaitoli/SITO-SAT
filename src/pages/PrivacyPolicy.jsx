import React from "react";
import { Link } from "react-router-dom";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/Footer";
import { SITE } from "@/config/site";

// Informativa sul trattamento dei dati personali (GDPR - Reg. UE 2016/679, art. 13).
// I contenuti descrivono solo trattamenti realmente presenti nel sito:
// il modulo di contatto (consegnato via email tramite Web3Forms) e i canali
// diretti (telefono, WhatsApp, email). Nessun analytics, nessuna profilazione.

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

export default function PrivacyPolicy() {
  const { legale } = SITE;
  return (
    <div className="bg-[#1C1814] min-h-screen topo-dark">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-32 lg:pt-40 pb-16 lg:pb-24">
        <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">Privacy</p>
        <h1 className="font-heading text-5xl lg:text-6xl text-[#F5EBD9] leading-none mb-4">
          INFORMATIVA <span className="text-[#A0612A]">PRIVACY</span>
        </h1>
        <p className="font-body text-[#F5EBD9]/50 text-sm mb-12">
          Ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR).
        </p>

        <Sezione n="1" titolo="Titolare del trattamento">
          <p>
            Il Titolare del trattamento è <strong className="text-[#F5EBD9]">{legale.ragioneSociale}</strong>{" "}
            ({legale.formaGiuridica}), P.IVA {legale.partitaIva}, con sede in {legale.sede}.
          </p>
          <p>
            Per qualsiasi richiesta relativa ai tuoi dati personali puoi scrivere a{" "}
            <a href={`mailto:${SITE.email}`} className="text-[#A0612A] underline">{SITE.email}</a>.
          </p>
        </Sezione>

        <Sezione n="2" titolo="Quali dati raccogliamo">
          <p>
            Raccogliamo esclusivamente i dati che ci fornisci spontaneamente quando ci
            contatti tramite il modulo presente sul sito o tramite i canali diretti
            (telefono, WhatsApp, email):
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>nome;</li>
            <li>indirizzo email;</li>
            <li>numero di telefono (facoltativo);</li>
            <li>tour di interesse e data desiderata (facoltativi);</li>
            <li>il contenuto del messaggio che ci invii.</li>
          </ul>
          <p>
            Il sito <strong className="text-[#F5EBD9]">non utilizza cookie di profilazione,
            strumenti di analisi statistica o di tracciamento</strong> e non raccoglie dati a
            tua insaputa. Per i dettagli sui cookie e sugli strumenti tecnici consulta la{" "}
            <Link to="/cookie-policy" className="text-[#A0612A] underline">Cookie Policy</Link>.
          </p>
        </Sezione>

        <Sezione n="3" titolo="Finalità e base giuridica">
          <p>
            I dati che ci comunichi sono trattati per un'unica finalità: <strong className="text-[#F5EBD9]">rispondere
            alla tua richiesta</strong> e fornirti informazioni sui tour e sulle attività di
            Sardegna Trail Avventura, gestendo l'eventuale organizzazione dell'esperienza.
          </p>
          <p>
            La base giuridica del trattamento è l'esecuzione di misure precontrattuali
            adottate su tua richiesta (art. 6, par. 1, lett. b del GDPR) e il nostro
            legittimo interesse a dare riscontro alle comunicazioni ricevute (art. 6, par. 1,
            lett. f).
          </p>
        </Sezione>

        <Sezione n="4" titolo="Come vengono trattati i dati">
          <p>
            Le richieste inviate dal modulo di contatto ci vengono recapitate via email
            attraverso il servizio <strong className="text-[#F5EBD9]">Web3Forms</strong>
            {" "}(Web3Forms), che agisce come responsabile del trattamento limitatamente alla
            trasmissione del messaggio. Le email vengono poi ricevute e conservate sulla
            casella di posta del Titolare.
          </p>
          <p>
            I dati non vengono diffusi né ceduti a terzi per finalità commerciali o di
            marketing.
          </p>
        </Sezione>

        <Sezione n="5" titolo="Per quanto tempo conserviamo i dati">
          <p>
            Conserviamo i dati per il tempo strettamente necessario a gestire la tua
            richiesta e gli eventuali rapporti che ne derivano. Le comunicazioni a cui non
            segue alcun rapporto vengono eliminate quando non più necessarie. Puoi in ogni
            momento chiederci la cancellazione (vedi punto 7).
          </p>
        </Sezione>

        <Sezione n="6" titolo="Comunicazione e trasferimento dei dati">
          <p>
            I dati possono essere trattati dal personale autorizzato del Titolare e dal
            fornitore del servizio di invio del modulo (Web3Forms) e della casella email.
            Non effettuiamo trasferimenti di dati verso Paesi extra-UE se non nell'ambito dei
            servizi tecnici sopra indicati e nel rispetto delle garanzie previste dal GDPR.
          </p>
        </Sezione>

        <Sezione n="7" titolo="I tuoi diritti">
          <p>In qualità di interessato hai il diritto di:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>accedere ai tuoi dati e ottenerne copia (art. 15);</li>
            <li>chiederne la rettifica o l'aggiornamento (art. 16);</li>
            <li>chiederne la cancellazione (art. 17);</li>
            <li>chiedere la limitazione del trattamento (art. 18);</li>
            <li>opporti al trattamento (art. 21);</li>
            <li>ricevere i tuoi dati in formato portabile (art. 20).</li>
          </ul>
          <p>
            Per esercitare questi diritti scrivi a{" "}
            <a href={`mailto:${SITE.email}`} className="text-[#A0612A] underline">{SITE.email}</a>.
            Hai inoltre il diritto di proporre reclamo all'Autorità Garante per la protezione
            dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-[#A0612A] underline">garanteprivacy.it</a>).
          </p>
        </Sezione>

        <Sezione n="8" titolo="Modifiche a questa informativa">
          <p>
            Potremmo aggiornare questa informativa per adeguarla a modifiche normative o dei
            servizi utilizzati. La versione pubblicata su questa pagina è sempre quella
            vigente.
          </p>
        </Sezione>

        <Link
          to="/#contatti"
          className="btn-mech inline-flex bg-[#A0612A] hover:bg-[#b87033] text-[#F5EBD9] px-8 py-4 text-base mt-4"
        >
          Torna ai contatti
        </Link>
      </div>
      <Footer />
    </div>
  );
}
