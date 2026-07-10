const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";

import { Megaphone } from "lucide-react";

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.entities.NewsUpdate.list("-date", 6).then((data) => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  if (!loading && news.length === 0) return null;

  return (
    <section id="news" className="bg-[#1C1814] topo-dark py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="mb-16 max-w-3xl">
          <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">Aggiornamenti</p>
          <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none">
            NEWS &<br />
            <span className="text-[#A0612A]">NOVITÀ</span>
          </h2>
        </div>

        {loading ? (
          <p className="font-body text-[#F5EBD9]/60">Caricamento...</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <div key={item.id} className="bg-[#252019] border border-[#F5EBD9]/10 p-7">
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone size={16} className="text-[#A0612A]" />
                  {item.tag && (
                    <span className="font-button text-[10px] tracking-[0.2em] uppercase text-[#E4D4B0]">
                      {item.tag}
                    </span>
                  )}
                </div>
                <h3 className="font-heading text-2xl text-[#F5EBD9] mb-2 tracking-wide">{item.title}</h3>
                <p className="font-body text-sm text-[#F5EBD9]/70 leading-relaxed mb-4">{item.description}</p>
                <p className="font-body text-xs text-[#A0612A] uppercase tracking-wider">
                  {new Date(item.date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}