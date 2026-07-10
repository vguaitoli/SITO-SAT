const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ChevronLeft, Search } from "lucide-react";
import { listBlogPosts } from "@/data/blogPosts.js?blogposts=2";

export default function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listBlogPosts(db)
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const filteredPosts = posts.filter((post) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      post.title?.toLowerCase().includes(q) ||
      post.excerpt?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#1C1814] min-h-screen topo-dark">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16 lg:py-24">
        <Link to="/" className="inline-flex items-center gap-2 font-button text-sm text-[#E4D4B0] hover:text-[#A0612A] uppercase tracking-wider mb-10 transition-colors">
          <ChevronLeft size={16} />
          Torna al sito
        </Link>

        <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">Dal Trail</p>
        <h1 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none mb-16">
          RACCONTI <span className="text-[#A0612A]">& AVVENTURE</span>
        </h1>

        <div className="relative max-w-md mb-12">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F5EBD9]/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca un racconto..."
            className="w-full bg-transparent border border-[#F5EBD9]/20 focus:border-[#A0612A] outline-none text-[#F5EBD9] font-body text-sm pl-11 pr-4 py-3 transition-colors placeholder:text-[#F5EBD9]/40"
          />
        </div>

        {loading ? (
          <div className="text-[#F5EBD9]/60 font-body">Caricamento articoli...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-[#F5EBD9]/60 font-body border border-[#F5EBD9]/15 px-6 py-8">
            {posts.length === 0 ? "Nuovi racconti in arrivo a breve." : "Nessun racconto trovato per questa ricerca."}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-1">
            {filteredPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.id}`} className="group relative bg-[#252019] overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={post.cover_image || "/media/sunset-group.png?v=real2"}
                    alt={post.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                </div>
                <div className="p-6">
                  {post.published_date && (
                    <p className="font-button text-[10px] tracking-[0.2em] uppercase text-[#A0612A] mb-2">
                      {new Date(post.published_date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  <h3 className="font-heading text-2xl text-[#F5EBD9] tracking-wide leading-tight mb-2">
                    {post.title}
                  </h3>
                  <p className="font-body text-sm text-[#F5EBD9]/70 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
