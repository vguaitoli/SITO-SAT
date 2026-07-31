export const LEGAL_CONTENT = {
  it: {
    privacy: {
      eyebrow: "Privacy",
      title: "INFORMATIVA",
      accent: "PRIVACY",
      intro: "Informativa resa ai sensi dell’art. 13 del Regolamento (UE) 2016/679 (GDPR).",
      updated: "Ultimo aggiornamento: 31 luglio 2026.",
      sections: [
        {
          title: "Titolare del trattamento",
          paragraphs: [
            "Il Titolare del trattamento è {person}, titolare di {owner} ({form}), P.IVA {vat}, con sede in {address}.",
            "Per qualsiasi richiesta relativa ai tuoi dati personali puoi scrivere a {email}.",
          ],
        },
        {
          title: "Categorie di dati trattati",
          paragraphs: [
            "Quando ci contatti tramite il modulo o i canali diretti trattiamo i dati che ci fornisci spontaneamente.",
            "Per erogare e proteggere il sito, l’infrastruttura Vercel può trattare dati tecnici come indirizzo IP, data e ora della richiesta, risorsa richiesta, informazioni sul browser o dispositivo e log di sicurezza.",
            "Vercel Analytics elabora dati statistici quali data e ora, pagina o indirizzo visitato, provenienza, parametri URL filtrati, area geografica approssimativa, browser, sistema operativo e tipo di dispositivo. Secondo Vercel, i dati statistici non sono associati a una persona o a un indirizzo IP e non utilizzano identificatori persistenti.",
            "Vercel Speed Insights rileva indicatori tecnici di prestazione della pagina (i cosiddetti Core Web Vitals, come i tempi di caricamento e la stabilità visiva) insieme a pagina visitata, tipo di dispositivo, browser e connessione. Anche questo servizio non installa cookie e non assegna identificatori persistenti.",
          ],
          list: ["nome", "indirizzo email", "numero di telefono (facoltativo)", "esperienza di interesse e data desiderata (facoltative)", "contenuto del messaggio (facoltativo)"],
        },
        {
          title: "Finalità e basi giuridiche",
          paragraphs: [
            "I dati di contatto sono trattati per rispondere alla richiesta, fornire informazioni e organizzare l’eventuale esperienza. La base giuridica è l’esecuzione di misure precontrattuali richieste dall’interessato (art. 6, par. 1, lett. b GDPR) e, per la gestione delle comunicazioni, il legittimo interesse del Titolare (lett. f).",
            "I dati tecnici sono trattati per rendere disponibile e sicuro il sito, prevenire abusi e risolvere malfunzionamenti. Le statistiche aggregate servono a misurare le visite e migliorare contenuti e prestazioni. La base giuridica è il legittimo interesse del Titolare alla sicurezza e al miglioramento del servizio (art. 6, par. 1, lett. f GDPR).",
            "Quando necessario, alcuni dati sono trattati per adempiere obblighi legali, fiscali o amministrativi (art. 6, par. 1, lett. c GDPR).",
          ],
        },
        {
          title: "Natura del conferimento",
          paragraphs: [
            "Nel modulo, nome e indirizzo email sono necessari per poter rispondere. Telefono, esperienza, data e messaggio sono facoltativi. Se non fornisci i dati obbligatori non potremo gestire la richiesta.",
            "La selezione della casella Privacy attesta la presa visione dell’informativa e non costituisce consenso a finalità di marketing o profilazione, che il sito non effettua.",
          ],
        },
        {
          title: "Modalità del trattamento e destinatari",
          paragraphs: [
            "I dati sono trattati con strumenti informatici e misure adeguate a proteggerli. Possono essere trattati da persone autorizzate e dai fornitori necessari al funzionamento del servizio: Vercel Inc. per hosting, rete di distribuzione e statistiche; Web3Forms/Web3Creative per l’inoltro del modulo; il fornitore della casella email; OpenStreetMap Foundation quando viene visualizzata una mappa; consulenti o autorità quando previsto dalla legge.",
            "Web3Forms dichiara di non archiviare stabilmente le richieste, ma di poter conservare log tecnici contenenti dati personali per un massimo di due mesi. Le email inoltrate vengono conservate nella casella del Titolare.",
            "I dati non vengono venduti, diffusi o utilizzati da Sardegna Trail Avventura per pubblicità o profilazione.",
          ],
        },
        {
          title: "Tempi di conservazione",
          paragraphs: [
            "Le richieste che non danno luogo a una prenotazione sono conservate fino a 24 mesi dall’ultimo contatto, salvo la necessità di tutelare un diritto. I dati relativi a prenotazioni o rapporti contrattuali sono conservati per la durata del rapporto e per i successivi termini previsti dalla normativa civile, fiscale e contabile.",
            "Web3Forms dichiara di eliminare periodicamente i log tecnici entro due mesi. Vercel Analytics elimina dopo 24 ore l’hash giornaliero usato per distinguere le visite; le statistiche anonime e aggregate restano disponibili secondo le impostazioni e i periodi del servizio. I log tecnici di sicurezza sono conservati per il tempo necessario alle finalità operative e di protezione dell’infrastruttura.",
          ],
        },
        {
          title: "Trasferimenti fuori dallo Spazio Economico Europeo",
          paragraphs: [
            "Vercel Inc. è un fornitore statunitense e dichiara di aderire all’EU-U.S. Data Privacy Framework e di utilizzare, ove necessario, le Clausole Contrattuali Standard. Web3Forms dichiara server nella regione US-East e una società madre con sede in India; l’uso del servizio può quindi comportare trasferimenti fuori dallo Spazio Economico Europeo.",
            "I trasferimenti sono effettuati esclusivamente in presenza di una condizione valida prevista dal Capo V del GDPR, come una decisione di adeguatezza o garanzie contrattuali appropriate. Puoi chiedere al Titolare informazioni sul meccanismo applicato e su come ottenerne copia.",
          ],
        },
        {
          title: "I tuoi diritti",
          paragraphs: [
            "Puoi esercitare i diritti previsti dagli artt. 15–22 GDPR scrivendo a {email}. In particolare puoi opporti ai trattamenti basati sul legittimo interesse. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali.",
          ],
          list: ["accesso e copia dei dati", "rettifica e aggiornamento", "cancellazione", "limitazione del trattamento", "opposizione al trattamento", "portabilità dei dati, quando applicabile"],
        },
        {
          title: "Decisioni automatizzate",
          paragraphs: ["Il sito non effettua profilazione e non adotta decisioni basate unicamente su trattamenti automatizzati che producano effetti giuridici o analogamente significativi."],
        },
        {
          title: "Modifiche a questa informativa",
          paragraphs: ["Potremmo aggiornare questa informativa per adeguarla a modifiche normative o dei servizi utilizzati. La versione pubblicata su questa pagina, con la relativa data di aggiornamento, è quella vigente."],
        },
      ],
      cta: "Torna ai contatti",
    },
    cookies: {
      eyebrow: "Cookie",
      title: "COOKIE",
      accent: "POLICY",
      intro: "Come questo sito utilizza cookie e tecnologie simili.",
      updated: "Ultimo aggiornamento: 31 luglio 2026.",
      sections: [
        {
          title: "Cookie e consenso",
          paragraphs: [
            "Sardegna Trail Avventura non installa cookie di profilazione, marketing o tracciamento pubblicitario e non utilizza Google Analytics.",
            "Non è presente un banner di consenso perché il sito non utilizza cookie o strumenti di archiviazione sul dispositivo che richiedano il consenso preventivo. Se in futuro verranno introdotti strumenti non necessari, questa informativa sarà aggiornata e verrà richiesto il consenso prima della loro attivazione.",
          ],
        },
        {
          title: "Cosa sono cookie e tecnologie simili",
          paragraphs: ["I cookie sono piccoli file di testo salvati sul dispositivo. Anche memoria locale, pixel e altre tecnologie possono leggere o salvare informazioni. Gli strumenti tecnici sono usati per fornire un servizio richiesto; quelli di profilazione seguono il comportamento per personalizzare contenuti o pubblicità e richiedono, di regola, il consenso preventivo."],
        },
        {
          title: "Archiviazione tecnica e cache",
          paragraphs: ["Il sito non salva preferenze, profili o identificatori persistenti nei cookie, nella memoria locale o nella memoria di sessione del browser. Il browser può conservare temporaneamente nella propria cache immagini, audio, font, fogli di stile e script per velocizzare i caricamenti successivi."],
        },
        {
          title: "Vercel Analytics",
          paragraphs: ["Per misurare le visite utilizziamo Vercel Analytics. Il servizio non installa cookie e non assegna identificatori persistenti. Elabora dati statistici come data e ora, pagina visitata, provenienza, parametri URL filtrati, area geografica approssimativa, browser, sistema operativo e dispositivo. Secondo Vercel, i dati non sono collegati a una persona o all’indirizzo IP; l’hash giornaliero usato per distinguere le visite viene eliminato dopo 24 ore.", "Usiamo inoltre Vercel Speed Insights per misurare le prestazioni delle pagine (Core Web Vitals). Anch’esso non installa cookie e non assegna identificatori persistenti."],
        },
        {
          title: "Hosting e sicurezza",
          paragraphs: ["Il sito è ospitato su Vercel. Come ogni servizio web, l’infrastruttura riceve dati tecnici necessari a consegnare le pagine e proteggere il servizio, inclusi indirizzo IP e informazioni della richiesta. Questi dati non sono usati da Sardegna Trail Avventura per profilazione o pubblicità."],
        },
        {
          title: "Font e mappe",
          paragraphs: ["I caratteri sono ospitati direttamente dal sito e non vengono effettuate chiamate a Google Fonts. Nelle pagine del blog con una mappa, le tessere cartografiche provengono da OpenStreetMap Foundation: la richiesta può trasmettere indirizzo IP, informazioni su browser e dispositivo, pagina di provenienza, data e ora."],
        },
        {
          title: "Modulo di contatto",
          paragraphs: ["Quando invii il modulo, i dati vengono trasmessi tramite Web3Forms e inoltrati alla casella email del Titolare. L’operazione avviene soltanto dopo una tua azione e non installa cookie di tracciamento. Il trattamento è descritto nell’Informativa Privacy."],
        },
        {
          title: "Collegamenti esterni",
          paragraphs: ["I collegamenti a WhatsApp, Instagram, Facebook e Google Maps non caricano contenuti di tali piattaforme prima del click. Quando scegli di aprirli lasci questo sito e il trattamento successivo è regolato dalle informative del relativo fornitore."],
        },
        {
          title: "Come controllare i dati del browser",
          paragraphs: ["Puoi controllare e cancellare cookie, cache e dati salvati dai siti tramite le impostazioni Privacy o Cronologia del browser. La cancellazione della cache può rendere più lento il primo caricamento successivo."],
        },
        {
          title: "Titolare e contatti",
          paragraphs: ["Titolare del trattamento: {person}, titolare di {owner} ({form}), P.IVA {vat}, {address}. Per informazioni scrivi a {email}."],
        },
      ],
      cta: "Leggi l’Informativa Privacy",
    },
  },
  en: {
    privacy: {
      eyebrow: "Privacy",
      title: "PRIVACY",
      accent: "POLICY",
      intro: "Information provided under Article 13 of Regulation (EU) 2016/679 (GDPR).",
      updated: "Last updated: 31 July 2026.",
      sections: [
        {
          title: "Data controller",
          paragraphs: [
            "The data controller is {person}, owner of {owner} ({form}), VAT number {vat}, registered at {address}.",
            "For any request concerning your personal data, write to {email}.",
          ],
        },
        {
          title: "Categories of data processed",
          paragraphs: [
            "When you contact us through the form or direct channels, we process the information you voluntarily provide.",
            "To deliver and protect the website, Vercel infrastructure may process technical data such as IP address, request date and time, requested resource, browser or device information and security logs.",
            "Vercel Analytics processes statistical data including date and time, page or URL viewed, referrer, filtered URL parameters, approximate geographical area, browser, operating system and device type. According to Vercel, analytics data is not associated with a person or IP address and does not use persistent identifiers.",
            "Vercel Speed Insights collects technical page-performance indicators (the Core Web Vitals, such as loading times and visual stability) together with the page viewed, device type, browser and connection. This service likewise sets no cookies and assigns no persistent identifiers.",
          ],
          list: ["name", "email address", "telephone number (optional)", "experience of interest and preferred date (optional)", "message content (optional)"],
        },
        {
          title: "Purposes and legal bases",
          paragraphs: [
            "Contact details are processed to reply to your request, provide information and organise a possible experience. The legal basis is taking pre-contractual steps at your request (Article 6(1)(b) GDPR) and, for managing communications, the controller’s legitimate interest (Article 6(1)(f)).",
            "Technical data is processed to make the website available and secure, prevent abuse and resolve faults. Aggregated statistics are used to measure visits and improve content and performance. The legal basis is the controller’s legitimate interest in service security and improvement (Article 6(1)(f) GDPR).",
            "Where necessary, some data is processed to comply with legal, tax or administrative obligations (Article 6(1)(c) GDPR).",
          ],
        },
        {
          title: "Whether data must be provided",
          paragraphs: [
            "In the form, name and email address are necessary for us to reply. Telephone number, experience, date and message are optional. If you do not provide the required information, we cannot handle the request.",
            "Selecting the Privacy checkbox confirms that you have read this policy; it is not consent to marketing or profiling, which the website does not carry out.",
          ],
        },
        {
          title: "Processing methods and recipients",
          paragraphs: [
            "Data is processed with electronic tools and appropriate protective measures. It may be processed by authorised persons and providers necessary for the service: Vercel Inc. for hosting, content delivery and analytics; Web3Forms/Web3Creative for form forwarding; the email provider; OpenStreetMap Foundation when a map is displayed; advisers or authorities where required by law.",
            "Web3Forms states that it does not permanently store submissions, but may retain technical logs containing personal data for up to two months. Forwarded emails are stored in the controller’s mailbox.",
            "Sardegna Trail Avventura does not sell or disclose data or use it for advertising or profiling.",
          ],
        },
        {
          title: "Retention periods",
          paragraphs: [
            "Requests that do not result in a booking are retained for up to 24 months after the last contact, unless needed to establish or defend a legal claim. Data relating to bookings or contracts is retained for the duration of the relationship and the subsequent periods required by civil, tax and accounting law.",
            "Web3Forms states that it periodically deletes technical logs within two months. Vercel Analytics discards after 24 hours the daily hash used to distinguish visits; anonymous aggregated statistics remain available according to the service settings and retention periods. Technical security logs are retained only as long as necessary for operational and infrastructure-protection purposes.",
          ],
        },
        {
          title: "Transfers outside the European Economic Area",
          paragraphs: [
            "Vercel Inc. is a US provider and states that it participates in the EU-U.S. Data Privacy Framework and uses Standard Contractual Clauses where required. Web3Forms states that its servers are in the US-East region and its parent company is based in India; use of the service may therefore involve transfers outside the European Economic Area.",
            "Transfers take place only where a valid condition under Chapter V GDPR applies, such as an adequacy decision or appropriate contractual safeguards. You may ask the controller for information about the mechanism used and how to obtain a copy.",
          ],
        },
        {
          title: "Your rights",
          paragraphs: ["You may exercise the rights provided by Articles 15–22 GDPR by writing to {email}. In particular, you may object to processing based on legitimate interests. You also have the right to lodge a complaint with the Italian Data Protection Authority."],
          list: ["access and a copy of your data", "rectification and updating", "erasure", "restriction of processing", "objection to processing", "data portability, where applicable"],
        },
        {
          title: "Automated decisions",
          paragraphs: ["The website does not carry out profiling or make decisions based solely on automated processing that produce legal or similarly significant effects."],
        },
        {
          title: "Changes to this policy",
          paragraphs: ["We may update this policy to reflect changes in legislation or the services used. The version published on this page, together with its update date, is the current version."],
        },
      ],
      cta: "Back to contact",
    },
    cookies: {
      eyebrow: "Cookies",
      title: "COOKIE",
      accent: "POLICY",
      intro: "How this website uses cookies and similar technologies.",
      updated: "Last updated: 31 July 2026.",
      sections: [
        { title: "Cookies and consent", paragraphs: ["Sardegna Trail Avventura does not install profiling, marketing or advertising-tracking cookies and does not use Google Analytics.", "There is no consent banner because the website does not use cookies or device-storage tools that require prior consent. If non-essential tools are introduced in the future, this policy will be updated and consent will be requested before they are activated."] },
        { title: "What cookies and similar technologies are", paragraphs: ["Cookies are small text files stored on a device. Local storage, pixels and other technologies may also read or store information. Technical tools provide a service requested by the user; profiling tools follow behaviour to personalise content or advertising and generally require prior consent."] },
        { title: "Technical storage and cache", paragraphs: ["The website does not store preferences, profiles or persistent identifiers in cookies, local storage or browser session storage. The browser may temporarily cache images, audio, fonts, style sheets and scripts to speed up subsequent visits."] },
        { title: "Vercel Analytics", paragraphs: ["We use Vercel Analytics to measure visits. It sets no cookies and assigns no persistent identifiers. It processes statistical data including date and time, page viewed, referrer, filtered URL parameters, approximate geographical area, browser, operating system and device. According to Vercel, this data is not associated with a person or IP address; the daily hash used to distinguish visits is discarded after 24 hours.", "We also use Vercel Speed Insights to measure page performance (Core Web Vitals). It likewise sets no cookies and assigns no persistent identifiers."] },
        { title: "Hosting and security", paragraphs: ["The website is hosted on Vercel. Like any web service, its infrastructure receives technical data needed to deliver pages and protect the service, including IP address and request information. Sardegna Trail Avventura does not use this data for profiling or advertising."] },
        { title: "Fonts and maps", paragraphs: ["Fonts are hosted directly by the website and no requests are made to Google Fonts. Blog pages with maps load tiles from OpenStreetMap Foundation; the request may transmit IP address, browser and device information, referrer, date and time."] },
        { title: "Contact form", paragraphs: ["When you submit the form, data is transmitted through Web3Forms and forwarded to the controller’s email inbox. This happens only after your action and sets no tracking cookies. Processing is described in the Privacy Policy."] },
        { title: "External links", paragraphs: ["Links to WhatsApp, Instagram, Facebook and Google Maps do not load content from those platforms before you click. When you choose to open them, you leave this website and subsequent processing is governed by the relevant provider’s policy."] },
        { title: "Managing browser data", paragraphs: ["You can review and delete cookies, cache and site data through your browser’s Privacy or History settings. Clearing the cache may make the next initial load slower."] },
        { title: "Controller and contact details", paragraphs: ["Data controller: {person}, owner of {owner} ({form}), VAT number {vat}, {address}. For information, write to {email}."] },
      ],
      cta: "Read the Privacy Policy",
    },
  },
  fr: {
    privacy: {
      eyebrow: "Confidentialité",
      title: "POLITIQUE DE",
      accent: "CONFIDENTIALITÉ",
      intro: "Information fournie conformément à l’article 13 du Règlement (UE) 2016/679 (RGPD).",
      updated: "Dernière mise à jour : 31 juillet 2026.",
      sections: [
        {
          title: "Responsable du traitement",
          paragraphs: [
            "Le responsable du traitement est {person}, titulaire de {owner} ({form}), numéro de TVA {vat}, siège à {address}.",
            "Pour toute demande concernant vos données personnelles, écrivez à {email}.",
          ],
        },
        {
          title: "Catégories de données traitées",
          paragraphs: [
            "Lorsque vous nous contactez via le formulaire ou les canaux directs, nous traitons les informations que vous fournissez volontairement.",
            "Pour fournir et protéger le site, l’infrastructure Vercel peut traiter des données techniques telles que l’adresse IP, la date et l’heure de la requête, la ressource demandée, des informations sur le navigateur ou l’appareil et des journaux de sécurité.",
            "Vercel Analytics traite des données statistiques telles que la date et l’heure, la page ou l’adresse consultée, la provenance, les paramètres URL filtrés, la zone géographique approximative, le navigateur, le système d’exploitation et le type d’appareil. Selon Vercel, ces données ne sont associées ni à une personne ni à une adresse IP et n’utilisent aucun identifiant persistant.",
            "Vercel Speed Insights relève des indicateurs techniques de performance de la page (les Core Web Vitals, comme les temps de chargement et la stabilité visuelle) ainsi que la page consultée, le type d’appareil, le navigateur et la connexion. Ce service n’installe lui non plus aucun cookie et n’attribue aucun identifiant persistant.",
          ],
          list: ["nom", "adresse e-mail", "numéro de téléphone (facultatif)", "expérience souhaitée et date préférée (facultatives)", "contenu du message (facultatif)"],
        },
        {
          title: "Finalités et bases juridiques",
          paragraphs: [
            "Les coordonnées sont traitées afin de répondre à votre demande, de fournir des informations et d’organiser éventuellement une expérience. La base juridique est l’exécution de mesures précontractuelles prises à votre demande (article 6(1)(b) RGPD) et, pour la gestion des communications, l’intérêt légitime du responsable (article 6(1)(f)).",
            "Les données techniques sont traitées afin de rendre le site disponible et sûr, prévenir les abus et résoudre les dysfonctionnements. Les statistiques agrégées servent à mesurer les visites et améliorer les contenus et les performances. La base juridique est l’intérêt légitime du responsable à assurer la sécurité et améliorer le service (article 6(1)(f) RGPD).",
            "Lorsque cela est nécessaire, certaines données sont traitées pour respecter des obligations légales, fiscales ou administratives (article 6(1)(c) RGPD).",
          ],
        },
        {
          title: "Caractère obligatoire des données",
          paragraphs: [
            "Dans le formulaire, le nom et l’adresse e-mail sont nécessaires pour pouvoir répondre. Le téléphone, l’expérience, la date et le message sont facultatifs. Sans les données obligatoires, nous ne pourrons pas traiter la demande.",
            "La sélection de la case Confidentialité confirme la lecture de cette politique ; elle ne constitue pas un consentement au marketing ou au profilage, que le site n’effectue pas.",
          ],
        },
        {
          title: "Modalités du traitement et destinataires",
          paragraphs: [
            "Les données sont traitées par des moyens électroniques et avec des mesures de protection appropriées. Elles peuvent être traitées par des personnes autorisées et les prestataires nécessaires au service : Vercel Inc. pour l’hébergement, la diffusion du contenu et les statistiques ; Web3Forms/Web3Creative pour la transmission du formulaire ; le fournisseur de messagerie ; OpenStreetMap Foundation lorsqu’une carte est affichée ; des conseillers ou autorités lorsque la loi l’exige.",
            "Web3Forms déclare ne pas conserver durablement les soumissions, mais peut garder des journaux techniques contenant des données personnelles pendant deux mois au maximum. Les e-mails transmis sont conservés dans la boîte du responsable.",
            "Sardegna Trail Avventura ne vend ni ne diffuse les données et ne les utilise pas à des fins publicitaires ou de profilage.",
          ],
        },
        {
          title: "Durées de conservation",
          paragraphs: [
            "Les demandes qui n’aboutissent pas à une réservation sont conservées jusqu’à 24 mois après le dernier contact, sauf nécessité de constater, exercer ou défendre un droit. Les données relatives aux réservations ou contrats sont conservées pendant la relation puis durant les délais imposés par les législations civile, fiscale et comptable.",
            "Web3Forms déclare supprimer périodiquement les journaux techniques dans un délai de deux mois. Vercel Analytics supprime après 24 heures le hachage quotidien utilisé pour distinguer les visites ; les statistiques anonymes et agrégées restent disponibles selon les paramètres et durées du service. Les journaux techniques de sécurité sont conservés uniquement le temps nécessaire aux finalités opérationnelles et de protection de l’infrastructure.",
          ],
        },
        {
          title: "Transferts hors de l’Espace économique européen",
          paragraphs: [
            "Vercel Inc. est un prestataire américain qui déclare adhérer au cadre de protection des données UE–États-Unis et utiliser les clauses contractuelles types lorsque cela est nécessaire. Web3Forms déclare que ses serveurs sont situés dans la région US-East et que sa société mère est établie en Inde ; l’utilisation du service peut donc entraîner des transferts hors de l’Espace économique européen.",
            "Les transferts n’ont lieu qu’en présence d’une condition valable au titre du chapitre V du RGPD, telle qu’une décision d’adéquation ou des garanties contractuelles appropriées. Vous pouvez demander au responsable des informations sur le mécanisme utilisé et sur la manière d’en obtenir une copie.",
          ],
        },
        {
          title: "Vos droits",
          paragraphs: ["Vous pouvez exercer les droits prévus aux articles 15 à 22 du RGPD en écrivant à {email}. Vous pouvez notamment vous opposer aux traitements fondés sur l’intérêt légitime. Vous pouvez également introduire une réclamation auprès de l’autorité italienne de protection des données."],
          list: ["accès et copie des données", "rectification et mise à jour", "effacement", "limitation du traitement", "opposition au traitement", "portabilité des données, lorsqu’elle s’applique"],
        },
        {
          title: "Décisions automatisées",
          paragraphs: ["Le site n’effectue aucun profilage et ne prend aucune décision fondée uniquement sur un traitement automatisé produisant des effets juridiques ou similaires significatifs."],
        },
        {
          title: "Modifications de cette politique",
          paragraphs: ["Cette politique peut être mise à jour pour tenir compte des évolutions légales ou des services utilisés. La version publiée sur cette page, accompagnée de sa date de mise à jour, est la version en vigueur."],
        },
      ],
      cta: "Retour au contact",
    },
    cookies: {
      eyebrow: "Cookies",
      title: "POLITIQUE DE",
      accent: "COOKIES",
      intro: "Comment ce site utilise les cookies et technologies similaires.",
      updated: "Dernière mise à jour : 31 juillet 2026.",
      sections: [
        { title: "Cookies et consentement", paragraphs: ["Sardegna Trail Avventura n’installe aucun cookie de profilage, marketing ou suivi publicitaire et n’utilise pas Google Analytics.", "Aucun bandeau de consentement n’est affiché car le site n’utilise aucun cookie ni outil de stockage sur l’appareil nécessitant un consentement préalable. Si des outils non nécessaires sont ajoutés, cette politique sera mise à jour et le consentement sera demandé avant leur activation."] },
        { title: "Cookies et technologies similaires", paragraphs: ["Les cookies sont de petits fichiers texte enregistrés sur un appareil. Le stockage local, les pixels et d’autres technologies peuvent également lire ou enregistrer des informations. Les outils techniques fournissent un service demandé ; les outils de profilage suivent le comportement afin de personnaliser le contenu ou la publicité et requièrent généralement un consentement préalable."] },
        { title: "Stockage technique et cache", paragraphs: ["Le site n’enregistre ni préférences, ni profils, ni identifiants persistants dans les cookies, le stockage local ou le stockage de session du navigateur. Le navigateur peut mettre temporairement en cache images, fichiers audio, polices, feuilles de style et scripts afin d’accélérer les visites suivantes."] },
        { title: "Vercel Analytics", paragraphs: ["Nous utilisons Vercel Analytics pour mesurer les visites. Il n’installe aucun cookie et n’attribue aucun identifiant persistant. Il traite des données statistiques telles que la date et l’heure, la page consultée, la provenance, les paramètres URL filtrés, la zone géographique approximative, le navigateur, le système d’exploitation et l’appareil. Selon Vercel, ces données ne sont associées ni à une personne ni à une adresse IP ; le hachage quotidien utilisé pour distinguer les visites est supprimé après 24 heures.", "Nous utilisons également Vercel Speed Insights pour mesurer les performances des pages (Core Web Vitals). Lui non plus n’installe aucun cookie et n’attribue aucun identifiant persistant."] },
        { title: "Hébergement et sécurité", paragraphs: ["Le site est hébergé sur Vercel. Comme tout service web, son infrastructure reçoit les données techniques nécessaires à la transmission des pages et à la protection du service, notamment l’adresse IP et les informations de la requête. Sardegna Trail Avventura n’utilise pas ces données à des fins de profilage ou de publicité."] },
        { title: "Polices et cartes", paragraphs: ["Les polices sont hébergées directement par le site et aucun appel à Google Fonts n’est effectué. Les pages du blog contenant une carte chargent des tuiles OpenStreetMap Foundation ; la requête peut transmettre l’adresse IP, des informations sur le navigateur et l’appareil, la page de provenance, la date et l’heure."] },
        { title: "Formulaire de contact", paragraphs: ["Lorsque vous envoyez le formulaire, les données sont transmises via Web3Forms et transférées vers la boîte e-mail du responsable. Cette opération résulte uniquement de votre action et n’installe aucun cookie de suivi. Le traitement est décrit dans la Politique de confidentialité."] },
        { title: "Liens externes", paragraphs: ["Les liens vers WhatsApp, Instagram, Facebook et Google Maps ne chargent aucun contenu de ces plateformes avant le clic. Lorsque vous choisissez de les ouvrir, vous quittez ce site et le traitement ultérieur est régi par la politique du fournisseur concerné."] },
        { title: "Gérer les données du navigateur", paragraphs: ["Vous pouvez contrôler et supprimer les cookies, le cache et les données des sites depuis les réglages Confidentialité ou Historique de votre navigateur. Vider le cache peut ralentir le premier chargement suivant."] },
        { title: "Responsable et contact", paragraphs: ["Responsable du traitement : {person}, titulaire de {owner} ({form}), numéro de TVA {vat}, {address}. Pour toute information, écrivez à {email}."] },
      ],
      cta: "Lire la politique de confidentialité",
    },
  },
};
