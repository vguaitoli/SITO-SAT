import React from "react";
import PannelloEsito from "./PannelloEsito";

/**
 * Collega l'esito di un'esportazione ai due gesti che può richiedere.
 *
 * Esiste per una ragione sola: **questo collegamento va verificato**. Quando
 * viveva dentro `EditorEvento` passava un unico callback ai tre rami del
 * pannello, e «Riprova» ripartiva con `ignoraAvvisi = true` — saltando in
 * silenzio avvisi che nessuno aveva accettato. Un difetto di due righe, in un
 * punto che nessun test poteva raggiungere senza montare l'editor intero.
 *
 * Le due azioni sono distinte e restano distinte:
 *
 * - **Riprova** ripete l'esportazione come la prima volta, `ignoraAvvisi`
 *   falso: il pre-flight rigira e, se ha trovato qualcosa di nuovo, si torna a
 *   chiedere.
 * - **Esporta comunque** è l'unico percorso che supera gli avvisi, e lo fa
 *   perché qualcuno l'ha premuto sapendo quali sono.
 *
 * @param {object} props
 * @param {object|null} props.daConfermare
 * @param {(cosa: string, ignoraAvvisi: boolean) => void} props.chiedi
 * @param {() => void} props.onChiudi
 */
export default function EsitoExport({ daConfermare, chiedi, onChiudi }) {
  const cosa = daConfermare?.tipo === "pacchetto" ? "pacchetto" : "vista";

  return (
    <PannelloEsito
      daConfermare={daConfermare}
      onRiprova={() => chiedi(cosa, false)}
      onEsportaComunque={() => chiedi(cosa, true)}
      onChiudi={onChiudi}
    />
  );
}
