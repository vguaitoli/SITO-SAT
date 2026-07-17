import React, { Suspense, lazy } from "react";
import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";

/**
 * Home narrativa e snella. Un'unica spina dorsale di navigazione — le cinque
 * esperienze (mezzi) — poi un percorso che risponde, in ordine, alle domande
 * dell'utente: cosa scelgo → che tour esistono → cosa vivrò → perché voi →
 * chi siete → com'è → cosa include → dubbi → prenoto.
 * Il catalogo completo dei tour e i racconti del blog vivono su pagine dedicate.
 */
const TrustBar = lazy(() => import("@/components/TrustBar"));
const Categorie = lazy(() => import("@/components/Categorie"));
const TourInEvidenza = lazy(() => import("@/components/TourInEvidenza"));
const Experience = lazy(() => import("@/components/Experience"));
const About = lazy(() => import("@/components/About"));
const Guides = lazy(() => import("@/components/Guides.jsx?guideportraits=3"));
const Gallery = lazy(() => import("@/components/Gallery"));
const Included = lazy(() => import("@/components/Included"));
const FAQ = lazy(() => import("@/components/FAQ"));
const Contact = lazy(() => import("@/components/Contact"));
const MobileCta = lazy(() => import("@/components/MobileCta"));
const Footer = lazy(() => import("@/components/Footer"));

function SectionFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--granite-mist)]/20 border-t-[var(--accent)]" />
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-[var(--obsidian)]">
      <SiteNav />
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        {/* Promessa di valore in numeri reali */}
        <TrustBar />
        {/* Scegli la tua avventura — le 5 esperienze (unica porta d'ingresso) */}
        <Categorie />
        {/* Assaggio di itinerari reali → catalogo completo su /itinerari */}
        <TourInEvidenza />
        {/* Racconto del territorio: cosa vivrai in Sardegna */}
        <Experience />
        {/* Prima le guide che ti accompagnano, poi il racconto di chi siamo */}
        <Guides />
        <About />
        {/* Galleria editoriale (foto reali) */}
        <Gallery />
        {/* Cosa è incluso — informazioni utili prima di prenotare */}
        <Included />
        <FAQ />
        {/* CTA finale: verifica disponibilità */}
        <Contact />
        <Footer />
        <MobileCta />
      </Suspense>
    </div>
  );
}
