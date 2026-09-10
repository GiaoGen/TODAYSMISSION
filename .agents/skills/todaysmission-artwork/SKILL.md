# TODAYSMISSION Abstract Artwork Production Skill

**Version:** 2.1  
**Status:** Production / Benchmark Workflow  
**Scope:** Pack-level abstract art direction, Mission Artwork Cards, and Pack Cover  
**Primary principle:** **Do not illustrate the Mission. Abstract the Mission. Abstraction removes literal detail; it must not remove the subject.**

---

## 1. Purpose

This Skill governs the creation of TODAYSMISSION collectible artwork.

It exists to produce artwork that is:

- rooted in abstract art and abstraction;
- artistically intentional rather than generically "AI-stylized";
- coherent within each Pack;
- different enough from Mission to Mission to feel like individual works;
- usable at the real TODAYSMISSION card size;
- producible with low human workflow overhead.

The user should experience:

> **Choose one art language → verify the collection once → receive the Pack.**

Not:

> approve every internal step, inspect raw generations, repair every image, or manage a long design pipeline.

---

## 2. The Core Model

TODAYSMISSION does **not** use one universal artwork style.

```text
TODAYSMISSION
    ↓
shared product frame / typography / card behavior
    ↓
PACK
    ↓
one coherent abstract art language
    ↓
MISSIONS
    ↓
individual artworks created inside that art language
```

Therefore:

> **One Pack = one abstract art world.**

Different Packs may use substantially different abstract-art languages.

TODAYSMISSION remains recognizable through the product system around the art:

- card dimensions;
- typography;
- interaction;
- reveal behavior;
- collection logic;
- Pack / Mission hierarchy.

Do not force all Packs to share one illustration style.

---

## 3. What "Abstract" Means Here

Abstract does **not** mean:

- random colorful shapes;
- circles + squares + triangles;
- generic minimalist graphics;
- a realistic scene with an abstract filter;
- a person standing in a real location with painterly effects;
- decorative geometry added to make an image feel "designed."

For TODAYSMISSION:

> **Abstraction is the formal translation of behavioral meaning, relational structure, psychological tension, rhythm, scale, movement, isolation, grouping, interruption, exposure, distance, or other relevant Mission properties into an artwork.**

The Mission is the conceptual source.

The artwork does not need to literally depict the Mission's venue or objects.

Example distinction:

```text
WRONG:
Movie for One
→ draw a realistic cinema
→ place one person in a seat
→ make it flat / painterly / stylish

RIGHT:
Movie for One
→ identify the behavioral relation
→ one individual entering a strongly companion-coded structure
→ translate that relation into scale, rhythm, separation, repetition,
  interruption, compression, negative space, or another formal device
→ create an abstract artwork
```

A viewer does not need to guess "cinema" without the title.

However, after knowing the Mission, the relationship between artwork and Mission should feel intentional and defensible.

---

## 4. Research-Derived Principles

These are design principles inspired by relevant generative-art and style-control research.

They are **not mandatory software dependencies**.

Do not clone, install, or integrate these projects unless the user explicitly asks for a technical escalation.

### 4.1 Abstraction has more than one axis

Inspired by CLIPascene:

Treat abstraction as at least two separable questions:

**Semantic Fidelity** — how much recognizable Mission meaning survives?  
**Formal Simplicity** — how reduced or concentrated is the visual vocabulary?

Do not collapse both into a vague instruction such as "make it more abstract."

### 4.2 Complexity is a budget

Inspired by CLIPasso and DiffSketcher:

Abstraction can be controlled by restricting formal complexity.

For each Pack, define a **Complexity Budget** such as:

- number of dominant forms;
- number of secondary systems;
- number of figure fragments;
- number of repeated structures;
- number of textures;
- degree of literal representation.

This is not a mechanical shape-counting exercise.

Its purpose is to prevent uncontrolled visual noise and generic AI "abstract art soup."

### 4.3 Style is not merely texture

Inspired by StyleCLIPDraw:

A Pack's art language must affect:

- shape;
- spatial behavior;
- proportion;
- edge;
- rhythm;
- composition;
- mark-making;

not merely:

- grain;
- palette;
- brush texture;
- filters.

If two artworks have identical generic compositions but the same texture overlay, they are not meaningfully style-aligned.

### 4.4 Reference images outrank adjectives

Inspired by StyleAligned, IP-Adapter, and InstantStyle:

Once an art language has been approved, visual references are a stronger style anchor than long descriptive prompts.

Use approved artworks as the Pack's **Reference Set** whenever the image-generation system supports visual references.

Text explains meaning. Approved images anchor the art language.

A reference is a **style anchor**, not a composition template.

Do not copy its layout into every new Mission.

### 4.5 Generate a collection, not isolated images

Treat the Pack as the generation unit.

```text
Pack Collection
├── shared art grammar
├── shared abstraction profile
├── shared reference set
├── shared complexity budget
└── distinct Mission-level formal translations
```

Every new artwork must be judged both:

- as an individual work;
- as a member of the Pack collection.

### 4.6 Rendering medium follows the art language

Do not decide raster / SVG / procedural generation in advance.

Possible rendering modes:

- **Raster Generative Art** — organic, painterly, ambiguous, material, irregular abstraction.
- **Vector Generative Art** — hard-edge, cut-form, stroke-based, graphic, tightly controlled abstraction.
- **Procedural Generative Art** — repetition, rhythm, field behavior, algorithmic variation, grids, flows, rule-based systems where the algorithm is itself the medium.

Procedural/vector code is allowed only when it is the chosen artistic medium.

It must never be used as a fallback because Codex cannot generate real artwork.

---

## 5. Pack Art Language

Every Pack receives one **Pack Art Language**.

It must be defined through concrete formal behavior, not vague adjectives.

### 5.1 Abstraction Profile

```text
Semantic fidelity: low / medium / high
Formal simplicity: low / medium / high
Literal representation: low / medium / high
Human recognizability: none / fragmentary / partial / clear
Spatial realism: none / distorted / partial / conventional
```

These values are descriptive constraints, not numerical scores.

### 5.2 Formal Vocabulary

What kinds of visual elements are allowed?

Possible categories include:

- hard-edged planes;
- organic forms;
- gestural marks;
- fragmented figures;
- silhouettes;
- cut forms;
- repeated modules;
- torn boundaries;
- line systems;
- color fields;
- spatial slices;
- layered transparency;
- negative-space structures.

Do not automatically use any of these. The chosen vocabulary must emerge from the Pack's behavioral concept.

### 5.3 Spatial Grammar

Define how space behaves:

- flat or depth-bearing;
- stable or unstable;
- compressed or expansive;
- fragmented or continuous;
- one viewpoint or multiple;
- centered or asymmetric;
- permitted rotation;
- permitted overlap;
- how negative space is used.

### 5.4 Tension Mechanism

Every Pack language must identify what creates visual tension.

Possible mechanisms include:

- scale difference;
- isolation;
- repetition interrupted by one element;
- crowding;
- displacement;
- collision;
- imbalance;
- compression;
- empty space;
- directional conflict;
- fragmentation;
- containment;
- separation.

The system should use only a small set of recurring tension mechanisms.

### 5.5 Color Behavior

Do not define color only as a list of hex values.

Define behavior:

- dominant field vs accents;
- high or low contrast;
- warm/cool conflict;
- limited or broad palette;
- black as structure or background;
- color repetition rules;
- whether color identifies relational roles.

### 5.6 Complexity Budget

Keep it short.

Example structure:

```text
Dominant formal systems: 1–2
Dominant forms: restrained
Secondary forms: limited
Repeated systems: max 1 main rhythm
Human fragments: only when meaningful
Literal objects: rare / prohibited / allowed
Texture systems: max 1
Decorative marks without semantic role: prohibited
```

The exact budget is Pack-specific.

### 5.7 Anti-Patterns

Define what would make this specific Pack look cheap, literal, repetitive, or off-direction.

Keep this Pack-specific list short.

---

## 6. Mission Abstraction Brief

Do not use a conventional Scene Brief. A Scene Brief tends to reconstruct literal environments.

Each Mission instead receives a compact **Abstraction Brief** that preserves both concept and subject.

```md
## Mission
<title>

## Behavioral Core
What behavioral ability is this Mission training?

## Mission Identity
What makes this Mission different from the other Missions in the same Pack?

## Primary Tension
What is the central psychological or relational tension?

## Relational Structure
Examples: one vs many / single vs paired / inside vs outside / waiting vs moving / exposure vs hiding

## Semantic Anchor
Choose 1–2 transformed visual remnants that can preserve Mission identity.
Examples: posture / screen-like plane / table plane / row rhythm / shelf rhythm / gesture / viewing direction.

## Emotional Temperature
Examples: controlled / exposed / playful / tense / awkward / defiant / calm

## Formal Translation
One short proposal for translating Mission identity + tension into visual form.

## Must Preserve
- Mission-specific semantic anchor
- essential conceptual relationship

## Do Not Literalize
- full realistic venue
- literal protagonist-in-scene composition
- obvious visual cliché
```

Keep the brief short. Its purpose is not to describe a scene. It is to prevent abstraction from erasing the Mission.

---

## 7. Semantic Intent Rule

Every major formal decision must have a role.

Before accepting an artwork, Codex should be able to explain important choices such as:

- why something repeats;
- why one element is isolated;
- why a field is oversized;
- why space is empty;
- why forms collide;
- why a body is fragmented;
- why one element breaks a rhythm.

Bad justification:

> "It makes the composition more interesting."

Better justification:

> "The repeated paired forms establish the social default; the single displaced form breaks the rhythm and carries the Mission's independence tension."

This explanation is an internal quality check. Do not require the user to review a written explanation for every artwork.

---

## 8. Anti-Slop Gate

Automatically reject imagery that falls into these patterns.

### 8.1 Lifestyle slop

Reject:

- beautiful person in a pleasant environment;
- wellness / self-care poster;
- generic journaling illustration;
- soft sunset lifestyle image;
- cinematic solo traveler;
- Pinterest inspirational composition.

### 8.2 Literal-scene slop

Reject:

- full realistic venue + protagonist;
- "a woman alone in a café";
- "a person alone in a cinema";
- "a person walking alone in a park";
- literal scenes merely covered with flat colors or abstract overlays.

### 8.3 Random-abstraction slop

Reject:

- arbitrary circles / squares / triangles;
- meaningless floating blobs;
- random line decoration;
- color patches with no relational logic;
- gratuitous grids;
- arbitrary scribbles.

Abstract art is not visual randomness.

### 8.4 Semantically empty non-objective abstraction

Reject purely non-objective abstraction when it removes the Mission-specific subject and leaves only a generic conceptual metaphor.

Typical failure patterns:

- one line escaping a grid;
- one dot separated from many dots;
- one shape breaking a repeating pattern;
- a path through a field;
- generic rupture / deviation / isolation imagery;

when those devices could represent many unrelated Missions equally well.

Pure non-objective abstraction is allowed only when the Mission-specific identity remains unusually strong through a distinct formal mechanism.

It must not be the default solution.

Prefer, when useful:

- representational abstraction;
- abstract figuration;
- fragmented representation;
- transformed semantic remnants;
- partially recognizable spatial/object structures.

## 8.4 Fake-art texture

Reject texture used only as taste camouflage:

- excessive grain;
- paper texture;
- film noise;
- fake screen-print defects;
- halftone everywhere;
- faux paint;
- distressed edges;

unless that material behavior is genuinely part of the Pack Art Language.

### 8.5 AI polish slop

Be suspicious of:

- cinematic glow;
- hyper-detailed rendering;
- perfect staged lighting;
- overfinished surfaces;
- fake depth-of-field;
- glossy concept-art polish.

Higher rendering fidelity does not equal higher artistic quality.

### 8.6 Artist cosplay

Do not solve art direction by prompting "in the style of [famous artist]" or equivalent imitation shortcuts.

Use art movements, formal principles, and visual grammar rather than artist impersonation.

---

## 9. Workflow: Only 3 Runs / 2 Gates

There are exactly three user-facing Codex runs for establishing the first Pack.

```text
RUN 1 — ART LANGUAGE SEARCH
        ↓
GATE 1 — user chooses one direction
        ↓
RUN 2 — COLLECTION PROOF
        ↓
GATE 2 — user approves collection quality
        ↓
RUN 3 — PRODUCTION
```

Do not create extra user-facing phases.

Internal exploration, candidate rejection, regeneration, comparison, and technical checking happen inside the run.

The user should not have to push Codex through internal steps.

---

## 10. RUN 1 — ART LANGUAGE SEARCH

### Goal

Find the correct abstract-art language for the Pack.

### Codex executes all of this internally

1. Read the complete Pack content.
2. Identify behavioral theme, recurring tensions, recurring relational structures, emotional territory, and visual clichés to avoid.
3. Select one real Mission as a **Direction Anchor**.
4. Create one Abstraction Brief for that Mission, including 1–2 Mission-specific Semantic Anchors.
5. Propose **3 genuinely different abstract-art languages**.
6. For each direction define only:
   - Abstraction Profile;
   - Formal Vocabulary;
   - Spatial Grammar;
   - Tension Mechanism;
   - Color Behavior;
   - likely Rendering Mode.
7. Generate one finished direction study for the same Direction Anchor in each language. Each study must preserve Mission identity through at least one Semantic Anchor while abstracting it differently.
8. Curate internally.
9. Reject obvious slop before showing anything.
10. Show the user the 3 direction studies side-by-side.

### Critical rule

The three directions must differ in **formal grammar**, not just palette, texture, degree of detail, or prompt wording.

Do not stop before the 3 visual directions are ready.

Do not show raw candidate dumps.

Do not accept a direction merely because it is abstract. A direction that erases the Mission subject fails RUN 1 even if the image is visually polished.

Do not generate a large Style Bible yet.

---

## 11. GATE 1 — CHOOSE THE ART LANGUAGE

The user makes one decision:

> Which abstract-art language should this Pack use?

The user may reject all three.

If one direction is selected:

- create a provisional Pack Art Language from that direction;
- treat the selected image as the first visual style reference;
- continue to RUN 2.

If all are rejected:

- remain inside RUN 1;
- create three materially different directions;
- do not add process complexity.

---

## 12. RUN 2 — COLLECTION PROOF

### Goal

Prove that the selected abstract-art language can create a coherent but non-repetitive collection.

### Scope

Create **5 additional Mission artworks**.

The selected RUN 1 direction study may be refined into production quality and becomes part of the proof set.

Final proof set:

> **6 artworks total**

This is enough to test a Pack without wasting generation budget on a near-complete collection before validation.

### Mission selection

Codex chooses five Missions that maximize variation in:

- behavioral relation;
- social exposure;
- duration;
- public/private spatial expectation;
- group expectation;
- activity type;
- conceptual difficulty.

Do not choose five Missions merely because they are easy to visualize.

### Codex executes internally

For each selected Mission:

1. create an Abstraction Brief;
2. generate candidates;
3. curate internally;
4. reject literal-scene slop;
5. reject random abstraction;
6. reject compositions that copy the reference;
7. revise only when needed.

Then evaluate the six-work collection for:

- art-language consistency;
- Mission distinctness;
- semantic traceability;
- composition diversity;
- anti-template behavior;
- anti-slop quality;
- real product fit.

Codex shows only the curated six-work set.

Do not stop after each Mission.

---

## 13. GATE 2 — APPROVE THE COLLECTION

The user only answers the equivalent of:

> Does this feel like a real art collection I want the rest of the Pack to belong to?

The user does not need to score a rubric.

The set passes when:

- the art language is clearly coherent;
- works are not compositional clones;
- abstraction feels intentional;
- no obvious generic AI aesthetic appears;
- individual cards have collectible value;
- the whole set feels appropriate for TODAYSMISSION.

After approval:

1. lock the Pack Art Language;
2. lock the 6-image Reference Set;
3. finalize a concise Pack Art Spec;
4. enter RUN 3.

The user does not need a third approval gate.

---

## 14. Pack Art Spec

After Gate 2, save a concise Pack-level art specification.

Suggested file:

```text
docs/design/packs/<pack-slug>/ART_DIRECTION.md
```

It should contain only:

1. Pack concept in 2–4 sentences.
2. Abstraction Profile.
3. Formal Vocabulary.
4. Spatial Grammar.
5. Tension Mechanism.
6. Color Behavior.
7. Complexity Budget.
8. Anti-Patterns.
9. Rendering Mode.
10. Reference Set paths.
11. 3–5 short examples of successful formal logic.

Do not write an art-history essay.

Do not add implementation architecture.

The Reference Set is part of the specification. The text file alone is not considered sufficient style reference.

---

## 15. RUN 3 — PRODUCTION

### Goal

Produce the remaining public Mission Artwork Cards and the Pack Cover.

Codex completes the run without per-card user approval.

### For each remaining Mission

1. create a compact Abstraction Brief;
2. use the locked Pack Art Spec;
3. use the approved visual Reference Set;
4. generate candidates;
5. internally curate;
6. perform targeted revision if needed;
7. check against the collection.

### Reference behavior

Approved references communicate:

- shape language;
- edge behavior;
- color logic;
- visual rhythm;
- mark-making;
- abstraction level;
- overall artistic finish.

They must **not** force:

- identical composition;
- same subject placement;
- same dominant form arrangement;
- same negative-space pattern.

If new images repeatedly copy a reference composition, style conditioning is leaking content.

Correct the generation approach rather than accepting template repetition.

---

## 16. Pack Cover

The Pack Cover is created in RUN 3.

It uses the same Pack Art Language but represents the Pack as a whole.

It should express:

- the central behavioral conflict;
- the Pack's emotional territory;
- the collection's visual grammar.

It must not be:

- a collage of Mission images;
- a literal summary scene;
- one Mission artwork with a larger title;
- unrelated branding art.

Pack Cover design remains independent from the reusable Mission Text Card template.

---

## 17. Current Pack: Doing Things Alone

For the current first Pack, **Doing Things Alone**, the behavioral core is not:

- loneliness;
- self-love;
- enjoying solitude;
- rejecting companionship;
- becoming an introvert;
- becoming an extrovert.

The core is:

> **desired action should no longer depend on whether someone else comes with you.**

Its recurring conceptual relationships include:

- individual vs paired/grouped structures;
- action vs waiting;
- movement vs delay;
- exposure vs hiding;
- singular rhythm vs social rhythm;
- self-directed choice vs companion dependency;
- entering spaces with high companion expectation.

Do not treat these as mandatory visual motifs. They are semantic material from which an art language may be developed.

Do not default to:

- lone person in café;
- lone person in cinema;
- lone person on bench;
- lone person walking in city;
- soft healing imagery.

---

## 18. Hidden Final Mission

Do not generate the hidden Final Mission during initial collection proof.

The public Mission art system should become stable first.

Once public production succeeds, the Final Mission may be generated at the end of RUN 3 if explicitly requested, or later as a special artwork.

Do not create an extra mandatory workflow phase solely for it.

---

## 19. Product Validation

Artwork is not approved only because it looks good at full resolution.

Codex must validate internally:

- real card aspect ratio;
- actual crop;
- mobile-size clarity;
- down/reveal interaction;
- image asset weight;
- Safari/mobile suitability.

This validation is internal. Do not create an additional user Gate.

Do not redesign the current interaction system to rescue artwork that does not fit.

---

## 20. Rendering Rules

### Native generation first

Use the available image-generation capability first.

Do not install external diffusion/vector pipelines merely because they exist.

External projects are research references, not default dependencies.

### Escalation only after demonstrated failure

If the native generation workflow repeatedly fails:

- **Style inconsistency:** consider stronger reference-conditioning or style-alignment methods.
- **Composition leakage:** reduce reference influence or use style/content disentanglement approaches.
- **Vector-native art language:** consider vector-first generation / SVG tools.
- **Algorithmic art language:** consider a procedural generator.

Do not escalate the technical stack without a concrete repeated failure.

---

## 21. Procedural / Vector Safety Rule

Code-generated abstract art can be valid, but it must pass a high bar.

Valid:

> The chosen Pack art language is fundamentally based on algorithmic rhythm, rule-based fields, deterministic geometry, or vector/stroke systems.

Invalid:

> Codex cannot make the image, so it draws circles and rectangles in HTML/SVG as a substitute.

If procedural/vector art is chosen:

- the generator itself is part of the artwork medium;
- the rules must derive from Pack meaning;
- outputs must be curated as art;
- random parameter variation alone is not artistic direction.

---

## 22. Consistency Without Homogeneity

A successful Pack should feel like:

> one artist / one exhibition / one body of work

not:

> one template with sixteen reskins.

Keep stable:

- grammar;
- abstraction profile;
- material behavior;
- complexity;
- visual logic.

Allow variation in:

- composition;
- scale;
- rhythm;
- dominant relation;
- density;
- negative space;
- directionality;
- focal behavior.

---

## 23. Lightweight Human Review

The human has only two mandatory review moments.

### Gate 1
Choose the Pack's abstract-art language.

### Gate 2
Approve that the language works as a six-work collection.

Everything else is Codex's responsibility.

Never introduce:

- per-Mission approval;
- per-candidate approval;
- separate Abstraction-Brief approval;
- separate color approval;
- separate composition approval;
- separate technical-QA approval;

unless the user explicitly asks for it.

---

## 24. Failure Policy

### One bad artwork

Fix that artwork internally. Do not rewrite the system.

### Several artworks fail in the same way

Change the smallest relevant Pack Art Spec rule. Do not create a new workflow layer.

### Whole collection feels wrong

Return to the art language choice. Do not try to repair a fundamentally wrong direction with more prompting.

### AI requires constant human cleanup

The AI production method has failed. Do not conceal this by increasing process complexity.

Possible fallback paths:

- AI concept + human finishing;
- stronger style-reference conditioning;
- vector-native workflow;
- procedural art system;
- external illustrator.

---

## 25. Anti-Complexity Rule

This rule overrides optimization instincts:

> **Internal rigor must not become user-facing bureaucracy.**

Codex may internally:

- analyze;
- generate;
- reject;
- compare;
- regenerate;
- validate.

But Codex must not turn those actions into separate user phases.

Prefer:

```text
RUN → curated visual result → human Gate
```

not:

```text
analysis → approval
brief → approval
style → approval
palette → approval
candidate → approval
revision → approval
technical test → approval
```

---

## 26. Final Success Condition

The system succeeds when all three statements are true:

### Artistic
The Pack feels like a coherent body of abstract art rather than AI illustration output.

### Semantic
Each artwork has an intentional formal relationship to its Mission, preserves a Mission-specific semantic subject or anchor, and avoids literal scene depiction.

### Operational
The user chooses the art language once, approves the collection once, and Codex produces the rest.

The target experience is:

> **"I chose the exhibition. I approved the collection. The Pack was produced."**


---

## 27. RUN 4 — MISSION UI TEMPLATE + PAGE BACKGROUND

### Goal

After the Pack artwork production is complete, create the Pack's reusable **Mission Text Card template family** and **one code-native Mission page background**.

This Run inherits the already-approved Pack art language.

Do not invent a second visual direction.

The UI must feel like it belongs to the same Pack as the completed artwork collection, while remaining quieter, clearer, and more readable than the Artwork Cards.

### Source of visual truth

Style consistency must not depend on conversation memory.

Use:

1. the locked `ART_DIRECTION.md`;
2. the completed approved Mission Artwork Cards;
3. the approved Pack Cover.

Treat `ART_DIRECTION.md` as the written grammar and the completed images as the visual reference set.

The completed artwork collection is a **style reference**, not a layout template.

Do not copy one Artwork composition into the Mission Text Card or page background.

---

## 28. Mission Text Card Content

The Mission Text Card contains exactly three information levels:

1. **Mission Title**
2. **Mission Instruction**
3. **Pack Name**

Do not add:

- Mission number;
- difficulty;
- duration;
- tags;
- progress;
- status;
- decorative metadata.

The Mission Instruction must receive enough flexible space for real Pack content.

Readability is mandatory.

However, readability must not be achieved by placing the instruction inside a generic box, sticker, label, panel, or card-within-card.

The text must feel integrated into the composition itself.

---

## 29. Template Family

Do not create one frozen card repeated for every Mission.

Do not create a separate bespoke component for every Mission.

Create:

> **one shared code-native template system with 3–5 controlled visual variants**

The variants may differ in restrained ways such as:

- dominant palette role;
- edge or framing behavior;
- distribution of negative space;
- structural geometry;
- title placement within the same overall typographic system.

The variants must still feel unmistakably like one family.

### Keep stable

- card dimensions;
- information hierarchy;
- typography system;
- Pack-name behavior;
- Mission Instruction readability;
- overall Pack art grammar.

### Allow variation

- dominant color role;
- composition of non-text structural areas;
- edge cuts;
- balance;
- negative space;
- restrained title layout differences.

Do not use runtime randomness.

A Mission should receive a stable variant.

---

## 30. Color Behavior

Do not hardcode a universal TODAYSMISSION palette.

Derive color behavior from the approved Pack artwork collection.

If the Pack uses multiple meaningful colors, allow those colors to take different dominant roles across the template variants so the Mission stream does not feel visually dead.

Do not force every Mission Text Card to be dominated by one color.

Do not introduce unrelated colors merely for variety.

Preserve the color roles established by the approved artwork language.

Readability outranks variation.

---

## 31. Art → UI Translation

The Mission Text Card is not a simplified Artwork Card.

Translate the Pack's art grammar into interface form.

Internally extract from the approved artwork collection:

- palette behavior;
- edge behavior;
- shape vocabulary;
- negative-space logic;
- spatial rhythm;
- asymmetry;
- density;
- tension;
- texture/material behavior.

Then reduce their intensity for UI.

The intended hierarchy is:

```text
Artwork Card       = highest visual density
Mission Text Card  = medium visual density
Page Background    = lowest visual density
```

The completion experience should still feel like:

> **information → artwork**

not:

> artwork-lite → artwork

---

## 32. Page Background

Create **one** Mission page background for the Pack.

The background is not an image.

It must be code-native.

Prefer:

- CSS;
- pseudo-elements;
- gradients only when genuinely supported by the Pack art language;
- `clip-path`;
- simple inline SVG only if the Pack's visual grammar genuinely requires vector geometry.

Do not generate a raster background.

Do not use an Artwork Card as wallpaper.

Do not create several background variants.

The single background must work with every Mission Text Card variant.

### Background behavior

The background should:

- inherit the Pack's art grammar;
- remain significantly quieter than the cards;
- preserve a calm area around the active Mission card;
- maintain clear separation from light and dark card variants;
- avoid high-contrast structure behind important text or controls;
- behave reasonably on both mobile and desktop.

The background should feel like the **environment of the collection**, not another artwork competing with it.

---

## 33. Code-Native Requirement

Mission Text Card templates and the page background must **not** be image assets.

Use live HTML/CSS and the project's existing frontend stack.

Text must remain real text.

Do not use image generation for RUN 4.

Do not flatten the template into SVG artwork containing text.

Simple inline SVG may only be used for reusable non-text structural geometry when justified by the Pack art language.

---

## 34. Simple Visual Preview

RUN 4 is a **visual proof**, not production integration.

Create only a lightweight isolated preview.

The preview should:

- be simple;
- use real Mission content;
- show the 3–5 template variants;
- use the one shared page background;
- include at least one short Mission and one long Mission;
- include the hidden/final Mission if it exists;
- be viewable at a representative mobile and desktop size.

Prefer one isolated HTML/CSS page or the lightest equivalent preview in the current frontend environment.

Do not:

- integrate backend data;
- modify database schema;
- refactor the production Mission flow;
- wire completed artwork into production;
- run repository-wide redesign work;
- build a large design system;
- create extra approval stages.

The purpose is only:

> **Can this code-native Mission template family and one background convincingly belong to the same art world as the approved Pack artwork collection?**

---

## 35. RUN 4 Execution

Codex performs internally:

1. read the locked `ART_DIRECTION.md`;
2. inspect the completed approved artwork reference set and Pack Cover;
3. read the Pack Mission content;
4. derive the quieter UI translation;
5. create 3–5 code-native Mission Text Card variants;
6. create one code-native page background;
7. assemble one lightweight preview page;
8. internally reject generic SaaS styling, card-within-card text boxes, unreadable compositions, and visual directions that drift away from the artwork;
9. present the finished preview.

Do not stop for intermediate approvals.

Do not show raw experiments.

Do not proceed into production integration.

Stop after the preview is ready for user review.

---

## 36. RUN 4 Anti-Patterns

Reject:

- Mission Instruction inside a generic framed box or sticker;
- generic SaaS cards;
- glassmorphism used without support from the Pack art language;
- arbitrary gradients;
- random decorative geometry;
- one identical card recolored repeatedly;
- unrelated color additions;
- artwork pasted behind body text;
- page background that competes with the card;
- raster background images;
- generated template images;
- one custom component per Mission;
- production refactors during visual proof.

---

## 37. RUN 4 Success Condition

RUN 4 succeeds when:

### Visual
The template family clearly belongs to the same Pack art world as the completed artworks.

### Variety
The card variants are different enough to avoid monotony while remaining one coherent family.

### Readability
Mission Title, Mission Instruction, and Pack Name remain clear, with enough space for real content.

### Background
One shared code-native background supports all variants without competing with them.

### Operational
The result is shown through one lightweight preview and does not require backend integration or production refactoring.

The target is:

> **approved Pack art language → code-native Mission template family + one shared background → simple visual proof**
