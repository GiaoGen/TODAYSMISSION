import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const plain = value => JSON.parse(JSON.stringify(value));

function loadModule(file, cache = new Map()) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);

  const exports = {};
  cache.set(absolute, exports);
  const source = ts.transpileModule(readFileSync(absolute, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;

  vm.runInNewContext(source, {
    exports,
    console,
    require(name) {
      if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
      const base = name.startsWith("@/")
        ? path.join(root, name.slice(2))
        : path.resolve(path.dirname(absolute), name);
      const resolved = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
      assert.ok(resolved, `Module must resolve: ${base}`);
      return loadModule(resolved, cache);
    },
  }, { filename: absolute });

  return exports;
}

const mapper = loadModule("data/mappers/pack-mapper.ts");
const progressMapper = loadModule("data/mappers/mission-progress-mapper.ts");

const packRow = (overrides = {}) => ({
  id: "pack-1",
  slug: "go-alone",
  title: "GO ALONE",
  description: "Do things without waiting for company.",
  design_key: "field-edition",
  theme_key: "go-alone",
  sort_order: 10,
  missions: [{ count: 5 }],
  ...overrides,
});

const missionRow = (overrides = {}) => ({
  id: "mission-1",
  slug: "movie-alone",
  title: "Go to a movie alone.",
  note: "Pick the film yourself.",
  tag: "GO ALONE",
  code: "01—A",
  theme_key: "coral",
  artwork_key: "circle",
  sort_order: 10,
  ...overrides,
});

test("maps database snake_case content to the frontend contract", () => {
  const pack = mapper.mapPackSummary(packRow(), 0);
  const mission = mapper.mapMissionSummary(missionRow());

  assert.deepEqual(plain(pack), {
    id: "pack-1",
    slug: "go-alone",
    title: "GO ALONE",
    description: "Do things without waiting for company.",
    number: "01",
    missionCount: 5,
    designKey: "field-edition",
    themeKey: "go-alone",
  });
  assert.deepEqual(plain(mission), {
    id: "mission-1",
    slug: "movie-alone",
    title: "Go to a movie alone.",
    note: "Pick the film yourself.",
    tag: "GO ALONE",
    code: "01—A",
    themeKey: "coral",
    artworkKey: "circle",
  });
});

test("falls back unknown registry keys without changing core content", () => {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = message => warnings.push(message);

  try {
    const pack = mapper.mapPackSummary(packRow({ design_key: "future-design", theme_key: "future-theme" }), 1);
    const mission = mapper.mapMissionSummary(missionRow({ theme_key: "future-theme", artwork_key: "future-art" }));

    assert.equal(pack.designKey, "field-edition");
    assert.equal(pack.themeKey, "go-alone");
    assert.equal(mission.themeKey, "paper");
    assert.equal(mission.artworkKey, "circle");
    assert.equal(pack.title, "GO ALONE");
    assert.equal(mission.title, "Go to a movie alone.");
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 4);
});

test("orders Mission rows before mapping and formats Pack numbers", () => {
  const detail = mapper.mapPackDetail(packRow({ missions: [
    missionRow({ id: "mission-30", slug: "third", sort_order: 30 }),
    missionRow({ id: "mission-10-b", slug: "first-b", sort_order: 10 }),
    missionRow({ id: "mission-10-a", slug: "first-a", sort_order: 10 }),
  ] }), 9);

  assert.equal(detail.number, "10");
  assert.deepEqual(plain(detail.missions.map(mission => mission.slug)), ["first-a", "first-b", "third"]);
});

test("does not replace invalid core content with fixture values", () => {
  assert.throws(
    () => mapper.mapMissionSummary(missionRow({ title: "" })),
    /Mission: title must be non-empty/,
  );
});

test("maps mission progress without exposing user identity", () => {
  assert.deepEqual(plain(progressMapper.mapMissionProgressRows([
    {
      mission_id: "mission-taken",
      status: "taken",
      taken_at: "2026-08-31T00:00:00Z",
      completed_at: null,
    },
    {
      mission_id: "mission-completed",
      status: "completed",
      taken_at: "2026-08-30T00:00:00Z",
      completed_at: "2026-08-31T00:00:00Z",
    },
  ])), {
    "mission-taken": {
      missionId: "mission-taken",
      status: "taken",
      takenAt: "2026-08-31T00:00:00Z",
      completedAt: null,
    },
    "mission-completed": {
      missionId: "mission-completed",
      status: "completed",
      takenAt: "2026-08-30T00:00:00Z",
      completedAt: "2026-08-31T00:00:00Z",
    },
  });
});
