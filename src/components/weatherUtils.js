import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from "lucide-react";

const MAP = {
  sereno: { label: "Sereno", Icon: Sun },
  nuvoloso: { label: "Nuvoloso", Icon: Cloud },
  pioggia: { label: "Pioggia", Icon: CloudRain },
  neve: { label: "Neve", Icon: CloudSnow },
  temporale: { label: "Temporale", Icon: CloudLightning },
  nebbia: { label: "Nebbia", Icon: CloudFog }
};

export function getWeatherInfo(condition) {
  return MAP[condition] || { label: "Variabile", Icon: Cloud };
}