/**
 * Le cinque categorie di esperienza di Sardegna Trail Avventura.
 *
 * Le descrizioni raccontano il CARATTERE di ciascuna disciplina e del mezzo
 * (informazioni generali sul tipo di veicolo), senza inventare dati operativi
 * dei tour: durate, livelli e periodi restano quelli reali definiti in
 * src/components/TourDetails.jsx e vengono associati dinamicamente per "type".
 */

export const CATEGORIE = [
  {
    id: "maxienduro",
    nome: "Maxienduro",
    // Tipo del tour in TourDetails a cui questa categoria è collegata.
    tourType: "Maxienduro",
    // Slug foto (manifest src/data/foto.js).
    fotoCard: "cat-maxienduro",
    fotoHero: "hero-maxienduro-panorama",
    galleria: ["maxienduro-tenere", "maxienduro-sosta-bosco", "hero-maxienduro-panorama"],
    claim: "Grandi distanze, nessun limite",
    intro:
      "Le grandi maxienduro da viaggio: moto alte e potenti, pensate per macinare chilometri su asfalto e affrontare lo sterrato senza fermarsi. La scelta di chi vuole attraversare l'isola da costa a costa con il comfort di una moto da turismo e l'anima del fuoristrada.",
    adatto: "Piloti con esperienza su moto pesanti, a proprio agio nella guida in piedi sullo sterrato.",
  },
  {
    id: "enduro",
    nome: "Enduro",
    tourType: "Enduro",
    fotoCard: "cat-enduro",
    fotoHero: "hero-enduro-gruppo",
    galleria: ["enduro-sentiero", "enduro-vetta", "hero-enduro-gruppo"],
    claim: "Leggera, agile, tecnica",
    intro:
      "Moto da enduro leggere e maneggevoli, nate per i sentieri stretti e i passaggi tecnici. Dove la maxienduro non arriva, l'enduro danza: mulattiere, tratturi e single track nel cuore più selvaggio della Barbagia e del Supramonte.",
    adatto: "Chi ama la guida tecnica e i percorsi impegnativi, dal livello avanzato in su.",
  },
  {
    id: "quad",
    nome: "Quad",
    tourType: "Quad",
    fotoCard: "cat-quad",
    fotoHero: "hero-quad-convoglio",
    galleria: ["quad-pietraia", "hero-quad-convoglio"],
    claim: "Il fuoristrada per tutti",
    intro:
      "Quattro ruote, tanta stabilità e nessuna esperienza richiesta. Il quad è il modo più immediato per vivere lo sterrato sardo: divertente, sicuro e accessibile anche a chi non ha mai guidato fuoristrada.",
    adatto: "Tutti, anche i principianti assoluti: si guida con la stessa logica di un mezzo a manubrio.",
  },
  {
    id: "ssv",
    nome: "SSV",
    // Nessun tour SSV nei contenuti attuali: la categoria rimanda alla richiesta info.
    tourType: null,
    fotoCard: "cat-ssv",
    fotoHero: "hero-ssv-guado",
    galleria: ["ssv-roccia", "ssv-bandiera", "ssv-spiaggia-flotta"],
    claim: "Guida affiancata, adrenalina condivisa",
    intro:
      "Side-by-Side: veicoli a due posti affiancati, con volante, cinture e roll-bar. Tutta l'adrenalina del fuoristrada estremo in totale sicurezza, da condividere con chi ti siede accanto. Guado dei torrenti, guadi e pietraie diventano puro divertimento.",
    adatto: "Chi cerca emozioni forti volendo guidare — o vivere l'esperienza da passeggero.",
  },
  {
    id: "4x4",
    nome: "4x4",
    tourType: "4x4",
    fotoCard: "cat-4x4",
    fotoHero: "hero-4x4-costa",
    galleria: ["4x4-guado", "4x4-crinale", "4x4-borgo-pietra"],
    claim: "L'avventura senza compromessi",
    intro:
      "Fuoristrada veri, attrezzati per l'off-road più impegnativo. Altipiani, guadi, coste remote e borghi minerari raggiungibili solo su quattro ruote motrici: il 4x4 è la spedizione per esplorare la Sardegna più nascosta con tutto il gruppo a bordo.",
    adatto: "Appassionati di off-road e famiglie o gruppi che vogliono esplorare insieme.",
  },
  {
    id: "4x4-experience",
    nome: "4x4 Experience",
    // Nessun tour dedicato nei contenuti attuali: la categoria rimanda alla richiesta info.
    tourType: null,
    fotoCard: "4x4exp-crinale",
    fotoHero: "4x4exp-salita",
    galleria: ["4x4exp-salita", "4x4exp-crinale", "4x4exp-nuvole", "4x4exp-guado", "4x4exp-bosco"],
    claim: "L'avventura, seduti a bordo",
    intro:
      "Vivi il fuoristrada più estremo senza guidare: sali a bordo dei 4x4 dell'organizzazione, guidati dalle nostre guide esperte, e lasciati portare tra crinali, guadi e salite ripide che il fuoristrada normale non affronta. Tutta l'adrenalina dell'off-road, zero pensieri.",
    adatto: "Chi vuole vivere l'adrenalina del fuoristrada estremo da passeggero, senza bisogno di patente o esperienza di guida.",
  },
  {
    id: "tour-stradali",
    nome: "Tour Stradali",
    // Nessun tour dedicato nei contenuti attuali: la categoria rimanda alla richiesta info.
    tourType: null,
    // Nessuna foto reale ancora disponibile per questa categoria: fotoCard/fotoHero
    // restano null finché non verranno fornite. I componenti mostrano un
    // segnaposto grafico (icona), mai una foto non pertinente o inventata.
    fotoCard: null,
    fotoHero: null,
    galleria: [],
    claim: "L'isola, un tornante alla volta",
    intro:
      "Le strade panoramiche della Sardegna raccontano l'isola da un'altra prospettiva: coste a strapiombo, tornanti tra i monti e borghi di pietra, tutto su asfalto. Percorsi pensati per chi ama viaggiare comodo, senza rinunciare all'emozione della strada.",
    adatto: "Chi preferisce l'asfalto allo sterrato: adatto a moto e auto, da soli o in piccoli gruppi.",
  },
  {
    id: "e-bike",
    nome: "E-Bike",
    tourType: "E-Bike",
    fotoCard: "ebike-pineta",
    fotoHero: "ebike-costa",
    galleria: ["ebike-costa", "ebike-pineta", "pinnetta-sosta"],
    claim: "Natura, silenzio, zero fatica",
    intro:
      "Mountain bike a pedalata assistita per vivere la Sardegna in modo lento e immersivo. L'e-bike annulla la fatica delle salite e ti porta dove i mezzi a motore non arrivano: sentieri silenziosi, nuraghi nascosti e borghi dell'entroterra, a contatto totale con la natura.",
    adatto: "Tutti, anche senza allenamento: la pedalata assistita rende ogni salita accessibile.",
  },
];

const byId = new Map(CATEGORIE.map((c) => [c.id, c]));

export function categoria(id) {
  return byId.get(id) || null;
}
