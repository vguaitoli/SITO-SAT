import React from "react";
import Telaio from "../../Telaio";
import Foto from "../../Foto";
import { FOTO } from "../../../design/tokens";
import { CATEGORIA, GEOMETRIA, datiVisibili, fotoDellaStory } from "../../../design/tour";
import { AmbitoProblemi } from "../../primitivi";
import {
  ClaimTour,
  CtaTour,
  DatiTour,
  GuidaSticker,
  IntestazioneTour,
  KickerTour,
  MarchioTour,
  TitoloTour,
} from "./parti";

/**
 * La Story TOUR — 1080×1920, variante `standard`.
 *
 * **Non è il Post allungato.** La fotografia tiene 645 px liberi contro 378, i
 * dati scendono da tre a due, il titolo da tre righe a due, e tutto è ancorato
 * sopra il marchio, che a sua volta sta sopra la fascia del Link Sticker: il
 * fondo tela qui non è un riferimento, perché gli ultimi 340 px appartengono
 * all'interfaccia di Instagram.
 *
 * Il ripiego sulla cover è **osservabile** — `data-foto-ripiego` sul nodo — e
 * non nascosto: l'inquadratura della cover è pensata per il 4:5 e qui finisce
 * su una tela 9:16. Resta un fatto, non un problema del registro: il pre-flight
 * TOUR ne farà un avviso quando esisterà.
 *
 * @param {object} props
 * @param {object} props.contenuto  la bozza TOUR convalidata
 * @param {string} [props.sorgenteStory]  URL già risolto dello slot Story
 * @param {string} [props.sorgenteCover]  URL già risolto della cover, per il ripiego
 * @param {object} [props.riferimento]  ref sul nodo che la cattura fotografa
 */
export default function StoryTour({ contenuto, sorgenteStory, sorgenteCover, riferimento }) {
  const foto = fotoDellaStory({ media: contenuto?.media, sorgenteStory, sorgenteCover });
  const dati = datiVisibili(contenuto?.fattuali, "story");
  const titolo = contenuto?.editoriale?.titoloBreve || contenuto?.fattuali?.nome || "";

  return (
    <Telaio
      categoria={CATEGORIA}
      formato="story"
      riferimento={riferimento}
      conIntestazione={false}
      conLogo={false}
      sfondo={
        <Foto
          sorgente={foto.sorgente}
          ritaglio={foto.ritaglio}
          velo={FOTO.velo.medio}
          filtro={FOTO.filtro}
          etichettaVuoto="Fotografia del tour"
          /*
           * Geometria esplicita: html2canvas non legge `object-fit` e nel solo
           * PNG la fotografia usciva deformata. Vedi `geometria-foto.js`.
           */
          dimensioni={GEOMETRIA.story.tela}
          chiave="foto"
        />
      }
    >
      <AmbitoProblemi nome="tour-story">
        {/*
          Un contenitore che copre la tela: le parti restano posizionate sulle
          stesse coordinate, e il ripiego diventa leggibile dal DOM senza che
          il template debba avvisare qualcuno durante il disegno.
        */}
        <div
          data-foto-ripiego={String(foto.ripiego)}
          style={{ position: "absolute", inset: 0 }}
        >
          <IntestazioneTour formato="story" />
          <KickerTour formato="story" tipologia={contenuto?.fattuali?.categoria} />
          <TitoloTour formato="story" testo={titolo} />
          <ClaimTour formato="story" testo={contenuto?.editoriale?.claim} />
          <DatiTour formato="story" dati={dati} />
          <CtaTour formato="story" testo={contenuto?.editoriale?.cta} />
          <MarchioTour formato="story" />
          <GuidaSticker />
        </div>
      </AmbitoProblemi>
    </Telaio>
  );
}
