import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const geojsonPath = path.join(root, "public/media/maps/sardegna-osm.geojson");
const logoPath = path.join(root, "public/media/logo-sardegna-trail-avventura.png");
const silhouettePath = path.join(root, "public/media/maps/sardegna-osm-silhouette.svg");
const posterSvgPath = path.join(root, "public/media/social/tour-maxienduro-22-25-ottobre-osm.svg");
const posterPngPath = path.join(root, "public/media/social/tour-maxienduro-22-25-ottobre-osm.png");

const geojson = JSON.parse(await fs.readFile(geojsonPath, "utf8"));
const feature = geojson.features?.[0];
if (!feature || feature.geometry?.type !== "MultiPolygon") {
  throw new Error("Il GeoJSON OSM non contiene il MultiPolygon atteso per la Sardegna.");
}

const meanLat = 40.05;
const lonFactor = Math.cos((meanLat * Math.PI) / 180);
const flatArea = (ring) => {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lonA, latA] = ring[i];
    const [lonB, latB] = ring[i + 1];
    area += lonA * lonFactor * latB - lonB * lonFactor * latA;
  }
  return Math.abs(area / 2);
};

const mainPolygon = feature.geometry.coordinates
  .map((polygon) => ({ polygon, area: flatArea(polygon[0]) }))
  .sort((a, b) => b.area - a.area)[0]?.polygon;
if (!mainPolygon) throw new Error("Impossibile individuare l'isola principale nel MultiPolygon OSM.");

const mainRing = mainPolygon[0];
const xs = mainRing.map(([lon]) => lon * lonFactor);
const ys = mainRing.map(([, lat]) => lat);
const bounds = {
  minX: Math.min(...xs),
  maxX: Math.max(...xs),
  minY: Math.min(...ys),
  maxY: Math.max(...ys),
};

function makeProjector(box) {
  const scale = Math.min(
    box.width / (bounds.maxX - bounds.minX),
    box.height / (bounds.maxY - bounds.minY),
  );
  const drawnWidth = (bounds.maxX - bounds.minX) * scale;
  const drawnHeight = (bounds.maxY - bounds.minY) * scale;
  const offsetX = box.x + (box.width - drawnWidth) / 2;
  const offsetY = box.y + (box.height - drawnHeight) / 2;
  return ([lon, lat]) => [
    offsetX + (lon * lonFactor - bounds.minX) * scale,
    offsetY + (bounds.maxY - lat) * scale,
  ];
}

function ringPath(ring, project) {
  return ring
    .map((point, index) => {
      const [x, y] = project(point);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

const posterBox = { x: 430, y: 270, width: 430, height: 790 };
const posterProject = makeProjector(posterBox);
const islandPath = ringPath(mainRing, posterProject);
const [olbiaX, olbiaY] = posterProject([9.4964, 40.9236]);
const [dorgaliX, dorgaliY] = posterProject([9.5887, 40.2922]);

const silhouetteProject = makeProjector({ x: 24, y: 24, width: 552, height: 952 });
const silhouetteD = ringPath(mainRing, silhouetteProject);
const sourceLicence = geojson.licence || "Data © OpenStreetMap contributors, ODbL 1.0";

const standaloneSilhouette = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1000" viewBox="0 0 600 1000" role="img" aria-labelledby="title desc">
  <title id="title">Silhouette della Sardegna da OpenStreetMap</title>
  <desc id="desc">Confine regionale della Sardegna, relazione OSM ${feature.properties?.osm_id || "7361997"}. ${sourceLicence}</desc>
  <path d="${silhouetteD}" fill="#A0612A" fill-opacity=".16" stroke="#A0612A" stroke-opacity=".72" stroke-width="4"/>
  <text x="580" y="986" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#1C1814">© OpenStreetMap contributors · ODbL</text>
</svg>`;
await fs.writeFile(silhouettePath, standaloneSilhouette);

const logoBase64 = (await fs.readFile(logoPath)).toString("base64");
const fontBase64 = Object.fromEntries(
  await Promise.all(
    [
      ["bebas", "bebas-neue-400.ttf"],
      ["montserrat500", "montserrat-500.ttf"],
      ["montserrat600", "montserrat-600.ttf"],
      ["montserrat700", "montserrat-700.ttf"],
      ["oswald500", "oswald-500.ttf"],
      ["oswald600", "oswald-600.ttf"],
      ["oswald700", "oswald-700.ttf"],
    ].map(async ([key, file]) => [
      key,
      (await fs.readFile(path.join(root, "public/fonts", file))).toString("base64"),
    ]),
  ),
);
const c = {
  obsidian: "#1C1814",
  granite: "#F5EBD9",
  oxblood: "#A0612A",
  oxbloodDark: "#A0612A",
  sage: "#6B7A3E",
  sand: "#E4D4B0",
  carbon: "#252019",
};

const t1 = `M ${olbiaX.toFixed(1)} ${olbiaY.toFixed(1)} C ${(olbiaX - 88).toFixed(1)} ${(olbiaY + 58).toFixed(1)}, ${(dorgaliX - 120).toFixed(1)} ${(dorgaliY - 75).toFixed(1)}, ${dorgaliX.toFixed(1)} ${dorgaliY.toFixed(1)}`;
const t4 = `M ${dorgaliX.toFixed(1)} ${dorgaliY.toFixed(1)} C ${(dorgaliX + 70).toFixed(1)} ${(dorgaliY - 95).toFixed(1)}, ${(olbiaX + 66).toFixed(1)} ${(olbiaY + 92).toFixed(1)}, ${olbiaX.toFixed(1)} ${olbiaY.toFixed(1)}`;
const t2 = `M ${dorgaliX.toFixed(1)} ${dorgaliY.toFixed(1)} C ${(dorgaliX - 65).toFixed(1)} ${(dorgaliY - 25).toFixed(1)}, ${(dorgaliX - 170).toFixed(1)} ${(dorgaliY - 86).toFixed(1)}, ${(dorgaliX - 205).toFixed(1)} ${(dorgaliY - 24).toFixed(1)} C ${(dorgaliX - 238).toFixed(1)} ${(dorgaliY + 34).toFixed(1)}, ${(dorgaliX - 150).toFixed(1)} ${(dorgaliY + 86).toFixed(1)}, ${(dorgaliX - 98).toFixed(1)} ${(dorgaliY + 34).toFixed(1)} C ${(dorgaliX - 45).toFixed(1)} ${(dorgaliY - 8).toFixed(1)}, ${(dorgaliX - 44).toFixed(1)} ${(dorgaliY - 38).toFixed(1)}, ${dorgaliX.toFixed(1)} ${dorgaliY.toFixed(1)}`;
const t3 = `M ${dorgaliX.toFixed(1)} ${dorgaliY.toFixed(1)} C ${(dorgaliX - 28).toFixed(1)} ${(dorgaliY + 45).toFixed(1)}, ${(dorgaliX - 142).toFixed(1)} ${(dorgaliY + 58).toFixed(1)}, ${(dorgaliX - 162).toFixed(1)} ${(dorgaliY + 132).toFixed(1)} C ${(dorgaliX - 184).toFixed(1)} ${(dorgaliY + 214).toFixed(1)}, ${(dorgaliX - 88).toFixed(1)} ${(dorgaliY + 244).toFixed(1)}, ${(dorgaliX - 48).toFixed(1)} ${(dorgaliY + 176).toFixed(1)} C ${(dorgaliX + 8).toFixed(1)} ${(dorgaliY + 113).toFixed(1)}, ${(dorgaliX + 20).toFixed(1)} ${(dorgaliY + 62).toFixed(1)}, ${dorgaliX.toFixed(1)} ${dorgaliY.toFixed(1)}`;

const posterSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-labelledby="title desc">
  <title id="title">Tour Maxienduro Sardegna, 22–25 ottobre</title>
  <desc id="desc">Locandina Sardegna Trail Avventura con silhouette della Sardegna ricavata da OpenStreetMap.</desc>
  <metadata>${sourceLicence}; OSM relation ${feature.properties?.osm_id || "7361997"}</metadata>
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.granite}"/>
      <stop offset=".52" stop-color="#F7EEDC"/>
      <stop offset="1" stop-color="${c.sand}"/>
    </linearGradient>
    <linearGradient id="copy-wash" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.granite}" stop-opacity=".98"/>
      <stop offset=".68" stop-color="${c.granite}" stop-opacity=".88"/>
      <stop offset="1" stop-color="${c.granite}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="topo" width="180" height="145" patternUnits="userSpaceOnUse">
      <path d="M-18 48C27 3 79 4 116 34s48 72 93 80M-25 75C29 28 82 29 122 61s53 68 95 80M0 111c46-37 91-32 126-4 25 20 36 43 68 51" fill="none" stroke="${c.oxblood}" stroke-width="1" opacity=".08"/>
    </pattern>
    <clipPath id="island-clip"><path d="${islandPath}"/></clipPath>
    <clipPath id="cta-clip"><path d="M42 1230H372l22 22v66H64l-22-22z"/></clipPath>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c.oxblood}"/></marker>
    <style>
      @font-face { font-family:"Bebas Neue"; font-weight:400; src:url(data:font/ttf;base64,${fontBase64.bebas}) format("truetype"); }
      @font-face { font-family:"Montserrat"; font-weight:500; src:url(data:font/ttf;base64,${fontBase64.montserrat500}) format("truetype"); }
      @font-face { font-family:"Montserrat"; font-weight:600; src:url(data:font/ttf;base64,${fontBase64.montserrat600}) format("truetype"); }
      @font-face { font-family:"Montserrat"; font-weight:700; src:url(data:font/ttf;base64,${fontBase64.montserrat700}) format("truetype"); }
      @font-face { font-family:"Oswald"; font-weight:500; src:url(data:font/ttf;base64,${fontBase64.oswald500}) format("truetype"); }
      @font-face { font-family:"Oswald"; font-weight:600; src:url(data:font/ttf;base64,${fontBase64.oswald600}) format("truetype"); }
      @font-face { font-family:"Oswald"; font-weight:700; src:url(data:font/ttf;base64,${fontBase64.oswald700}) format("truetype"); }
      .display { font-family:"Bebas Neue", "Avenir Next Condensed", sans-serif; font-weight:400; letter-spacing:1.8px; }
      .label { font-family:"Oswald", "Avenir Next Condensed", sans-serif; font-weight:600; letter-spacing:1.3px; }
      .body { font-family:"Montserrat", Avenir, Arial, sans-serif; font-weight:600; }
      .route { fill:none; stroke:${c.oxblood}; stroke-width:4; stroke-dasharray:11 9; stroke-linecap:round; stroke-linejoin:round; marker-end:url(#arrow); }
      .icon { fill:none; stroke:${c.sage}; stroke-width:2.6; stroke-linecap:round; stroke-linejoin:round; }
    </style>
  </defs>

  <rect width="1080" height="1350" fill="url(#paper)"/>
  <rect y="225" width="1080" height="1015" fill="url(#topo)" opacity=".45"/>
  <path d="M-80 1000C180 865 360 1045 585 912s371-189 603-65v400H-80z" fill="${c.sand}" opacity=".25"/>
  <path d="M-90 1095c246-116 433 37 635-42 216-85 347-205 630-146v340H-90z" fill="${c.granite}" opacity=".42"/>

  <rect width="1080" height="225" fill="${c.obsidian}"/>
  <g opacity=".42"><path d="M0 66h1080M0 132h1080M0 198h1080" stroke="${c.granite}" stroke-opacity=".06"/><path d="M540 0l140 225M705 0l140 225M870 0l140 225" stroke="${c.granite}" stroke-opacity=".06"/></g>

  <image href="data:image/png;base64,${logoBase64}" x="55" y="27" width="170" height="170"/>
  <line x1="248" y1="64" x2="248" y2="162" stroke="${c.oxblood}" stroke-width="4"/>
  <text x="274" y="98" class="label" font-size="23" letter-spacing="4" fill="${c.sand}">SARDEGNA</text>
  <text x="274" y="135" class="label" font-size="23" letter-spacing="3" fill="${c.granite}">TRAIL AVVENTURA</text>
  <text x="274" y="168" class="body" font-size="12" letter-spacing="2" fill="${c.granite}" opacity=".58">TOUR OFF-ROAD GUIDATI</text>

  <g class="display">
    <text x="650" y="70" font-size="32" fill="${c.granite}">NON VISITARE LA SARDEGNA.</text>
    <text x="650" y="151" font-size="82" fill="${c.oxblood}">VIVILA.</text>
  </g>

  <path d="${islandPath}" fill="${c.oxblood}" fill-opacity=".16" stroke="${c.oxblood}" stroke-opacity=".68" stroke-width="4.5"/>
  <g clip-path="url(#island-clip)"><rect x="390" y="210" width="570" height="990" fill="url(#topo)" opacity=".82"/></g>

  <g>
    <path d="${t1}" class="route"/>
    <path d="${t4}" class="route"/>
    <path d="${t2}" class="route"/>
    <path d="${t3}" class="route"/>
  </g>

  <g transform="translate(${olbiaX.toFixed(1)} ${olbiaY.toFixed(1)})">
    <path d="M0-24C-14-24-23-14-23-1c0 18 23 39 23 39S23 17 23-1C23-14 14-24 0-24z" fill="${c.sage}"/>
    <circle cy="-2" r="7" fill="${c.granite}"/>
    <text x="-31" y="8" text-anchor="end" class="display" font-size="28" fill="${c.obsidian}">OLBIA</text>
  </g>
  <g transform="translate(${dorgaliX.toFixed(1)} ${dorgaliY.toFixed(1)})">
    <path d="M0-24C-14-24-23-14-23-1c0 18 23 39 23 39S23 17 23-1C23-14 14-24 0-24z" fill="${c.sage}"/>
    <circle cy="-2" r="7" fill="${c.granite}"/>
    <text x="30" y="8" class="display" font-size="28" fill="${c.obsidian}">DORGALI</text>
  </g>

  <rect x="28" y="270" width="610" height="330" fill="url(#copy-wash)"/>

  <g class="display">
    <text x="66" y="310" class="label" font-size="17" letter-spacing="5" fill="${c.oxblood}">SARDEGNA · TOUR OFF-ROAD GUIDATO</text>
    <text x="64" y="420" font-size="118" fill="${c.obsidian}">TOUR</text>
    <text x="64" y="520" font-size="108" fill="${c.oxblood}">MAXIENDURO</text>
    <path d="M66 540h260l21 8 125-4" fill="none" stroke="${c.obsidian}" stroke-opacity=".22" stroke-width="2"/>
    <path d="M66 540h145" stroke="${c.oxblood}" stroke-width="6"/>
    <text x="66" y="579" class="body" font-size="18" fill="${c.obsidian}" opacity=".72">4 giorni tra mare, montagna e fuoristrada</text>
  </g>

  <g>
    <rect x="62" y="630" width="314" height="200" fill="${c.carbon}"/>
    <line x1="62" y1="630" x2="376" y2="630" stroke="${c.oxblood}" stroke-width="8"/>
    <text x="86" y="713" class="display" font-size="87" fill="${c.granite}">22—25</text>
    <text x="88" y="784" class="display" font-size="63" fill="${c.oxblood}">OTTOBRE</text>
    <text x="90" y="812" class="label" font-size="13" letter-spacing="3" fill="${c.sand}" opacity=".75">4 GIORNI · 3 NOTTI</text>
  </g>

  <g>
    <rect x="820" y="254" width="232" height="174" fill="${c.granite}" fill-opacity=".86" stroke="${c.obsidian}" stroke-opacity=".13"/>
    <text x="838" y="282" class="label" font-size="12" letter-spacing="4" fill="${c.oxblood}">ITINERARIO</text>
    <g class="label" font-size="15" fill="${c.obsidian}">
      <g transform="translate(838 310)"><text x="0" y="7" fill="${c.oxblood}">T1</text><text x="28" y="7">OLBIA → DORGALI</text></g>
      <g transform="translate(838 343)"><text x="0" y="7" fill="${c.oxblood}">T2</text><text x="28" y="7">DORGALI</text></g>
      <g transform="translate(838 376)"><text x="0" y="7" fill="${c.oxblood}">T3</text><text x="28" y="7">DORGALI</text></g>
      <g transform="translate(838 409)"><text x="0" y="7" fill="${c.oxblood}">T4</text><text x="28" y="7">DORGALI → OLBIA</text></g>
    </g>
  </g>

  <g transform="translate(66 925)">
    <line x1="0" y1="0" x2="88" y2="0" stroke="${c.sage}" stroke-width="2"/>
    <text y="44" class="display" font-size="38" letter-spacing="2" fill="${c.obsidian}">COSA <tspan fill="${c.oxblood}">COMPRENDE</tspan></text>

    <g transform="translate(0 72)"><path class="icon" d="M2 17c3-12 18-17 29-9 5 4 7 10 6 15H20l-6 7H5c-2-4-3-8-3-13zm18 6h17"/><text x="48" y="25" class="label" font-size="19" fill="${c.obsidian}">GUIDA LOCALE</text></g>
    <g transform="translate(215 72)"><rect class="icon" x="4" y="8" width="31" height="26" rx="2"/><path class="icon" d="M12 8V2h15v6M10 34v5m19-5v5"/><text x="48" y="25" class="label" font-size="19" fill="${c.obsidian}">TRASPORTO BAGAGLI 4×4</text></g>
    <g transform="translate(0 124)"><path class="icon" d="M4 4l31 31M35 4L4 35M7 3l6 1-5 5-4-1zm25 29 5 5m-4-33 4 4-6 6-4-4z"/><text x="48" y="25" class="label" font-size="19" fill="${c.obsidian}">ASSISTENZA TECNICA</text></g>
    <g transform="translate(0 176)"><path class="icon" d="M2 32V11m0 13h39v8M8 24V13h13c7 0 10 4 10 11M2 36v-4m39 4v-4"/><text x="48" y="25" class="label" font-size="19" fill="${c.obsidian}">3 NOTTI · MEZZA PENSIONE</text></g>
    <g transform="translate(280 176)"><rect class="icon" x="4" y="14" width="34" height="25"/><path class="icon" d="M2 14h38v-8H2zm19-8v33M21 6c-8 0-12-5-9-9 4-4 9 2 9 9zm0 0c8 0 12-5 9-9-4-4-9 2-9 9z"/><text x="50" y="25" class="label" font-size="19" fill="${c.obsidian}">GADGET UFFICIALE</text></g>
  </g>

  <rect x="0" y="1210" width="1080" height="140" fill="${c.obsidian}"/>
  <line x1="0" y1="1210" x2="1080" y2="1210" stroke="${c.oxblood}" stroke-opacity=".5"/>
  <g clip-path="url(#cta-clip)"><rect x="42" y="1230" width="352" height="88" fill="${c.oxblood}"/><path d="M0 1320L118 1202M83 1340l118-118M330 1335l118-118" stroke="${c.granite}" stroke-opacity=".10"/></g>
  <text x="68" y="1260" class="label" font-size="12" letter-spacing="3" fill="${c.sand}">POSTI LIMITATI</text>
  <text x="68" y="1303" class="display" font-size="39" fill="${c.granite}">PRENOTA ORA</text>
  <g transform="translate(430 1240)"><path class="icon" d="M6 0c9 1 15 7 16 15l-8 6c4 11 12 19 23 23l6-8c8 1 14 7 15 16-4 6-10 9-17 8C18 56 2 40-2 17-3 10 0 4 6 0z"/><text x="66" y="42" class="display" font-size="45" fill="${c.granite}">348 79 81 591</text></g>
  <g transform="translate(770 1252)"><rect class="icon" x="0" y="0" width="34" height="26" rx="2"/><path class="icon" d="M2 3l15 12L32 3"/><text x="45" y="20" class="body" font-size="13" fill="${c.granite}">sardegnatrailavventura@gmail.com</text></g>
  <text x="1045" y="1336" text-anchor="end" class="body" font-size="9.5" fill="${c.granite}" opacity=".45">© OpenStreetMap contributors · ODbL</text>
</svg>`;

await fs.writeFile(posterSvgPath, posterSvg);
await sharp(Buffer.from(posterSvg)).png().toFile(posterPngPath);

console.log(JSON.stringify({
  osmRelation: feature.properties?.osm_id,
  osmName: feature.properties?.display_name,
  geojson: path.relative(root, geojsonPath),
  silhouette: path.relative(root, silhouettePath),
  posterSvg: path.relative(root, posterSvgPath),
  posterPng: path.relative(root, posterPngPath),
}, null, 2));
