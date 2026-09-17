import React from "react";
import Telaio from "../../Telaio";
import Foto from "../../Foto";
import { FOTO } from "../../../design/tokens";
import { CATEGORIA, GEOMETRIA, datiVisibili, fotoDelPost } from "../../../design/tour";
import { AmbitoProblemi } from "../../primitivi";
import { ClaimTour, CtaTour, DatiTour, IntestazioneTour, KickerTour, MarchioTour, TitoloTour } from "./parti";

/**
 * Il Post TOUR — 1080×1350, variante `standard`.
 *
 * Fotografia a tutta tela, velo dal basso, testo a bandiera sinistra ancorato
 * in fondo: è la composizione di «Scegli la tua avventura», riproporzionata
 * sulla tela reale. Niente arriva da EVENTI.
 *
 * Intestazione e marchio sono **locali**: il telaio comune li mette fuori
 * dall'area di sicurezza, e per TOUR devono starci dentro. Si spengono con
 * `conIntestazione={false}` e `conLogo={false}`, che non cambiano il
 * comportamento predefinito per chi il telaio lo usa già.
 *
 * @param {object} props
 * @param {object} props.contenuto  la bozza TOUR convalidata
 * @param {string} [props.sorgenteCover]  URL già risolto della cover
 * @param {object} [props.riferimento]  ref sul nodo che la cattura fotografa
 */
export default function PostTour({ contenuto, sorgenteCover, riferimento }) {
  const foto = fotoDelPost({ media: contenuto?.media, sorgenteCover });
  const dati = datiVisibili(contenuto?.fattuali, "post");
  const titolo = contenuto?.editoriale?.titoloBreve || contenuto?.fattuali?.nome || "";

  return (
    <Telaio
      categoria={CATEGORIA}
      formato="post"
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
          dimensioni={GEOMETRIA.post.tela}
          chiave="foto"
        />
      }
    >
      <AmbitoProblemi nome="tour-post">
        <IntestazioneTour formato="post" />
        <KickerTour formato="post" tipologia={contenuto?.fattuali?.categoria} />
        <TitoloTour formato="post" testo={titolo} />
        <ClaimTour formato="post" testo={contenuto?.editoriale?.claim} />
        <DatiTour formato="post" dati={dati} />
        <CtaTour formato="post" testo={contenuto?.editoriale?.cta} />
        <MarchioTour formato="post" />
      </AmbitoProblemi>
    </Telaio>
  );
}
