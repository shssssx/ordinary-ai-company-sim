# Minimal company resource state contract

## Status and scope

This document is a docs-only technical specification for `game/`. It defines the minimum authoritative company-resource state contract needed by a future, separately authorized code slice. It refines [the technical architecture](./architecture.md), [the first playable vertical-slice specification](./vertical-slice-spec.md), and [the runtime SimState ownership and persistence boundary](./sim-state-boundary.md). It does not replace the mechanism meanings in `content/`; those meanings remain sourced from the relevant company-operations, AI-training, evaluation, and progression nodes under `content/`.

Phase 1G implements no TypeScript and creates none of the public symbols named below. It approves only their future names, shapes, numeric representations, invariants, and creation boundary. The next code phase remains independent and requires separate authorization; it is not implemented or otherwise approved by this specification.

The terms **must**, **must not**, and **is** in this document are normative for that future code slice. No initial values, costs, income, thresholds, difficulty settings, or balance values are defined here.

## Existing sealed boundaries

Phases 0 through 1F remain sealed. This specification does not revise any existing code, interface, or specification.

In particular:

- The Phase 1D seeded RNG and event queue remain unchanged, including the `dueDay` → `priority` → `sequenceId` ordering contract.
- The Phase 1E persistence API remains unchanged. `SAVE_SCHEMA_VERSION` remains `1`, and `SimKernelState` continues to contain exactly `currentDay`, `rngState`, and `eventQueue`.
- The ownership and persistence separation established by [the Phase 1F boundary](./sim-state-boundary.md) remains in force: authoritative runtime domain state belongs to `sim/`, while persistence may adapt it only in a separately approved future persistence phase.
- This specification does not modify, extend, wrap, move, rename, or re-export a variant of persistence-owned `SimKernelState`.

## Why this is a resource slice, not complete SimState

[The vertical-slice specification](./vertical-slice-spec.md) requires the game state to represent company resources, but a complete playable state must also eventually compose time, deterministic infrastructure, events, checkpoints, model capabilities, tutorial progress, and other domain state. This contract covers only the minimum company-resource portion of that larger state.

No top-level TypeScript symbol named `SimState` is approved here. The resource contract is not a generic state container, must not be presented as complete authoritative runtime state, and does not claim that the first playable vertical slice can run with this state alone. The composition of current day, RNG, event queue, and domain state remains deferred.

## Approved future public contract

The following exact TypeScript surface is approved for a future independent code phase:

```ts
export interface ComputeResourceState {
  readonly capacity: number
  readonly occupied: number
}

export interface DataQualityState {
  readonly domainCoverage: number
  readonly cleaningQuality: number
  readonly contaminationRisk: number
  readonly legalRisk: number
  readonly feedbackQuality: number
}

export interface ResearchCapacityState {
  readonly capacity: number
  readonly occupied: number
}

export interface CompanyResourceStateInput {
  readonly cash: number
  readonly compute: ComputeResourceState
  readonly dataQuality: DataQualityState
  readonly researchCapacity: ResearchCapacityState
  readonly reputation: number
  readonly users: number
}

export interface CompanyResourceState
  extends CompanyResourceStateInput {}

export function createCompanyResourceState(
  input: CompanyResourceStateInput,
): CompanyResourceState
```

Phase 1G does not create these symbols. If the separate code phase is authorized and implemented, all six symbols must be exported from `game/src/sim/index.ts`. This surface does not approve a top-level `SimState` symbol and does not modify or wrap `SimKernelState`.

The root state has exactly the six fields shown above. Each nested object has exactly the fields shown for its interface. No opaque resource ID, discriminator, metadata field, cached derived field, or generic extension container is part of this contract.

## Cash

`cash` is the authoritative cash balance.

- Representation: JavaScript safe integer.
- Unit: whole US dollars.
- Valid range: zero through `Number.MAX_SAFE_INTEGER`, inclusive.
- Invalid values include `NaN`, positive or negative infinity, fractions, negative numbers, and integers outside the JavaScript safe-integer range.

This contract does not define initial cash, costs, income, overdrafts, or cash-related failure rules.

## Compute

`compute` is an aggregate capacity-and-occupancy constraint with exactly two authoritative fields:

- `capacity`: a non-negative JavaScript safe integer.
- `occupied`: a non-negative JavaScript safe integer no greater than `capacity`.

Both fields use the aggregate compute unit of the first playable vertical slice. That unit is not an exact GPU count and does not map to FLOPs, numeric precision, interconnect, or power supply.

Available compute is derived as:

```text
available = capacity - occupied
```

`available` must not be stored as a third authoritative field. Any future split between training and inference compute, or any physical mapping of the aggregate unit, requires separate approval.

## Data quality

Authoritative internal data quality is not a single aggregate scalar. It consists of exactly five integer fields, each in the inclusive range `0..10_000`:

| Field | Direction |
| --- | --- |
| `domainCoverage` | Higher is better. |
| `cleaningQuality` | Higher is better. |
| `contaminationRisk` | Higher means greater risk. |
| `legalRisk` | Higher means greater risk. |
| `feedbackQuality` | Higher is better. |

The UI-facing aggregate called `dataQuality` in [the vertical-slice specification](./vertical-slice-spec.md) is a future value derived by projection and rules. This phase defines no aggregation weights, formula, thresholds, or display format.

This contract does not expand the complete data-asset system described in `content/`. It does not represent data sources, data volume, duplication rate, staleness rate, or verifiability.

## Research capacity

`researchCapacity` is an aggregate capacity-and-occupancy constraint with exactly two authoritative fields:

- `capacity`: a non-negative JavaScript safe integer.
- `occupied`: a non-negative JavaScript safe integer no greater than `capacity`.

Both fields use the aggregate research-capacity unit of the first implementation. Available research capacity is derived as:

```text
available = capacity - occupied
```

`available` must not be stored as a third authoritative field. This resource slice does not implement employees, roles, salaries, morale, personnel identity, or a tacit-knowledge subsystem.

## Reputation and users

`reputation` is a signed JavaScript safe integer measured in internal reputation points. Negative, zero, and positive values are valid within the safe-integer range. This contract does not define a UI mapping, a natural upper bound, an initial value, action deltas, or rule thresholds.

`users` is a non-negative JavaScript safe integer representing the actual number of users. It is not split into active, paying, free, API, enterprise, or cohort categories.

## Derived values

The following values are derived rather than stored in `CompanyResourceState`:

- Compute availability is `compute.capacity - compute.occupied`.
- Research availability is `researchCapacity.capacity - researchCapacity.occupied`.
- The displayed aggregate data-quality value is derived later by projection and rules from the five internal data-quality fields.
- `runwayDays` does not enter `CompanyResourceState` and must not be stored as a cached value.

The recurring-expense inputs, burn inputs, and formula needed to derive `runwayDays` remain deferred. Consequently, this resource slice does not claim to satisfy complete playable-state requirements.

## Future creation and validation boundary

If the next independent code phase is authorized, `createCompanyResourceState` must:

1. Accept a `CompanyResourceStateInput`.
2. Require exactly the approved root and nested fields.
3. Accept only plain objects. An ordinary object with `Object.prototype` and a null-prototype plain object are allowed; arrays, class instances, and objects with any other custom prototype are rejected at every approved object boundary.
4. Inspect own keys and own property descriptors. Symbol keys, extra fields, and missing fields are rejected.
5. Require every approved field to be an own enumerable data property. An accessor is rejected without invoking its getter.
6. Complete a descriptor-based snapshot of the root and all approved nested objects before any snapped field value is used for validation or construction, so later property changes cannot create a time-of-check/time-of-use inconsistency.
7. Validate every numeric representation, range, and nested invariant in this document, including both `occupied <= capacity` constraints.
8. Leave the input and its nested objects unmodified.
9. Return a new `CompanyResourceState` with a readonly public state view assembled from the validated snapshot.

The implementation must not add a public generic validator, must not add `parseCompanyResourceState`, and must not connect the constructor to persistence. Phase 1G implements and tests none of these behaviors.

## Persistence consequences

This resource contract is sim-owned domain state, not a change to the schema 1 persistence surface. Therefore:

- `SimKernelState`, `SaveEnvelope`, and `SAVE_SCHEMA_VERSION` remain unchanged.
- `CompanyResourceState` is not inserted into, wrapped around, or adapted through `SimKernelState` in this phase.
- No storage representation, full-state serialization, parser, migration, or defaulting behavior is approved.
- A kernel-only envelope still must not be described as a complete playable save.
- Full-state persistence requires a separate proposal and approval and must not silently omit or synthesize company-resource state.

This specification does not select a future `schemaVersion`.

## Deferred decisions

The following remain unapproved and deferred:

- a top-level runtime `SimState` symbol;
- composition of current day, RNG, event queue, and domain state;
- checkpoint identity, references, and lifecycle;
- hidden capability-vector dimensions and their extension mechanism;
- representation of triggered and completed tutorial state;
- the event-kind and payload union;
- commands, actions, results, and rejections;
- handlers, registries, time advancement, and automatic pause;
- scenario-initialization input;
- the `runwayDays` formula;
- recurring expenses, burn inputs, and other economic rules;
- the physical mapping of compute and any later training/inference or other split;
- the displayed data-quality aggregate formula;
- gameplay rules for reputation and users;
- projections;
- application behavior;
- UI;
- storage;
- full-state persistence;
- migration;
- `schemaVersion` changes;
- initial values, costs, revenue, thresholds, difficulty, and balance.

## Non-goals

This phase does not:

- create or modify TypeScript, TSX, tests, or CSS;
- modify `SimKernelState`, `SaveEnvelope`, `SAVE_SCHEMA_VERSION`, or the Phase 1D queue API;
- create an empty `SimState`, an opaque resource ID, a generic state container, or a generic validator;
- implement commands, events, scenarios, projections, application behavior, persistence, or UI;
- modify `content/`, any existing `game/docs/` file, a README, package metadata, a lockfile, a dependency, a Quartz command, a workflow, or deployment;
- add Playwright;
- define initial values, costs, income, formulas, thresholds, difficulty, or balance;
- promote discussion material, chat, issue text, or implementation speculation into a formal mechanism.

## Acceptance criteria

This specification is acceptable only if:

- the sole repository change is the new `game/docs/company-resource-state.md` file;
- all existing sealed code, interfaces, tests, and specifications remain unchanged;
- the exact future public surface and `game/src/sim/index.ts` export boundary are recorded without creating those symbols;
- every numeric representation, unit, valid range, direction, and cross-field invariant above is explicit;
- authoritative stored fields are clearly separated from compute availability, research availability, displayed aggregate data quality, and `runwayDays`;
- the future creation boundary requires exact descriptor-snapshotted plain-object input without authorizing a parser or generic validator;
- schema 1 persistence and `SimKernelState` remain unchanged and full-state persistence remains deferred;
- no top-level `SimState`, business rule, initial value, formula, projection, application behavior, UI, storage behavior, migration, or balance decision is approved;
- no TypeScript behavior or test is implemented in Phase 1G.
