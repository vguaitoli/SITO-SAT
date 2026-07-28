import React, { useState } from "react";
import GalleryLightbox from "@/components/GalleryLightbox";
import SectionHeading from "@/components/SectionHeading";
import { tinaField } from "tinacms/dist/react";
import { useSiteContent } from "@/content/TinaContentProvider";

const layoutClasses = {
  normal: "",
  wide: "col-span-2",
  featured: "col-span-2 row-span-2",
};

export default function Gallery() {
  const { homepage } = useSiteContent();
  const content = homepage.gallery;
  const images = content.images.map((item) => ({
    ...item,
    src: item.image,
    aspect: 4 / 3,
    span: layoutClasses[item.layout] || "",
  }));
  const [selectedIndex, setSelectedIndex] = useState(null);

  return (
    <section id="gallery" className="bg-[var(--obsidian)] topo-dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div data-tina-field={tinaField(content)}>
            <SectionHeading
              eyebrow={content.eyebrow}
              title={content.title}
              accent={content.accent}
              className="mb-0"
            />
          </div>
          <p
            className="max-w-md font-body text-base leading-relaxed text-[var(--granite-mist)]/60"
            data-tina-field={tinaField(content, "intro")}
          >
            {content.intro}
          </p>
        </div>

        <ul className="grid auto-rows-[150px] grid-cols-2 gap-2 lg:auto-rows-[220px] lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={`${img.image}-${i}`} className={img.span} data-tina-field={tinaField(content.images[i])}>
              <button
                type="button"
                onClick={() => setSelectedIndex(i)}
                className="group relative block h-full w-full overflow-hidden"
                aria-label={`Apri la foto: ${img.alt}`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  width={1200}
                  height={Math.round(1200 / img.aspect)}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover grayscale-[30%] transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0"
                />
              </button>
            </li>
          ))}
        </ul>
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
