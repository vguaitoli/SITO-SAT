/**
 * Date degli eventi, nelle forme che servono alle grafiche.
 *
 * Le date sono dati fattuali: non si abbreviano con i puntini di sospensione.
 * Quando lo spazio è poco si usa una forma più corta — che resta leggibile e
 * completa — invece di troncare quella lunga.
 */

const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

const aData = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`) : null);

/** «29 OTT — 1 NOV»: la forma del badge, come nella locandina. */
export function periodoBreve(dati) {
  const inizio = aData(dati.dataInizio);
  const fine = aData(dati.dataFine);
  if (!inizio) return dati.periodo || "";

  const parte = (d) => `${d.getDate()} ${MESI_BREVI[d.getMonth()]}`;
  if (!fine || +fine === +inizio) return `${parte(inizio)} ${inizio.getFullYear()}`;
  return `${parte(inizio)} — ${parte(fine)} ${fine.getFullYear()}`;
}

/** «29 ottobre – 1 novembre 2026»: la forma per esteso. */
export function periodoLeggibile(dati) {
  if (dati.periodo) return dati.periodo;
  const inizio = aData(dati.dataInizio);
  const fine = aData(dati.dataFine);
  if (!inizio) return "";

  const lungo = (d, conAnno) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "long", ...(conAnno ? { year: "numeric" } : {}) });

  if (!fine || +fine === +inizio) return lungo(inizio, true);
  return `${lungo(inizio, false)} – ${lungo(fine, true)}`;
}

/** «4 giorni»: durata ricavata dalle date, se non è già dichiarata. */
export function durataDaDate(dati) {
  if (dati.durata) return dati.durata;
  const inizio = aData(dati.dataInizio);
  const fine = aData(dati.dataFine);
  if (!inizio || !fine) return "";
  const giorni = Math.round((fine - inizio) / 86400000) + 1;
  return `${giorni} giorn${giorni === 1 ? "o" : "i"}`;
}
