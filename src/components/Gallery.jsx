const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import GalleryLightbox from "@/components/GalleryLightbox";

const images = [
  { src: "/media/hero-trail.png?v=real2", alt: "Maxienduro su sterrato panoramico sardo", label: "Moto", span: "lg:col-span-2 lg:row-span-2" },
  { src: "/media/hero-trail.png?v=real2", alt: "Vista drone su sentiero e costa sarda", label: "Drone", span: "" },
  { src: "/media/coast-trail.png?v=real2", alt: "Rider lungo un sentiero costiero", label: "Paesaggi", span: "" },
  { src: "/media/sunset-group.png?v=real2", alt: "Gruppo di rider su un belvedere montano", label: "Gruppi", span: "lg:col-span-2" },
  { src: "/media/sunset-group.png?v=real2", alt: "Pranzo tipico dopo il tour", label: "Pranzi", span: "" },
  { src: "/media/nuraghe-stop.png?v=real2", alt: "Sosta vicino a un nuraghe", label: "Tramonti", span: "" },
];

export default function Gallery() {
  const [selectedIndex, setSelectedIndex] = useState(null);

  return (
    <section id="gallery" className="bg-[#1C1814] topo-dark py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
          <div>
            <p className="font-button text-[#E4D4B0] text-xs tracking-[0.3em] uppercase mb-4">Gallery</p>
            <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none">
              L'AVVENTURA<br />
              <span className="text-[#A0612A]">IN IMMAGINI</span>
            </h2>
          </div>
          <p className="font-body text-[#F5EBD9]/60 text-base max-w-md leading-relaxed">
            Moto, drone, paesaggi, gruppi, pranzi e tramonti. Un assaggio di ciò che ti aspetta.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[200px] lg:auto-rows-[260px] gap-2">
          {images.map((img, i) => (
            <figure
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`group relative overflow-hidden cursor-pointer ${img.span}`}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1814]/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
              <figcaption className="absolute bottom-4 left-4 font-button text-xs tracking-[0.2em] uppercase text-[#F5EBD9] z-10">
                {img.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <GalleryLightbox
        image={selectedIndex !== null ? images[selectedIndex] : null}
        onClose={() => setSelectedIndex(null)}
        onNext={() => setSelectedIndex((i) => (i + 1) % images.length)}
        onPrev={() => setSelectedIndex((i) => (i - 1 + images.length) % images.length)}
      />
    </section>
  );
}
