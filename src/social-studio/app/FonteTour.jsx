import React, { useCallback, useMemo, useState } from "react";
import { GitCompare, RotateCw } from "lucide-react";
import { CODICI } from "./useBozzaTour";

/**
 * Il confronto con il sito, e il riallineamento.
 *
 * Una bozza TOUR nasce da un tour del sito e ne porta dentro un'**istantanea**.
 * Il sito però continua a cambiare — un prezzo, una durata, il nome — e da quel
 * momento la bozza descrive qualcosa che non c'è più, senza che nulla lo dica.
 *
 * Sono due gesti, e restano distinti apposta:
 *
 * - **confrontare** è una domanda. Non tocca niente: né contenuto, né «non
 *   salvato», né esito, né archivio, né revisioni. Chiederselo dev'essere
 *   gratuito, altrimenti non lo si chiede;
 * - **riallineare** è una decisione, e la prende chi scrive. Aggiorna solo il
 *   ramo `fonte` — tipo, slug, istantanea, `importatoIl` — e lascia intatti
 *   fatti, provenienze, copy, media, mappa e revisioni: prendere atto che il
 *   sito è cambiato non è reimportare, e il lavoro editoriale non si perde per
 *   questo. Marca la bozza non salvata e **non** salva da solo.
 *
 * ## I cinque stati, che non vanno confusi
 *
 * «Allineata» e «cambiata» sono risposte. «Fonte assente», «non
 * corrispondente» e «non confrontabile» sono tre impossibilità diverse, e
 * appiattirle su «non allineata» direbbe una cosa falsa: nella prima manca il
 * tour, nella seconda la bozza viene da un altro percorso — e accettarne
 * l'istantanea le farebbe dire di descrivere qualcosa che non descrive — nella
 * terza l'identità torna ma l'istantanea manca, ed è l'unico caso in cui il
 * riallineamento **ripara** invece di aggiornare.
 *
 * I fatti restano in sola lettura: questo capitolo non li rende modificabili a
 * mano.
 *
 * ## Una risposta vale per gli ingressi che l'hanno prodotta
 *
 * Il confronto è una funzione di tre cose: **quale bozza**, **quale istantanea**
 * e **quale tour del sito**. La risposta è vera di quella terna e di nessun'
 * altra, e da 6.3M.1 le è legata esplicitamente.
 *
 * Senza quel legame la risposta era uno stato del pannello, e il pannello non
 * si smonta cambiando bozza: aprendone un'altra si vedeva già il suo slug e
 * accanto il verdetto calcolato sulla precedente. Non un fotogramma di ritardo
 * — un risultato che resta lì, e che chi legge attribuisce a ciò che ha davanti.
 * Lo stesso valeva cambiando i dati del sito sotto un componente montato.
 *
 * Il legame è per **identità degli ingressi**, non dell'oggetto contenuto:
 * scrivere un claim non tocca `fonte`, quindi non invalida una risposta che è
 * ancora vera. E quando gli ingressi cambiano non si riesegue niente: si torna a
 * «non ancora confrontato», perché rifare da soli una domanda che nessuno ha
 * ripetuto è il modo di far comparire risposte che nessuno ha chiesto.
 *
 * Il confronto **riuscito** resta locale — è una domanda, non un fatto della
 * bozza. Il riallineamento **riuscito** no: quello è successo alla bozza, e lo
 * pubblica l'hook su `esito`, che lo azzera alla modifica successiva e lo
 * sostituisce aprendo o creando. Al pannello restano i soli **rifiuti** del
 * riallineamento, che per definizione non cambiano niente.
 */

export const MESSAGGI_FONTE = Object.freeze({
  [CODICI.fonteAllineata]: "L'istantanea regge: il sito non è cambiato su quello che la bozza usa.",
  [CODICI.fonteCambiata]: "Il sito è cambiato rispetto all'istantanea della bozza.",
  [CODICI.fonteAssente]:
    "Nessun tour corrispondente nel catalogo del sito: non c'è niente con cui confrontare.",
  [CODICI.fonteNonCorrispondente]:
    "Quel tour non è la fonte di questa bozza: accettarne l'istantanea le farebbe dire di descrivere un altro percorso.",
  [CODICI.fonteNonConfrontabile]:
    "L'identità corrisponde, ma la bozza non porta nessuna istantanea: non c'è niente da confrontare. Il riallineamento la ricostruisce.",
  [CODICI.fonteAccettata]: "Istantanea aggiornata. Non è ancora sul disco: salva la bozza.",
  [CODICI.nessunaBozza]: "Nessuna bozza aperta.",
});

const mostra = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return `${v.length} voci`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/**
 * @param {object} props
 * @param {object} props.contenuto  la bozza aperta
 * @param {object|null} props.tourAttuale  il tour del sito con lo stesso slug
 * @param {(tour: object) => {codice: string, allineato: boolean|null, scostamenti: Array}} props.onConfronta
 * @param {(tour: object) => {codice: string}} props.onRiallinea
 * @param {boolean} [props.disabilitato]
 */
export default function FonteTour({
  contenuto,
  tourAttuale,
  onConfronta,
  onRiallinea,
  disabilitato = false,
}) {
  /*
   * L'identità degli ingressi del confronto. Cambia quando cambia la bozza,
   * quando cambia il suo ramo `fonte` — riallineamento, apertura, ripristino —
   * o quando cambia il tour che arriva dal sito. Non cambia scrivendo un testo:
   * `fonte` resta lo stesso oggetto, e una risposta ancora vera resta.
   */
  const idBozza = contenuto?.id ?? null;
  const fonte = contenuto?.fonte ?? null;
  const chiave = useMemo(
    () => ({ idBozza, fonte, tour: tourAttuale }),
    [idBozza, fonte, tourAttuale],
  );

  /*
   * La risposta **insieme** alla chiave che l'ha prodotta. Il confronto si fa
   * durante il render: un effetto che azzera arriverebbe dopo, e per un
   * fotogramma il verdetto di prima starebbe sotto il contenuto nuovo.
   */
  const [memoria, setMemoria] = useState(null);
  const valida = memoria && memoria.chiave === chiave ? memoria : null;
  const risposta = valida?.risposta ?? null;
  const rifiuto = valida?.rifiuto ?? null;

  const confronta = useCallback(() => {
    setMemoria({ chiave, risposta: onConfronta(tourAttuale), rifiuto: null });
  }, [chiave, onConfronta, tourAttuale]);

  const riallinea = useCallback(() => {
    const e = onRiallinea(tourAttuale);
    /*
     * Riuscito: lo pubblica l'hook, e `fonte` cambia — una copia legata alla
     * chiave di prima sparirebbe nello stesso istante in cui la si scrive.
     * Rifiutato: non è cambiato niente, quindi il messaggio resta vero finché
     * resta lo stesso contesto, e ci viene legato.
     */
    setMemoria(
      e.codice === CODICI.fonteAccettata ? null : { chiave, risposta: null, rifiuto: e.codice },
    );
  }, [chiave, onRiallinea, tourAttuale]);

  const slug = contenuto.fonte?.slug || null;

  return (
    <section className="border border-[var(--border-on-dark)] p-4" data-parte="fonte">
      <h4 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        Fonte sul sito
      </h4>

      <p className="mb-3 font-body text-[11px] text-granite-mist/55">
        Slug: <span data-fonte-slug>{slug || "—"}</span> ·{" "}
        {tourAttuale ? "tour trovato nel catalogo" : "nessun tour con questo slug nel catalogo"}
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-azione="confronta-fonte"
          onClick={confronta}
          className="btn-mech inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em]"
        >
          <GitCompare size={12} aria-hidden="true" />
          Confronta con il sito
        </button>
        <button
          type="button"
          data-azione="riallinea-fonte"
          onClick={riallinea}
          disabled={disabilitato}
          className="btn-mech inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] disabled:opacity-40"
        >
          <RotateCw size={12} aria-hidden="true" />
          Accetta l&apos;istantanea del sito
        </button>
      </div>

      {rifiuto && (
        <p className="mb-2 font-body text-xs" data-esito-fonte={rifiuto}>
          {MESSAGGI_FONTE[rifiuto] || rifiuto}
        </p>
      )}

      {risposta && (
        <div data-confronto={risposta.codice}>
          <p className="mb-2 font-body text-xs">{MESSAGGI_FONTE[risposta.codice] || risposta.codice}</p>
          {risposta.scostamenti.length > 0 && (
            <table className="w-full font-body text-[11px]" data-elenco="scostamenti">
              <thead>
                <tr className="text-granite-mist/40">
                  <th className="text-left font-normal">campo</th>
                  <th className="text-left font-normal">prima</th>
                  <th className="text-left font-normal">adesso</th>
                </tr>
              </thead>
              <tbody>
                {risposta.scostamenti.map((s) => (
                  <tr key={s.campo} data-scostamento={s.campo} className="align-top text-granite-mist/70">
                    <td className="pr-2 text-granite-mist/45">{s.nome || s.campo}</td>
                    <td className="pr-2">{mostra(s.prima)}</td>
                    <td>{mostra(s.adesso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="mt-3 font-body text-[10px] leading-snug text-granite-mist/30">
        Il confronto non modifica niente e non marca la bozza come non salvata. Il riallineamento
        tocca soltanto l&apos;istantanea della fonte: testi, fatti, fotografie e revisioni restano
        dove sono.
      </p>
    </section>
  );
}
