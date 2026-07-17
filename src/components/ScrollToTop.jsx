import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const getHashId = (hash) => {
  const rawId = hash.slice(1);
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Un'àncora deve SEMPRE portare alla sua sezione, anche restando sulla
    // stessa pagina (es. click su "Chi Siamo" dal menu mentre sei già in home).
    if (hash) {
      const id = getHashId(hash);
      let raf;
      let tries = 0;
      // Le sezioni sono lazy (Suspense): riproviamo per qualche frame finché
      // l'elemento è montato, poi scrolliamo.
      const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
          return;
        }
        if (tries++ < 40) raf = requestAnimationFrame(tryScroll);
      };
      raf = requestAnimationFrame(tryScroll);
      return () => cancelAnimationFrame(raf);
    }

    // Nessuna àncora: su back/forward lasciamo il ripristino nativo dello scroll,
    // altrimenti riportiamo in cima (nuova pagina).
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}
