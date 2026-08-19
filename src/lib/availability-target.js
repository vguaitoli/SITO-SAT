import { resolveRoute } from "@/i18n/routes";

function dateAtMidnight(value) {
  return value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
}

export function availabilityTargetForPath(pathname, events, route, fallback) {
  const current = resolveRoute(pathname);
  if (current.name !== "eventDetail") return fallback;

  const event = events.find((entry) => entry.slug === current.params.slug);
  const lastDay = dateAtMidnight(event?.endDate || event?.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!event?.date || !lastDay || lastDay < today) return fallback;
  return `${route("booking")}?evento=${encodeURIComponent(event.slug)}`;
}
