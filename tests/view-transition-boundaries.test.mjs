import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const componentFiles = {
  RootLayout: "app/layout.tsx",
  Home: "app/page.tsx",
  HomeCarouselEntry: "features/packs/components/HomeCarouselEntry.tsx",
  HomePackCarousels: "features/packs/components/HomePackCarousels.tsx",
  HomeUserMenu: "features/packs/components/HomeUserMenu.tsx",
  ArcCarousel: "features/packs/components/ArcCarousel.tsx",
  TransformArcCarousel: "features/packs/components/ArcCarousel.tsx",
  NativePackCarousel: "features/packs/components/NativePackCarousel.tsx",
  CalendarCarousel: "features/calendar/components/CalendarCarousel.tsx",
  PackDetailPage: "app/pack/[slug]/page.tsx",
  MissionPackDetail: "features/packs/components/MissionPackDetail.tsx",
  MissionGallery: "features/packs/components/MissionGallery.tsx",
  CompletedMissionsPage: "app/completed/[date]/page.tsx",
};

function readComponent(name) {
  const file = componentFiles[name];
  assert.ok(file, `Unknown component: ${name}`);
  const source = ts.createSourceFile(
    file,
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = source.statements.find((node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === name);
  const result = declaration?.body?.statements.find(ts.isReturnStatement);
  assert.ok(result?.expression, `${name} must have a top-level return`);
  let root = result.expression;
  while (ts.isParenthesizedExpression(root)) root = root.expression;
  return { source, root };
}

function attribute(element, name) {
  return element.attributes.properties.find((property) =>
    ts.isJsxAttribute(property) && property.name.text === name)?.initializer;
}

function containsTransition(node) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const element = ts.isJsxElement(node) ? node.openingElement : node;
    const name = element.tagName.getText();
    if (name === "ViewTransition") return true;
    if (componentFiles[name]) return containsTransition(readComponent(name).root);
  }
  let found = false;
  ts.forEachChild(node, (child) => { if (containsTransition(child)) found = true; });
  return found;
}

// Inspect the actual route's component chain, not just whether CSS rules exist.
// React enter/exit traversal stops at the first host node in the inserted/deleted tree.
function routeBoundaries(componentName, route = []) {
  const { root } = readComponent(componentName);
  const branch = [...route, { name: componentName }];

  function visit(node, path) {
    if (node.kind === ts.SyntaxKind.NullKeyword) return [];
    if (ts.isJsxText(node)) return [];
    if (ts.isJsxExpression(node) && !node.expression) return [];
    if (ts.isJsxExpression(node)) return visit(node.expression, path);
    if (ts.isParenthesizedExpression(node)) return visit(node.expression, path);
    if (ts.isConditionalExpression(node)) return [...visit(node.whenTrue, path), ...visit(node.whenFalse, path)];
    if (ts.isJsxFragment(node)) return node.children.flatMap((child) => visit(child, path));
    assert.ok(ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node));
    const element = ts.isJsxElement(node) ? node.openingElement : node;
    const name = element.tagName.getText();
    if (name === "ViewTransition") return [{ owner: componentName, path, element }];
    // A non-animated sibling (the menu) is fine. A host enclosing a wheel isn't.
    if (/^[a-z]/.test(name) && !containsTransition(node)) return [];
    assert.doesNotMatch(name, /^[a-z]/,
      `${path.map((part) => part.name).join(" → ")} renders <${name}> before its animation boundary`);
    const placement = attribute(element, "placement");
    const handler = attribute(element, "onOpenPack");
    return routeBoundaries(name, [...path, {
      name: `${name} invocation`,
      placement: placement && ts.isStringLiteral(placement) ? placement.text : undefined,
      onOpenPack: handler?.getText(),
    }]);
  }

  return visit(root, branch);
}

function hostElements(root, tagName) {
  const matches = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (node.tagName.getText() === tagName) matches.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return matches;
}

test("home exposes both wheel boundaries before any route-owned DOM wrapper", () => {
  const boundaries = routeBoundaries("Home");
  // Fixed calendar and Pack still expose independent, coordinated boundaries.
  assert.equal(boundaries.length, 3);
  assert.deepEqual(boundaries.map((boundary) => boundary.owner), ["CalendarCarousel", "NativePackCarousel", "TransformArcCarousel"]);
  const invocations = boundaries.filter(({ owner }) => owner !== "CalendarCarousel").map(({ path }) =>
    path.find((part) => part.name === "ArcCarousel invocation"));
  assert.deepEqual(invocations.map((call) => call.placement ?? "bottom"), ["bottom", "bottom"]);
  assert.deepEqual(invocations.map((call) => call.onOpenPack), ["{openPack}", "{openPack}"]);
  const calendarCalls = boundaries.filter(({ owner }) => owner === "CalendarCarousel").map(({ path }) =>
    path.find((part) => part.name === "CalendarCarousel invocation"));
  assert.deepEqual(calendarCalls.map((call) => call.placement), ["top"]);
  for (const { element } of boundaries) {
    assert.ok(attribute(element, "enter"));
    assert.ok(attribute(element, "exit"));
  }
});

test("detail keeps its exit boundary above the content", () => {
  const boundaries = routeBoundaries("PackDetailPage");
  assert.equal(boundaries.length, 1);
  assert.equal(boundaries[0].owner, "MissionGallery");
  assert.ok(attribute(boundaries[0].element, "exit"));
});

test("completed history route exposes no fixture gallery", () => {
  const boundaries = routeBoundaries("CompletedMissionsPage");
  assert.equal(boundaries.length, 0);
});

test("the persistent layout owns the sole main landmark and the route slot", () => {
  const { source, root } = readComponent("RootLayout");
  const mains = hostElements(root, "main");
  assert.equal(mains.length, 1);
  assert.match(mains[0].parent.getText(), /\{children\}/);
  assert.equal(hostElements(readComponent("Home").root, "main").length, 0);
  assert.equal(hostElements(readComponent("MissionPackDetail").root, "main").length, 0);
  assert.ok(!source.statements.some((node) =>
    ts.isExpressionStatement(node) && node.expression.text === "use client"));
});
