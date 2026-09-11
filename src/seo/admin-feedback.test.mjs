import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSeoEntries, getSeoForPath } from "./seo-config.js";

describe("/admin/feedback", () => {
  const seo = getSeoForPath("/admin/feedback");

  it("è privata, fuori dagli indici e descritta correttamente", () => {
    assert.equal(seo.privata, true);
    assert.equal(seo.indexable, false);
    assert.equal(seo.title, "Dashboard feedback | Sardegna Trail Avventura");
    assert.equal(seo.robots, "noindex, nofollow, noarchive");
  });

  it("non porta metadati pubblici", () => {
    for (const campo of ["canonical", "alternates", "image", "structuredData", "description"]) {
      assert.equal(seo[campo], undefined, `«${campo}» non deve esserci`);
    }
  });

  it("non entra nel prerendering né nella sitemap", () => {
    assert.equal(getSeoEntries().some((entry) => entry.path.startsWith("/admin")), false);
  });
});
