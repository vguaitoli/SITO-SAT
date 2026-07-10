import React, { useState } from "react";
import SiteNav from "@/components/SiteNav";
import TourDetails from "@/components/TourDetails.jsx?modalfix=1";
import Footer from "@/components/Footer";

export default function TourItinerari() {
  const urlParams = new URLSearchParams(window.location.search);
  const [tourFilter, setTourFilter] = useState(urlParams.get("filter") || null);

  return (
    <div className="bg-[#0A0A0A]">
      <SiteNav />
      <div className="pt-24 lg:pt-28">
        <TourDetails activeFilter={tourFilter} onClearFilter={() => setTourFilter(null)} />
      </div>
      <Footer />
    </div>
  );
}
