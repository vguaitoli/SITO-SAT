export const blogPosts = [
  {
    id: "supramonte-extreme-maxienduro",
    title: "Supramonte Extreme: tre giorni di Maxienduro nella Sardegna più selvaggia",
    excerpt:
      "Un tour di 3 giorni, 260 km e 88% sterrato tra Tiscali, Golgo, Cala Luna e Baunei: il Supramonte come pochi lo vivono davvero.",
    cover_image: "/media/real-nuraghe-tour.png?v=real2",
    published_date: "2026-07-11",
    route_lat: 40.244,
    route_lng: 9.383,
    route_location_name: "Supramonte",
    content: `Il Supramonte non è un luogo che si attraversa distrattamente. È una Sardegna dura, antica, verticale. Roccia calcarea, gole profonde, altipiani sospesi, strade sterrate che cambiano ritmo a ogni curva. Il nostro **Supramonte Extreme** nasce per chi cerca un'esperienza vera in Maxienduro, lontana dalle rotte turistiche e vicina all'anima più selvaggia dell'isola.

Il tour dura **3 giorni** e copre circa **260 km**, con una percentuale di sterrato dell'**88%**. È pensato per piloti di livello **esperto**, abituati a gestire la moto su fondi misti, pietra, salite tecniche e discese panoramiche.

La prima tappa porta verso **Tiscali**, tra doline, sentieri nascosti e tracce nuragiche immerse nella roccia. Qui la guida locale fa la differenza: non si tratta solo di seguire una traccia GPS, ma di leggere il territorio, scegliere il ritmo giusto e vivere il percorso con sicurezza.

Il secondo giorno si entra nel cuore dell'altopiano del **Golgo**, tra passaggi spettacolari e panorami che aprono lo sguardo verso canyon e montagne. Ogni sosta diventa parte dell'esperienza: una foto, un racconto, un pranzo tipico, il tempo di respirare davvero la Sardegna.

La parte finale porta verso **Cala Luna e Baunei**, dove il paesaggio cambia ancora: la montagna incontra il mare e la fatica lascia spazio a quella sensazione difficile da spiegare, quando capisci di aver vissuto qualcosa che resterà.

**Supramonte Extreme** è consigliato da **ottobre ad aprile** ed è ideale per chi vuole un tour intenso, tecnico e autentico. Non una semplice escursione, ma tre giorni dentro una Sardegna potente, ruvida e indimenticabile.`,
  },
  {
    id: "costa-dune-expedition-quad",
    title: "Costa & Dune Expedition: quad, dune e miniere nella Sardegna occidentale",
    excerpt:
      "Due giorni in quad tra le dune di Piscinas, la Costa Verde e le vecchie miniere del Sulcis: un tour accessibile, panoramico e spettacolare.",
    cover_image: "/media/real-coast-ride.png?v=real2",
    published_date: "2026-07-11",
    route_lat: 39.45,
    route_lng: 8.53,
    route_location_name: "Costa Verde",
    content: `Ci sono zone della Sardegna che sembrano appartenere a un altro tempo. La **Costa Verde** è una di queste: spiagge immense, dune dorate, vecchie miniere abbandonate e sterrati che corrono tra mare, macchia mediterranea e paesaggi quasi desertici.

Il nostro **Costa & Dune Expedition** è un tour in **quad** di **2 giorni**, pensato anche per chi non ha grande esperienza fuoristrada ma vuole vivere un'avventura vera. Il percorso copre circa **220 km**, con un **60% di sterrato** e un livello **principiante**, sempre accompagnato da guide locali esperte.

La prima parte del viaggio è dedicata alle **dune di Piscinas**, tra le più alte d'Europa. Qui il paesaggio è scenografico e potente: sabbia, vento, silenzio e piste che sembrano sparire all'orizzonte. Le soste fotografiche sono inevitabili, ma il bello è arrivarci guidando, sentendo il terreno cambiare sotto le ruote.

Il secondo giorno si entra nella parte più ruvida della Costa Verde, tra sterrati panoramici, spiagge selvagge e le **miniere abbandonate** del Sulcis. È una Sardegna diversa da quella delle cartoline estive: più autentica, più solitaria, più emozionante.

Il pranzo tipico è incluso e diventa parte del racconto: sapori locali, ritmo lento, condivisione con il gruppo e quella sensazione di viaggio che non dipende solo dai chilometri percorsi.

**Costa & Dune Expedition** è disponibile **tutto l'anno** ed è perfetto per coppie, amici, piccoli gruppi e per chi vuole avvicinarsi al mondo off-road senza affrontare percorsi troppo tecnici.

Un tour accessibile, ma non banale. Panoramico, ma pieno di carattere. La Sardegna occidentale, vissuta dal basso, tra polvere, mare e libertà.`,
  },
];

const byNewest = (a, b) => new Date(b.published_date || 0) - new Date(a.published_date || 0);

export async function listBlogPosts(db, limit) {
  let remotePosts = [];

  try {
    const loaded = await db.entities.BlogPost.list("-published_date");
    remotePosts = Array.isArray(loaded) ? loaded : [];
  } catch {
    remotePosts = [];
  }

  const merged = new Map(blogPosts.map((post) => [post.id, post]));

  remotePosts.forEach((post) => {
    if (post?.id) merged.set(post.id, post);
  });

  const posts = Array.from(merged.values()).sort(byNewest);
  return typeof limit === "number" ? posts.slice(0, limit) : posts;
}

export async function getBlogPost(db, id) {
  try {
    const remotePost = await db.entities.BlogPost.get(id);
    if (remotePost) return remotePost;
  } catch {
    // Static articles keep the local preview populated when no Base44 DB is connected.
  }

  return blogPosts.find((post) => post.id === id) || null;
}
