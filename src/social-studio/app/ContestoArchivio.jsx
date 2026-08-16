import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { archivioDisponibile, creaArchivioLocale } from "../fondamenta/archivio-locale";
import { statoPersistenza, valutaSpazio } from "../fondamenta/persistenza";

/**
 * Fornisce l'archivio all'interfaccia.
 *
 * È qui che si tiene la promessa dell'astrazione: i componenti chiamano
 * `useArchivio()` e non sanno che sotto c'è IndexedDB. Nessun file di `app/` o
 * `template/` importa `archivio-locale`, e un test di architettura lo verifica.
 */

const Contesto = createContext(null);

export function FornitoreArchivio({ children, archivio: fornitoDaFuori }) {
  // In produzione l'archivio locale; nei test se ne inietta uno in memoria.
  const archivio = useMemo(
    () => fornitoDaFuori || (archivioDisponibile() ? creaArchivioLocale() : null),
    [fornitoDaFuori],
  );

  const [spazio, setSpazio] = useState(null);
  const [persistenza, setPersistenza] = useState(null);
  const montato = useRef(true);

  useEffect(() => {
    montato.current = true;
    return () => {
      montato.current = false;
      archivio?.liberaUrl?.();
    };
  }, [archivio]);

  const aggiornaStato = useMemo(
    () => async () => {
      if (!archivio) return;
      const [s, p] = await Promise.all([archivio.spazioUsato(), statoPersistenza()]);
      if (!montato.current) return;
      setSpazio(s);
      setPersistenza(p);
    },
    [archivio],
  );

  useEffect(() => {
    aggiornaStato();
  }, [aggiornaStato]);

  const valore = useMemo(
    () => ({
      archivio,
      disponibile: Boolean(archivio),
      spazio,
      persistenza,
      diagnosi: spazio ? valutaSpazio({ ...spazio, persistente: spazio.persistente }) : null,
      aggiornaStato,
    }),
    [archivio, spazio, persistenza, aggiornaStato],
  );

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useArchivio() {
  const valore = useContext(Contesto);
  if (!valore) throw new Error("useArchivio va usato dentro <FornitoreArchivio>.");
  return valore;
}
