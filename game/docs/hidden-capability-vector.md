# Minimal hidden capability vector contract

## Status and scope

This document is a docs-only technical specification for `game/`. It defines the minimum hidden capability-vector contract needed by a future, separately authorized code slice. It refines [the technical architecture](./architecture.md), [the first playable vertical-slice specification](./vertical-slice-spec.md), [the runtime SimState ownership and persistence boundary](./sim-state-boundary.md), and [the minimal company resource state contract](./company-resource-state.md). It does not replace the mechanism meanings in `content/`; those meanings remain sourced from the relevant AI-training, data, evaluation, company-operations, and progression nodes under `content/`.

Phase 1I implements no TypeScript and creates no public symbol. It approves only the future contract recorded below. Any future code phase still requires independent authorization, implementation, and review. This specification does not mean that any later code, checkpoint, persistence, projection, application, or UI phase has been approved, implemented, published, or sealed.

The terms **must**, **must not**, and **is** in this document are normative only for a future independently authorized implementation of this contract. No initial value, delta, formula, threshold, probability, difficulty setting, or balance value is defined here.

## Existing sealed boundaries

Phases 1D through 1H remain sealed and are neither modified nor re-reviewed by this specification.

In particular:

- The seeded RNG and deterministic event queue remain unchanged, including the `dueDay` → `priority` → `sequenceId` ordering contract.
- The Phase 1E persistence surface remains unchanged. `SAVE_SCHEMA_VERSION` remains `1`, and `SimKernelState` continues to contain exactly `currentDay`, `rngState`, and `eventQueue`.
- The runtime ownership boundary remains unchanged: authoritative domain state belongs to `sim/`; persistence may adapt complete domain state only in a separately approved future persistence phase.
- `CompanyResourceState` remains exactly the Phase 1G/1H resource slice. `HiddenCapabilityVector` is not added to it.
- No top-level `SimState`, complete runtime composition, checkpoint state, or full-state persistence shape is approved here.

## Why capability state precedes checkpoint state

A checkpoint must eventually be able to own model capability without reducing it to a single true score. Defining the minimal value object first isolates the exact dimensions, numeric invariants, visibility boundary, and construction requirements from checkpoint identity, references, collections, lifecycle, training, evaluation, release, and rollback rules.

This dependency order does not approve checkpoint work. Phase 1I defines no `CheckpointState`, `CheckpointId`, `CheckpointReference`, checkpoint collection, current-checkpoint pointer, or checkpoint lifecycle. Those concepts require separate contract decisions.

## Approved future public contract

The following exact TypeScript surface is approved as a documentary target for a future independent code phase:

```ts
export interface HiddenCapabilityVectorInput {
  readonly coding: number
  readonly mathReasoning: number
  readonly writing: number
  readonly dialogue: number
  readonly hallucinationResistance: number
  readonly selfCorrection: number
}

export interface HiddenCapabilityVector
  extends HiddenCapabilityVectorInput {}

export function createHiddenCapabilityVector(
  input: HiddenCapabilityVectorInput,
): HiddenCapabilityVector
```

The surface contains exactly these three symbols, without additions, removals, renames, aliases, or wrappers. Phase 1I creates none of them. Only after a separate code phase is authorized and implemented may all three symbols be exported from `game/src/sim/index.ts`.

These symbols are a `sim/`-layer contract for authoritative hidden state. They are not player-visible data, and UI must not read `HiddenCapabilityVector` directly.

The contract does not approve a dimension-ID constant, arbitrary string dimension, dynamic map, tuple-entry registry, metadata, version, kind, ID, tags, `Record<string, unknown>`, extension bag, generic validator, or parser.

## Dimension semantics

The vector contains exactly the following six dimensions:

| Field | Authoritative meaning |
| --- | --- |
| `coding` | Capability on coding tasks. |
| `mathReasoning` | Capability on mathematical and reasoning tasks. |
| `writing` | Capability to produce written content. |
| `dialogue` | Capability in conversational interaction. |
| `hallucinationResistance` | Resistance to an underlying tendency to hallucinate. A higher value means a lower underlying hallucination tendency. |
| `selfCorrection` | Capability to identify and correct the model's own errors. |

Each field is an authoritative true capability value used inside the simulation and is not directly observable by the player. Higher is better for every field. In particular, `hallucinationResistance` is oriented as a capability rather than a rate: increasing it decreases the underlying hallucination tendency.

A future projection may display a hallucination rate or a risk warning. Such a projection is not the authoritative `hallucinationResistance` value, and no projection is defined in Phase 1I.

The six dimensions are the minimum set for the first 2020–2022 tutorial vertical slice. They are not a claim that the full game has only six capabilities.

## Numeric representation and invariants

Every approved field must be a signed JavaScript safe integer in the inclusive range `Number.MIN_SAFE_INTEGER..Number.MAX_SAFE_INTEGER`. `Number.isSafeInteger` defines the representation boundary. `NaN`, positive or negative infinity, fractions, non-number primitives, and integers outside that closed range are invalid.

The numbers are internal capability coordinates. They are not probabilities, percentages, or UI progress-bar values. Equal numbers on different dimensions are not guaranteed to have directly comparable player-facing meaning.

This specification defines no initial value, action or event delta, training gain, degradation, formula, normalization, threshold, cap narrower than the signed safe-integer range, or mapping from architecture, data, compute, research capacity, evaluation, release, or user feedback.

## No aggregate true-capability score

The six dimensions must not be summed, averaged, weighted, normalized, or otherwise collapsed into an authoritative true `modelCapability` score. No scalar may replace the vector as the simulation's true model capability.

Public benchmarks, internal evaluations, and user feedback can only be future projections of hidden capability and other future inputs. A projection may eventually include noise, confidence, and blind spots, but Phase 1I defines none of those projection shapes or algorithms. A projection also must not be presented as direct access to the hidden vector.

## Future creation and validation boundary

If a future independent code phase authorizes `createHiddenCapabilityVector`, its factory must:

1. Accept a `HiddenCapabilityVectorInput`.
2. Require the root to contain exactly the six approved fields.
3. Accept an ordinary plain object with `Object.prototype` and a null-prototype plain object.
4. Reject arrays, class instances, and objects with any other custom prototype.
5. Inspect `Reflect.ownKeys` and own property descriptors.
6. Reject missing fields, extra fields, and symbol keys.
7. Require every approved field to be an own enumerable data property.
8. Reject accessors without invoking a getter.
9. Complete the entire root descriptor snapshot before validating any primitive field value.
10. Perform no subsequent ordinary property read from `input` after that snapshot.
11. Validate all six snapped values as signed JavaScript safe integers.
12. Leave `input` and its property descriptors unmodified.
13. Return a new root object assembled from the validated snapshot.
14. Expose the returned value through the TypeScript `readonly` public view.
15. Not freeze the returned object at runtime.
16. Not create `parseHiddenCapabilityVector`.
17. Not create a public generic validator.
18. Not connect the factory to persistence.

The future factory may use its own minimal private implementation. It must not extract or modify the Phase 1H validation implementation. No factory or validation code is implemented in Phase 1I.

## Checkpoint ownership boundary

`HiddenCapabilityVector` is a future checkpoint-owned value object. Each future checkpoint may own its own capability vector; application and UI layers must not own an authoritative vector copy.

Phase 1I does not define checkpoint state, identity, reference, lifecycle, collection, or current-checkpoint selection. It does not add capability state to `CompanyResourceState`, create a top-level `SimState`, or decide complete runtime composition.

A future scenario may provide initial capability input. This specification defines no scenario value, default, initialization API, scenario schema, or scenario composition rule.

## Projection and UI boundary

UI may consume only future projections produced across the architecture's projection boundary. It must not import, receive, retain, infer authority from, or directly read `HiddenCapabilityVector`.

Public benchmark, internal-evaluation, and user-feedback views remain future projections. Their fields, scales, noise, confidence, blind spots, aggregation, labeling, and rendering are all deferred. Phase 1I creates no projection, application behavior, or UI.

## Persistence consequences

`SAVE_SCHEMA_VERSION` remains `1`. `SimKernelState` remains exactly:

- `currentDay`
- `rngState`
- `eventQueue`

Phase 1I does not modify `SaveEnvelope` or `SimKernelState`, insert `HiddenCapabilityVector` into schema 1, create a storage adapter, create full-state serialization, create a migration, or select a future `schemaVersion`.

Complete domain persistence still requires an independent proposal and approval. It must not silently omit capability state from a purported complete save, and loading must not silently synthesize missing capability state from default values.

## Deferred decisions

The six-field set is deliberately closed for the first 2020–2022 tutorial vertical slice. The following dimensions remain outside this contract:

- world knowledge;
- science;
- multilingual capability;
- multimodal capability;
- long-horizon consistency;
- research taste;
- pragmatic inference;
- creative writing as an independent dimension;
- metacognition;
- sycophancy;
- deception;
- evaluation awareness;
- benchmark-cheating tendency;
- RSI potential;
- all other later-game capabilities.

Adding any dimension requires a separately approved contract revision. Future extensibility must not be implemented by accepting arbitrary string keys, using `Record`, using an open object, adding an extension bag or optional unknown fields, adding metadata or version fields, or creating a generic capability container.

Also deferred are checkpoint identity, references, lifecycle and collections; complete runtime composition; scenario initialization; all capability-change rules; architecture-to-capability mapping; evaluation and projection algorithms; commands and events; persistence schema design; and every initial or balance value. These are deferred decisions, not approved next-phase work.

## Non-goals

Phase 1I does not implement or approve:

- TypeScript, tests, or any public symbol;
- `CheckpointState`, checkpoint identity, reference, lifecycle, list, collection, or current checkpoint;
- training, evaluation, release, or rollback rules;
- an architecture-capability mapping matrix;
- RNG consumption or capability deltas;
- commands, actions, results, or rejections;
- event kinds, payloads, handlers, registries, scheduled-event execution, time advancement, or automatic pause;
- tutorial state, scenario initialization, or initial values;
- projections, application behavior, UI, or player-visible capability access;
- storage, full-state persistence, migration, or a `schemaVersion` change;
- costs, rewards, thresholds, probabilities, difficulty, formulas, or balance;
- Playwright, dependencies, packages, workflows, or deployment.

This phase does not modify, refactor, wrap, or re-review Phase 1D, 1E, 1F, 1G, or 1H. It does not promote discussion, chat, issue text, or temporary suggestions into a formal mechanism, and it does not plan or implement a subsequent checkpoint, command, event, scenario, projection, application, or UI phase.

## Acceptance criteria

This specification is acceptable only if:

- the sole repository change is the new `game/docs/hidden-capability-vector.md` file;
- no existing document, content node, TypeScript, test, package, lockfile, dependency, configuration, workflow, or deployment file changes;
- Phase 1I is explicitly docs-only, creates no symbol, and grants no authorization for a later implementation phase;
- the exact three-symbol future public surface and conditional `game/src/sim/index.ts` export boundary are recorded without creating them;
- the vector contains exactly the six approved signed-safe-integer dimensions, with higher values always better and no aggregate true-capability score;
- player visibility, projection, checkpoint ownership, company-resource, runtime-composition, and UI boundaries are explicit;
- the future creation boundary requires exact descriptor-snapshotted plain-object input without approving a parser, public generic validator, runtime freeze, or persistence connection;
- schema 1, `SaveEnvelope`, and the exact three-field `SimKernelState` remain unchanged;
- deferred dimensions require a separate contract revision rather than an open extension mechanism;
- no initial value, delta, rule, formula, threshold, probability, difficulty, balance, persistence change, or later phase is approved or implemented.
