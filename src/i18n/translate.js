import { MESSAGES } from "./messages.js";

const NON_TRANSLATABLE_KEYS = new Set([
  "id",
  "slug",
  "image",
  "video",
  "music",
  "href",
  "sourceUrl",
  "startDate",
  "endDate",
  "updatedAt",
  "layout",
  "icon",
]);

export function localizeValue(value, locale, key = "") {
  if (locale === "it" || value == null) return value;
  if (typeof value === "string") {
    if (NON_TRANSLATABLE_KEYS.has(key)) return value;
    const direct = MESSAGES[locale]?.[value];
    if (direct) return direct;
    if (value.includes("\n")) {
      return value
        .split("\n")
        .map((line) => MESSAGES[locale]?.[line.trim()] || line)
        .join("\n");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => localizeValue(item, locale, key));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([itemKey, item]) => [
        itemKey,
        localizeValue(item, locale, itemKey),
      ]),
    );
  }
  return value;
}
