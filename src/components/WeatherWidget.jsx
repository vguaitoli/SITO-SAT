const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getWeatherInfo } from "@/components/weatherUtils";
import WeatherForecastModal from "@/components/WeatherForecastModal";

export default function WeatherWidget({ lat, lng, locationName, color }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForecast, setShowForecast] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) {
      setLoading(false);
      return;
    }
    const invokeLLM = db.integrations?.Core?.InvokeLLM;
    if (typeof invokeLLM !== "function") {
      setLoading(false);
      return;
    }

    invokeLLM({
      prompt: `Qual è il meteo attuale in tempo reale alle coordinate lat ${lat}, lng ${lng} (zona ${locationName}, Sardegna, Italia)? Fornisci la temperatura attuale in gradi Celsius e la condizione generale.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          temperature: { type: "number" },
          condition: {
            type: "string",
            enum: ["sereno", "nuvoloso", "pioggia", "neve", "temporale", "nebbia"]
          }
        },
        required: ["temperature", "condition"]
      }
    })
      .then((data) => setWeather(data))
      .catch(() => setWeather(null))
      .finally(() => setLoading(false));
  }, [lat, lng]);

  if (lat == null || lng == null) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#F5EBD9]/50 font-body text-xs">
        <Loader2 size={14} className="animate-spin" />
        Meteo in caricamento...
      </div>
    );
  }

  if (!weather) return null;

  const { label, Icon } = getWeatherInfo(weather.condition);

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowForecast(true); }}
        className="flex items-center gap-2 font-body text-xs text-[#F5EBD9]/80 hover:text-[#F5EBD9] transition-colors text-left"
      >
        <Icon size={16} style={{ color }} />
        <span>
          Ora a {locationName}: <span className="font-semibold text-[#F5EBD9]">{Math.round(weather.temperature)}°C</span>, {label}
        </span>
      </button>
      {showForecast && (
        <WeatherForecastModal
          lat={lat}
          lng={lng}
          locationName={locationName}
          onClose={() => setShowForecast(false)}
        />
      )}
    </>
  );
}
