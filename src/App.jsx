import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import SeoHead from '@/components/SeoHead';
import BackgroundMusic from '@/components/BackgroundMusic';
import { TinaContentProvider } from '@/content/TinaContentProvider';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';

const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Home = lazy(() => import('./pages/Home'));
const TourItinerari = lazy(() => import('./pages/TourItinerari'));
const CatalogDetailPage = lazy(() => import('./pages/CatalogDetailPage'));
const CategoriaPage = lazy(() => import('./pages/CategoriaPage'));
const Events = lazy(() => import('./pages/Events'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));

function RouteFallback() {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-[var(--obsidian)]"
      role="status"
      aria-label={t("Caricamento pagina")}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-granite-mist/20 border-t-[var(--accent)]" />
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
        <Route path="/tour/:slug" element={<CatalogDetailPage kind="tour" />} />
        <Route path="/eventi" element={<Events />} />
        <Route path="/eventi/:slug" element={<CatalogDetailPage kind="event" />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:id" element={<BlogDetail />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/en" element={<Home />} />
        <Route path="/en/experiences/:cat" element={<CategoriaPage />} />
        <Route path="/en/tours" element={<TourItinerari />} />
        <Route path="/en/tours/:slug" element={<CatalogDetailPage kind="tour" />} />
        <Route path="/en/events" element={<Events />} />
        <Route path="/en/events/:slug" element={<CatalogDetailPage kind="event" />} />
        <Route path="/en/blog" element={<BlogList />} />
        <Route path="/en/blog/:id" element={<BlogDetail />} />
        <Route path="/en/privacy" element={<PrivacyPolicy />} />
        <Route path="/en/cookie-policy" element={<CookiePolicy />} />
        <Route path="/fr" element={<Home />} />
        <Route path="/fr/experiences/:cat" element={<CategoriaPage />} />
        <Route path="/fr/circuits" element={<TourItinerari />} />
        <Route path="/fr/circuits/:slug" element={<CatalogDetailPage kind="tour" />} />
        <Route path="/fr/evenements" element={<Events />} />
        <Route path="/fr/evenements/:slug" element={<CatalogDetailPage kind="event" />} />
        <Route path="/fr/blog" element={<BlogList />} />
        <Route path="/fr/blog/:id" element={<BlogDetail />} />
        <Route path="/fr/confidentialite" element={<PrivacyPolicy />} />
        <Route path="/fr/politique-cookies" element={<CookiePolicy />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <Router>
      <I18nProvider>
        <TinaContentProvider>
          <ScrollToTop />
          <SeoHead />
          <BackgroundMusic />
          <SiteRoutes />
          <Toaster />
          {/* Statistiche di visita e Core Web Vitals: entrambi senza cookie né
              identificatori persistenti, quindi non richiedono un banner. */}
          <Analytics />
          <SpeedInsights />
        </TinaContentProvider>
      </I18nProvider>
    </Router>
  )
}

export default App
