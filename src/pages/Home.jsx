import React, { useEffect, useState, Suspense, lazy } from "react";
import SiteNav from "@/components/SiteNav";
import Hero from "@/components/Hero";

const WhyChoose = lazy(() => import("@/components/WhyChoose"));
const TourTypes = lazy(() => import("@/components/TourTypes.jsx?modalfix=1"));
const TourDetails = lazy(() => import("@/components/TourDetails.jsx?modalfix=1"));
const Experience = lazy(() => import("@/components/Experience"));
const Included = lazy(() => import("@/components/Included"));
const Blog = lazy(() => import("@/components/Blog.jsx?blogposts=2"));
const About = lazy(() => import("@/components/About"));
const Guides = lazy(() => import("@/components/Guides.jsx?guideportraits=3"));
const News = lazy(() => import("@/components/News"));
const Gallery = lazy(() => import("@/components/Gallery"));
const Reviews = lazy(() => import("@/components/Reviews"));
const FAQ = lazy(() => import("@/components/FAQ"));
const Contact = lazy(() => import("@/components/Contact"));
const Footer = lazy(() => import("@/components/Footer"));

function SectionFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-[#F5EBD9]/20 border-t-[#A0612A] rounded-full animate-spin" />
    </div>
  );
}

export default function Home() {
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    if (!activeFilter) return;

    let timeoutId;
    let attempts = 0;

    const scrollToDetails = () => {
      const gridId = window.innerWidth >= 768 ? "tour-details-desktop-grid" : `tour-details-mobile-${activeFilter}-grid`;
      const sectionId = window.innerWidth >= 768 ? "tour-details-desktop" : `tour-details-mobile-${activeFilter}`;
      const el = document.getElementById(gridId) || document.getElementById(sectionId);

      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: "smooth" });
        return;
      }

      attempts += 1;
      if (attempts < 20) {
        timeoutId = window.setTimeout(scrollToDetails, 80);
      }
    };

    timeoutId = window.setTimeout(scrollToDetails, 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeFilter]);

  const handleSelect = (group) => {
    if (activeFilter === group) {
      setActiveFilter(null);
      return;
    }
    setActiveFilter(group);
  };

  return (
    <div className="bg-[#0A0A0A]">
      <SiteNav />
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        <WhyChoose />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TourTypes onSelect={handleSelect} activeFilter={activeFilter} onClearFilter={() => setActiveFilter(null)} />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TourDetails
          id="tour-details-desktop"
          className="hidden md:block"
          activeFilter={activeFilter}
          onClearFilter={() => setActiveFilter(null)}
        />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Experience />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Included />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <About />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Guides />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Gallery />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Blog />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <News />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Reviews />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <FAQ />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Contact />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <Footer />
      </Suspense>
    </div>
  );
}
