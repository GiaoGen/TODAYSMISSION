# Production and QA

## Purpose

Protect artwork quality with the least process necessary. The source render is
the evidence. Written records are memory aids, not deliverables in their own
right.

Use `approved-visual-baseline.md` as the default quality precedent. Inspect the
collection together at planning time, then attach only two to four relevant
baseline Mission images to a generation call. Use the approved baseline Cover
only during Cover direction. Do not copy its character, palette, locations,
props, poses, or compositions.

## Three-batch limit

Complete all Mission Artwork in at most three production batches. For a
17-Mission Pack, use `6 / 6 / 5` unless a nearby balanced split is materially
better. Smaller Packs may use one or two batches. Planning is not a production
batch, and the Pack Cover is made afterward.

Each batch includes its first calls, pixel review, authorized second calls,
preferred selections, and one record update. A repair does not create another
batch. Batch 1 produces formal assets rather than disposable trials. Batch 3
closes only after the complete Mission set has been reviewed together and each
Mission has a preferred final asset. Escalate any remaining hold for user
art-direction judgment inside Batch 3; do not open Batch 4 or exceed the
per-image call budget automatically.

## Fast resume for an approved collection

When production already has an approved matrix and a current record:

1. read the current batch rows and existing preferred assets relevant to visual
   comparison;
2. confirm the canonical reference paths and target dimensions still exist;
3. do not reread unchanged full Pack documents, character prose, old QA files,
   or historical trials;
4. do not rewrite the matrix, reference map, README, or prior audit merely to
   mark that another batch started.

If content, character authority, dimensions, or art direction changed, reload
only the affected source before generation.

## Lean batch execution

For an approved matrix:

1. build all first-call prompts before generating;
2. save each exact prompt once;
3. issue independent first calls in parallel when safe;
4. inspect the finished batch once, at intended card size first;
5. zoom into anatomy, hands, facial boundaries, text-like marks, or texture only
   where the card-size view suggests a real problem;
6. approve visually strong images immediately;
7. use one repair call only for an approval-blocking visible defect;
8. inspect only repaired images again;
9. choose preferred assets, optionally view one contact sheet when collection
   comparison adds value, then update one production record once.

Do not repeat an unchanged review, contact sheet, or status write.

## Generation call budget

Each requested image receives one initial call. A second and final call is
allowed only for a specific visible failure that materially blocks approval.
Never make a third call or automatic comparison variants unless the user asks.

Use the second call as a repair, not a new art direction:

- regenerate structure only for wrong identity, malformed anatomy, broken
  action geometry, unusable perspective/crop, wrong or unsafe meaning, or lost
  protagonist dominance;
- use a preservation edit for a local finish or artifact problem;
- state the successful visual qualities directly in the repair prompt as
  invariants; a separate QA document is unnecessary;
- compare the original and repair as complete artworks and keep the stronger
  one. A more compliant but flatter or less atmospheric image is not an
  automatic improvement.

If the second call still has a material failure, retain the stronger version on
hold and stop. Do not spend calls polishing a defect that does not visibly harm
the intended card.

## Generation brief

One focused prompt should contain:

1. asset role, aspect ratio, dimensions, and image-only requirement;
2. each attached reference labeled by role;
3. canonical identity invariants and reference defects not to copy;
4. semantic mode and retained Mission anchor;
5. one acting verb with expression and body intention;
6. for dynamic scenes: origin, path, target, depth order, perspective, planted
   weight, limb roots, gaze, counterbalance, tail attachment, and motion-cue
   direction;
7. camera, crop, silhouette, composition, and negative-space plan;
8. palette/value hierarchy and tactile cinematic storybook finish;
9. the environmental evidence and its job;
10. a short list of observable failure modes and confusion risks.

Do not inflate prompts with repeated synonyms. Positive visual direction,
acting, and spatial decisions should outweigh negative instructions.

When identity references contain contour or texture defects, say that they
control identity but not finish. Request clean integrated matte boundaries,
species- and material-appropriate texture, motivated light, broad soft tonal
modeling, and separation by value, temperature, chroma, focus, overlap,
occlusion, depth, and negative space. Permit fine canonical facial lines and
purposeful local structure. Exclude heavy uniform outlines, sticker contours,
mechanical edge tracing, edge-following shadow bands, fuzzy halos, doubled
edges, texture spill, uniform noise, and glossy plastic 3D rendering.

When environmental detail forms one coherent subordinate setting, do not fail
it merely for exceeding a planned object count. Remove or repair detail only
when it competes with the protagonist, creates another narrative, introduces
an artifact, or confuses the Mission.

## Dynamic blocking gate

Before generating a genuinely dynamic card, make sure the prompt resolves:

- origin → path → target;
- near / middle / far order;
- camera and environmental perspective;
- planted weight, leading limb, torso, pelvis, head, gaze, and counterbalance;
- each visible paw or hand back to its own shoulder, each foot to its own hip,
  and the tail to the pelvis;
- coherent occlusion and motion trails behind movement.

Do not create a separate blocking artifact unless the action is ambiguous
enough that a simple written decision cannot resolve it.

## Art-first pixel review

Start with one question: does this feel authored, atmospheric, tactile,
character-led, memorable, and worth collecting?

Then check the visible reasons a card might fail:

- the character is wrong or no longer recognizable;
- anatomy topology, object contact, balance, or action direction is malformed;
- the semantic anchor is absent, unsafe, or reads as another Mission;
- crop, perspective, or hierarchy makes the card unusable;
- accidental text, logos, random symbols, incoherent duplicates, or obvious AI
  artifacts are present;
- a heavy or mechanical outline system, halo, texture spill, plastic rendering,
  or other finish problem visibly breaks the intended collection language;
- the environment competes with the protagonist or creates an unrelated story.

Inspect at the intended card size first because that is the product experience.
Use 100% inspection to confirm a suspected issue, not as a search for invisible
reasons to reject an otherwise excellent image. Fine eye definition, canonical
facial marks, natural light edges, local structural accents, and tiny edge
variation are not failures when they integrate at card size.

### Severity

- **Approve:** the complete artwork is strong and no visible issue materially
  lowers product quality.
- **Repair:** one visible structural or finish problem blocks approval and can
  be corrected within the final call while preserving the image's strengths.
- **Hold:** a material problem remains after the call budget, or choosing a
  direction requires the user's art-direction judgment.

Do not create a “soft hold” category for coherent variation. Make the art
direction decision: accept it, repair a real problem, or hold it for a concrete
reason.

## Repair rules

For a local finish repair, pass the original image as the edit target and say
exactly what region may change. Preserve identity, facial structure,
expression, pose, anatomy, action, camera, crop, composition, perspective,
palette, props, lighting, atmosphere, environmental geometry, and tactile
modeling.

For structural regeneration, restate the corrected blocking and every approved
strength that must survive. Do not disguise bad structure with texture, motion
lines, cropping, or cosmetic inpainting.

After repair, review the entire image once for drift. Select the revision only
if it is at least as strong holistically and the approval-blocking issue is
actually resolved.

## Collection review

Collection review exists to improve the set, not to produce paperwork. Use the
preferred assets directly or one contact sheet when it materially helps judge:

- repeated pose, camera, crop, layout, or emotion grammar;
- deliberate rhythm across direct, associative, and free treatments;
- range beyond fear and generic happiness;
- adequate semantic coverage of the Pack's major training clusters;
- structural palette variation rather than background swaps;
- stable character identity across viewpoints and acting;
- absence of visible typography and collection-level AI repetition.

Do not write a standalone batch audit when the set passes and the production
record can carry the result in one line. Write a focused note only for a real
unresolved collection issue. The final 17-Mission review may have one concise
audit because it directly informs the Pack Cover.

## Minimal production record

At batch completion, update one record once. Keep only:

- Mission or Pack ID;
- revision and generation-call count;
- exact prompt path for each call;
- preferred asset path and dimensions;
- status: approved or hold;
- for a retry or hold only, one concise visible failure and before/after result;
- any unresolved limitation that affects future art direction.

Do not create standalone QA files for passing images. Do not create separate
v1/v2 QA essays. Do not repeat the same conclusion in a batch audit, manifest,
README, matrix status line, and event history. Do not create evidence crops or
annotated screenshots unless a subtle issue needs user adjudication or a local
repair target cannot be understood from the source render.

The exact prompt and source/revised images are sufficient repair evidence.
Approved files are never overwritten silently. Pack Cover production remains
locked until all Mission Artwork is stable and the collection has passed its
visual review.

## Lean delivery layout

Default to one canonical delivery tree:

```text
production/
  mission-artwork/          # one preferred final image per Mission
  cover/                    # one preferred final Cover
  prompts/
    batch-01.md
    batch-02.md
    batch-03.md
    cover.md
  production-record.md      # matrix, status, call count, preferred path, brief repair note
  collection-sheet.png      # optional final overview only
```

Keep discarded generations and temporary contact sheets in working storage;
do not duplicate them into delivery folders. Do not create per-Mission QA
documents, README status histories, batch continuation/audit files, evidence
crops, event logs, parallel `numbered` and `final-numbered` trees, or ZIP
archives unless the user explicitly requests them.
