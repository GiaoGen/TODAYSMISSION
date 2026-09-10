# TODAYSMISSION Mission UI Template Design Skill

**Version:** 1.0  
**Scope:** Mission Text Card + Mission Page Background  
**Type:** Generic Pack-to-UI translation workflow  
**Primary rule:** **Translate the approved Pack art language into UI. Do not invent a second art direction.**

## 1. Purpose

This Skill is used after a Pack's artwork direction and artwork collection already exist.

It creates a reusable, code-native Mission UI system that visually belongs to that Pack without turning the interface itself into another artwork.

It must work for any TODAYSMISSION Pack.

The Skill must not hardcode a specific Pack palette, geometry, art movement, or composition.

Instead, it derives the UI system from:

1. the approved `ART_DIRECTION.md`;
2. the approved artwork reference set;
3. the real product/repository constraints.

The result is:

- one reusable Mission Text Card component;
- a small family of controlled visual variants;
- a coordinated Mission page background system;
- a concise `PACK_UI_DIRECTION.md`;
- responsive, readable, production-ready implementation.

## 2. Source of Truth

Style consistency must never depend on chat memory.

The required style sources are:

### A. `ART_DIRECTION.md`

Defines the Pack's visual grammar:
- abstraction profile;
- formal vocabulary;
- spatial grammar;
- palette behavior;
- edge behavior;
- tension mechanisms;
- complexity;
- anti-patterns.

### B. Approved visual Reference Set

Use the completed Mission Artwork Cards and Pack Cover as visual evidence of how the written art direction actually behaves.

The reference set is the primary visual anchor.

### C. Product repository

Use the real repository only to understand:
- card geometry;
- typography constraints;
- current interaction;
- responsive behavior;
- reveal animation;
- action-layer boundaries;
- Safari/mobile constraints.

Do not redesign unrelated product systems.

## 3. Card Roles Must Stay Separate

### Mission Text Card
A code-native information surface shown before completion.

Its job is:
- clarity;
- reading;
- task understanding;
- visual connection to the Pack.

It is not a mini Artwork Card.

### Mission Artwork Card
A unique collectible artwork asset revealed after completion.

Do not recreate it with HTML/CSS.

### Mission Action Layer
Controls such as nervous/listening actions, completion slider, record, replay, upload, and retry remain separate from the Text Card visual template.

Do not bake action controls into the Text Card design.

## 4. Information Hierarchy

The Mission Text Card contains exactly three content levels:

1. **Mission Title**
2. **Mission Instruction**
3. **Pack Name**

Do not add Mission number, difficulty, intensity, duration, tags, code, progress, status, or decorative metadata unless the user explicitly changes this rule.

## 5. Reading Priority

The Mission instruction has the largest layout priority, even when the Mission Title has the strongest visual hierarchy.

Create a **Protected Reading Field** for the instruction.

The Protected Reading Field must:
- remain uninterrupted;
- maintain strong text/background contrast;
- avoid complex texture;
- avoid geometric cuts through body copy;
- support short and long instructions;
- survive mobile sizes;
- never depend on manual per-Mission CSS fixes.

Decorative or structural Pack geometry may surround the reading field, but must not compete with it.

## 6. Art-to-UI Translation

Do not copy artwork compositions into the UI.

Instead:

> **Extract the Pack's formal grammar, then translate it into a quieter interface language.**

Internally analyze the approved reference set for:
- palette roles;
- dominant vs accent color behavior;
- edge language;
- shape families;
- spatial behavior;
- asymmetry;
- repetition;
- negative space;
- density;
- texture;
- depth;
- tension;
- material character.

Then convert those properties into UI equivalents.

Example logic:

```text
ART: large dominant color field
UI: dominant card surface or restrained structural plane

ART: aggressive spatial cut
UI: controlled edge/framing cut outside the reading field

ART: high-contrast accent
UI: small tension accent

ART: deep visual void
UI: page environment or outer framing

ART: complex object/figure fragment
UI: do not reproduce literally; translate only its formal behavior
```

The UI should feel related to the artwork collection without looking like a flattened copy of it.

## 7. Density Hierarchy

Always preserve:

```text
Artwork Card     = highest visual density
Mission Text Card = medium visual density
Page Background   = lowest visual density
```

The Artwork is the reward.

The Text Card should be visually designed but quieter.

The Page Background should establish atmosphere without competing with the card.

## 8. Template Family, Not One Frozen Template

Do not create:
- one identical card repeated for every Mission;
- sixteen bespoke Mission card designs.

Create:

> **one shared component + 3–5 controlled visual variants**

All variants must clearly belong to the same Pack UI system.

The purpose is to prevent visual monotony without losing system consistency.

## 9. Invariant Grammar

The following remain stable across all variants:
- card geometry;
- information hierarchy;
- typography system;
- reading-field rules;
- Pack-name placement logic;
- spacing logic;
- accessibility thresholds;
- Pack art language;
- interaction/reveal compatibility.

These are the **Invariant Grammar**.

## 10. Controlled Variation

Variation is allowed only along approved axes.

### A. Surface dominance

Different colors or tones from the approved Pack palette may take the dominant card role.

Do not force every Mission card to use the same dominant color.

If the approved artwork language contains several functional colors, use **controlled color-role rotation** to create rhythm across Missions.

Do not invent unrelated colors simply to create variety.

If the Pack is intentionally monochrome, create variation through tonal hierarchy, geometry, negative space, or edge behavior instead.

### B. Framing geometry

Allow a small set of related structural treatments such as:
- top intrusion;
- side cut;
- corner compression;
- open field;
- split plane;
- peripheral frame.

The exact vocabulary must come from the Pack art direction.

### C. Title behavior

Allow restrained variation for short, medium, and long titles while keeping the same typographic system and core grid.

Do not create radically different title layouts for every Mission.

## 11. Color Rules

Color must be derived from the approved reference set and `ART_DIRECTION.md`.

Do not hardcode TODAYSMISSION-wide colors.

For each Pack, identify:
- primary surface colors;
- neutral/background colors;
- structural colors;
- tension/accent colors;
- colors unsuitable for body-copy backgrounds.

When the Pack contains multiple strong colors, do not make every Text Card use the same dominant surface.

Use role rotation to keep the Mission stream alive.

However:
- readability outranks visual variety;
- accent colors must remain accents if the art direction treats them as accents;
- do not introduce arbitrary rainbow variation;
- do not equate colors with difficulty unless explicitly required.

## 12. Variant Assignment

Mission variants must be deterministic.

Do not use runtime randomness.

A Mission should retain the same visual identity across sessions.

Variant assignment may be based on:
- an explicit Pack UI mapping;
- stable Mission slug mapping;
- lightweight semantic matching;
- a deterministic theme function.

Prefer explicit or deterministic assignment over `Math.random()`.

Do not create one-off CSS overrides for each Mission unless a real content bug requires it.

## 13. Page Background Is a Separate System

The page background is not the Text Card extended to full screen.

It is:

> **an ambient translation of the Pack art language.**

The background should preserve Pack identity while remaining substantially quieter than the card.

It may use:
- low-contrast structural planes;
- cropped peripheral forms;
- subtle edge behavior;
- restrained depth;
- soft spatial asymmetry;
- Pack-derived tonal relationships.

It must not:
- become a full artwork;
- reproduce an Artwork Card as wallpaper;
- use high-detail image backgrounds by default;
- place high-contrast geometry directly behind important text/actions;
- visually merge with the active Text Card;
- overpower the Mission carousel.

## 14. Card ↔ Background Pairing

Card and background must be designed together.

A card variant and its page background should form a coordinated pair.

If the card uses a dark dominant surface, the background must preserve enough separation.

If the card uses a strong Pack color, the background should avoid competing with the same dominant color in the same region.

The background family should therefore contain coordinated variants, but with less variation and lower contrast than the Text Card family.

Do not let card and background independently choose random styles.

## 15. Quiet Zone

Maintain a calm area around the active Mission card.

The strongest background identity should usually live toward:
- screen edges;
- cropped peripheral regions;
- distant planes;
- areas away from dense UI controls.

Avoid tangencies where background shapes visually collide with card edges or text.

## 16. Code-Native Implementation

Mission Text Card and Page Background should be implemented primarily with:
- HTML;
- CSS;
- React/Next.js components;
- CSS custom properties;
- pseudo-elements;
- `clip-path`;
- gradients only when justified by the Pack language;
- simple inline SVG only when the Pack grammar genuinely requires vector geometry.

Do not generate raster background images by default.

Do not turn the Mission Text Card into a flattened image.

Text must remain live HTML for responsiveness, accessibility, localization, maintainability, and dynamic Mission content.

## 17. One Component, Pack-Specific Theme

Prefer an architecture equivalent to:

```text
MissionTextCard + PackMissionUITheme
MissionPageBackground + PackMissionUITheme
```

The shared component owns:
- content hierarchy;
- layout;
- accessibility;
- responsive behavior;
- reveal compatibility.

The Pack-specific theme owns:
- palette roles;
- visual variants;
- geometry language;
- background behavior;
- controlled decorative structure.

Do not create a separate component for every Mission.

## 18. Hidden / Final Mission

The hidden/final Mission should remain in the same Template Family.

A restrained `final` variant is allowed.

It may change:
- title emphasis;
- spatial openness;
- accent intensity;
- framing tension;

but must not become a completely unrelated "legendary" design.

Avoid gold-card or game-rarity clichés.

## 19. Responsive Requirements

The component must be validated with real Mission content across:
- short Mission title;
- long Mission title;
- short instruction;
- long instruction;
- mobile card width;
- tablet;
- desktop.

The layout must not require manual per-Mission tuning.

Test actual card dimensions from the repository.

Do not design only from a large desktop mockup.

## 20. Reveal Compatibility

The Mission Text Card must share the real card geometry expected by the completion Artwork reveal.

Do not change aspect ratio or core card bounds in ways that break the existing interaction.

Artwork must be able to cover/replace the Text Card cleanly during completion.

The intended visual transition is:

> **information → action → artwork**

The Text Card should therefore remain quieter than the revealed Artwork.

## 21. Validation

Codex must internally verify:

### Readability
- title clear;
- instruction comfortably readable;
- Pack name legible but subordinate.

### Variety
- Mission cards do not look copy-pasted;
- variants remain clearly related.

### Consistency
- UI feels derived from the approved artwork collection;
- no second unrelated design language appears.

### Background
- supports the card rather than competing with it;
- card remains visually separated in every variant.

### Product
- mobile;
- desktop;
- actual content lengths;
- reveal;
- existing action layer;
- Safari/performance constraints.

Do not create separate user-facing approval phases for these checks.

## 22. Anti-Patterns

Reject:
- generic SaaS card styling;
- decorative gradients unrelated to the artwork;
- glassmorphism unless explicitly supported by the Pack art language;
- random color themes;
- one fixed color surface for every Mission when the approved palette supports meaningful variation;
- sixteen unrelated card layouts;
- artwork fragments pasted directly behind text;
- high-contrast geometry crossing body copy;
- background art that competes with the card;
- runtime random variants;
- overdesigned metadata;
- fake collectible-rarity UI;
- code geometry used as decorative filler without relationship to the Pack art language.

## 23. Workflow — One User-Facing Run

This Skill must remain lightweight.

There is only one required user-facing execution:

# RUN — MISSION UI SYSTEM

Codex performs internally:

```text
read ART_DIRECTION
→ inspect approved references
→ inspect real repository
→ derive UI translation
→ design Template Family
→ design Background Family
→ implement
→ test real Mission content
→ validate mobile/desktop/reveal
→ refine
→ present final result
```

These are internal actions, not user-facing phases.

Do not stop after:
- art analysis;
- palette extraction;
- layout proposal;
- background proposal;
- first variant;
- first Mission.

Do not request approval for every internal step.

## 24. Final Deliverables

At the end of the run, provide:

1. production-ready Mission Text Card component;
2. 3–5 controlled card variants;
3. coordinated Mission Page Background family;
4. deterministic variant assignment;
5. concise `PACK_UI_DIRECTION.md`;
6. representative real-content previews covering:
   - short title;
   - long title;
   - short instruction;
   - long instruction;
   - several variants;
   - hidden/final Mission;
7. mobile and desktop validation;
8. integration with the existing reveal/action structure;
9. only genuine unresolved issues, if any.

Do not create unnecessary design-system documentation.

## 25. `PACK_UI_DIRECTION.md`

Keep this file short.

It should contain only:

```md
# <Pack Name> — Mission UI Direction

## Source
ART_DIRECTION path
Reference Set paths

## UI Translation
Short explanation of how the artwork grammar becomes interface grammar.

## Palette Roles
Surface / structural / accent / neutral / restricted roles.

## Invariant Grammar
Stable typography, information grid, reading field, Pack-name logic.

## Controlled Variants
3–5 variant definitions.

## Background Family
Ambient rules and card/background pairings.

## Final Mission
Any restrained variation.

## Never
Pack-specific UI anti-patterns.
```

The file is a reconstruction aid for future Codex sessions.

It must not depend on the original conversation.

## 26. Cold-Start Requirement

A future Codex session should be able to reproduce, maintain, or extend the Mission UI using only:
- this Skill;
- Pack content;
- `ART_DIRECTION.md`;
- approved visual Reference Set;
- `PACK_UI_DIRECTION.md`;
- repository.

If the original chat history is required to understand the design, the system is incomplete.

## 27. Success Condition

The Mission UI system succeeds when:

### Visually
The cards clearly belong to the Pack's artwork collection without imitating the Artwork Cards.

### Functionally
Mission instructions remain easy to read across real content and devices.

### Experientially
Different Missions have enough controlled variation to avoid monotony.

### Structurally
One reusable code system supports the Pack instead of sixteen bespoke layouts.

### Operationally
A new Codex session can reconstruct the system from saved artifacts without conversation memory.

The target is:

> **one Pack art language → one reusable UI grammar → several controlled Mission surfaces → one coherent product experience**
