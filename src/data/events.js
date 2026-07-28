import eventCatalogContent from "../../content/events/index.json";
import { normalizeEvents } from "@/content/normalize";

export const events = normalizeEvents(eventCatalogContent);
