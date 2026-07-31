/**
 * Le esperienze di Sardegna Trail Avventura.
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
    fotoCard: "hero-maxienduro-crinale",
    fotoHero: "hero-maxienduro-crinale",
    // Carosello nella pagina categoria: foto reali distinte, mai ripetute in altre categorie.
    carosello: ["cat-maxienduro", "carousel-maxienduro-1", "carousel-maxienduro-2", "carousel-maxienduro-3", "carousel-maxienduro-4", "carousel-maxienduro-5", "carousel-maxienduro-6", "carousel-maxienduro-7", "carousel-maxienduro-8", "carousel-maxienduro-9", "carousel-maxienduro-10", "carousel-maxienduro-11", "carousel-maxienduro-12", "carousel-maxienduro-13", "carousel-maxienduro-14"],
    claim: "Grandi distanze, nessun limite",
    cardIntro: "Viaggi tra asfalto e sterrato.",
    intro:
      "Un tour in maxienduro in Sardegna è la scelta di chi vuole macinare chilometri veri: moto da viaggio alte e potenti, pensate per affrontare asfalto e sterrato senza fermarsi mai. La soluzione ideale per attraversare l'isola da costa a costa, con il comfort di una moto da turismo e l'anima del fuoristrada.",
    adatto: "Piloti con esperienza su moto pesanti, a proprio agio nella guida in piedi sullo sterrato.",
  },
  {
    id: "enduro",
    nome: "Enduro",
    tourType: "Enduro",
    fotoCard: "cat-enduro",
    fotoHero: "hero-enduro-gruppo",
    carosello: ["cat-enduro", "carousel-enduro-1", "carousel-enduro-2", "carousel-enduro-3", "carousel-enduro-4", "carousel-enduro-5", "carousel-enduro-6", "carousel-enduro-7", "carousel-enduro-8", "carousel-enduro-9", "carousel-enduro-10", "carousel-enduro-11", "carousel-enduro-12", "carousel-enduro-13", "carousel-enduro-14", "carousel-enduro-15", "carousel-enduro-16", "carousel-enduro-17", "carousel-enduro-18", "carousel-enduro-19", "carousel-enduro-20", "carousel-enduro-21", "carousel-enduro-22", "carousel-enduro-23", "carousel-enduro-24", "carousel-enduro-25", "carousel-enduro-26", "carousel-enduro-27", "carousel-enduro-28", "carousel-enduro-29", "carousel-enduro-30", "carousel-enduro-31", "carousel-enduro-32", "carousel-enduro-33", "carousel-enduro-34", "carousel-enduro-35", "carousel-enduro-36", "carousel-enduro-37", "carousel-enduro-38", "carousel-enduro-39", "carousel-enduro-40", "carousel-enduro-41", "carousel-enduro-42", "carousel-enduro-43", "carousel-enduro-44", "carousel-enduro-45", "carousel-enduro-46", "carousel-enduro-47", "carousel-enduro-48", "carousel-enduro-49", "carousel-enduro-50", "carousel-enduro-51", "carousel-enduro-52", "carousel-enduro-53", "carousel-enduro-54", "carousel-enduro-55", "carousel-enduro-56", "carousel-enduro-57"],
    claim: "Leggera, agile, tecnica",
    cardIntro: "Tecnica agile sui sentieri selvaggi.",
    intro:
      "Un tour enduro in Sardegna su moto leggere e maneggevoli, nate per i sentieri stretti e i passaggi tecnici. Dove la maxienduro non arriva, l'enduro danza: mulattiere, tratturi e single track nel cuore più selvaggio della Barbagia e del Supramonte.",
    adatto: "Chi ama la guida tecnica e i percorsi impegnativi, dal livello avanzato in su.",
  },
  {
    id: "quad",
    nome: "Quad",
    tourType: "Quad",
    fotoCard: "cat-quad",
    fotoHero: "hero-quad-convoglio",
    carosello: ["cat-quad", "carousel-quad-1", "carousel-quad-2", "carousel-quad-3"],
    claim: "Il fuoristrada per tutti",
    cardIntro: "Stabile e accessibile a tutti.",
    intro:
      "Quattro ruote, tanta stabilità e nessuna esperienza richiesta. Un tour in quad in Sardegna è il modo più immediato per vivere lo sterrato dell'isola: divertente, sicuro e accessibile anche a chi non ha mai guidato fuoristrada.",
    adatto: "Tutti, anche i principianti assoluti: si guida con la stessa logica di un mezzo a manubrio.",
  },
  {
    id: "ssv",
    nome: "SSV",
    // Nessun tour SSV nei contenuti attuali: la categoria rimanda alla richiesta info.
    tourType: null,
    fotoCard: "cat-ssv",
    fotoHero: "hero-ssv-guado",
    carosello: ["cat-ssv", "carousel-ssv-1", "carousel-ssv-2", "carousel-ssv-3", "carousel-ssv-4", "carousel-ssv-5", "carousel-ssv-6", "carousel-ssv-7", "carousel-ssv-8"],
    claim: "Guida affiancata, adrenalina condivisa",
    cardIntro: "Adrenalina condivisa, fianco a fianco.",
    intro:
      "Side-by-Side: veicoli a due posti affiancati, con volante, cinture e roll-bar. Un'esperienza in SSV in Sardegna regala tutta l'adrenalina del fuoristrada, da condividere con chi ti siede accanto. Torrenti, guadi e pietraie diventano puro divertimento.",
    adatto: "Chi cerca emozioni forti volendo guidare — o vivere l'esperienza da passeggero.",
  },
  {
    id: "4x4",
    nome: "4x4",
    tourType: "4x4",
    fotoCard: "cat-4x4",
    fotoHero: "4x4exp-salita",
    carosello: ["cat-4x4", "carousel-4x4-1", "carousel-4x4-2", "carousel-4x4-3", "carousel-4x4-4", "carousel-4x4-5"],
    claim: "L'avventura senza compromessi",
    cardIntro: "Spedizioni verso la Sardegna nascosta.",
    intro:
      "Fuoristrada veri, attrezzati per l'off-road più impegnativo. Altipiani, guadi, coste remote e borghi minerari raggiungibili solo su quattro ruote motrici: un tour in 4x4 è la spedizione per esplorare la Sardegna più nascosta con tutto il gruppo a bordo.",
    adatto: "Appassionati di off-road e famiglie o gruppi che vogliono esplorare insieme.",
  },
  {
    id: "4x4-experience",
    nome: "4x4 Experience",
    // Nessun tour dedicato nei contenuti attuali: la categoria rimanda alla richiesta info.
    tourType: null,
    fotoCard: "4x4exp-crinale",
    fotoHero: "4x4exp-nuvole",
    carosello: ["4x4exp-crinale", "carousel-4x4exp-1", "carousel-4x4exp-2", "4x4exp-nuvole"],
    claim: "La Sardegna, comodi a bordo",
    cardIntro: "Passeggeri, comodi e in sicurezza.",
    intro:
      "Sali a bordo dei 4x4 dell'organizzazione e lasciati portare alla scoperta della Sardegna più nascosta, guidati dalle nostre guide esperte. Nessuna patente, nessuna esperienza di guida richiesta: basta sedersi, godersi il panorama e vivere l'emozione del fuoristrada in tutta comodità e sicurezza, adatto anche a famiglie con bambini.",
    adatto: "Famiglie con bambini, gruppi e chiunque voglia vivere il fuoristrada da passeggero, senza guidare e senza pensieri.",
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
    // Nessun carosello: nessuna foto reale disponibile per questa categoria.
    carosello: [],
    claim: "L'isola, un tornante alla volta",
    cardIntro: "Coste e tornanti panoramici.",
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
    carosello: ["ebike-pineta", "carousel-ebike-1", "carousel-ebike-2", "carousel-ebike-3"],
    claim: "Natura, silenzio, zero fatica",
    cardIntro: "Natura e sentieri senza fatica.",
    intro:
      "Un tour in e-bike in Sardegna, in mountain bike a pedalata assistita, per vivere l'isola in modo lento e immersivo. L'e-bike annulla la fatica delle salite e ti porta dove i mezzi a motore non arrivano: sentieri silenziosi, nuraghi nascosti e borghi dell'entroterra, a contatto totale con la natura.",
    adatto: "Tutti, anche senza allenamento: la pedalata assistita rende ogni salita accessibile.",
  },
  {
    id: "corsi-off-road",
    nome: "Corsi Off-road",
    kind: "course",
    // I corsi non sono itinerari a catalogo: programma, disponibilità e
    // requisiti vengono definiti direttamente con il partecipante.
    tourType: null,
    fotoCard: "corsi-guida-enduro-fiume",
    fotoHero: "corsi-guida-enduro-fiume",
    carosello: [],
    claim: "Più tecnica, più controllo",
    cardIntro: "Tecnica e sicurezza con un istruttore qualificato.",
    intro:
      "Corsi di guida off-road in Sardegna pensati per migliorare tecnica, controllo del mezzo e sicurezza sullo sterrato. Gianluca Serra, istruttore qualificato, definisce il lavoro in base all'esperienza del partecipante, alla moto e agli obiettivi di guida.",
    adatto:
      "Chi vuole iniziare con basi solide o perfezionare la propria tecnica in fuoristrada, con un percorso calibrato sul proprio livello.",
  },
  {
    id: "noleggio",
    nome: "Noleggio",
    kind: "rental",
    // Servizio di noleggio, non un itinerario a catalogo: nessun tour associato.
    tourType: null,
    fotoCard: "noleggio-discesa-vallata",
    fotoHero: "noleggio-discesa-vallata",
    carosello: ["maxienduro-tenere", "enduro-vetta", "quad-pietraia"],
    claim: "Non hai il mezzo. Hai già l'avventura.",
    cardIntro: "Il mezzo giusto per il tuo tour.",
    intro:
      "Vuoi partecipare a uno dei nostri tour ma non puoi raggiungere la Sardegna con il tuo mezzo? Ti aiutiamo a organizzare il noleggio di Quad, Enduro o Maxienduro attraverso partner locali selezionati, scegliendo la soluzione più adatta all'itinerario e alla tua esperienza.",
    adatto:
      "A chi vuole vivere un tour Sardegna Trail Avventura senza possedere o trasportare il proprio mezzo.",
  },
];

const byId = new Map(CATEGORIE.map((c) => [c.id, c]));

export function categoria(id) {
  return byId.get(id) || null;
}
