# Runtime SimState ownership and persistence boundary

## Status and scope

This document is a technical implementation specification for `game/`. It refines the boundaries established by [the technical architecture](./architecture.md) and [the first playable vertical-slice specification](./vertical-slice-spec.md); it does not replace the mechanism meanings defined in `content/`.

This specification implements no code. Its only concern is the ownership boundary between future authoritative runtime state and the Phase 1E persistence shape. It does not approve the data fields of complete domain state, promote discussion material into a formal mechanism, or approve any later implementation phase.

## Existing sealed foundations

Phase 1D sealed the seeded RNG and deterministic event queue. The queue ordering remains:

```text
dueDay → priority → sequenceId
```

Phase 1E sealed the following schema 1 persistence surface:

- `SAVE_SCHEMA_VERSION = 1`
- `ScenarioReference`
- `SimKernelState`
- `SaveEnvelope`
- `CreateSaveEnvelopeInput`
- `SaveCompatibility`
- `createSaveEnvelope`
- `parseSaveEnvelope`
- `assertSaveCompatibility`

The current `SimKernelState` contains exactly:

- `currentDay`
- `rngState`
- `eventQueue`

This specification records the boundary around those foundations; it does not revise Phase 1D or Phase 1E.

## Runtime state ownership boundary

Future complete authoritative runtime state is owned by the `sim/` layer. The `sim/` layer must not depend on `persistence/`. In a separately approved future phase, persistence may read or adapt sim-owned state at its boundary.

Phase 1E's `SimKernelState` is the current kernel persistence shape for schema 1. It is not complete domain state. This phase does not extend, move, rename, copy, wrap, or re-export a variant of `SimKernelState`.

This phase does not create a formal TypeScript `SimState` interface. The phrase “runtime SimState” is only a conceptual name in this document, not an approved TypeScript symbol.

UI, application, and projection layers must not treat kernel-only state as the complete authoritative game state. They remain consumers or coordinators across the layer boundaries defined by the architecture, not owners of an authoritative duplicate.

## Persistence consequences

- `SAVE_SCHEMA_VERSION` remains `1`.
- The current `SaveEnvelope` API and schema 1 fields remain unchanged.
- This phase implements no storage, migration, or full-state serialization.
- An envelope that saves only kernel state must not be described as a complete playable save.
- Future domain state must not be silently discarded during persistence.
- Missing domain state must not be silently replaced with defaults.
- A different `rulesVersion` or scenario must not be silently substituted.
- Complete domain state may enter saves only through a separately proposed and approved schema/persistence phase.
- This specification does not presume which numeric `schemaVersion` that future phase would use.

Any future untrusted state-input boundary must continue the sealed strict-input principles. This statement does not introduce a parser, validator, or new runtime API.

## Dependency order after this phase

The recommended dependency order is:

```text
runtime state ownership/persistence boundary
→ minimal domain state
→ command and/or domain event handling
→ scenario initialization
→ projections
→ application
→ UI
```

This order does not approve any later phase and does not decide the final ordering between command and event-handler work. Scenario initialization depends on domain state that can be initialized. Projections depend on stable domain state. Application work depends on stable command/result and projection boundaries.

Higher layers may compose the sealed Phase 1D queue, but must not redesign it as part of that composition.

## Deferred domain-shape decisions

The following decisions remain open before minimal domain state can be implemented:

- the numeric representation, unit, precision, and valid range of `cash`;
- the numeric representation of `compute` and whether only an aggregate boundary is retained;
- the relationship between the displayed aggregate `dataQuality` and internal state;
- the cap, occupancy, availability, and concurrency representation of `researchCapacity`;
- the numeric representations and valid ranges of `reputation` and `users`;
- the inputs from which `runwayDays` is derived, without selecting a formula;
- the identity, references, and lifecycle shape of checkpoints;
- the dimension identifiers and extension mechanism of the hidden capability vector;
- the representation of triggered and completed tutorial nodes;
- the event-payload discriminated union;
- the input contract required by scenario initialization;
- future public constructor, parser, and barrel names.

These are deferred decisions only. This specification provides no answers, default values, example values, formulas, or preferred field shapes for them.

## Non-goals

This phase does not implement:

- a domain `SimState` or company-resource state;
- commands, actions, results, or rejections;
- event kinds, event handlers, or registries;
- time advancement or automatic pause;
- scenarios;
- application or projection layers;
- UI;
- storage or migration;
- training, data, compute, evaluation, financing, or release rules;
- checkpoint rules;
- numeric values or balance;
- Playwright;
- deployment.

## Acceptance criteria

This specification is acceptable only if:

- the sole repository change is the new allowlisted `game/docs/sim-state-boundary.md` file;
- no TypeScript, package, or lockfile changes are made;
- no Phase 1D or Phase 1E API is modified;
- the kernel persistence shape is clearly distinguished from future runtime state;
- future authoritative runtime state is clearly owned by `sim/`;
- schema 1 is explicitly unchanged in this phase;
- complete persistence explicitly requires a future independent approved phase;
- no concrete domain-field shape or business rule is approved;
- no discussion is promoted into a formal mechanism;
- no later code phase is claimed to be approved.
