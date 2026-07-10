const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import TourCard from "@/components/TourCard.jsx?modalfix=1";

const filterLabels = {
  weekend: "Weekend Adventure",
  week: "Sardegna Trail Week",
  custom: "Tour Personalizzati",
};

const tours = [
  {
    name: "Supramonte Extreme",
    type: "Maxienduro",
    durata: "3 Giorni",
    km: "260 km",
    livello: "Esperto",
    sterrato: "88%",
    interesse: "Tiscali, Golgo, Cala Luna, Baunei",
    pranzo: true,
    periodo: "Ottobre - Aprile",
    descrizione: "Tre giorni nel cuore del Supramonte, dai nuraghi d'altura alle gole calcaree.",
    groups: ["weekend"],
    meteo: { lat: 40.244, lng: 9.383, nome: "Supramonte" },
    tappe: [
      { title: "Verso Tiscali", desc: "Si parte alla volta dell'altopiano di Tiscali, tra doline e villaggi nuragici nascosti nella roccia.", img: "/media/hero-trail.png?v=real2" },
      { title: "Golgo e i canyon", desc: "Attraversiamo l'altopiano del Golgo fino ai bordi del canyon, con soste panoramiche mozzafiato.", img: "/media/sunset-group.png?v=real2" },
      { title: "Cala Luna e Baunei", desc: "Discesa verso la costa, tra sentieri stretti e la vista finale sulla splendida Cala Luna.", img: "/media/sunset-group.png?v=real2" },
    ],
  },
  {
    name: "Barbagia Trail",
    type: "Enduro",
    durata: "2 Giorni",
    km: "180 km",
    livello: "Avanzato",
    sterrato: "85%",
    interesse: "Borghi antichi, Canyon di Gorropu, Foreste",
    pranzo: true,
    periodo: "Ottobre - Maggio",
    descrizione: "Due giorni di sentieri tecnici nella Barbagia più selvaggia, tra borghi di pietra e passaggi da enduro puro.",
    groups: ["weekend"],
    meteo: { lat: 40.05, lng: 9.30, nome: "Barbagia" },
    tappe: [
      { title: "Borghi antichi", desc: "Attraversiamo i borghi di pietra della Barbagia, tra vicoli, murales e antiche tradizioni pastorali.", img: "/media/nuraghe-stop.png?v=real2" },
      { title: "Canyon di Gorropu e foreste", desc: "Sentieri tecnici tra le foreste secolari fino al bordo del canyon di Gorropu, uno dei più profondi d'Europa.", img: "/media/sunset-group.png?v=real2" },
    ],
  },
  {
    name: "Costa & Dune Expedition",
    type: "Quad",
    durata: "2 Giorni",
    km: "220 km",
    livello: "Principiante",
    sterrato: "60%",
    interesse: "Dune di Piscinas, Costa verde, Miniere abbandonate",
    pranzo: true,
    periodo: "Tutto l'anno",
    descrizione: "Due giorni tra dune dorate e coste incontaminate, con pernottamento e mezzi quad accessibili a tutti.",
    groups: ["weekend"],
    meteo: { lat: 39.45, lng: 8.53, nome: "Costa Verde" },
    tappe: [
      { title: "Dune di Piscinas", desc: "Prime evoluzioni tra le dune dorate più alte d'Europa, con soste fotografiche e pranzo tipico.", img: "/media/coast-trail.png?v=real2" },
      { title: "Costa Verde e miniere", desc: "Costeggiamo la Costa Verde tra spiagge selvagge e le suggestive miniere abbandonate del Sulcis.", img: "/media/coast-trail.png?v=real2" },
    ],
  },
  {
    name: "Sardegna 4x4 Explorer",
    type: "4x4",
    durata: "4 Giorni",
    km: "350 km",
    livello: "Intermedio",
    sterrato: "70%",
    interesse: "Altipiani del Gennargentu, Miniere del Sulcis, Coste selvagge",
    pranzo: true,
    periodo: "Marzo - Novembre",
    descrizione: "Quattro giorni a bordo di mezzi 4x4 tra altipiani, miniere abbandonate e coste remote.",
    groups: ["weekend"],
    meteo: { lat: 40.0, lng: 9.2, nome: "Gennargentu" },
    tappe: [
      { title: "Altipiani del Gennargentu", desc: "Saliamo verso gli altipiani più alti della Sardegna, tra panorami infiniti e strade sterrate.", img: "/media/sunset-group.png?v=real2" },
      { title: "Miniere del Sulcis", desc: "Visita ai suggestivi villaggi minerari abbandonati, testimonianza della storia mineraria dell'isola.", img: "/media/coast-trail.png?v=real2" },
      { title: "Coste selvagge", desc: "Discesa verso coste remote e incontaminate, lontane dai percorsi turistici classici.", img: "/media/sunset-group.png?v=real2" },
      { title: "Rientro panoramico", desc: "Ultimo giorno tra borghi dell'entroterra e soste panoramiche prima del rientro.", img: "/media/nuraghe-stop.png?v=real2" },
    ],
  },
  {
    name: "Gennargentu Wild",
    type: "Maxienduro",
    durata: "4 Giorni",
    km: "380 km",
    livello: "Esperto",
    sterrato: "80%",
    interesse: "Nuraghi, Boschi secolari, Panorami Supramonte",
    pranzo: true,
    periodo: "Marzo - Giugno · Settembre - Novembre",
    descrizione: "Quattro giorni tra le creste del Gennargentu, sterrati panoramici e discese verso valli incontaminate.",
    groups: ["weekend"],
    meteo: { lat: 40.0, lng: 9.2, nome: "Gennargentu" },
    tappe: [
      { title: "Nuraghi e primi sentieri", desc: "Partiamo tra antichi nuraghi e i primi sterrati panoramici che introducono al massiccio.", img: "/media/hero-trail.png?v=real2" },
      { title: "Boschi secolari", desc: "Attraversiamo foreste di lecci secolari lungo sentieri tecnici immersi nella natura.", img: "/media/sunset-group.png?v=real2" },
      { title: "Panorami sul Supramonte", desc: "Saliamo verso i crinali più alti con vista sul Supramonte e le valli circostanti.", img: "/media/sunset-group.png?v=real2" },
      { title: "Discesa finale", desc: "Ultima tappa tra valli incontaminate e borghi dell'entroterra prima del rientro.", img: "/media/nuraghe-stop.png?v=real2" },
    ],
  },
  {
    name: "Sardegna Enduro Week",
    type: "Enduro",
    durata: "7 Giorni",
    km: "620 km",
    livello: "Avanzato",
    sterrato: "82%",
    interesse: "Nuraghi, Barbagia, Supramonte, Golfo di Orosei",
    pranzo: true,
    periodo: "Aprile - Ottobre",
    descrizione: "Una settimana immersiva tra i sentieri enduro più suggestivi dell'isola.",
    groups: ["week"],
    meteo: { lat: 40.28, lng: 9.70, nome: "Golfo di Orosei" },
    tappe: [
      { title: "Nuraghi e primi sterrati", desc: "Prime uscite tra antichi nuraghi e sterrati di livello progressivo per prendere confidenza.", img: "/media/hero-trail.png?v=real2" },
      { title: "Barbagia profonda", desc: "Ci addentriamo nella Barbagia più autentica, tra borghi di pietra e tradizioni pastorali.", img: "/media/nuraghe-stop.png?v=real2" },
      { title: "Supramonte tecnico", desc: "Giornata impegnativa tra i sentieri più tecnici del Supramonte, con vista su Tiscali.", img: "/media/sunset-group.png?v=real2" },
      { title: "Golfo di Orosei", desc: "Discesa verso il Golfo di Orosei, tra calette e sterrati a picco sul mare.", img: "/media/coast-trail.png?v=real2" },
      { title: "Canyon e altipiani", desc: "Esplorazione dei canyon interni e degli altipiani che dividono le due coste dell'isola.", img: "/media/coast-trail.png?v=real2" },
      { title: "Tramonto in sella", desc: "Tappa panoramica pensata per godersi il tramonto sardo dai punti più suggestivi del percorso.", img: "/media/sunset-group.png?v=real2" },
      { title: "Rientro e saluti", desc: "Ultima giornata leggera tra i borghi vicino alla base, per chiudere la settimana in bellezza.", img: "/media/hero-trail.png?v=real2" },
    ],
  },
  {
    name: "Isola in Quad Week",
    type: "Quad",
    durata: "7 Giorni",
    km: "580 km",
    livello: "Intermedio",
    sterrato: "65%",
    interesse: "Dune di Piscinas, Coste, Altipiani, Borghi storici",
    pranzo: true,
    periodo: "Tutto l'anno",
    descrizione: "Sette giorni in quad per esplorare l'isola da costa a costa, tra dune e altipiani.",
    groups: ["week"],
    meteo: { lat: 39.45, lng: 8.53, nome: "Costa Verde" },
    tappe: [
      { title: "Dune di Piscinas", desc: "Si parte tra le dune dorate più alte d'Europa, prendendo confidenza con il mezzo.", img: "/media/coast-trail.png?v=real2" },
      { title: "Costa Verde", desc: "Percorriamo la costa selvaggia tra spiagge nascoste e falesie a picco sul mare.", img: "/media/coast-trail.png?v=real2" },
      { title: "Miniere abbandonate", desc: "Visita ai villaggi minerari del Sulcis, tra archeologia industriale e paesaggi lunari.", img: "/media/sunset-group.png?v=real2" },
      { title: "Altipiani centrali", desc: "Saliamo verso gli altipiani interni, con lunghi tratti panoramici in quota.", img: "/media/hero-trail.png?v=real2" },
      { title: "Borghi storici", desc: "Tappa culturale tra borghi dell'entroterra, tradizioni locali e prodotti tipici.", img: "/media/nuraghe-stop.png?v=real2" },
      { title: "Coste opposte", desc: "Attraversata da costa a costa, per scoprire i contrasti paesaggistici dell'isola.", img: "/media/sunset-group.png?v=real2" },
      { title: "Rientro finale", desc: "Ultima tappa rilassata verso la base, tra soste fotografiche e saluti finali.", img: "/media/coast-trail.png?v=real2" },
    ],
  },
  {
    name: "Custom Moto Club",
    type: "Su Misura",
    durata: "Variabile",
    km: "Su richiesta",
    livello: "Personalizzato",
    sterrato: "Su richiesta",
    interesse: "Definito insieme al gruppo",
    pranzo: true,
    periodo: "Tutto l'anno",
    descrizione: "Itinerario cucito su misura per il tuo gruppo o moto club: territorio, difficoltà e durata scelti da voi.",
    groups: ["custom"],
  },
];

const typeColors = {
  Maxienduro: "#A0612A",
  Enduro: "#6B7A3E",
  Quad: "#C9A227",
  "4x4": "#8B5E3C",
  "Su Misura": "#B08968",
};

export default function TourDetails({ activeFilter, onClearFilter, id = "tour-details", className = "" }) {
  if (!activeFilter) return null;

  const filteredTours = tours.filter((t) => t.groups.includes(activeFilter));

  return (
    <motion.section
      id={id}
      className={`bg-[#F5EBD9] topo-bg py-24 lg:py-32 ${className}`}
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="mb-16 max-w-3xl">
          <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">Schede Tecniche</p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#1C1814] leading-none">
            ITINERARI IN<br />
            <span className="text-[#A0612A]">DETTAGLIO</span>
          </h2>
          <p className="font-body text-[#1C1814]/70 text-lg mt-6">
            Ogni tour con dati tecnici completi: durata, chilometri, livello, percentuale di sterrato,
            punti di interesse e periodo consigliato.
          </p>
          {activeFilter && (
            <button
              onClick={onClearFilter}
              className="mt-6 inline-flex items-center gap-2 font-button text-xs tracking-[0.15em] uppercase text-[#F5EBD9] bg-[#A0612A] hover:bg-[#8a531f] px-4 py-2 transition-colors"
            >
              {filterLabels[activeFilter]}
              <X size={14} />
            </button>
          )}
        </div>

        <div id={`${id}-grid`} className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTours.map((tour) => (
            <TourCard key={tour.name} tour={tour} color={typeColors[tour.type] || "#A0612A"} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}
