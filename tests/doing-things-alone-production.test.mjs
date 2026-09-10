import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = file => readFileSync(path.join(root, file), "utf8");

const missionSlugs = [
  "stay-awhile",
  "eat-outside-alone",
  "lunch-for-one",
  "browse-alone",
  "go-somewhere-new",
  "sit-in-the-crowd",
  "coffee-for-one",
  "table-for-one",
  "movie-for-one",
  "see-it-for-yourself",
  "play-alone",
  "go-to-something",
  "show-up-alone",
  "be-the-only-one",
  "one-hour-out",
  "spend-the-day-your-way",
];

test("production content migration publishes exactly the 16 final public Missions", () => {
  const migration = read("supabase/migrations/20260910170402_production_doing_things_alone.sql");
  const rows = [...migration.matchAll(/^\s{4}\('([^']+)', '([^']+)',/gm)];

  assert.deepEqual(rows.map(match => match[1]), missionSlugs);
  assert.doesNotMatch(migration, /'stop-waiting'/);
  assert.match(migration, /'Doing Things Alone'/);
  assert.match(migration, /Do the things you want to do — even when no one comes with you\./);
  assert.match(migration, /Spend 15 minutes alone in a public place\./);
  assert.match(migration, /Plan half a day for yourself and spend it out alone\./);
  assert.match(migration, /set is_published = false/);
});

test("every public Mission has one optimized static artwork and a deterministic approved variant", () => {
  const component = read("features/packs/components/MissionStreamCard.tsx");
  const variants = [];

  for (const slug of missionSlugs) {
    const asset = path.join(root, "public", "packs", "doing-things-alone", "missions", `${slug}.webp`);
    assert.ok(existsSync(asset), `missing artwork for ${slug}`);
    assert.ok(statSync(asset).size > 0, `empty artwork for ${slug}`);

    const mapping = component.match(new RegExp(`"${slug}": \\{ variant: "([^"]+)", artworkSrc: "([^"]+)" \\}`));
    assert.ok(mapping, `missing deterministic design mapping for ${slug}`);
    assert.equal(mapping[2], `/packs/doing-things-alone/missions/${slug}.webp`);
    variants.push(mapping[1]);
  }

  assert.deepEqual(new Set(variants), new Set(["aperture", "field", "pressure", "split", "final"]));
  assert.doesNotMatch(component, /Math\.random/);
  assert.doesNotMatch(component, /stop-waiting-hidden/);
});

test("approved cover, shared background, and existing completion motion stay connected", () => {
  const cover = path.join(root, "public", "packs", "doing-things-alone", "cover.webp");
  const registry = read("features/packs/components/PackDesignRegistry.tsx");
  const gallery = read("features/packs/components/MissionGallery.tsx");
  const galleryCss = read("features/packs/components/MissionGallery.module.css");

  assert.ok(existsSync(cover));
  assert.ok(statSync(cover).size > 0);
  assert.match(registry, /"doing-things-alone": DoingThingsAlonePackDesign/);
  assert.match(registry, /\/packs\/doing-things-alone\/cover\.webp/);
  assert.match(gallery, /hero\.slug === "go-alone"/);
  assert.match(galleryCss, /\.root\[data-pack-slug="go-alone"\]/);
  assert.match(gallery, /className=\{styles\.completionFace\}/);
  assert.match(galleryCss, /var\(--completion-card-y, -100%\)/);
});
