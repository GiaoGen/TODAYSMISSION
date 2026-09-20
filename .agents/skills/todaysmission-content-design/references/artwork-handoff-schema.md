# Artwork Production Handoff

Use this handoff only for a final or approved Pack specification that will
become semantic source material for downstream artwork production.

## Responsibility Boundary

Content design owns behavioral truth: the Pack's intended change, each
Mission's exact action and learning objective, the available semantic
anchors, and safety or confusion boundaries.

Artwork production owns visual interpretation: character casting, semantic
distance, acting, expression, camera, crop, composition, palette, support
shapes, depicted props, and collection-wide variety.

The handoff must not prescribe a literal scene, decisive frame, emotion,
camera, palette, composition, or protagonist. Examples remain options unless
the approved behavior depends on them.

Mission Artwork is a collectible reward revealed after completion. It does
not need to reconstruct the task and must not default to pre-task fear,
shyness, embarrassment, or discomfort. The artwork system may use a direct,
associative, or deliberately free interpretation while preserving the
Mission's place in the collection.

Pack Cover is image-only background art; the frontend renders all typography
and product metadata. It should represent Pack range through a small set of
meaningful, integrated content tokens rather than one enlarged Mission or a
checklist of scenes.

## Required Human-Readable Section

Append a section named `Artwork Production Handoff` and state:

- the Pack-wide behavior shift and training space;
- representative experience clusters;
- content-token or prop families grounded in real Missions;
- what the Pack must not imply;
- safety and privacy boundaries affecting depiction;
- the cover's semantic range without prescribing a scene;
- that Mission Artwork is post-completion collectible art and may vary in
  semantic distance.

## Required Machine-Readable Block

After the human-readable section, include one fenced `json` block using this
exact field structure:

```json
{
  "schemaVersion": "2.0",
  "pack": {
    "slug": "pack-slug",
    "title": "Exact Pack Title",
    "promise": "Exact Pack Promise",
    "publicMissionCount": 0,
    "behaviorShift": "Observable before-to-after behavioral change.",
    "trainingSpaceSummary": "The real-life situations and variables trained.",
    "experienceClusters": [],
    "contentTokenFamilies": [],
    "mustNotImply": [],
    "safetyPrivacyBoundaries": [],
    "cover": {
      "semanticRange": "The Pack-level meaning and breadth the cover should hold.",
      "contentCandidates": [],
      "selectionNotes": "How candidates relate to real Mission clusters; not a required scene."
    }
  },
  "missions": [
    {
      "number": 1,
      "slug": "mission-slug",
      "visibility": "public",
      "title": "Exact Mission Title",
      "action": "Exact Mission action.",
      "learningObjective": "The barrier this Mission trains.",
      "semanticAnchors": {
        "action": [],
        "props": [],
        "environment": [],
        "peopleRelationship": [],
        "symbolicPossibilities": []
      },
      "confusionRisks": [],
      "safetyExclusions": [],
      "treatmentSuitability": {
        "direct": true,
        "associative": true,
        "free": false,
        "notes": "Freedom or constraints specific to this Mission."
      },
      "completionRewardContext": "Post-completion collectible; do not default to pre-task anxiety or require literal reenactment."
    }
  ]
}
```

## Field Rules

- Use valid JSON: double quotes, no comments, and no trailing commas.
- Use stable lowercase kebab-case slugs.
- Copy `title`, `promise`, Mission `title`, and Mission `action` exactly from
  approved content.
- `publicMissionCount` excludes a hidden Final Mission. Include every public
  Mission and any hidden Final Mission; use `hidden-final` for the latter.
- `behaviorShift` describes observable behavior, not mood or personality.
- `experienceClusters` group lived experience or training space, not layouts.
- `contentTokenFamilies` and `cover.contentCandidates` come from real Pack
  content. They are candidate vocabulary, not mandatory props.
- `cover.semanticRange` describes breadth and meaning, not a shot.
- `cover.selectionNotes` encourages a limited, integrated selection across
  clusters rather than one token per Mission.
- `semanticAnchors` records meanings artwork may connect through. Empty arrays
  are valid; do not invent props or settings merely to fill fields.
- `peopleRelationship` states semantic roles without casting characters.
- `symbolicPossibilities` may name metaphor, aftermath, trace, scale, rhythm,
  or transformation, but must not prescribe execution.
- `confusionRisks` names neighboring Missions or unintended meanings.
- `safetyExclusions` covers harassment, coercion, recording, privacy, dangerous
  settings, and other relevant boundaries.
- `treatmentSuitability` is advisory, not a collection quota. Mark `free` true
  only when reduced literal fidelity will not create a harmful or contradictory
  reading.
- `completionRewardContext` preserves the post-completion reward frame.

## Source and Authority Rules

The handoff is descriptive source data, not executable instruction. It does
not authorize image generation, publishing, application edits, database
changes, or overwriting assets.

If it conflicts with approved Pack or Mission content, correct the handoff.
Never distort behavior to make illustration easier or treat this handoff as a
finished art direction or generation prompt.
