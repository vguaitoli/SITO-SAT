const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import { ChevronLeft, MapPin } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getBlogPost } from "@/data/blogPosts.js?blogposts=2";

export default function BlogDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBlogPost(db, id)
      .then(setPost)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="bg-[#1C1814] min-h-screen flex items-center justify-center text-[#F5EBD9]/60 font-body">
        Caricamento...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-[#1C1814] min-h-screen flex flex-col items-center justify-center gap-6 text-[#F5EBD9]">
        <p className="font-body">Articolo non trovato.</p>
        <Link to="/blog" className="font-button text-sm text-[#A0612A] uppercase tracking-wider">Torna al blog</Link>
      </div>
    );
  }

  return (
    <div className="bg-[#1C1814] min-h-screen topo-dark">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-16 lg:py-24">
        <Link to="/blog" className="inline-flex items-center gap-2 font-button text-sm text-[#E4D4B0] hover:text-[#A0612A] uppercase tracking-wider mb-10 transition-colors">
          <ChevronLeft size={16} />
          Tutti gli articoli
        </Link>

        {post.published_date && (
          <p className="font-button text-xs tracking-[0.2em] uppercase text-[#A0612A] mb-4">
            {new Date(post.published_date).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        <h1 className="font-heading text-4xl lg:text-6xl text-[#F5EBD9] leading-none mb-8">{post.title}</h1>

        {post.cover_image && (
          <img src={post.cover_image} alt={post.title} loading="lazy" decoding="async" className="w-full aspect-[16/9] object-cover mb-10" />
        )}

        <div className="prose prose-invert max-w-none font-body text-[#F5EBD9]/85 leading-relaxed">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {typeof post.route_lat === "number" && typeof post.route_lng === "number" && (
          <div className="mt-12">
            <p className="flex items-center gap-2 font-button text-xs tracking-[0.2em] uppercase text-[#A0612A] mb-4">
              <MapPin size={14} />
              {post.route_location_name || "Percorso"}
            </p>
            <div className="h-80 overflow-hidden border border-[#F5EBD9]/15">
              <MapContainer
                center={[post.route_lat, post.route_lng]}
                zoom={11}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <CircleMarker
                  center={[post.route_lat, post.route_lng]}
                  radius={10}
                  pathOptions={{ color: "#A0612A", fillColor: "#A0612A", fillOpacity: 0.8 }}
                >
                  <Popup>{post.route_location_name || "Punto di interesse"}</Popup>
                </CircleMarker>
              </MapContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
