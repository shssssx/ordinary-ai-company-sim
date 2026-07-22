# Minimal checkpoint state contract

## Status and scope

This document is a docs-only technical specification for `game/`. It records the minimum checkpoint-state contract needed by a future, separately authorized code slice. It refines [the technical architecture](./architecture.md), [the first playable vertical-slice specification](./vertical-slice-spec.md), [the runtime SimState ownership and persistence boundary](./sim-state-boundary.md), [the minimal company resource state contract](./company-resource-state.md), and [the minimal hidden capability vector contract](./hidden-capability-vector.md). It does not replace the game-design, mechanism, narrative, or worldbuilding meanings in `content/`.

This separately human-authorized documentation stage creates no TypeScript, tests, or public symbols. The future API described below still requires separate authorization, implementation, and independent review. This document does not approve or seal a Phase 1K, and it does not approve checkpoint implementation, a training task, command, event, scenario, projection, application behavior, UI, or persistence work.

The terms **must**, **must not**, and **is** below are normative only for a future independently authorized implementation of this contract. This stage implements no gameplay behavior.

## Existing sealed boundaries

Phase 0 through Phase 1J remain sealed. This specification neither re-reviews nor refactors them.

In particular:

- `SAVE_SCHEMA_VERSION` remains `1`.
- `SimKernelState` continues to contain exactly `currentDay`, `rngState`, and `eventQueue`.
- The Phase 1J public API remains unchanged.
- `HiddenCapabilityVector` remains sim-owned hidden state. UI must not read it directly.
- `CompanyResourceState` remains unchanged, and checkpoint state is not part of it.
- No top-level TypeScript `SimState` is created or approved here.

## Why checkpoint is the next real dependency

The formal vertical slice requires training to produce a checkpoint. That checkpoint becomes the target of evaluation, release, continued training, and rollback. Phase 1J sealed `HiddenCapabilityVector`, after the Phase 1I contract defined it as a future checkpoint-owned value object, but no other formal state currently exists that can own capability.

The checkpoint contract is therefore a prerequisite for training completion, an evaluation target, a release target, and a scenario's initial model. It is not a generic entity foundation or an abstraction without known consumers. Recording this dependency does not implement any consumer or gameplay behavior and does not authorize their implementation.

## Exact proposed future public API

Only the following three future public symbols are proposed:

```ts
export interface CheckpointStateInput {
  readonly id: string
  readonly capability: HiddenCapabilityVectorInput
}

export interface CheckpointState {
  readonly id: string
  readonly capability: HiddenCapabilityVector
}

export function createCheckpointState(
  input: CheckpointStateInput,
): CheckpointState
```

No symbol may be added, removed, renamed, wrapped, or aliased in this proposed surface. In particular, it does not propose `CheckpointId`, `CheckpointReference`, `CheckpointStatus`, `CheckpointCollection`, `CheckpointRepository`, `CheckpointRegistry`, `parseCheckpointState`, `validateCheckpointState`, `assertCheckpointState`, generic entity identity, or a generic validator.

Only after a future independent code stage is separately authorized and implemented may these three symbols be exported from `game/src/sim/index.ts`. This docs-only stage does not modify that barrel or create any public symbol.

## Checkpoint identity contract

`CheckpointState.id` is a non-blank string with the following exact contract:

- Its runtime type must be `string`.
- `id.trim().length > 0` must hold.
- The empty string and strings containing only whitespace are invalid.
- A valid ID is preserved exactly as supplied.
- The factory must not trim it, change its case, or normalize Unicode.
- This contract defines no maximum length, UUID form, hash form, or numeric sequence.
- This contract defines no ID generator, consumes no RNG, and creates no ID counter.

A future scenario initialization stage may, after separate approval, provide a valid ID. This stage defines neither a scenario API nor any initial ID. Future runtime checkpoint-ID generation remains deferred.

Uniqueness is a future collection invariant, not an invariant of the single-checkpoint factory. This stage creates no collection and does not guarantee that two independently supplied checkpoint inputs have distinct IDs.

## Minimal stored fields and meaning

`CheckpointState` is a sim-owned completed model snapshot value object. Here, **completed** only distinguishes a checkpoint from a training task that is still executing; it does not imply or authorize a lifecycle enum.

The root contains exactly:

- `id`
- `capability`

It contains no `parentId`, `createdDay`, `trainingRunId`, `status`, `released`, `name`, `label`, `version`, `metadata`, `kind`, `tags`, `architecture`, `trainingData`, `evaluation`, extension bag, `Record<string, unknown>`, or optional future field.

## Capability ownership

- A checkpoint directly owns one `HiddenCapabilityVector`.
- `CheckpointStateInput.capability` uses `HiddenCapabilityVectorInput`.
- `CheckpointState.capability` uses `HiddenCapabilityVector`.
- A future `createCheckpointState` must call the existing public `createHiddenCapabilityVector` factory.
- That call must create a fresh nested capability. The output capability must not alias `input.capability`.
- Even when the caller supplies an already-created `HiddenCapabilityVector`, the checkpoint factory must revalidate it through `createHiddenCapabilityVector` and create a fresh vector.
- The future implementation must not extract, move, modify, or reuse Phase 1J's private validation implementation.
- Application, projection, and UI layers must not own an authoritative capability copy. UI must not directly read hidden capability state.
- Checkpoint state is not part of `CompanyResourceState`.
- Checkpoint state may belong to future sim-owned runtime domain state, but this stage creates no top-level `SimState` and decides no complete runtime composition.
- This stage does not connect checkpoint state to persistence.

## Future factory strict-input contract

If a future independent code stage separately authorizes `createCheckpointState`, the factory must satisfy all of the following:

1. Require the root to contain exactly `id` and `capability`.
2. Accept an ordinary plain object with `Object.prototype` and a null-prototype plain object.
3. Reject primitives, arrays, class instances, and objects with any other custom prototype.
4. Perform the root snapshot in this exact order, without reordering any step based on field validity:
   1. Call `Reflect.ownKeys(input)`.
   2. Obtain and snapshot the own property descriptor for `id`.
   3. Obtain and snapshot the own property descriptor for `capability`.
   4. Treat the root snapshot as complete.
5. Reject a missing required field, any extra string field, and any symbol key.
6. Require each required field to be an own enumerable data property.
7. Reject an accessor without invoking its getter.
8. Before all four root-snapshot steps are complete, perform no primitive validation of `id`, call to `createHiddenCapabilityVector`, output construction, ordinary property read from the root input, early return or throw because `id` is invalid, or nested validation using the capability value. Even when the snapped ID is obviously invalid, the factory must obtain the `capability` descriptor and complete the root snapshot before calling the capability factory and validating the ID.
9. After the root snapshot is complete, use the snapped values in this exact order: call `createHiddenCapabilityVector` with the snapped capability value, validate the snapped ID as the non-blank string defined above, and only then construct the fresh `CheckpointState` root.
10. Because the `id` descriptor is snapped before the `capability` descriptor, a `capability`-descriptor Proxy trap that mutates the original root `input.id` must not change the snapped ID value or the returned `CheckpointState.id`. Both must use the value captured from the `id` descriptor before the `capability` descriptor operation.
11. Perform no ordinary property read from `input` after the root snapshot.
12. Preserve every valid snapped ID exactly.
13. Leave the root input, the capability input, their keys, and their property descriptors unmodified.
14. Return a fresh root object.
15. Return a fresh nested capability object that does not alias the supplied capability value.
16. Expose root and nested fields through TypeScript `readonly` public views.
17. Not freeze either the root or nested capability at runtime.
18. Not create a parser.
19. Not create a public generic validator.
20. Not connect the factory to persistence.

The implementation must not modify the existing company-resource-state or hidden-capability-vector implementation for reuse.

## Future review and test determinability

Although this stage creates no tests, a future code review must be able to determine all of the following from implementation and tests:

- the root has exactly `id` and `capability`;
- ID runtime type and non-blank validation are enforced, while valid IDs are preserved exactly;
- ordinary and null-prototype root objects are accepted;
- primitives, arrays, class instances, and custom-prototype roots are rejected;
- missing fields, extra string fields, and symbol keys are rejected;
- accessors are rejected with zero getter calls;
- root Proxy operations occur in the exact order `Reflect.ownKeys(input)`, `id` descriptor, then `capability` descriptor, and both descriptors are snapped before either snapped value is used;
- a `capability`-descriptor Proxy trap that changes the original root `input.id` from a valid value A to B leaves the snapped ID and returned `CheckpointState.id` equal to A, the value captured before that descriptor operation;
- even when the snapped ID is invalid, the `capability` descriptor is obtained and the root snapshot is completed before the nested capability factory and ID primitive validation run;
- after the root snapshot, the snapped capability is passed to `createHiddenCapabilityVector` before snapped-ID primitive validation, and the fresh root is constructed only after both operations;
- no ordinary root-input read occurs after the snapshot;
- snapped capability is strictly revalidated through `createHiddenCapabilityVector`;
- both root and nested capability are fresh and do not alias their corresponding inputs;
- input objects, keys, and descriptors remain unmodified;
- TypeScript views are readonly while root and nested capability remain unfrozen at runtime;
- no parser, public generic validator, or extra barrel export is introduced; and
- no parent, lifecycle, collection, persistence, or other deferred boundary is crossed.

## Persistence boundary

`SAVE_SCHEMA_VERSION = 1` remains unchanged. `SimKernelState` remains exactly:

- `currentDay`
- `rngState`
- `eventQueue`

This stage does not modify `SimKernelState` or `SaveEnvelope`, put checkpoint state into schema 1, create a storage adapter, create full-state serialization, create a migration, or select a future `schemaVersion`. The current kernel-only envelope must not be described as a complete playable save.

Future complete-state persistence requires a separate proposal, authorization, implementation, and review. It must not silently omit checkpoint state from a purported complete save or silently synthesize missing checkpoint state from defaults.

## Explicitly deferred

All of the following remain deferred and unapproved:

- parent checkpoint;
- `parentId`;
- lineage;
- ancestry;
- branching;
- rollback implementation;
- training provenance;
- `trainingRunId`;
- architecture;
- training data;
- compute provenance;
- created day;
- checkpoint lifecycle;
- training status;
- evaluation state;
- evaluation report;
- release state;
- a `released` boolean;
- archive state;
- checkpoint collection;
- uniqueness;
- ordering;
- lookup;
- deletion;
- current checkpoint;
- current training base;
- current released checkpoint;
- training task;
- command, action, result, and rejection;
- domain event kind and payload;
- scheduled-event execution;
- time advancement;
- automatic pause;
- scenario initialization;
- tutorial progress;
- top-level `SimState`;
- projection;
- application;
- UI;
- storage;
- full-state persistence;
- migration;
- any `schemaVersion` change;
- initial values;
- capability delta;
- costs;
- duration;
- thresholds;
- probabilities;
- difficulty; and
- balance.

None of these decisions may be parked in optional fields, metadata, `kind`, `version`, tags, an extension bag, or `Record<string, unknown>`.

## Non-goals

This documentation stage does not:

- create or modify TypeScript, tests, package metadata, a lockfile, a dependency, content, workflow, or deployment;
- implement checkpoint, training, command, event, scenario, projection, application, UI, or persistence behavior;
- create a top-level `SimState`;
- revise the Phase 1J API or any earlier sealed phase;
- define an initial value, capability delta, formula, cost, duration, threshold, probability, difficulty setting, or balance value;
- promote discussion, issue, chat, or implementation speculation into a formal mechanism; or
- claim that a future checkpoint code stage is authorized.

## Acceptance criteria

This specification is acceptable only if:

1. The sole repository change is `game/docs/checkpoint-state.md`.
2. No TypeScript, test, package, lockfile, dependency, content, workflow, or deployment file changes.
3. The stage is docs-only and creates no public symbol.
4. The proposed future surface contains exactly the three symbols shown above.
5. The checkpoint root contains exactly `id` and `capability`.
6. The ID contract is complete and defines no generation mechanism.
7. Capability ownership, fresh-copy construction, and non-aliasing are explicit.
8. The strict descriptor-snapshot factory contract is explicit.
9. Parentage, provenance, lifecycle, evaluation, release, collection, and current pointers all remain deferred.
10. The Phase 1J public API remains unchanged.
11. Schema 1 and kernel persistence remain unchanged.
12. No top-level `SimState` is created.
13. No initial value, delta, formula, cost, duration, threshold, probability, difficulty, or balance is defined.
14. No future checkpoint code stage is claimed to be authorized, implemented, reviewed, or sealed.
