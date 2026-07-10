const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ list:async()=>[], filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

import { getWeatherInfo } from "@/components/weatherUtils";

export default function WeatherForecastModal({ lat, lng, locationName, onClose }) {
  const [days, setDays] = useState(null);

  useEffect(() => {
    const invokeLLM = db.integrations?.Core?.InvokeLLM;
    if (typeof invokeLLM !== "function") {
      setDays([]);
      return;
    }

    invokeLLM({
      prompt: `Fornisci le previsioni meteo per i prossimi 7 giorni (a partire da oggi) per le coordinate lat ${lat}, lng ${lng} (zona ${locationName}, Sardegna, Italia). Per ogni giorno indica: nome del giorno della settimana in italiano, temperatura massima e minima in gradi Celsius, e condizione generale.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_label: { type: "string" },
                temp_max: { type: "number" },
                temp_min: { type: "number" },
                condition: {
                  type: "string",
                  enum: ["sereno", "nuvoloso", "pioggia", "neve", "temporale", "nebbia"]
                }
              },
              required: ["day_label", "temp_max", "temp_min", "condition"]
            }
          }
        },
        required: ["days"]
      }
    })
      .then((data) => setDays(Array.isArray(data?.days) ? data.days : []))
      .catch(() => setDays([]));
  }, [lat, lng]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1C1814]/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#252019] border border-[#F5EBD9]/15 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-2xl text-[#F5EBD9] tracking-wide">
            Meteo · {locationName}
          </h3>
          <button onClick={onClose} className="text-[#F5EBD9]/60 hover:text-[#A0612A]" aria-label="Chiudi">
            <X size={22} />
          </button>
        </div>

        {!days ? (
          <div className="flex items-center gap-2 text-[#F5EBD9]/60 font-body text-sm py-6 justify-center">
            <Loader2 size={16} className="animate-spin" />
            Caricamento previsioni...
          </div>
        ) : days.length === 0 ? (
          <p className="text-[#F5EBD9]/60 font-body text-sm text-center py-6">Previsioni non disponibili al momento.</p>
        ) : (
          <div className="space-y-2">
            {days.map((d, i) => {
              const { label, Icon } = getWeatherInfo(d.condition);
              return (
                <div key={i} className="flex items-center justify-between border-b border-[#F5EBD9]/10 py-2.5 last:border-0">
                  <span className="font-body text-sm text-[#F5EBD9]/80 capitalize w-28">{d.day_label}</span>
                  <div className="flex items-center gap-2 text-[#A0612A]">
                    <Icon size={18} />
                    <span className="font-body text-xs text-[#F5EBD9]/60 w-20">{label}</span>
                  </div>
                  <span className="font-body text-sm text-[#F5EBD9]">
                    {Math.round(d.temp_max)}° / {Math.round(d.temp_min)}°
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
