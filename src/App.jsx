import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster"
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import SeoHead from '@/components/SeoHead';
import BackgroundMusic from '@/components/BackgroundMusic';

const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Home = lazy(() => import('./pages/Home'));
const TourItinerari = lazy(() => import('./pages/TourItinerari'));
const CategoriaPage = lazy(() => import('./pages/CategoriaPage'));
const Events = lazy(() => import('./pages/Events'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));

function RouteFallback() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-[var(--obsidian)]"
      role="status"
      aria-label="Caricamento pagina"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--granite-mist)]/20 border-t-[var(--accent)]" />
    </div>
  );
}

const SiteRoutes = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/esperienze/:cat" element={<CategoriaPage />} />
        <Route path="/itinerari" element={<TourItinerari />} />
        <Route path="/eventi" element={<Events />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <SeoHead />
      <BackgroundMusic />
      <SiteRoutes />
      <Toaster />
    </Router>
  )
}

export default App
