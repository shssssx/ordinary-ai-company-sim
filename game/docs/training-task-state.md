# Minimal training task state contract

## Status and scope

This document is a docs-only technical specification for `game/`. It records only the minimum training-task state contract that may become a documentary target for a future, separately authorized code stage. It refines [the technical architecture](./architecture.md), [the first playable vertical-slice specification](./vertical-slice-spec.md), [the runtime SimState ownership and persistence boundary](./sim-state-boundary.md), [the minimal company resource state contract](./company-resource-state.md), [the minimal hidden capability vector contract](./hidden-capability-vector.md), and [the minimal checkpoint state contract](./checkpoint-state.md). It does not replace the game-design, mechanism, narrative, or worldbuilding meanings in `content/`.

This stage creates no TypeScript, tests, or public symbols. It approves only the future documentary target written below. Every future code stage requires separate authorization, implementation, and independent review. This specification does not mean that any later code, command, event, scenario, projection, application, UI, or persistence stage is approved, implemented, reviewed, published, or sealed.

The terms **must**, **must not**, and **is** below are normative only for a future independently authorized implementation of this contract. This stage implements no gameplay behavior.

## Existing sealed boundaries

All existing sealed APIs and specifications remain unchanged. This document does not redesign, rename, wrap, extend, or re-review them.

In particular:

- The seeded RNG remains unchanged.
- The generic deterministic event queue remains unchanged.
- Scheduled-event ordering remains exactly `dueDay` → `priority` → `sequenceId`.
- `CompanyResourceState` remains unchanged.
- `HiddenCapabilityVector` remains unchanged.
- `CheckpointState` remains unchanged.
- `SAVE_SCHEMA_VERSION` remains `1`.
- `SimKernelState` remains exactly `currentDay`, `rngState`, and `eventQueue`.
- No top-level TypeScript `SimState` is created or approved.
- The `sim/` layer continues to own authoritative domain state.
- Persistence remains a separate layer and may adapt complete domain state only in a separately approved future persistence stage.

## Why training-task state is the next real dependency

`CheckpointState` represents a completed model snapshot. The formal vertical slice requires the player to submit a training task, wait an integer number of game days for that task to complete, and receive a checkpoint at completion. A currently executing training task is therefore the missing direct domain state between `CheckpointState` and a future start-training command and completion event.

This state has known future consumers: a command boundary, an event boundary, resource accounting, and checkpoint lineage. It is not a generic task or entity framework. This stage implements none of those consumers.

## Exact proposed future public surface

Only the following three future public symbols are proposed:

```ts
export interface TrainingTaskStateInput {
  readonly id: string
  readonly baseCheckpointId: string
  readonly computeOccupancy: number
  readonly researchCapacityOccupancy: number
}

export interface TrainingTaskState
  extends TrainingTaskStateInput {}

export function createTrainingTaskState(
  input: TrainingTaskStateInput,
): TrainingTaskState
```

No symbol may be added, removed, renamed, wrapped, or aliased in this proposed surface. In particular, this contract does not propose `TrainingTaskId`, `TrainingTaskReference`, `TrainingTaskStatus`, `TrainingTaskKind`, `TrainingTaskResult`, `TrainingTaskFailure`, `TrainingTaskCollection`, `TrainingTaskRegistry`, `TrainingTaskRepository`, `parseTrainingTaskState`, `validateTrainingTaskState`, `assertTrainingTaskState`, a generic `Task`, a generic `Entity`, a generic `Result`, or a generic `Rejection`.

This docs-only stage does not modify `game/src/sim/index.ts`. The three proposed symbols may be created or exported only by a separately authorized future code stage.

## Exact root contract

The `TrainingTaskState` root contains exactly:

- `id`
- `baseCheckpointId`
- `computeOccupancy`
- `researchCapacityOccupancy`

It contains no optional field, metadata, `kind`, status, version, tags, extension bag, or `Record<string, unknown>`.

### `id`

`id` has the following exact contract:

- Its runtime type must be `string`.
- `id.trim().length > 0` must hold.
- A valid ID is preserved exactly as supplied.
- The factory must not trim it, change its case, or normalize Unicode.
- There is no maximum length and no UUID, hash, or sequence-format requirement.
- The factory does not generate an ID, consume RNG, or maintain an ID counter.
- Uniqueness is not checked by the single-task factory.

Task-ID generation, counters, and uniqueness remain outside this contract.

### `baseCheckpointId`

`baseCheckpointId` has the following exact contract:

- Its runtime type must be `string`.
- `baseCheckpointId.trim().length > 0` must hold.
- A valid value is preserved exactly as supplied.
- The factory must not trim it, change its case, or normalize Unicode.
- It references a checkpoint by ID only.
- It does not embed or copy `CheckpointState`.
- It does not embed or copy `HiddenCapabilityVector`.
- The factory performs no collection lookup or existence validation.

Checkpoint existence, whether a checkpoint is eligible to be a training base, current-checkpoint selection, and rollback lookup remain deferred.

### `computeOccupancy`

`computeOccupancy` must be a non-negative JavaScript safe integer.

It represents only the quantity of aggregate compute occupancy attributable to this task. It is not global `compute.capacity`, global `compute.occupied`, available compute, a GPU count, FLOPs, cash cost, duration, or a training result.

Allowing `0` is only a value-object representation boundary. It does not mean that a future command must accept training with zero compute.

### `researchCapacityOccupancy`

`researchCapacityOccupancy` must be a non-negative JavaScript safe integer.

It represents only the quantity of aggregate research-capacity occupancy attributable to this task. Allowing `0` is only a value-object representation boundary and approves no gameplay rule.

## Task, checkpoint, resource, and queue ownership

`TrainingTaskState` is sim-owned authoritative domain state.

The task references its base checkpoint only through `baseCheckpointId`. It does not copy or embed the checkpoint or its hidden capability. `CompanyResourceState` continues to own the global capacity and occupied truth for compute and research capacity. The two task occupancy fields are per-task attribution only.

This stage defines no cross-task occupancy-sum invariant and performs no resource-availability check. It does not decide resource mutation or release behavior.

`ScheduledEvent` is the sole owner of `dueDay`, `priority`, and `sequenceId`. `TrainingTaskState` stores none of `dueDay`, `durationDays`, `completionDay`, `remainingDays`, `priority`, or `eventSequenceId`. Scheduling truth must not be duplicated between a task and the queue.

This stage does not define how a future event references a task. A `TrainingCompleted` kind, its payload, and its handler remain deferred.

## Running-state boundary

`TrainingTaskState` represents only a currently executing training task. The existence of the object means that the task is running.

The root therefore has no status, `running` boolean, `completed` boolean, `failed` boolean, `cancelled` boolean, or lifecycle enum. Completion, failure, cancellation, retry, archival, and removal semantics remain deferred.

## Output boundary

A running task does not own:

- `outputCheckpointId`
- an output `CheckpointState`
- an output `HiddenCapabilityVector`
- a capability delta
- a failure result

It is not yet decided whether an output checkpoint ID is reserved when training starts or generated when training completes. Capability delta, failure probability, RNG timing, and failure output are also undecided. These fields therefore cannot enter this contract.

## Future factory strict-input contract

If a future independent code stage separately authorizes `createTrainingTaskState`, the factory must:

1. Accept a `TrainingTaskStateInput`.
2. Require the root to contain exactly the four approved fields.
3. Accept an ordinary plain object with `Object.prototype` and a null-prototype plain object.
4. Reject primitives, arrays, class instances, and custom-prototype objects.
5. Use `Reflect.ownKeys` and own property descriptors.
6. Reject a missing field, any extra string field, and any symbol key.
7. Require every field to be an own enumerable data property.
8. Reject an accessor without invoking its getter.
9. Obtain and snapshot the own property descriptors for all four approved fields before using any snapped primitive for validation or construction. An invalid snapped primitive must not cause early validation, construction, return, or throw before all four descriptor operations are complete.
10. Perform no ordinary property read from the root input after the snapshot is complete.
11. Validate the two snapped non-blank strings and the two snapped non-negative JavaScript safe integers.
12. Perform no checkpoint lookup, ID-uniqueness validation, or resource-availability validation.
13. Leave the input, its keys, and its property descriptors unmodified.
14. Return a fresh root object.
15. Expose the returned value through a TypeScript `readonly` public view.
16. Not freeze the returned object at runtime.
17. Not generate an ID.
18. Not consume RNG.
19. Not create a parser.
20. Not create a public generic validator.
21. Not connect the factory to persistence.

The task root has no nested factory. A future implementation must not mechanically add the checkpoint factory's nested-capability factory ordering. The requirement here is only that the complete four-field descriptor snapshot precede primitive validation and construction from the snapped values.

## Explicitly deferred

All of the following remain deferred and unapproved:

- training configuration;
- research direction;
- architecture;
- model scale;
- context length;
- training stage;
- data composition;
- FLOPs budget;
- task ID generation;
- task uniqueness;
- task collection;
- parallel tasks;
- lookup;
- ordering;
- deletion;
- current task pointer;
- checkpoint existence lookup;
- `parentId`;
- lineage;
- output checkpoint ID;
- output ID timing;
- rollback implementation;
- duration;
- `dueDay` calculation;
- event priority;
- `TrainingCompleted` kind;
- event payload;
- event handler;
- task/event linkage;
- time advancement;
- automatic pause;
- cancellation;
- rescheduling;
- cash cost;
- compute mutation timing;
- research-capacity mutation timing;
- release timing;
- capacity rejection;
- transaction/atomicity;
- capability delta;
- training outcome;
- failure probability;
- RNG use and draw order;
- success/failure result;
- start-training command;
- command input;
- result;
- rejection;
- top-level `SimState`;
- scenario initialization;
- initial task;
- initial values;
- tutorial state;
- projection;
- application;
- UI;
- storage;
- full-state persistence;
- migration;
- any `schemaVersion` change;
- thresholds;
- difficulty;
- balance.

This specification provides no default value, example value, recommended algorithm, or preferred design for any deferred item.

## Persistence boundary

- `SAVE_SCHEMA_VERSION` remains `1`.
- `SimKernelState` remains exactly `currentDay`, `rngState`, and `eventQueue`.
- `TrainingTaskState` is not inserted into schema 1.
- `SaveEnvelope` remains unchanged.
- This stage creates no storage adapter, serializer, parser, or migration.
- No future `schemaVersion` is selected.
- The kernel-only envelope is not a complete playable save.

The ability of the event queue to preserve a JSON payload does not make a training task persisted. Task state must not be hidden in a generic event payload and described as complete task persistence.

## Non-goals

This docs-only stage does not:

- create or modify TypeScript;
- create tests;
- modify the sim barrel;
- implement a training task;
- implement a command, result, or rejection;
- implement a domain event;
- implement an event handler;
- modify the event queue;
- modify `CompanyResourceState`;
- modify `HiddenCapabilityVector`;
- modify `CheckpointState`;
- create a collection;
- create a top-level `SimState`;
- create a scenario;
- create a projection;
- create application behavior;
- create UI;
- modify persistence;
- modify schema 1;
- add a dependency;
- modify `content/`;
- modify any existing document;
- modify a README;
- modify a workflow;
- add Playwright;
- define initial values, cost, duration, delta, threshold, probability, difficulty, or balance; or
- promote discussion, chat, or issue text into a formal mechanism.

## Acceptance criteria

This specification is acceptable only if:

1. The sole repository change is `game/docs/training-task-state.md`.
2. The stage is docs-only and creates no public symbol.
3. The future surface contains exactly `TrainingTaskStateInput`, `TrainingTaskState`, and `createTrainingTaskState`.
4. The root contains exactly `id`, `baseCheckpointId`, `computeOccupancy`, and `researchCapacityOccupancy`.
5. The ID contract is complete, preserves valid IDs exactly, and defines no ID generation.
6. The base checkpoint is referenced by ID only, with no embedded checkpoint, hidden capability, or factory lookup.
7. The occupancy fields are task-specific attribution, while `CompanyResourceState` retains global resource truth.
8. The event queue alone owns scheduling truth, and the task stores no scheduling field.
9. The task has no status, boolean lifecycle marker, or lifecycle enum.
10. The task has no output checkpoint, output capability, capability delta, or failure result.
11. The future factory boundary requires exact plain-object input and a complete four-field descriptor snapshot before primitive validation or construction.
12. No parser or public generic validator is proposed.
13. Schema 1, `SaveEnvelope`, and the exact three-field `SimKernelState` remain unchanged.
14. No command, event, top-level `SimState`, scenario, projection, application, UI, or persistence behavior is implemented or approved.
15. No concrete training value, default, formula, threshold, probability, difficulty, or balance is defined.
16. No future code stage is automatically authorized, implemented, reviewed, published, or sealed by this document.
