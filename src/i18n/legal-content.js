export const LEGAL_CONTENT = {
  it: {
    privacy: {
      eyebrow: "Privacy",
      title: "INFORMATIVA",
      accent: "PRIVACY",
      intro: "Ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR).",
      sections: [
        {
          title: "Titolare del trattamento",
          paragraphs: [
            "Il Titolare del trattamento è {owner} ({form}), P.IVA {vat}, con sede in {address}.",
            "Per qualsiasi richiesta relativa ai tuoi dati personali puoi scrivere a {email}.",
          ],
        },
        {
          title: "Quali dati raccogliamo",
          paragraphs: [
            "Raccogliamo esclusivamente i dati che ci fornisci spontaneamente tramite il modulo del sito o i canali diretti (telefono, WhatsApp ed email).",
            "Il sito non utilizza cookie di profilazione o di tracciamento pubblicitario e non raccoglie dati a tua insaputa. Per capire quali pagine sono più consultate utilizziamo Vercel Analytics, uno strumento di statistica che non installa cookie, non assegna identificatori persistenti e non permette di risalire alla tua identità: raccoglie solo dati aggregati come la pagina visitata, il paese e il tipo di dispositivo. La base giuridica è il nostro legittimo interesse a migliorare il sito (art. 6, par. 1, lett. f, GDPR).",
          ],
          list: ["nome", "indirizzo email", "numero di telefono (facoltativo)", "tour di interesse e data desiderata (facoltativi)", "contenuto del messaggio"],
        },
        {
          title: "Finalità e base giuridica",
          paragraphs: [
            "I dati sono trattati per rispondere alla tua richiesta, fornirti informazioni sui tour e gestire l’eventuale organizzazione dell’esperienza.",
            "La base giuridica è l’esecuzione di misure precontrattuali richieste dall’interessato (art. 6, par. 1, lett. b GDPR) e il legittimo interesse a rispondere alle comunicazioni ricevute (art. 6, par. 1, lett. f).",
          ],
        },
        {
          title: "Come vengono trattati i dati",
          paragraphs: [
            "Le richieste del modulo vengono recapitate via email tramite Web3Forms, che agisce come responsabile del trattamento limitatamente alla trasmissione del messaggio. Le email sono poi ricevute e conservate nella casella del Titolare.",
            "I dati non vengono diffusi né ceduti a terzi per finalità commerciali o di marketing.",
          ],
        },
        {
          title: "Per quanto tempo conserviamo i dati",
          paragraphs: ["Conserviamo i dati per il tempo strettamente necessario a gestire la richiesta e gli eventuali rapporti che ne derivano. Le comunicazioni non più necessarie vengono eliminate e puoi chiederne in ogni momento la cancellazione."],
        },
        {
          title: "Comunicazione e trasferimento dei dati",
          paragraphs: ["I dati possono essere trattati dal personale autorizzato, da Web3Forms e dal fornitore della casella email. Eventuali trasferimenti tecnici verso Paesi extra-UE avvengono nel rispetto delle garanzie previste dal GDPR."],
        },
        {
          title: "I tuoi diritti",
          paragraphs: [
            "Puoi esercitare i diritti previsti dagli artt. 15–21 GDPR scrivendo a {email}. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali.",
          ],
          list: ["accesso e copia dei dati", "rettifica e aggiornamento", "cancellazione", "limitazione del trattamento", "opposizione al trattamento", "portabilità dei dati"],
        },
        {
          title: "Modifiche a questa informativa",
          paragraphs: ["Potremmo aggiornare questa informativa per adeguarla a modifiche normative o dei servizi utilizzati. La versione pubblicata su questa pagina è sempre quella vigente."],
        },
      ],
      cta: "Torna ai contatti",
    },
    cookies: {
      eyebrow: "Cookie",
      title: "COOKIE",
      accent: "POLICY",
      intro: "Come questo sito utilizza cookie e strumenti di archiviazione locale.",
      sections: [
        {
          title: "Questo sito non usa cookie di profilazione",
          paragraphs: [
            "Sardegna Trail Avventura non installa cookie di profilazione, marketing o tracciamento e non condivide dati di navigazione con terze parti a fini pubblicitari. Non utilizziamo Google Analytics.",
            "Per le statistiche di visita usiamo Vercel Analytics, che non installa cookie e non assegna identificatori persistenti: rileva solo dati aggregati e anonimi (pagina visitata, paese, tipo di dispositivo) e non consente di riconoscere o seguire un singolo visitatore.",
            "Per questo non è presente un banner di consenso: non ci sono cookie che richiedono l’accettazione dell’utente.",
          ],
        },
        {
          title: "Cosa sono i cookie",
          paragraphs: ["I cookie sono piccoli file di testo salvati sul dispositivo. Possono essere tecnici, quindi necessari al funzionamento, oppure di profilazione, usati per tracciare la navigazione e proporre pubblicità mirata. Il consenso preventivo è richiesto per questi ultimi."],
        },
        {
          title: "Archiviazione tecnica",
          paragraphs: ["Il sito non salva cookie di profilazione né identificatori nella memoria locale del browser. Il browser può conservare temporaneamente immagini, font, fogli di stile e script per velocizzare i caricamenti successivi."],
        },
        {
          title: "Font e mappe",
          paragraphs: ["I caratteri sono ospitati direttamente sui nostri server e non vengono effettuate chiamate a Google Fonts. Nelle pagine del blog con una mappa, le tessere cartografiche provengono da OpenStreetMap e la richiesta tecnica può trasmettere l’indirizzo IP del dispositivo."],
        },
        {
          title: "Modulo di contatto",
          paragraphs: ["Quando invii il modulo, i dati vengono trasmessi via email tramite Web3Forms. L’operazione avviene solo su tua azione e non installa cookie di tracciamento. Il trattamento dei dati è descritto nell’Informativa Privacy."],
        },
        {
          title: "Come gestire i cookie dal browser",
          paragraphs: ["Puoi sempre controllare e cancellare cookie e dati salvati dai siti tramite le impostazioni Privacy o Cronologia del browser."],
        },
        {
          title: "Titolare e contatti",
          paragraphs: ["Titolare del trattamento: {owner} ({form}), P.IVA {vat}, {address}. Per informazioni scrivi a {email}."],
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
      intro: "Pursuant to Articles 13 and 14 of Regulation (EU) 2016/679 (GDPR).",
      sections: [
        {
          title: "Data controller",
          paragraphs: [
            "The data controller is {owner} ({form}), VAT number {vat}, registered at {address}.",
            "For any request concerning your personal data, write to {email}.",
          ],
        },
        {
          title: "Data we collect",
          paragraphs: [
            "We only collect information that you voluntarily provide through the website form or direct channels (telephone, WhatsApp and email).",
            "The website does not use profiling cookies or advertising trackers and does not collect information without your knowledge. To understand which pages are most visited we use Vercel Analytics, a statistics tool that sets no cookies, assigns no persistent identifiers and cannot identify you: it only collects aggregated data such as the page viewed, the country and the device type. The legal basis is our legitimate interest in improving the website (Article 6(1)(f) GDPR).",
          ],
          list: ["name", "email address", "telephone number (optional)", "tour of interest and preferred date (optional)", "message content"],
        },
        {
          title: "Purpose and legal basis",
          paragraphs: [
            "We process data to reply to your request, provide information about tours and manage the possible organisation of an experience.",
            "The legal basis is taking pre-contractual steps at your request (Article 6(1)(b) GDPR) and our legitimate interest in replying to communications received (Article 6(1)(f)).",
          ],
        },
        {
          title: "How data is processed",
          paragraphs: [
            "Contact-form requests are delivered by email through Web3Forms, which acts as a processor solely for message transmission. Emails are then received and stored in the data controller’s mailbox.",
            "Data is not disclosed or transferred to third parties for commercial or marketing purposes.",
          ],
        },
        {
          title: "Retention period",
          paragraphs: ["We retain data only for as long as necessary to handle the request and any resulting relationship. Communications that are no longer needed are deleted, and you may request deletion at any time."],
        },
        {
          title: "Data disclosure and transfers",
          paragraphs: ["Data may be processed by authorised staff, Web3Forms and the email provider. Any technical transfer outside the EU takes place in accordance with the safeguards required by the GDPR."],
        },
        {
          title: "Your rights",
          paragraphs: ["You may exercise the rights provided by Articles 15–21 GDPR by writing to {email}. You also have the right to lodge a complaint with the Italian Data Protection Authority."],
          list: ["access and a copy of your data", "rectification and updating", "erasure", "restriction of processing", "objection to processing", "data portability"],
        },
        {
          title: "Changes to this policy",
          paragraphs: ["We may update this policy to reflect changes in legislation or the services used. The version published on this page is always the current version."],
        },
      ],
      cta: "Back to contact",
    },
    cookies: {
      eyebrow: "Cookies",
      title: "COOKIE",
      accent: "POLICY",
      intro: "How this website uses cookies and local storage technologies.",
      sections: [
        {
          title: "This website does not use profiling cookies",
          paragraphs: [
            "Sardegna Trail Avventura does not install profiling, marketing or tracking cookies and does not share browsing data with third parties for advertising. We do not use Google Analytics.",
            "For visit statistics we use Vercel Analytics, which sets no cookies and assigns no persistent identifiers: it records only aggregated, anonymous data (page viewed, country, device type) and cannot recognise or follow an individual visitor.",
            "There is therefore no consent banner: the website does not use cookies that require your consent.",
          ],
        },
        { title: "What cookies are", paragraphs: ["Cookies are small text files stored on a device. They may be technical and necessary for a website to work, or profiling cookies used to track browsing and deliver targeted advertising. Prior consent is required for the latter."] },
        { title: "Technical storage", paragraphs: ["The website does not store profiling cookies or identifiers in the browser’s local memory. The browser may temporarily cache images, fonts, style sheets and scripts to speed up subsequent visits."] },
        { title: "Fonts and maps", paragraphs: ["Fonts are hosted directly on our servers and the website makes no requests to Google Fonts. Blog pages with maps load tiles from OpenStreetMap; the technical request may transmit the device’s IP address to its servers."] },
        { title: "Contact form", paragraphs: ["When you submit the form, data is sent by email through Web3Forms. This only happens after your voluntary action and does not install tracking cookies. Processing is described in the Privacy Policy."] },
        { title: "Managing cookies in your browser", paragraphs: ["You can always review and delete cookies and site data through your browser’s Privacy or History settings."] },
        { title: "Controller and contact details", paragraphs: ["Data controller: {owner} ({form}), VAT number {vat}, {address}. For information, write to {email}."] },
      ],
      cta: "Read the Privacy Policy",
    },
  },
  fr: {
    privacy: {
      eyebrow: "Confidentialité",
      title: "POLITIQUE DE",
      accent: "CONFIDENTIALITÉ",
      intro: "Conformément aux articles 13 et 14 du Règlement (UE) 2016/679 (RGPD).",
      sections: [
        {
          title: "Responsable du traitement",
          paragraphs: [
            "Le responsable du traitement est {owner} ({form}), numéro de TVA {vat}, siège à {address}.",
            "Pour toute demande concernant vos données personnelles, écrivez à {email}.",
          ],
        },
        {
          title: "Données collectées",
          paragraphs: [
            "Nous collectons uniquement les informations que vous fournissez volontairement via le formulaire ou les canaux directs (téléphone, WhatsApp et e-mail).",
            "Le site n’utilise aucun cookie de profilage ni traceur publicitaire et ne collecte aucune donnée à votre insu. Pour savoir quelles pages sont les plus consultées, nous utilisons Vercel Analytics, un outil de statistiques qui n’installe aucun cookie, n’attribue aucun identifiant persistant et ne permet pas de vous identifier : il ne recueille que des données agrégées comme la page consultée, le pays et le type d’appareil. La base juridique est notre intérêt légitime à améliorer le site (art. 6, par. 1, point f, RGPD).",
          ],
          list: ["nom", "adresse e-mail", "numéro de téléphone (facultatif)", "circuit souhaité et date préférée (facultatifs)", "contenu du message"],
        },
        {
          title: "Finalité et base juridique",
          paragraphs: [
            "Les données sont traitées afin de répondre à votre demande, de vous informer sur les circuits et d’organiser éventuellement une expérience.",
            "La base juridique est l’exécution de mesures précontractuelles prises à votre demande (article 6(1)(b) RGPD) et notre intérêt légitime à répondre aux communications reçues (article 6(1)(f)).",
          ],
        },
        {
          title: "Traitement des données",
          paragraphs: [
            "Les demandes du formulaire sont transmises par e-mail via Web3Forms, sous-traitant limité à la transmission du message. Les e-mails sont ensuite reçus et conservés dans la boîte du responsable.",
            "Les données ne sont ni diffusées ni cédées à des tiers à des fins commerciales ou marketing.",
          ],
        },
        { title: "Durée de conservation", paragraphs: ["Les données sont conservées uniquement le temps nécessaire au traitement de la demande et de la relation éventuelle. Les communications devenues inutiles sont supprimées et vous pouvez demander leur effacement à tout moment."] },
        { title: "Communication et transfert des données", paragraphs: ["Les données peuvent être traitées par le personnel autorisé, Web3Forms et le fournisseur de messagerie. Tout transfert technique hors UE respecte les garanties prévues par le RGPD."] },
        {
          title: "Vos droits",
          paragraphs: ["Vous pouvez exercer les droits prévus aux articles 15 à 21 du RGPD en écrivant à {email}. Vous pouvez également introduire une réclamation auprès de l’autorité italienne de protection des données."],
          list: ["accès et copie des données", "rectification et mise à jour", "effacement", "limitation du traitement", "opposition au traitement", "portabilité des données"],
        },
        { title: "Modifications de cette politique", paragraphs: ["Cette politique peut être mise à jour pour tenir compte des évolutions légales ou des services utilisés. La version publiée sur cette page est toujours la version en vigueur."] },
      ],
      cta: "Retour au contact",
    },
    cookies: {
      eyebrow: "Cookies",
      title: "POLITIQUE DE",
      accent: "COOKIES",
      intro: "Comment ce site utilise les cookies et les technologies de stockage local.",
      sections: [
        {
          title: "Ce site n’utilise pas de cookies de profilage",
          paragraphs: [
            "Sardegna Trail Avventura n’installe aucun cookie de profilage, marketing ou suivi et ne partage aucune donnée de navigation à des fins publicitaires. Nous n’utilisons pas Google Analytics.",
            "Pour les statistiques de visite, nous utilisons Vercel Analytics, qui n’installe aucun cookie et n’attribue aucun identifiant persistant : il ne relève que des données agrégées et anonymes (page consultée, pays, type d’appareil) et ne permet pas de reconnaître ou de suivre un visiteur en particulier.",
            "Aucun bandeau de consentement n’est donc affiché : le site n’utilise aucun cookie nécessitant votre accord.",
          ],
        },
        { title: "Que sont les cookies ?", paragraphs: ["Les cookies sont de petits fichiers texte enregistrés sur un appareil. Ils peuvent être techniques et nécessaires au fonctionnement du site, ou servir au profilage et à la publicité ciblée. Le consentement préalable est requis pour ces derniers."] },
        { title: "Stockage technique", paragraphs: ["Le site ne stocke aucun cookie de profilage ni identifiant dans la mémoire locale du navigateur. Le navigateur peut mettre temporairement en cache images, polices, feuilles de style et scripts afin d’accélérer les visites suivantes."] },
        { title: "Polices et cartes", paragraphs: ["Les polices sont hébergées directement sur nos serveurs et aucun appel à Google Fonts n’est effectué. Les pages du blog contenant une carte chargent des tuiles OpenStreetMap ; la requête technique peut transmettre l’adresse IP de l’appareil."] },
        { title: "Formulaire de contact", paragraphs: ["Lorsque vous envoyez le formulaire, les données sont transmises par e-mail via Web3Forms. Cette opération résulte uniquement de votre action volontaire et n’installe aucun cookie de suivi. Le traitement est décrit dans la Politique de confidentialité."] },
        { title: "Gérer les cookies dans le navigateur", paragraphs: ["Vous pouvez à tout moment contrôler et supprimer les cookies et données de sites depuis les réglages Confidentialité ou Historique de votre navigateur."] },
        { title: "Responsable et contact", paragraphs: ["Responsable du traitement : {owner} ({form}), numéro de TVA {vat}, {address}. Pour toute information, écrivez à {email}."] },
      ],
      cta: "Lire la politique de confidentialité",
    },
  },
};
