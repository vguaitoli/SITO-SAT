import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  LoaderCircle,
  Send,
  Users,
} from "lucide-react";
import Footer from "@/components/Footer";
import SiteNav from "@/components/SiteNav";
import { useSiteContent } from "@/content/TinaContentProvider";
import { WEB3FORMS_ACCESS_KEY } from "@/config/site";
import { useI18n } from "@/i18n/I18nProvider";

const INPUT_CLASS =
  "mt-2 w-full rounded-none border border-[#1C1814]/20 bg-white px-4 py-3.5 font-body text-base text-[#1C1814] outline-none transition-colors placeholder:text-[#1C1814]/40 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25";

function localDate(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
}

export default function Booking() {
  const { events, SITE } = useSiteContent();
  const { t, route, localeMeta } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => {
          const lastDay = localDate(event.endDate || event.date);
          return event.date && lastDay && lastDay >= today;
        })
        .sort((a, b) => localDate(a.date).getTime() - localDate(b.date).getTime()),
    [events, today],
  );

  const requestedSlug = searchParams.get("evento") || "";
  const initialSlug = upcomingEvents.some((event) => event.slug === requestedSlug)
    ? requestedSlug
    : "";
  const [form, setForm] = useState({
    evento: initialSlug,
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    partecipanti: 1,
    tipologiaMezzo: "",
    marcaMezzo: "",
    modelloMezzo: "",
    cameraPrivata: false,
    richieste: "",
    privacy: false,
    botcheck: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const selectedEvent = upcomingEvents.find((event) => event.slug === form.evento);
  const formatDate = (value, options = {}) =>
    localDate(value)?.toLocaleDateString(localeMeta.dateLocale, options) || "";
  const formatPeriod = (event) => {
    const start = formatDate(event.date, { day: "numeric", month: "long", year: "numeric" });
    const end = formatDate(event.endDate, { day: "numeric", month: "long", year: "numeric" });
    return end && end !== start ? `${start} – ${end}` : start;
  };
  const monthLabel = (event) =>
    formatDate(event.date, { month: "long", year: "numeric" });
  const groupedEvents = upcomingEvents.reduce((groups, event) => {
    const month = monthLabel(event);
    if (!groups[month]) groups[month] = [];
    groups[month].push(event);
    return groups;
  }, {});

  const selectEvent = (slug) => {
    setForm((current) => ({ ...current, evento: slug }));
    setSearchParams(slug ? { evento: slug } : {}, { replace: true });
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "evento") {
      selectEvent(value);
      return;
    }
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.botcheck || !selectedEvent) return;
    setSending(true);
    setError("");

    try {
      if (!WEB3FORMS_ACCESS_KEY) {
        throw new Error("Web3Forms non configurato: manca VITE_WEB3FORMS_ACCESS_KEY.");
      }
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Richiesta prenotazione: ${selectedEvent.name} - ${form.nome} ${form.cognome}`,
          from_name: "Sito Sardegna Trail Avventura",
          evento: selectedEvent.name,
          periodo_evento: formatPeriod(selectedEvent),
          mezzo: selectedEvent.type,
          nome: form.nome,
          cognome: form.cognome,
          email: form.email,
          telefono: form.telefono,
          numero_partecipanti: form.partecipanti,
          tipologia_mezzo: form.tipologiaMezzo || "Non indicata",
          marca_mezzo: form.marcaMezzo || "Non indicata",
          modello_mezzo: form.modelloMezzo || "Non indicato",
          camera_privata: form.cameraPrivata ? "Sì — supplemento 30 €" : "No",
          richieste_particolari: form.richieste || "Nessuna",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Invio non riuscito");
      setSent(true);
    } catch (submissionError) {
      if (import.meta.env.DEV) console.error(submissionError);
      setError(
        SITE.contattiVerificati
          ? t("Si è verificato un errore. Riprova o contattaci via WhatsApp.")
          : t("Si è verificato un errore. Riprova tra qualche istante."),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-light)]">
      <SiteNav />

      <main>
        <section className="relative isolate flex min-h-[31rem] items-end overflow-hidden bg-[var(--obsidian)] pb-16 pt-36 sm:min-h-[35rem] sm:pb-20">
          <img
            src="/media/reali/gruppo-altopiano-1800.webp"
            alt="Gruppo in viaggio sugli altopiani della Sardegna"
            width="1800"
            height="1200"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/65 to-[var(--obsidian)]/30" />
          <div className="mx-auto w-full max-w-7xl px-5 lg:px-8">
            <p className="font-button text-xs uppercase tracking-[0.3em] text-[var(--accent-soft)]">
              {t("Partenze programmate")}
            </p>
            <h1 className="mt-5 max-w-4xl font-heading text-5xl leading-[0.9] text-[var(--granite-mist)] sm:text-7xl lg:text-8xl">
              {t("PRENOTA LA TUA AVVENTURA")}
            </h1>
            <p className="mt-7 max-w-2xl font-body text-base leading-relaxed text-granite-mist/80 sm:text-lg">
              {t("Scegli un evento e inviaci la tua richiesta. Ti ricontatteremo per verificare i posti e completare la prenotazione.")}
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:px-8">
            <aside aria-labelledby="calendar-title">
              <div className="lg:sticky lg:top-28">
                <p className="font-button text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                  {t("Calendario eventi")}
                </p>
                <h2 id="calendar-title" className="mt-4 font-heading text-4xl leading-none text-[#1C1814] sm:text-5xl">
                  {t("LE PROSSIME PARTENZE")}
                </h2>
                <p className="mt-5 max-w-xl font-body text-sm leading-relaxed text-[#1C1814]/65">
                  {t("Seleziona una data: l'evento scelto verrà riportato automaticamente nel modulo.")}
                </p>

                {upcomingEvents.length ? (
                  <div className="mt-8 space-y-8">
                    {Object.entries(groupedEvents).map(([month, monthEvents]) => (
                      <div key={month}>
                        <h3 className="border-b border-[#1C1814]/15 pb-2 font-button text-xs uppercase tracking-[0.22em] text-[#1C1814]/55">
                          {month}
                        </h3>
                        <div className="mt-3 space-y-3">
                          {monthEvents.map((event) => {
                            const selected = event.slug === form.evento;
                            return (
                              <button
                                key={event.slug}
                                type="button"
                                onClick={() => selectEvent(event.slug)}
                                aria-pressed={selected}
                                className={`w-full border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 ${
                                  selected
                                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-lg"
                                    : "border-[#1C1814]/15 bg-white text-[#1C1814] hover:border-[var(--accent)]/65"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <span className={`font-button text-[10px] uppercase tracking-[0.2em] ${selected ? "text-white/75" : "text-[#1C1814]/50"}`}>
                                      {event.type}
                                    </span>
                                    <span className="mt-1 block font-heading text-2xl leading-none">{event.name}</span>
                                  </div>
                                  {selected && (
                                    <span className="inline-flex shrink-0 items-center gap-1.5 bg-white px-2.5 py-1 font-button text-[10px] uppercase tracking-wider text-[var(--accent)]">
                                      <Check size={12} aria-hidden="true" /> {t("Disponibile")}
                                    </span>
                                  )}
                                </div>
                                <span className={`mt-3 flex items-center gap-2 font-body text-sm ${selected ? "text-white/85" : "text-[#1C1814]/65"}`}>
                                  <CalendarDays size={15} aria-hidden="true" /> {formatPeriod(event)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-8 border border-[#1C1814]/15 bg-white p-5 font-body text-[#1C1814]/70">
                    {t("Nessun evento programmato al momento.")}
                  </p>
                )}
              </div>
            </aside>

            <div className="border border-[#1C1814]/15 bg-[#F5EBD9] p-5 shadow-xl shadow-[#1C1814]/5 sm:p-8 lg:p-10">
              {sent ? (
                <div className="flex min-h-[32rem] flex-col items-center justify-center text-center" role="status">
                  <CheckCircle2 size={54} className="text-[var(--wild-sage)]" aria-hidden="true" />
                  <h2 className="mt-6 font-heading text-4xl leading-none text-[#1C1814] sm:text-5xl">
                    {t("RICHIESTA DI PRENOTAZIONE INVIATA!")}
                  </h2>
                  <p className="mt-5 max-w-lg font-body leading-relaxed text-[#1C1814]/70">
                    {t("La richiesta non costituisce ancora conferma di prenotazione. Ti contatteremo per verificare i posti e completare la prenotazione.")}
                  </p>
                  {selectedEvent && (
                    <Link
                      to={route("eventDetail", { slug: selectedEvent.slug })}
                      className="btn-mech mt-8 inline-flex items-center gap-2 bg-[var(--obsidian)] px-6 py-3 text-sm text-[var(--granite-mist)]"
                    >
                      <ArrowLeft size={16} aria-hidden="true" /> {t("Torna all'evento")}
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  <p className="font-button text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                    {t("Richiesta di prenotazione")}
                  </p>
                  <h2 className="mt-4 font-heading text-4xl leading-none text-[#1C1814] sm:text-5xl">
                    {t("I DATI DEL VIAGGIO")}
                  </h2>
                  <p className="mt-5 font-body text-sm leading-relaxed text-[#1C1814]/65">
                    {t("Compila i dati del gruppo. Verificheremo la disponibilità prima di confermare la prenotazione.")}
                  </p>

                  <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <input
                      type="text"
                      name="botcheck"
                      value={form.botcheck}
                      onChange={handleChange}
                      className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                      tabIndex={-1}
                      aria-hidden="true"
                      autoComplete="off"
                    />

                    <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                      {t("Evento *")}
                      <select name="evento" value={form.evento} onChange={handleChange} required className={INPUT_CLASS}>
                        <option value="">{t("Seleziona un evento...")}</option>
                        {upcomingEvents.map((event) => (
                          <option key={event.slug} value={event.slug}>
                            {event.name} · {formatPeriod(event)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                        {t("Nome *")}
                        <input name="nome" value={form.nome} onChange={handleChange} required autoComplete="given-name" className={INPUT_CLASS} />
                      </label>
                      <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                        {t("Cognome *")}
                        <input name="cognome" value={form.cognome} onChange={handleChange} required autoComplete="family-name" className={INPUT_CLASS} />
                      </label>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                        {t("Email *")}
                        <input type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" className={INPUT_CLASS} />
                      </label>
                      <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                        {t("Telefono *")}
                        <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} required autoComplete="tel" className={INPUT_CLASS} />
                      </label>
                    </div>

                    <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                      {t("Numero di partecipanti *")}
                      <span className="relative block">
                        <Users className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-[#1C1814]/45" size={18} aria-hidden="true" />
                        <input type="number" min="1" name="partecipanti" value={form.partecipanti} onChange={handleChange} required className={`${INPUT_CLASS} pl-12`} />
                      </span>
                    </label>

                    <fieldset className="border border-[#1C1814]/15 bg-white/45 p-4 sm:p-5">
                      <legend className="px-2 font-button text-xs uppercase tracking-[0.18em] text-[#1C1814]/70">
                        {t("Mezzo del partecipante")}
                      </legend>
                      <p className="mb-4 font-body text-sm leading-relaxed text-[#1C1814]/55">
                        {t("Compila questi dati se parteciperai con un mezzo proprio.")}
                      </p>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                          {t("Tipologia")}
                          <input
                            name="tipologiaMezzo"
                            value={form.tipologiaMezzo}
                            onChange={handleChange}
                            placeholder={t("Es. Maxienduro")}
                            autoComplete="off"
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                          {t("Marca")}
                          <input
                            name="marcaMezzo"
                            value={form.marcaMezzo}
                            onChange={handleChange}
                            placeholder={t("Es. Honda")}
                            autoComplete="off"
                            className={INPUT_CLASS}
                          />
                        </label>
                        <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                          {t("Modello")}
                          <input
                            name="modelloMezzo"
                            value={form.modelloMezzo}
                            onChange={handleChange}
                            placeholder={t("Es. Africa Twin")}
                            autoComplete="off"
                            className={INPUT_CLASS}
                          />
                        </label>
                      </div>
                    </fieldset>

                    <label className={`flex cursor-pointer items-start gap-4 border p-4 transition-colors ${form.cameraPrivata ? "border-[var(--accent)] bg-white" : "border-[#1C1814]/15 bg-white/55 hover:border-[var(--accent)]/55"}`}>
                      <input type="checkbox" name="cameraPrivata" checked={form.cameraPrivata} onChange={handleChange} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
                      <span>
                        <span className="block font-button text-sm uppercase tracking-wider text-[#1C1814]">{t("Camera privata")}</span>
                        <span className="mt-1 block font-body text-sm text-[#1C1814]/65">{t("Supplemento 30 €")}</span>
                      </span>
                    </label>

                    <label className="block font-button text-xs uppercase tracking-wider text-[#1C1814]/70">
                      {t("Richieste particolari")}
                      <textarea name="richieste" value={form.richieste} onChange={handleChange} rows={5} placeholder={t("Allergie, esigenze alimentari, necessità logistiche o altre informazioni utili...")} className={INPUT_CLASS} />
                    </label>

                    <label className="flex items-start gap-3 font-body text-sm leading-relaxed text-[#1C1814]/70">
                      <input type="checkbox" name="privacy" checked={form.privacy} onChange={handleChange} required className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]" />
                      <span>
                        {t("Ho letto l'")}
                        <Link to={route("privacy")} className="font-semibold text-[var(--accent)] underline underline-offset-2">
                          {t("informativa privacy")}
                        </Link>{" "}
                        {t("e chiedo di essere ricontattato in merito alla mia richiesta. *")}
                      </span>
                    </label>

                    {error && <p role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 font-body text-sm text-red-800">{error}</p>}

                    <button type="submit" disabled={sending || !upcomingEvents.length} className="btn-mech flex w-full items-center justify-center gap-2.5 bg-[var(--cta)] px-7 py-4 text-base text-[var(--cta-text)] hover:bg-[var(--cta-hover)] disabled:cursor-not-allowed disabled:opacity-55">
                      {sending ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                      {sending ? t("Invio in corso...") : t("Invia richiesta di prenotazione")}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
