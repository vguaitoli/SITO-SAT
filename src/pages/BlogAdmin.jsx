const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, Pencil, Trash2, Plus } from "lucide-react";

const emptyForm = { title: "", excerpt: "", content: "", cover_image: "", published_date: "", route_lat: "", route_lng: "", route_location_name: "" };

export default function BlogAdmin() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadPosts = () => {
    setLoading(true);
    db.entities.BlogPost.list("-published_date").then(setPosts).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleEdit = (post) => {
    setEditingId(post.id);
    setForm({
      title: post.title || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      cover_image: post.cover_image || "",
      published_date: post.published_date || "",
      route_lat: post.route_lat ?? "",
      route_lng: post.route_lng ?? "",
      route_location_name: post.route_location_name || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminare questo articolo?")) return;
    await db.entities.BlogPost.delete(id);
    loadPosts();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        route_lat: form.route_lat === "" ? undefined : parseFloat(form.route_lat),
        route_lng: form.route_lng === "" ? undefined : parseFloat(form.route_lng),
      };
      if (editingId) {
        await db.entities.BlogPost.update(editingId, payload);
      } else {
        await db.entities.BlogPost.create(payload);
      }
      handleCancel();
      loadPosts();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#1C1814] min-h-screen topo-dark">
      <div className="max-w-4xl mx-auto px-5 lg:px-8 py-16">
        <Link to="/" className="inline-flex items-center gap-2 font-button text-sm text-[#E4D4B0] hover:text-[#A0612A] uppercase tracking-wider mb-10 transition-colors">
          <ChevronLeft size={16} />
          Torna al sito
        </Link>

        <h1 className="font-heading text-4xl lg:text-6xl text-[#F5EBD9] leading-none mb-10">
          GESTIONE <span className="text-[#A0612A]">BLOG</span>
        </h1>

        <form onSubmit={handleSubmit} className="bg-[#252019] p-6 lg:p-8 mb-16 space-y-5">
          <div>
            <Label className="text-[#E4D4B0]">Titolo</Label>
            <Input value={form.title} onChange={handleChange("title")} required className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
          </div>
          <div>
            <Label className="text-[#E4D4B0]">Data pubblicazione</Label>
            <Input type="date" value={form.published_date} onChange={handleChange("published_date")} className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
          </div>
          <div>
            <Label className="text-[#E4D4B0]">Immagine di copertina (URL)</Label>
            <Input value={form.cover_image} onChange={handleChange("cover_image")} placeholder="https://..." className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
          </div>
          <div>
            <Label className="text-[#E4D4B0]">Riassunto</Label>
            <Textarea value={form.excerpt} onChange={handleChange("excerpt")} rows={2} className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-[#E4D4B0]">Nome luogo percorso</Label>
              <Input value={form.route_location_name} onChange={handleChange("route_location_name")} placeholder="Es. Supramonte" className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
            </div>
            <div>
              <Label className="text-[#E4D4B0]">Latitudine</Label>
              <Input value={form.route_lat} onChange={handleChange("route_lat")} placeholder="40.123" className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
            </div>
            <div>
              <Label className="text-[#E4D4B0]">Longitudine</Label>
              <Input value={form.route_lng} onChange={handleChange("route_lng")} placeholder="9.456" className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-[#E4D4B0]">Contenuto (Markdown supportato)</Label>
            <Textarea value={form.content} onChange={handleChange("content")} rows={10} required className="bg-[#1C1814] border-[#F5EBD9]/20 text-[#F5EBD9] mt-1" />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-[#A0612A] hover:bg-[#b87033] text-[#F5EBD9]">
              <Plus size={16} className="mr-2" />
              {editingId ? (saving ? "Salvataggio..." : "Salva modifiche") : (saving ? "Pubblicazione..." : "Pubblica articolo")}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={handleCancel} className="border-[#F5EBD9]/30 text-[#F5EBD9]">
                Annulla
              </Button>
            )}
          </div>
        </form>

        <h2 className="font-heading text-2xl text-[#F5EBD9] mb-6 tracking-wide">Articoli pubblicati</h2>
        {loading ? (
          <p className="text-[#F5EBD9]/60 font-body">Caricamento...</p>
        ) : posts.length === 0 ? (
          <p className="text-[#F5EBD9]/60 font-body">Nessun articolo ancora.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between bg-[#252019] px-5 py-4">
                <div>
                  <p className="font-body text-[#F5EBD9]">{post.title}</p>
                  {post.published_date && (
                    <p className="font-body text-xs text-[#F5EBD9]/50">{post.published_date}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(post)} className="p-2 text-[#E4D4B0] hover:text-[#A0612A]" aria-label="Modifica">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 text-[#E4D4B0] hover:text-red-500" aria-label="Elimina">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}