// Fonte: programmi Airzoone forniti da Vittorio il 24 ottobre 2026.
// Tunisia moto mantenuta al 2026 su indicazione di Vittorio. Date esatte da confermare.
const tunisiaStages = [
  ['Arrivo a Douz', 'Volo per Tunisi, trasferimento a Douz, incontro con lo staff e briefing. Cena e pernottamento in hotel.'],
  ['Le prime dune', 'Dune di El Faouar e percorso verso il pozzo di Bir Amhed. Primo pernottamento in campo.'],
  ['Verso Tembaine', 'Percorso verso il confine algerino e le dune più alte. Pernottamento nella zona di Tembaine.'],
  ['La sorgente nel deserto', 'Escursione alla sorgente di Wadi Treschet e rientro al campo per la notte.'],
  ['Cordoni di dune', 'Attraversamento delle dune passando da Ticanis fino alla piana di El Mida. Notte in campo.'],
  ['Ksar Ghilane', 'Arrivo all’oasi e alla sorgente termale. Pernottamento in campo nei pressi del fortino.'],
  ['Rientro a Douz', 'Attraversamento dell’Erg Biben e arrivo a Douz nel pomeriggio. Cena e pernottamento in hotel.'],
  ['Rientro in Italia', 'Trasferimento a Tunisi e partenza secondo gli orari dei voli.'],
];
const tunisiaIncluded = ['Pensione completa durante il viaggio', 'Due notti in hotel 3/4 stelle, in camera doppia', 'Fuoristrada di assistenza per trasporto bagagli e benzina', 'Personale esperto e guida accompagnatrice italiana', 'Permessi statali', 'Assistenza meccanica per quanto possibile', 'Assicurazione RC tour operator'];
// Marocco: proposta editoriale originale, non programma operativo confermato.
export const AFRICA_TRIPS = [
{
  "slug": "marocco-4x4-quad-ssv",
  "draft": true,
  "country": "Marocco",
  "title": "Marocco in moto, 4x4, quad e SSV",
  "subtitle": "La valle del Drâa, le dune di Chegaga, gli orizzonti di Iriki.",
  "vehicles": "Moto · 4x4 · Quad · SSV",
  "days": 8,
  "minimum": null,
  "price": null,
  "cover": "/media/africa/marocco-chegaga.jpg",
  "coverAlt": "Dromedari e dune di Erg Chegaga, Marocco. Foto Jamou.",
  "hero": {
    "src": "/media/africa/marocco-chegaga.jpg",
    "width": 1280,
    "height": 853,
    "alt": "Dromedari e dune di Erg Chegaga, Marocco. Foto Jamou."
  },
  "photos": [],
  "description": "Otto giorni nel sud del Marocco, con un anello da Agdz attraverso Zagora, M’Hamid ed Erg Chegaga. Dalla valle del Drâa alle distese di Iriki, una proposta di viaggio dedicata a moto, 4x4, quad e SSV.",
  "included": [],
  "excluded": [],
  "supplements": null,
  "stages": [
    [
      "Arrivo a Ouarzazate · Agdz",
      "Arrivo a Ouarzazate e trasferimento ad Agdz, porta della valle del Drâa. Incontro con lo staff, presentazione del percorso e preparazione dei mezzi."
    ],
    [
      "Agdz · Zagora",
      "Si entra nel viaggio lungo la valle del Drâa: piste, palmeti e villaggi in terra cruda accompagnano la discesa verso Zagora. Una prima giornata per prendere il ritmo del gruppo."
    ],
    [
      "Zagora · M’Hamid · Erg Lihoudi",
      "Verso M’Hamid il paesaggio si apre e la vegetazione lascia spazio alla sabbia. Le prime dune di Erg Lihoudi introducono alla guida nel deserto e alla prima serata al campo."
    ],
    [
      "Erg Lihoudi · Erg Chegaga",
      "Piste sabbiose e tratti di dune conducono verso Erg Chegaga. Il percorso alterna guida e soste, fino all’arrivo tra i grandi cordoni del Sahara marocchino."
    ],
    [
      "Una giornata tra le dune di Chegaga",
      "Una giornata dedicata alla sabbia, con un anello da definire in base ai mezzi e all’esperienza dei partecipanti. Il tempo per guidare, fermarsi e ritrovare il campo nella luce del tramonto."
    ],
    [
      "Erg Chegaga · Iriki · Foum Zguid",
      "Si lasciano i cordoni di dune per gli spazi aperti della depressione di Iriki. Piste e paesaggi minerali accompagnano l’uscita dal deserto verso Foum Zguid."
    ],
    [
      "Foum Zguid · Agdz · Ouarzazate",
      "Rientro verso Agdz tra altopiani e paesaggi dell’Anti Atlante. Conclusione dell’anello e trasferimento a Ouarzazate per l’ultima serata del viaggio."
    ],
    [
      "Ouarzazate · Rientro",
      "Tempo a disposizione secondo gli orari dei voli e trasferimento in aeroporto. Si chiude un viaggio tra palmeti, piste e grandi dune."
    ]
  ]
},
  {
    slug: 'tunisia-moto', hero: {"src": "/media/africa/tunisia-moto-hero.webp", "width": 1080, "height": 1440, "alt": "Moto da enduro tra le dune, dal programma Tunisia Airzoone"}, photos: [{"src": "/media/africa/tunisia-moto-foto-1.webp", "width": 640, "height": 480, "caption": "Le notti al campo", "alt": "Le notti al campo · Airzoone"}, {"src": "/media/africa/tunisia-moto-foto-2.webp", "width": 615, "height": 461, "caption": "La guida tra le dune", "alt": "La guida tra le dune · Airzoone"}], cover: '/media/africa/tunisia-moto-cover.webp', coverAlt: 'Dune illuminate dalla luce calda, foto dal sito Airzoone', year: 2026, country: 'Tunisia', title: 'Tunisia in moto, 4x4, quad e SSV', subtitle: 'Dalle dune di Douz all’oasi di Ksar Ghilane.', vehicles: 'Moto · 4x4 · Quad · SSV', days: 8, minimum: 'Da confermare', price: 1590, priceNote: 'Quota del programma moto. Quote e trasporto per 4x4, quad e SSV da confermare.', minimumNote: 'Il programma di riferimento prevede un minimo di 8 moto.',
    description: 'Otto giorni tra dune, oasi e notti in campo. Un percorso da Douz verso Tembaine, la sorgente di Wadi Treschet e Ksar Ghilane, con assistenza al seguito.',
    included: [...tunisiaIncluded, 'Recupero moto in caso di avaria e proseguimento del partecipante sui mezzi di assistenza', 'Assicurazione base medico-bagaglio'],
    excluded: ['Voli aerei', 'Trasporto della propria moto dall’Italia: 450 €', 'Carburante: circa 90 €', 'Trasferimenti Tunisi–Douz A/R: circa 90 €, secondo il numero dei partecipanti', 'Carnet ATA: 100 €', 'Starlink: 20 € a settimana', 'Bevande in hotel, extra personali e mance'],
    supplements: 'Supplemento camera singola: 140 €.', stages: tunisiaStages,
  },
  {
    slug: 'tunisia-quad-ssv', hero: {"src": "/media/africa/tunisia-quad-ssv-hero.webp", "width": 1600, "height": 1032, "alt": "Le dune del deserto tunisino, foto Airzoone"}, photos: [{"src": "/media/africa/tunisia-quad-ssv-foto-1.webp", "width": 621, "height": 414, "caption": "Il deserto in quad", "alt": "Il deserto in quad · Airzoone"}, {"src": "/media/africa/tunisia-quad-ssv-foto-2.webp", "width": 1800, "height": 1200, "caption": "Gli spazi del Sahara", "alt": "Gli spazi del Sahara · Airzoone"}], cover: '/media/africa/tunisia-quad-ssv-cover.webp', coverAlt: 'Dune del deserto nella proposta Tunisia di Airzoone', country: 'Tunisia', title: 'Tunisia in moto, 4x4, quad e SSV', subtitle: 'Il Sahara tra dune, campi e sorgenti.', vehicles: 'Moto · 4x4 · Quad · SSV', days: 8, minimum: 'Da confermare', price: 1590, priceNote: 'Quota del programma quad e SSV. Quote e trasporto per moto e 4x4 da confermare.', minimumNote: 'Il programma di riferimento prevede un minimo di 8 quad/SSV.',
    description: 'Un viaggio di otto giorni nel deserto tunisino, dalle prime dune di El Faouar alle oasi, con pernottamenti in campo e due notti in hotel a Douz.',
    included: [...tunisiaIncluded, 'Guida accompagnatrice italiana su quad o SSV', 'Telefono satellitare per le emergenze', 'Recupero quad in caso di avaria e proseguimento del partecipante sui mezzi di assistenza'],
    excluded: ['Voli aerei', 'Trasporto del proprio mezzo: quad 595 €, SSV 1.450 €', 'Carburante: circa 95 € per i quad', 'Trasferimenti Tunisi–Douz A/R: circa 80 €, secondo il numero dei partecipanti', 'Carnet ATA: 100 € a mezzo', 'Eventuale trasporto per recupero SSV', 'Assicurazione medico-bagaglio, consigliata nel programma', 'Bevande in hotel, extra personali e mance'],
    supplements: 'Passeggero: 1.490 €. Supplemento camera singola: 140 €.', stages: tunisiaStages,
  },
  {
    slug: 'libia-quad-ssv', hero: {"src": "/media/africa/libia-quad-ssv-hero.webp", "width": 1792, "height": 1344, "alt": "Moto e quad sulle grandi dune, dal programma Libia Airzoone"}, photos: [{"src": "/media/africa/libia-quad-ssv-foto-1.webp", "width": 564, "height": 376, "caption": "Tra roccia e sabbia", "alt": "Tra roccia e sabbia · Airzoone"}, {"src": "/media/africa/libia-quad-ssv-foto-2.webp", "width": 768, "height": 576, "caption": "Dentro i grandi erg", "alt": "Dentro i grandi erg · Airzoone"}], cover: '/media/africa/libia-quad-ssv.jpg', coverAlt: 'Rider e quad sulle dune, dalla copertina del programma Libia Airzoone', country: 'Libia', title: 'Libia in moto, 4x4, quad e SSV', subtitle: 'Dieci giorni tra arte rupestre e grandi erg.', vehicles: 'Moto · 4x4 · Quad · SSV', days: 10, minimum: 'Da confermare', price: 2550, priceNote: 'Quota del programma quad e SSV. Quote e trasporto per moto e 4x4 da confermare.', minimumNote: 'Il programma di riferimento prevede un minimo di 10 quad/SSV.',
    description: 'Dai laghi dell’Ubari alle formazioni rocciose dell’Akakus, fino alle dune del Murzuq. Un programma con notti in campo, assistenza e guide italiana e locale.',
    included: ['Voli interni Tripoli–Sebha A/R', 'Visto libico, permessi statali e targhe libiche per i mezzi', 'Pensione completa con cucina da campo', 'Due notti in hotel 3 stelle in camera doppia e una notte in campeggio a Tekerkiba, secondo programma', 'Fuoristrada di assistenza per trasporto bagagli e benzina', 'Guida accompagnatrice italiana, guida locale e polizia di accompagnamento', 'Assistenza meccanica per quanto possibile', 'Assicurazione RC tour operator'],
    excluded: ['Voli Italia–Tripoli', 'Trasporto mezzi: quad 680 €, SSV 1.690 €', 'Carnet ATA: 100 €', 'Carburante', 'Starlink: 20 € a settimana', 'Bevande ai pasti ed eventuali tasse libiche', 'Assicurazione base medico-bagaglio e annullamento', 'Extra personali e mance'],
    supplements: 'Accompagnatore su quad/SSV: 1.995 €. Supplemento camera singola: 100 €.',
    stages: [
      ['Italia · Tripoli · Sebha', 'Volo dall’Italia a Tripoli e proseguimento con volo interno per Sebha. Pernottamento in hotel.'],
      ['I laghi dell’Ubari', 'Mandara, Gabron e Oum El Ma, tra dune e specchi d’acqua. Circa 150 km e notte in campo.'],
      ['Verso Al Wainat', 'Tappa di trasferimento su sabbia, tra vallate e dune. Notte in campo.'],
      ['Avvicinamento all’Akakus', 'Proseguimento verso Al Wainat e l’Akakus su piste sabbiose e dune. Notte in campo.'],
      ['Dentro l’Akakus', 'Esplorazione delle formazioni rocciose e del territorio dell’Akakus. Notte in campo.'],
      ['Dal Messak al Murzuq', 'Mattinata nell’Akakus e trasferimento nel pomeriggio attraverso il Messak verso il Murzuq.'],
      ['Le dune del Murzuq', 'Attraversamento del grande erg e pernottamento in campo.'],
      ['Verso Tekerkiba', 'Percorso misto tra dune e piste, passando dai campi coltivati di Barjus. Notte in campeggio.'],
      ['Sebha · Tripoli', 'Rientro verso Sebha attraverso l’Ubari e volo serale per Tripoli. Pernottamento in hotel.'],
      ['Rientro in Italia', 'Colazione e trasferimento in aeroporto per il volo di rientro.'],
    ],
  },
];
