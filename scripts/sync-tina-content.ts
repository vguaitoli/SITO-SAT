import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "src/content/tina-snapshot.json");

async function readJson(relativePath: string) {
  return JSON.parse(await readFile(path.join(projectRoot, relativePath), "utf8"));
}

async function fallbackSnapshot() {
  const [homepage, tourCatalog, eventCatalog, siteSettings] = await Promise.all([
    readJson("content/homepage/index.json"),
    readJson("content/tours/index.json"),
    readJson("content/events/index.json"),
    readJson("content/settings/index.json"),
  ]);

  const entry = (documentName: string, data: unknown) => ({
    data: { [documentName]: data },
    query: `query ${documentName}Fallback { __typename }`,
    variables: { relativePath: "index.json" },
  });

  return {
    homepage: entry("homepage", homepage),
    tourCatalog: entry("tourCatalog", tourCatalog),
    eventCatalog: entry("eventCatalog", eventCatalog),
    siteSettings: entry("siteSettings", siteSettings),
  };
}

async function tinaSnapshot() {
  const { client } = await import("../tina/__generated__/client");
  const [homepage, tourCatalog, eventCatalog, siteSettings] = await Promise.all([
    client.queries.homepage({ relativePath: "index.json" }),
    client.queries.tourCatalog({ relativePath: "index.json" }),
    client.queries.eventCatalog({ relativePath: "index.json" }),
    client.queries.siteSettings({ relativePath: "index.json" }),
  ]);

  return { homepage, tourCatalog, eventCatalog, siteSettings };
}

let snapshot;
try {
  snapshot = await tinaSnapshot();
  console.log("[tina] Snapshot generato tramite Content API.");
} catch (error) {
  snapshot = await fallbackSnapshot();
  console.warn(
    "[tina] Content API non disponibile: uso i file JSON locali per questa build.",
    error instanceof Error ? error.message : error,
  );
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
