import { Link } from "react-router-dom";

import { ArrowRight } from "lucide-react";
import { listBlogPosts } from "@/data/blogPosts.js";
import { useI18n } from "@/i18n/I18nProvider";

export default function Blog() {
  const { locale, localeMeta, t, route } = useI18n();
  const posts = listBlogPosts(3, locale);

  return (
    <section id="blog" className="bg-[#1C1814] topo-dark py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="mb-16 max-w-3xl flex items-end justify-between flex-wrap gap-6">
          <div>
            <p className="font-button text-[#A0612A] text-xs tracking-[0.3em] uppercase mb-4">{t("Dal Trail")}</p>
            <h2 className="font-heading text-5xl lg:text-7xl text-[#F5EBD9] leading-none">
              {t("RACCONTI")} <span className="text-[#A0612A]">{t("& AVVENTURE")}</span>
            </h2>
          </div>
          <Link
            to={route("blog")}
            className="font-button text-sm text-[#E4D4B0] hover:text-[#A0612A] uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            {t("Vedi tutti gli articoli")}
            <ArrowRight size={16} />
          </Link>
        </div>

        {posts.length > 0 && (
          <div className="grid md:grid-cols-3 gap-1">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={route("blogPost", { id: post.id })}
                className="group relative bg-[#252019] overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={post.cover_image || "/media/reali/gruppo-altopiano-1200.webp"}
                    alt={post.title}
                    width={1200}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                  />
                </div>
                <div className="p-6">
                  {post.published_date && (
                    <p className="font-button text-[10px] tracking-[0.2em] uppercase text-[#A0612A] mb-2">
                      {new Date(post.published_date).toLocaleDateString(localeMeta.dateLocale, { day: "numeric", month: "long", year: "numeric" })}
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
    </section>
  );
}
