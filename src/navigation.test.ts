import { describe, expect, it } from "vitest";

import { NAV, SECTION_IDS } from "./App.js";

/**
 * The sidebar must not be able to hide a page that exists.
 *
 * Both failures below actually happened, and neither broke anything a compiler or a
 * build could notice: the page worked, the code shipped, and the entry was simply
 * somewhere nobody looks.
 */
describe("navigation du back-office", () => {
  it("n'invente pas de groupe isolé", () => {
    // A group holding a single entry lands at the bottom of the sidebar, below the
    // system section, wherever its first member happens to sit in the array. That is
    // the last place anyone looks for a page about attendance.
    const parGroupe = new Map<string, string[]>();
    for (const n of NAV) parGroupe.set(n.group, [...(parGroupe.get(n.group) ?? []), n.id]);

    const isoles = [...parGroupe.entries()].filter(([, ids]) => ids.length < 2);
    expect(isoles, `groupe(s) à une seule entrée : ${isoles.map(([g, ids]) => `${g} (${ids})`).join(", ")}`).toEqual([]);
  });

  it("déclare chaque section dans la liste des ancres", () => {
    // SECTION_IDS validates the URL hash. An entry missing from it still shows in the
    // menu, but a bookmark or a shared link silently falls back to another section.
    const absents = NAV.map((n) => n.id).filter((id) => !SECTION_IDS.has(id));
    expect(absents, `section(s) absente(s) de SECTION_IDS : ${absents.join(", ")}`).toEqual([]);
  });

  it("n'expose aucune section en double", () => {
    const ids = NAV.map((n) => n.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("attache une permission à chaque entrée", () => {
    const sansPerm = NAV.filter((n) => !n.perm.trim()).map((n) => n.id);
    expect(sansPerm, `entrée(s) sans permission : ${sansPerm.join(", ")}`).toEqual([]);
  });
});
