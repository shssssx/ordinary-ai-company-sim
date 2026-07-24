# Minimal start-training atomic transition boundary

## Status and scope

This document is a docs-only technical specification for `game/`. It refines
[the technical architecture](./architecture.md),
[the first playable vertical-slice specification](./vertical-slice-spec.md),
and the existing sim-owned state contracts only for the atomic boundary of a
future start-training operation. It does not replace the gameplay meaning in
`content/`.

This stage does not re-review, revise, or reopen any sealed specification or
implementation stage. It does not approve implementation of a start-training
command, create TypeScript, create tests, modify the sim barrel, or create any
public symbol.

The scope is only start-training-specific ownership and atomicity. This is not
a generic command framework, generic transaction framework, or generic
resource framework. It introduces no reusable abstraction for other gameplay
operations.

This document is a prerequisite boundary, not a complete future implementation
contract. It is insufficient by itself to authorize or implement any future
code stage. Every later contract and code stage requires separate human
authorization.

## Existing sealed boundaries

The following existing contracts remain unchanged:

- [Runtime SimState ownership and persistence boundary](./sim-state-boundary.md)
  keeps authoritative runtime domain state in `sim/` without creating a
  top-level `SimState`.
- [Minimal company resource state contract](./company-resource-state.md) keeps
  global compute and research capacity and occupancy in
  `CompanyResourceState`.
- [Minimal hidden capability vector contract](./hidden-capability-vector.md)
  keeps model capability hidden and checkpoint-owned.
- [Minimal checkpoint state contract](./checkpoint-state.md) keeps each
  checkpoint's identity and owned capability unchanged.
- [Minimal training task state contract](./training-task-state.md) keeps the
  exact running-task representation unchanged.
- The deterministic event queue keeps the ordering
  `dueDay` → `priority` → `sequenceId`, and a `ScheduledEvent` remains the sole
  owner of those scheduling fields.
- Schema 1 persistence and the kernel-only persistence shape remain unchanged.

This specification neither modifies nor reinterprets those boundaries.

## Why this boundary precedes a command contract

`TrainingTaskState` is already the single-object representation of a running
training task. A future start-training operation is the first gameplay
operation known to require coordination across multiple authoritative owners.
Its known participant directions are:

- `CompanyResourceState`;
- the future authoritative owner or location in which a created
  `TrainingTaskState` becomes authoritative;
- `EventQueue`; and
- `currentDay`.

There is not yet enough approved information to define complete command input,
a success result, rejections, or a scheduling contract. This document therefore
defines only the start-training-specific atomic transition boundary before any
command contract is proposed.

## Authoritative participants and ownership

A future start-training operation belongs to the `sim/` layer. The sim layer
must validate and coordinate every approved authoritative effect of that
operation.

Application, projection, UI, and persistence layers must not separately execute
or own:

- the resource update;
- task creation or installation into its future authoritative owner; or
- event scheduling.

Those layers must not assemble authoritative start-training behavior by calling
multiple public mutations. They must not observe a partially coordinated result
and must not become responsible for completing it.

This ownership rule is specific to start-training. It does not approve a shared
command dispatcher, transaction abstraction, resource service, repository,
registry, or unit-of-work mechanism.

## Atomic commit boundary

For a future successful start-training operation, every authoritative effect
approved by later contracts must commit as one indivisible whole. Before the
commit, externally observable authoritative state is the state from before the
operation. After the commit, all approved effects are present.

No external observer may see an intermediate state in which:

- resources have changed but the task is not authoritative;
- the task is authoritative but its approved event has not been scheduled;
- event scheduling has consumed a `sequenceId` but the operation ultimately
  rejects; or
- application code must compensate for an already committed partial change.

Atomicity here is a gameplay/runtime semantic guarantee. This stage does not
select how a future implementation provides that guarantee. In particular, it
does not decide between in-place mutation and fresh immutable outputs, multiple
parameters and a single aggregate input, or a future top-level runtime
composition. It does not approve a top-level `SimState`.

## Failure and no-partial-change guarantee

If any future domain rejection, structural input failure, resource validation
failure, task construction failure, event scheduling failure, or unexpected
pre-commit failure occurs, externally observable authoritative state must
remain exactly as it was when the operation began.

At minimum, every such failure guarantees:

- the existing `CompanyResourceState` has no partially committed change;
- no new running task is installed in any authoritative owner;
- `EventQueue` is unchanged;
- `nextSequenceId` is not incremented;
- `currentDay` is not advanced;
- RNG state is unchanged; and
- the caller performs no rollback, compensation, or cleanup.

Any operation-local temporary state used before the atomic commit point must be
discarded internally by the start-training operation on failure. Its cleanup
must not become the responsibility of application, projection, UI,
persistence, or any other caller. This requirement does not prescribe a
transaction framework, staging object, rollback mechanism, unit of work, or
mutation strategy.

Only the failure-path RNG guarantee is defined here. Whether a successful
start-training operation consumes RNG, and any successful draw order, remain
deferred.

## Resource, task, checkpoint, queue, and currentDay boundaries

### Resource boundary

`CompanyResourceState` continues to own global compute and research capacity
and occupied truth. The occupancy fields in `TrainingTaskState` remain only
attribution to that task.

A future successful transition must not expose an intermediate state in which
task attribution contradicts global resource truth. This requirement does not
define occupied-value arithmetic, cash deduction, resource cost, minimum
occupancy, acceptance of zero occupancy, availability rejection codes, release
timing, or resource loss after training failure.

### Task boundary

The existence of a `TrainingTaskState` object continues to mean that the task is
running. This stage adds no status, running, completed, failed, or cancelled
boolean; no lifecycle enum; and no `dueDay`, duration, priority,
`eventSequenceId`, or `outputCheckpointId` field.

This stage does not decide whether running tasks are ultimately held in a
collection, a single active-task slot, a future top-level runtime composition,
or another runtime composition.

### Checkpoint boundary

A running task continues to reference its base checkpoint only through
`baseCheckpointId`. It must not embed or copy `CheckpointState` or
`HiddenCapabilityVector`.

This stage does not decide checkpoint collection ownership, base-checkpoint
existence lookup, base eligibility, current-checkpoint selection, current
training-base selection, or rollback lookup.

### Scheduling boundary

`ScheduledEvent` remains the sole owner of `dueDay`, `priority`, and
`sequenceId`. `TrainingTaskState` must not copy scheduling truth.

The only scheduling requirement added here is atomicity: if later contracts
approve a scheduling effect for start-training, that effect must commit with
all other approved start-training effects. If scheduling fails, no other effect
may remain and no queue sequence may be consumed.

This stage does not define a duration, its source, a due-day calculation, event
priority, completion event kind, event payload, task/event linkage, event
handler, or event executor.

### `currentDay` boundary

The start-training operation itself does not advance `currentDay`. This rule
does not approve any due-day formula or any relationship between `currentDay`
and a future duration.

## Why no command API is approved

This stage proposes no future public API and no public symbol. The unresolved
inputs, outputs, rejection space, runtime composition, resource rules, and
scheduling rules prevent a complete command contract from being specified.

No API example, provisional name, open-ended field, metadata bag, discriminator,
version field, or generic escape hatch may substitute for those missing
decisions. The atomicity guarantee describes required externally observable
behavior only; it is not an API design.

## Blockers before a future command contract

Every item below remains unresolved:

- task ID ownership;
- task uniqueness;
- task collection and current-task ownership;
- checkpoint lookup ownership;
- base-checkpoint eligibility;
- occupancy supplied as input versus derived by rules;
- minimum accepted occupancy;
- cash cost and deduction timing;
- resource availability rules;
- resource mutation arithmetic;
- duration representation and source;
- `dueDay` calculation;
- event priority;
- event kind and payload;
- task/event linkage;
- success-result composition;
- the minimum complete rejection set;
- output-checkpoint ID timing;
- capability delta;
- training failure;
- RNG use and draw order;
- resource release; and
- top-level runtime composition.

The start-training command must not be implemented until all of these blockers
have been resolved through separately authorized contracts.

## Persistence boundary

`SAVE_SCHEMA_VERSION` remains `1`. `SimKernelState` continues to contain exactly:

- `currentDay`;
- `rngState`; and
- `eventQueue`.

This stage does not add `CompanyResourceState`, `CheckpointState`, or
`TrainingTaskState` to schema 1. It does not modify `SaveEnvelope`, create
full-state persistence, create a migration, or select a new `schemaVersion`.
A generic event payload must not be described as task persistence.

## Explicitly deferred

In addition to the implementation blockers above, the following remain
explicitly deferred:

- the complete command contract, including structural input handling, success
  output, and rejection semantics;
- all implementation and API choices for satisfying atomicity;
- authoritative runtime composition and storage of running tasks;
- resource-helper or collection design;
- ID generation;
- the completion event, its execution, and any automatic pause;
- time advancement;
- capability change and training outcome;
- success-path RNG consumption;
- scenario initialization;
- projections, application behavior, and UI;
- full-state persistence and migration; and
- every concrete value, formula, cost, duration, threshold, probability,
  difficulty setting, and balance value.

These are deferred decisions, not approvals or plans for a next stage.

## Non-goals

This docs-only stage does not:

- implement a command;
- implement a success result or rejection;
- implement an event, payload, handler, or executor;
- implement a resource transition or resource helper;
- implement a collection;
- implement ID generation;
- implement checkpoint lookup;
- implement a capability delta;
- implement a training outcome or failure;
- implement time advancement;
- implement automatic pause;
- create a top-level `SimState`;
- create a scenario;
- create a projection, application behavior, or UI;
- modify persistence or schema 1;
- create or modify TypeScript, tests, the sim barrel, or public symbols;
- modify `CompanyResourceState`, `TrainingTaskState`, `CheckpointState`, or
  `EventQueue`;
- define a concrete value, formula, cost, duration, threshold, probability,
  difficulty setting, or balance value;
- promote discussion, chat, issue text, or a temporary suggestion into a formal
  mechanism;
- claim that a future command stage is authorized; or
- claim that this stage or any later code stage is published, sealed, approved,
  or implemented.

## Acceptance criteria

An independent reviewer can accept this specification only if:

1. The sole repository change is
   `game/docs/start-training-transition-boundary.md`.
2. The change is docs-only and creates no TypeScript, tests, or public symbols.
3. The scope is limited to start-training.
4. No generic command, transaction, or resource framework is introduced.
5. Sim-layer ownership is explicit.
6. Resource, task, queue, and `currentDay` boundaries are explicit.
7. Application and UI do not perform authoritative partial coordination.
8. Failure guarantees no externally observable partial change.
9. The queue remains the sole owner of scheduling truth.
10. The sealed `TrainingTaskState` shape and API remain unchanged.
11. No top-level `SimState`, collection, helper, or ID generator is created.
12. No command API is proposed.
13. No duration, due-day calculation, priority, payload, cost, capability delta,
    training failure, or success-path RNG behavior is decided.
14. Schema 1 and kernel persistence remain unchanged.
15. The document explicitly remains insufficient to authorize code
    implementation.
16. No discussion, chat, or issue material is promoted into a formal mechanism.
17. No initial value or balance value is introduced.
18. The document does not claim that this stage is published or sealed, or that
    any later code stage is approved.
