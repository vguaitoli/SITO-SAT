import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import LibreriaUI from "../media/LibreriaUI";
import Ritaglio from "../media/Ritaglio";
import SelettoreSlot from "../media/SelettoreSlot";
import { GEOMETRIA } from "../design/tour";
import { CODICI } from "./useBozzaTour";
import { useArchivio } from "./ContestoArchivio";

/**
 * Gli slot fotografici di TOUR, collegati alla bozza vera.
 *
 * TOUR dichiara due slot e basta — `cover` per il Post, `story` per la Story —
 * e sono **due ritagli distinti**: il Post è 4:5, la Story 9:16, e la stessa
 * fotografia vuole due inquadrature. Condividerne uno obbligherebbe a scegliere
 * quale dei due formati sacrificare.
 *
 * ## Quello che questo pannello non fa
 *
 * **Non sceglie gli slot da sé.** L'elenco viene dal registro per rubrica di
 * `media/slot.js`, attraverso `SelettoreSlot`: una rubrica sconosciuta non ha
 * slot e non ne eredita, e qui si traduce in nessun pulsante invece che nei
 * nove di EVENTI.
 *
 * **Non scrive nel contenuto.** Ogni assegnazione, ogni spostamento del punto
 * focale e ogni rimozione passa da `scriviMedia`, che convalida il ritaglio e
 * marca la bozza non salvata. Un ritaglio rifiutato non cambia niente — né
 * contenuto, né «non salvato», né archivio — e lo si legge, invece di vederlo
 * sparire in silenzio.
 *
 * **Non salva.** Assegnare una fotografia è una modifica come le altre e
 * diventa persistente solo con «Salva»: è quel salvataggio a produrre **una**
 * revisione, non ogni singolo spostamento del mirino.
 *
 * **Non conosce i byte.** Le immagini si disegnano dalle URL temporanee
 * dell'archivio, che è l'unico a saperle creare e a liberarle
 * (`FornitoreArchivio` chiama `liberaUrl` allo smontaggio). Nel contenuto
 * finisce solo l'`idBlob`, che è una chiave opaca: mai un data URL, mai un
 * percorso, mai un'immagine.
 *
 * **Non mostra il ripiego come se fosse una fotografia.** Una Story senza slot
 * proprio viene disegnata con la cover, ma lo slot **resta vuoto**: l'indicatore
 * lo dice spento, perché lo è, e il ripiego è un fatto dell'anteprima.
 *
 * **Non tiene una copia dell'esito.** Da 6.3M.1: gli esiti che l'hook pubblica
 * — `media-assegnato`, `ritaglio-media-non-valido` — si leggono da lui, che li
 * azzera alla modifica successiva e li sostituisce aprendo, creando, salvando o
 * ripristinando. Tenerne una copia qui li faceva sopravvivere al proprio
 * contesto: aprendo un'altra bozza restava a schermo «Fotografia aggiornata.
 * Non è ancora sul disco: salva.» sotto un contenuto su cui non era stato fatto
 * niente — e con un invito a salvare che non aveva oggetto.
 */

/**
 * Le zone su cui si inquadra, per slot.
 *
 * Sono le tele vere dei due formati, lette da `design/tour.js`: gli stessi
 * numeri con cui i template disegnano. Riscriverli qui sarebbe la premessa
 * della divergenza — l'editor mostrerebbe un'inquadratura e il PNG un'altra.
 *
 * Uno slot sconosciuto non ha zone: `Ritaglio` mostra il suo riquadro
 * predefinito solo quando gli si dà un elenco vuoto, e qui non si arriva se non
 * con uno slot che il registro non dichiara.
 */
export const ZONE_TOUR = Object.freeze({
  cover: Object.freeze([
    Object.freeze({ id: "post", nome: "Post TOUR", ...GEOMETRIA.post.tela }),
  ]),
  story: Object.freeze([
    Object.freeze({ id: "story", nome: "Story TOUR", ...GEOMETRIA.story.tela }),
  ]),
});

/**
 * Gli esiti che **l'hook pubblica** su `esito`, e che quindi non vanno ripetuti.
 *
 * Sono quelli che hanno cambiato qualcosa, o che hanno rifiutato una modifica
 * che era stata chiesta: l'hook li azzera al gesto successivo e li sostituisce
 * a ogni sostituzione del contenuto. La loro durata è già giusta, e una seconda
 * copia potrebbe solo essere più lunga del dovuto.
 */
const PUBBLICATI_DALL_HOOK = Object.freeze([CODICI.mediaAssegnato, CODICI.ritaglioMediaNonValido]);

/**
 * I soli codici che l'hook **non** pubblica, e che quindi tocca mostrare qui.
 *
 * Hanno una proprietà in comune: non cambiano niente. Uno slot che TOUR non
 * dichiara e una bozza che non c'è non producono nessuna scrittura, quindi il
 * messaggio resta vero finché resta vero il contesto in cui è stato prodotto —
 * ed è esattamente a quel contesto che viene legato.
 */
export const MESSAGGI_MEDIA = Object.freeze({
  [CODICI.slotMediaNonValido]:
    "Slot non previsto da TOUR: niente è stato scritto. TOUR dichiara solo la cover e la Story.",
  [CODICI.nessunaBozza]: "Nessuna bozza aperta: non c'è dove assegnare una fotografia.",
});

/**
 * L'elenco della libreria con le sue URL temporanee.
 *
 * Sta qui e non dentro il pannello perché serve in due posti: alle miniature e
 * all'anteprima della bozza, che deve disegnare **le stesse** immagini. Due
 * mappe separate finirebbero per disallinearsi al primo caricamento.
 *
 * `ricarica` è stabile: `LibreriaUI` la riceve come `onCambiata` e la mette fra
 * le dipendenze del proprio effetto, e una funzione nuova a ogni render la
 * farebbe rileggere per sempre.
 */
export function useUrlMedia() {
  const { archivio } = useArchivio();
  const [voci, setVoci] = useState([]);
  const [url, setUrl] = useState({});

  const ricarica = useCallback(async () => {
    if (!archivio) return;
    const elenco = await archivio.elencaMedia();
    const mappa = {};
    for (const v of elenco) {
      const u = await archivio.urlTemporaneo(v.id);
      if (u) mappa[v.id] = u;
    }
    setVoci(elenco);
    setUrl(mappa);
  }, [archivio]);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  return { voci, url, ricarica };
}

/**
 * @param {object} props
 * @param {object} props.contenuto  la bozza aperta
 * @param {(slot: string) => object|null} props.leggiMedia
 * @param {(slot: string, riferimento: object|null) => {codice: string}} props.scriviMedia
 * @param {Record<string, string>} props.url  idBlob → URL temporanea
 * @param {() => void} props.onLibreriaCambiata  stabile
 * @param {boolean} [props.disabilitato]  una scrittura è in volo
 */
export default function MediaTour({
  contenuto,
  leggiMedia,
  scriviMedia,
  url,
  onLibreriaCambiata,
  disabilitato = false,
}) {
  /*
   * Slot attivo e selezione nella libreria sono **preferenze di chi lavora**:
   * non attribuiscono nessun fatto a nessuna bozza e non dichiarano niente di
   * riuscito. Restano dove sono state messe anche cambiando contenuto, perché
   * azzerarle sarebbe un fastidio senza una ragione.
   */
  const [slotAttivo, setSlotAttivo] = useState("cover");
  const [selezionata, setSelezionata] = useState(null);

  const riferimento = leggiMedia(slotAttivo);
  const sorgente = riferimento?.idBlob ? url[riferimento.idBlob] : undefined;

  /*
   * L'identità del contesto a cui un messaggio appartiene: quale bozza, e con
   * quale ramo `media`. Cambiando bozza il primo cambia; assegnando o togliendo
   * una fotografia cambia il secondo. In entrambi i casi un messaggio prodotto
   * prima smette di descrivere quel che si ha davanti, e sparisce **durante il
   * render** — non in un effetto, che per un fotogramma lo mostrerebbe ancora
   * sotto il contenuto nuovo.
   */
  const idBozza = contenuto?.id ?? null;
  const ramoMedia = contenuto?.media ?? null;
  const chiave = useMemo(() => ({ idBozza, ramoMedia }), [idBozza, ramoMedia]);
  const [memoria, setMemoria] = useState(null);
  const esitoMedia = memoria && memoria.chiave === chiave ? memoria.codice : null;

  /**
   * Registra l'esito **solo** se l'hook non lo pubblica già.
   *
   * Non è una scorciatoia: mostrare due volte lo stesso fatto significa avere
   * due durate da tenere allineate, e la seconda è sempre quella che sopravvive
   * troppo.
   */
  const riporta = useCallback(
    (risposta) => {
      const codice = risposta?.codice ?? null;
      setMemoria(codice && !PUBBLICATI_DALL_HOOK.includes(codice) ? { chiave, codice } : null);
      return risposta;
    },
    [chiave],
  );

  const assegna = useCallback(() => {
    if (disabilitato || !selezionata) return;
    // Un'assegnazione nuova riparte da un'inquadratura neutra: ereditare zoom e
    // punto focale del file di prima applicherebbe a questa fotografia una
    // scelta fatta guardandone un'altra.
    riporta(scriviMedia(slotAttivo, { idBlob: selezionata, zoom: 1, x: 0.5, y: 0.5, specchiata: false }));
  }, [disabilitato, selezionata, scriviMedia, slotAttivo, riporta]);

  /*
   * Il confine, non solo l'attributo. `Ritaglio` si ferma da sé, ma la callback
   * che gli è stata data può essere già stata catturata da una trascinata in
   * corso: chi la riceve deve poter rifiutare comunque.
   */
  const cambiaRitaglio = useCallback(
    (nuovo) => {
      if (disabilitato) return;
      if (!riferimento?.idBlob) return;
      riporta(scriviMedia(slotAttivo, { ...riferimento, ...nuovo, idBlob: riferimento.idBlob }));
    },
    [disabilitato, riferimento, scriviMedia, slotAttivo, riporta],
  );

  const rimuovi = useCallback(() => {
    if (disabilitato) return;
    riporta(scriviMedia(slotAttivo, null));
  }, [disabilitato, scriviMedia, slotAttivo, riporta]);

  const zone = useMemo(() => ZONE_TOUR[slotAttivo] || [], [slotAttivo]);

  /*
   * Il ripiego è un fatto dell'anteprima, non dello slot. Si dichiara qui in
   * parole perché chi compone sappia che cosa vedrà, senza che l'indicatore
   * dello slot cominci a raccontare di avere una fotografia che non ha.
   */
  const storyInRipiego =
    slotAttivo === "story" && !riferimento?.idBlob && Boolean(leggiMedia("cover")?.idBlob);

  return (
    <section
      className="border border-[var(--border-on-dark)] p-4"
      data-parte="media"
      /*
       * Il ritaglio dello slot attivo, leggibile da una prova senza passare
       * dagli stili: è la stessa convenzione di `data-slot` e `data-piena`, e
       * serve a verificare che durante una scrittura **non cambi**.
       */
      data-ritaglio-corrente={JSON.stringify(riferimento ?? null)}
    >
      <h4 className="mb-3 font-button text-[10px] uppercase tracking-[0.22em] text-[var(--accent-soft)]">
        Fotografie · cover e Story
      </h4>

      <LibreriaUI
        onSeleziona={setSelezionata}
        selezionato={selezionata}
        onCambiata={onLibreriaCambiata}
      />

      <div className="mt-4">
        <SelettoreSlot
          rubrica="tour"
          media={contenuto.media}
          attivo={slotAttivo}
          onSceglie={setSlotAttivo}
        />

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={assegna}
            disabled={!selezionata || disabilitato}
            className="btn-mech bg-[var(--cta)] px-3 py-2 text-xs text-[var(--cta-text)] disabled:opacity-40"
          >
            Assegna la foto selezionata
          </button>
          <button
            type="button"
            onClick={rimuovi}
            disabled={!riferimento?.idBlob || disabilitato}
            data-azione="rimuovi-foto"
            className="btn-mech inline-flex items-center gap-1.5 border border-[var(--border-on-dark)] px-3 py-2 font-button text-[10px] uppercase tracking-[0.16em] text-granite-mist/70 disabled:opacity-40"
          >
            <ImageOff size={12} aria-hidden="true" />
            Togli la fotografia
          </button>
        </div>

        {storyInRipiego && (
          <p className="mb-3 font-body text-[11px] leading-snug text-granite-mist/55" data-nota="ripiego-story">
            Lo slot Story è <strong>vuoto</strong>: l&apos;anteprima disegnerà la cover al suo
            posto, con l&apos;inquadratura della cover. È un ripiego del rendering, non una
            fotografia assegnata alla Story.
          </p>
        )}

        {esitoMedia && (
          <p className="mb-3 font-body text-xs" data-esito-media={esitoMedia}>
            {MESSAGGI_MEDIA[esitoMedia] || esitoMedia}
          </p>
        )}

        <label className="mb-3 flex items-center gap-2 font-body text-xs text-granite-mist/65">
          <input
            type="checkbox"
            aria-label="Rifletti la fotografia"
            checked={Boolean(riferimento?.specchiata)}
            disabled={!riferimento?.idBlob || disabilitato}
            onChange={(e) => cambiaRitaglio({ specchiata: e.target.checked })}
            className="accent-[var(--accent)]"
          />
          Rifletti la fotografia di questo slot
        </label>

        <Ritaglio
          sorgente={sorgente}
          valore={riferimento}
          onCambia={cambiaRitaglio}
          zone={zone}
          bloccato={disabilitato}
        />
      </div>
    </section>
  );
}
