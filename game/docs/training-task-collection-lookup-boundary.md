# Minimal authoritative training-task membership and exact identity boundary

## Status and scope

This document is a docs-only technical specification candidate for `game/`. It
defines only the minimum authoritative running-training-task membership and
exact task-identity boundary. It refines the existing technical architecture,
runtime-state, training-task-state, start-training atomic-transition, and
checkpoint-membership boundaries without replacing the gameplay meanings in
`content/`.

This is a conceptual ownership and identity boundary, not a collection API. It
creates no TypeScript, tests, public API, public symbol, lookup function,
collection implementation, or runtime aggregate. It does not modify the sim
barrel, content, persistence, or schema 1. It neither authorizes a
start-training implementation nor claims that this candidate is approved,
published, or sealed.

The terms **must**, **must not**, and **is** below are normative only for the
future boundary they describe. Discussion material was considered only as
background and is not promoted into a formal mechanism.

## Existing sealed boundaries

All existing sealed specifications and implementations remain unchanged:

- Authoritative runtime domain state belongs to `sim/`.
- `TrainingTaskState` is the existing sealed running-training-task state with
  exactly `id`, `baseCheckpointId`, `computeOccupancy`, and
  `researchCapacityOccupancy`.
- The existence of a `TrainingTaskState` continues to mean that the task is
  running. No status field or lifecycle enum is introduced.
- A valid `TrainingTaskState.id` is preserved exactly as supplied. Its
  single-object factory neither generates an ID nor establishes uniqueness
  across tasks.
- `CheckpointState` remains the sealed completed-model snapshot, and
  `TrainingTaskState.baseCheckpointId` remains an exact ID reference rather
  than an embedded checkpoint or hidden capability.
- Authoritative checkpoint membership and exact checkpoint lookup remain
  governed by the existing checkpoint collection and lookup boundary.
- `CompanyResourceState` continues to own global company-resource truth. Task
  occupancy fields remain per-task attribution only.
- The deterministic event queue retains
  `dueDay` → `priority` → `sequenceId` ordering and remains the sole owner of
  scheduling truth.
- The start-training atomic-transition boundary requires every pre-commit
  failure to leave externally observable authoritative state unchanged.
- No top-level TypeScript `SimState` or complete runtime composition is sealed.
- Schema 1 remains the kernel-only persistence surface.

This document neither re-reviews nor revises those boundaries.

## Why task membership and identity are the next dependency

An isolated `TrainingTaskState` can establish the shape of one running task,
but it cannot establish which running tasks are authoritative or whether its
ID collides with another authoritative task. A future successful
start-training commit must not install a duplicate task identity. Any future
sim-owned operation that refers to an already-running task by raw ID also
needs one authoritative answer to two limited questions:

1. Which running training tasks are authoritative runtime members?
2. Does a supplied raw task ID identify exactly one of those members?

This dependency is membership and identity only. It does not settle how any
consumer carries an ID, what consumer-specific result follows a missing ID,
how tasks complete or leave membership, how many tasks may run, or any
resource, scheduling, command, event, checkpoint-output, scenario, projection,
application, UI, or persistence rule.

## Authoritative ownership and membership

Authoritative running-training-task membership belongs to `sim/`. Application,
UI, projection, persistence, and event payloads must not own or maintain an
authoritative membership copy and must not decide which task instances are
authoritative.

Every authoritative member must be an existing sealed `TrainingTaskState`.
Membership must not substitute an ID-only record, cache entry, projection row,
event payload, persistence default, or another task-shaped object for that
state.

Membership contains only running tasks because the existence of each
`TrainingTaskState` continues to mean running. This statement does not define
completion removal, cancellation, failure, archive, or any other lifecycle
transition.

The words **membership** and **collection** in this document are
ordinary-language names for this conceptual ownership boundary. They do not
approve a TypeScript representation, public surface, factory, lookup method,
insertion method, removal method, repository, registry, or manager.

## Exact task-ID uniqueness

Within authoritative running-task membership, every
`TrainingTaskState.id` must be unique.

Uniqueness is determined solely by exact equality of the preserved raw string
stored in `TrainingTaskState.id`:

- do not trim;
- do not change case or case-fold;
- do not normalize Unicode;
- do not use an alias, label, display name, or derived key; and
- do not replace the stored identity with a canonicalized value.

Two authoritative members with the same preserved raw ID cannot form valid
authoritative membership. Duplicate membership must not use first-wins,
last-wins, insertion order, array order, object traversal order, or any other
arbitrary selection rule.

This boundary defines no UUID form, hash form, numeric sequence, counter, RNG
generation, caller-owned ID, maximum length, Unicode normal form, or other ID
origin or generation rule.

## Exact identity-resolution semantics

Resolving a raw task ID must compare that preserved raw string with each
authoritative member's preserved `TrainingTaskState.id` using exact string
equality. Resolution must not trim, case-fold, normalize Unicode, consult an
alias, compare a display name, or synthesize a replacement identity.

A successful resolution yields exactly one authoritative running
`TrainingTaskState`. It must resolve from sim-owned authoritative membership,
not from application state, UI state, a projection, a cache, an event payload,
or a task synthesized or defaulted by persistence.

When there is no exact authoritative match, resolution must not substitute a
current, latest, first, nearest, or arbitrary task. If invalid membership
contains duplicate raw IDs, resolution must not choose one duplicate through
first-wins, last-wins, ordering, or any other fallback.

The consumer-specific failure, result, or handling for a missing task remains
deferred. This document defines no lookup API, result union, rejection symbol,
error code, error message, or string error contract.

## Duplicate candidate ID and invalid-membership boundary

Before a future start-training operation can enter its successful atomic
commit, the raw ID of its candidate task must be unique against authoritative
running-task membership under the exact comparison above. The candidate task
must not be installed when an authoritative member already has the same raw
ID.

This pre-commit collision rule does not decide where the candidate ID comes
from, who generates it, how it is represented outside `TrainingTaskState`, or
what public rejection follows. It only forbids a successful start-training
commit from creating duplicate authoritative task membership.

If authoritative membership already contains duplicate raw task IDs, that
membership is invalid. No identity consumer may resolve such an ID by
arbitrary selection. A future start-training operation encountering this
pre-commit structural failure must not enter its successful commit or produce
any authoritative start-training effect.

Whether a duplicate candidate collision or duplicate existing membership is
represented as a structural failure, invalid runtime composition, or domain
rejection remains deferred. No public symbol, code, message, or result shape is
defined here.

## Start-training atomicity consequences

Candidate-ID collision detection and validation of existing membership belong
inside the future sim-owned start-training operation's pre-commit boundary.
Application, UI, projection, persistence, or event code must not perform a
separate authoritative check and then coordinate partial mutations.

A duplicate candidate collision, invalid duplicate membership, or any related
pre-commit structural failure extends the sealed atomic zero-change guarantee.
On such failure:

- `CompanyResourceState` is unchanged;
- authoritative running-task membership is unchanged;
- no candidate `TrainingTaskState` is installed;
- `EventQueue` is unchanged;
- `nextSequenceId` is not incremented;
- `currentDay` is not advanced;
- RNG state is unchanged; and
- the caller performs no rollback, compensation, or cleanup.

Any operation-local temporary work must be discarded internally before the
operation returns or fails. This guarantee does not select a transaction
abstraction, rollback mechanism, staging object, mutation strategy, command
API, or runtime aggregate. Success-path RNG behavior remains deferred.

## Membership and identity versus parallelism and cardinality

Membership identity and membership cardinality are separate boundaries.
Unique raw IDs say only that distinct authoritative running tasks cannot share
an identity. They do not determine how many tasks may run.

This document does not approve:

- a single active task;
- a current-task pointer;
- multiple or parallel tasks;
- any concurrency or parallelism limit;
- a minimum or maximum membership cardinality; or
- any relationship between membership size and compute, research capacity,
  checkpoint eligibility, cash, scheduling, or other gameplay rules.

Neither the existence of authoritative membership nor the use of plural
language is approval of parallelism. A future cardinality or parallelism rule,
if any, requires separate authorization.

## Runtime-composition boundary

This stage establishes that future runtime composition needs sim-owned
authoritative running-task membership. It does not decide whether that
membership is supplied through a future top-level runtime composition,
independent input, or another composition.

No top-level `SimState`, public membership representation, collection type,
repository, registry, manager, lookup function, collection factory, insertion
function, or removal function is created, proposed, or approved here. This
document is insufficient to implement runtime composition or a collection API.

## Persistence boundary

`SAVE_SCHEMA_VERSION = 1` remains unchanged.

`SimKernelState` continues to contain exactly:

- `currentDay`;
- `rngState`; and
- `eventQueue`.

Authoritative running-task membership is not inserted into schema 1. This
stage creates no serializer, parser, migration, storage adapter, full-state
save, persistence default, or future `schemaVersion`. Persistence must not
synthesize membership or missing tasks through defaults.

An event payload is not authoritative task membership and must not be
described as task persistence. The existing kernel-only envelope remains
insufficient to represent a complete playable save and must not be described
as one.

## Explicitly deferred

The following remain unapproved:

- a TypeScript representation for authoritative running-task membership;
- a public or provisional collection, lookup, insert, remove, or replacement
  API;
- a membership factory, parser, validator, or strict-input contract;
- task ID ownership, origin, generation, counter, UUID, hash, or RNG use;
- caller-owned task IDs;
- ordering;
- single-active-task, current-task, parallel-task, cardinality, concurrency,
  and parallelism rules;
- task completion removal, cancellation, failure, retry, archive, or other
  lifecycle behavior;
- checkpoint eligibility and current, latest, or first checkpoint selection;
- resource transition, reservation, release, availability checks, occupied
  arithmetic, and cross-task occupancy-sum invariants;
- cash cost or deduction;
- duration, `dueDay` calculation, and priority;
- `TrainingCompleted`, its payload, handler, executor, and task/event linkage;
- a start-training command, input, success result, or rejection;
- the consumer-specific result or failure for a missing task lookup;
- output checkpoint, output ID, output-ID timing, and lineage;
- capability delta, training outcome, training failure, and success-path RNG;
- top-level runtime composition;
- scenario;
- projection;
- application;
- UI;
- persistence, migration, storage, or schema change; and
- initial values, formulas, thresholds, probabilities, difficulty, and
  balance.

No optional field, metadata container, discriminator, version field, tag set,
extension bag, `Record<string, unknown>`, generic result, generic error,
generic collection framework, generic entity or identity framework, generic
command framework, generic transaction or unit-of-work framework, or generic
resource or reservation framework may carry these deferred decisions.

## Non-goals

This docs-only stage does not:

- create or modify TypeScript, tests, content, packages, lockfiles, README
  files, workflows, configuration, dependencies, or existing `game/docs/`;
- create or modify any public API or sim-barrel export;
- propose or approve `TrainingTaskCollection`, `TrainingTaskRepository`,
  `TrainingTaskRegistry`, `TrainingTaskManager`, `TaskId`, `TaskReference`,
  `lookupTrainingTask`, `findTrainingTask`, `installTrainingTask`,
  `removeTrainingTask`, a generic `Task`, a generic `Entity`, a generic
  `Result`, or a generic `Rejection`;
- create a generic collection, repository, registry, manager, entity,
  identity, command, transaction, unit-of-work, resource, reservation, result,
  error, or rejection framework;
- create a parser, public validator, cache, projection row, persistence
  default, metadata bag, extension bag, string error contract, or
  `Record<string, unknown>` escape hatch;
- implement task membership, task lookup, task insertion, task removal, or a
  runtime aggregate;
- implement start training, a command, result, rejection, event, payload,
  handler, executor, or resource transition;
- decide task ID generation, task cardinality, task parallelism, checkpoint
  eligibility, resource arithmetic, scheduling, capability change, training
  outcome, output checkpoint, or lineage;
- create a top-level `SimState`, scenario, projection, application behavior,
  UI, serializer, parser, migration, storage adapter, or complete save;
- modify persistence or schema 1;
- define a value, formula, cost, duration, threshold, probability, difficulty,
  or balance rule;
- promote discussion, chat, issue text, or temporary suggestions into a formal
  mechanism;
- recommend or implement a later stage; or
- authorize implementation or claim approval, publication, or sealing.

## Acceptance criteria

An independent reviewer can accept this candidate only if:

1. The sole repository change is
   `game/docs/training-task-collection-lookup-boundary.md`.
2. The stage remains docs-only and creates no public API or TypeScript symbol.
3. Authoritative running-task membership belongs only to `sim/` and contains
   only existing sealed `TrainingTaskState` members.
4. The existence of each member continues to mean that the task is running.
5. Membership uniqueness and task identity resolution both use exact equality
   of preserved raw ID strings without trimming, case-folding, or Unicode
   normalization.
6. Successful identity resolution yields exactly one authoritative running
   task.
7. Missing and duplicate identities permit no current, latest, first, or
   arbitrary fallback or selection.
8. A duplicate candidate ID cannot enter a successful start-training commit.
9. Duplicate candidate collision, invalid duplicate membership, and related
   pre-commit structural failure preserve the sealed start-training atomic
   zero-change guarantee without caller rollback, compensation, or cleanup.
10. Membership representation, lookup API, ID origin, missing-lookup
    result, cardinality, and parallelism all remain deferred.
11. Membership and identity are explicitly separated from parallelism and
    cardinality.
12. Runtime composition and every concrete collection or lookup API remain
    deferred.
13. `SAVE_SCHEMA_VERSION` remains `1`, `SimKernelState` retains exactly its
    three existing fields, and event payload is not described as task
    persistence.
14. No resource, scheduling, completion-event, checkpoint-output, command,
    persistence, scenario, projection, application, UI, formula, threshold,
    probability, difficulty, or balance decision is approved.
15. No generic framework, escape hatch, parser, public validator, or
    authority substitute is introduced.
16. No discussion material is promoted into a formal mechanism.
17. This document is explicitly insufficient to authorize implementation or a
    later stage.
18. The candidate makes no claim of approval, publication, or sealing.
