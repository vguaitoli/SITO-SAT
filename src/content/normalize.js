export function normalizeSettings(content) {
  const phone = String(content.phoneE164 || "").replace(/\D/g, "");
  const whatsappMessage = content.whatsappMessage || "";

  return {
    CTA_LABELS: {
      primary: content.cta?.primary || "Verifica disponibilità",
      whatsapp: content.cta?.whatsapp || "Scrivici su WhatsApp",
    },
    TOUR_GROUP: {
      label: content.tourGroup?.label || "",
      sentence: content.tourGroup?.sentence || "",
    },
    SITE: {
      nome: content.name || "",
      tagline: content.tagline || "",
      email: content.email || "",
      telefono: {
        e164: phone,
        display: content.phoneDisplay || "",
        href: phone ? `tel:+${phone}` : "",
      },
      whatsapp: {
        numero: phone,
        href: phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`
          : "",
      },
      social: {
        handle: content.socialHandle || "",
        instagram: content.instagram || "",
        facebook: content.facebook || "",
      },
      luogo: {
        regione: content.region || "",
        mapsHref: content.mapsUrl || "",
      },
      legale: {
        ragioneSociale: content.legal?.businessName || "",
        formaGiuridica: content.legal?.legalForm || "",
        partitaIva: content.legal?.vatNumber || "",
        sede: content.legal?.address || "",
      },
      contattiVerificati: Boolean(content.contactsVerified),
    },
  };
}

export function normalizeTours(content) {
  return (content?.tours || []).map((tour) => ({
    ...tour,
    durata: tour.duration,
    km: tour.distance,
    livello: tour.level,
    sterrato: tour.offroad,
    interesse: tour.interest,
    pranzo: tour.lunchIncluded,
    periodo: tour.period,
    prezzo: tour.price,
    descrizione: tour.description,
    esclusioni: tour.exclusions || [],
    tappe: (tour.stages || []).map((stage) => ({
      ...stage,
      title: stage.title,
      desc: stage.description,
      foto: stage.image,
      fotoAlt: stage.imageAlt,
    })),
  }));
}

export function normalizeEvents(content) {
  return (content?.events || []).map((event) => ({
    ...event,
    durata: event.duration,
    km: event.distance,
    livello: event.level,
    sterrato: event.offroad,
    interesse: event.interest,
    partenza: event.startLocation,
    pranzo: event.lunchIncluded,
    soggiorno: event.accommodation,
    periodo: event.period,
    date: event.startDate,
    endDate: event.endDate,
    prezzo: event.price,
    descrizione: event.description,
    programmaNote: event.programNote,
    incluso: event.included || [],
    esclusioni: event.exclusions || [],
    equipaggiamento: event.equipment || [],
    tappe: (event.stages || []).map((stage) => ({
      ...stage,
      title: stage.title,
      desc: stage.description,
      foto: stage.image,
      fotoAlt: stage.imageAlt,
    })),
  }));
}
