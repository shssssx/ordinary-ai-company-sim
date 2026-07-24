# Minimal authoritative checkpoint collection and exact lookup boundary

## Status and scope

This document is a docs-only technical specification candidate for `game/`. It
defines only the minimum authoritative checkpoint-membership and exact
identity-resolution boundary needed before a future start-training contract can
be considered. It refines the existing technical architecture, runtime-state,
checkpoint-state, training-task-state, and start-training atomic-transition
boundaries without replacing the gameplay meanings in `content/`.

This stage creates no TypeScript, tests, public API, public symbol, lookup
function, collection implementation, or runtime aggregate. It does not modify
the sim barrel, content, persistence, or schema 1. It neither authorizes a
start-training implementation nor claims that this candidate is approved,
published, or sealed. Every later contract, implementation, and independent
review remains separately authorized.

The terms **must**, **must not**, and **is** below are normative only for the
future boundary they describe. Discussion material was considered only as
background and is not promoted into a formal mechanism.

## Existing sealed boundaries

All existing sealed specifications and implementations remain unchanged:

- Authoritative runtime domain state belongs to `sim/`.
- `CheckpointState` is the existing sealed completed-model snapshot with
  exactly `id` and its owned hidden capability.
- A valid `CheckpointState.id` is preserved exactly as supplied. Its
  single-object factory does not establish uniqueness across checkpoints.
- `TrainingTaskState.baseCheckpointId` is a non-blank string preserved exactly
  as supplied. Its single-object factory performs no checkpoint existence
  lookup.
- `CompanyResourceState` owns global company-resource truth.
- The deterministic event queue retains
  `dueDay` → `priority` → `sequenceId` ordering and owns scheduling truth.
- The start-training atomic-transition boundary requires every failure before
  commit to leave externally observable authoritative state unchanged.
- No top-level TypeScript `SimState` or complete runtime composition is sealed.
- Schema 1 remains the kernel-only persistence surface.

This document neither re-reviews nor revises those boundaries.

## Why checkpoint identity resolution is the next dependency

A running training task refers to its base checkpoint only through
`baseCheckpointId`. A future start-training operation therefore cannot validate
that reference from an isolated task value. It first needs a single
authoritative answer to two limited questions:

1. Which completed checkpoints are authoritative runtime members?
2. Does the supplied raw ID identify exactly one of those members?

This dependency is identity resolution only. It does not settle training-base
eligibility, checkpoint ordering or lifecycle, task ownership, resource rules,
scheduling rules, command results, or runtime composition.

## Authoritative ownership and membership

Authoritative checkpoint membership belongs to `sim/`. Application,
projection, UI, and persistence layers must not maintain an authoritative
membership copy or decide which checkpoint instances are authoritative.

Every authoritative member must be an existing sealed `CheckpointState`.
Membership must not substitute an ID-only record, projection row, cache entry,
event payload, persistence default, or another checkpoint-shaped object for
that state.

The word **collection** in this document is only the ordinary-language name for
this authoritative ownership and membership boundary. It is not an approved
TypeScript symbol, data structure, public surface, factory, repository,
registry, or manager.

## Exact checkpoint ID uniqueness

Within authoritative checkpoint membership, every checkpoint ID must be
unique.

Uniqueness is determined solely by exact equality of the original string
stored in `CheckpointState.id`:

- do not trim;
- do not change case or case-fold;
- do not normalize Unicode;
- do not use an alias, label, or display name; and
- do not derive a replacement identity.

Two authoritative members with the same stored raw ID cannot form valid
authoritative membership. Duplicate IDs must not use first-wins, last-wins,
array order, insertion order, object traversal order, or any other arbitrary
selection rule.

This boundary defines no UUID form, hash form, numeric sequence, ID generator,
maximum length, or Unicode normal form.

## Exact lookup semantics

`TrainingTaskState.baseCheckpointId` is an ID reference to an authoritative
completed checkpoint.

Resolving that reference must compare the preserved
`TrainingTaskState.baseCheckpointId` string with the preserved
`CheckpointState.id` string using exact string equality. Resolution must not
trim, case-fold, normalize Unicode, consult aliases, or compare display names.

A successful existence resolution yields exactly one authoritative
`CheckpointState`. The result must come from authoritative sim-owned membership,
not from UI, projection, cache, event payload, or a value synthesized or
defaulted by persistence.

When no exact authoritative match exists, resolution must not substitute a
current, latest, first, nearest, or arbitrary checkpoint.

## Missing-reference boundary

If `baseCheckpointId` has no exact match in authoritative checkpoint
membership, a future start-training operation must not commit successfully.
That failure must preserve the sealed atomic zero-change guarantee:

- `CompanyResourceState` is unchanged;
- no `TrainingTaskState` is installed in an authoritative owner;
- `EventQueue` is unchanged;
- `nextSequenceId` is not incremented;
- `currentDay` is not advanced;
- RNG state is unchanged; and
- the caller performs no rollback, compensation, or cleanup.

This stage defines no rejection symbol, rejection code, rejection message,
result union, generic error, or string error for the missing-reference case.

## Duplicate-ID boundary

If runtime checkpoint membership contains duplicate raw
`CheckpointState.id` values, the reference must not resolve by arbitrary
selection. In particular, resolution must not depend on array order, insertion
order, object traversal order, first-wins, or last-wins behavior.

The future start-training operation must not enter a successful commit and must
produce no authoritative start-training effect. The same zero-change guarantee
applies:

- `CompanyResourceState` is unchanged;
- no `TrainingTaskState` is installed;
- `EventQueue` and `nextSequenceId` are unchanged;
- `currentDay` and RNG state are unchanged; and
- the caller performs no rollback, compensation, or cleanup.

Whether duplicate membership is represented as a structural failure, invalid
runtime composition, or domain rejection remains deferred. This document
defines no corresponding public symbol, code, message, or result shape.

## Base-reference resolution versus gameplay eligibility

Existence resolution and additional gameplay eligibility are separate
boundaries.

**Existence resolution** asks only whether `baseCheckpointId` resolves by exact
raw-string equality to exactly one authoritative completed
`CheckpointState`. This document approves that limited question.

**Additional gameplay eligibility** would ask whether that resolved checkpoint
may serve as a training base under future gameplay rules. This document
approves no such rule. Successful existence resolution does not imply that all
future eligibility requirements are satisfied.

In particular, this stage does not decide or infer that:

- only a current checkpoint may be used;
- a released checkpoint may or may not be used;
- only the latest checkpoint may be used;
- existence alone satisfies every future eligibility rule;
- rollback state changes eligibility;
- lineage is required; or
- model architecture, data, resources, or other conditions determine
  eligibility.

## Start-training atomicity consequences

Reference resolution must occur within the future sim-owned start-training
operation's pre-commit validation boundary. Application, projection, UI, or
persistence code must not resolve a reference separately and then coordinate
partial authoritative mutations.

Missing references and duplicate authoritative IDs are both incompatible with
a successful start-training commit. Neither case may leave resources changed,
a running task installed, an event scheduled, a sequence ID consumed, time
advanced, or RNG advanced.

This requirement extends the existing start-training atomic zero-change
guarantee to identity-resolution failure. It does not select an implementation
strategy, transaction abstraction, rollback mechanism, command API, or mutation
model.

## Runtime-composition boundary

This stage establishes that a future runtime needs sim-owned authoritative
checkpoint membership. It does not decide whether that membership is supplied
through a future top-level runtime composition, an independent parameter, or
another composition.

No top-level `SimState`, public checkpoint-membership representation,
repository, registry, manager, lookup function, or collection factory is
created, proposed, or approved here.

## Persistence boundary

`SAVE_SCHEMA_VERSION = 1` remains unchanged.

`SimKernelState` continues to contain exactly:

- `currentDay`;
- `rngState`; and
- `eventQueue`.

Authoritative checkpoint membership is not inserted into schema 1. This stage
creates no serializer, parser, migration, storage adapter, full-state save, or
future `schemaVersion`. Persistence must not synthesize membership or missing
checkpoints through defaults.

The existing kernel-only envelope remains insufficient to represent a complete
playable save and must not be described as one.

## Explicitly deferred

The following remain unapproved:

- a TypeScript representation for authoritative checkpoint membership;
- a lookup API;
- a factory, parser, validator, or strict-input contract for membership;
- insertion, removal, or replacement;
- ordering;
- deletion or archive behavior;
- checkpoint ID generation;
- current checkpoint;
- current training base;
- release pointer;
- `parentId`;
- lineage;
- rollback implementation;
- task ID ownership;
- task collection and task uniqueness;
- single-active-task or parallel-task rules;
- a start-training command, input, result, or rejection;
- resource arithmetic, reservation, release, cash deduction, and availability
  rules;
- duration, `dueDay`, and priority;
- event kind, payload, handler, and task/event linkage;
- output checkpoint and output-ID timing;
- capability delta;
- training failure;
- success-path RNG consumption or draw order;
- top-level runtime composition;
- scenario;
- projection;
- application;
- UI;
- persistence, migration, or schema change; and
- initial values, formulas, thresholds, probabilities, difficulty, and
  balance.

No open-ended field, metadata container, discriminator, version field, tag
set, unknown-value record, extension bag, generic result, generic error,
generic collection framework, generic command framework, generic transaction
framework, or generic resource framework may be used to carry these deferred
decisions.

## Non-goals

This docs-only stage does not:

- create or modify TypeScript, tests, content, packages, lockfiles, README
  files, workflows, or dependencies;
- modify any existing `game/docs/` document;
- implement checkpoint membership or reference lookup;
- create or modify any public API or sim-barrel export;
- implement start training, a command, an event, a resource transition, a
  collection, a task collection, or a runtime aggregate;
- decide checkpoint lifecycle, training-base eligibility, task identity,
  task parallelism, resource arithmetic, scheduling, capability change, or
  training outcome;
- modify persistence or schema 1;
- promote discussion, chat, issue text, or temporary suggestions into a formal
  mechanism; or
- authorize implementation or claim approval, publication, or sealing.

## Acceptance criteria

An independent reviewer can accept this candidate only if:

1. The sole repository change is
   `game/docs/checkpoint-collection-lookup-boundary.md`.
2. The stage remains docs-only and creates no public API or TypeScript symbol.
3. Authoritative checkpoint membership belongs only to `sim/` and contains
   only existing sealed `CheckpointState` members.
4. Membership uniqueness and reference lookup both use exact equality of the
   stored raw ID strings without trimming, case conversion, or Unicode
   normalization.
5. Successful existence resolution yields exactly one authoritative completed
   checkpoint.
6. Missing and duplicate IDs permit no arbitrary fallback or selection.
7. Either identity-resolution failure preserves the sealed start-training
   atomic zero-change guarantee.
8. Existence resolution is explicitly separated from additional gameplay
   eligibility.
9. Runtime composition and every concrete representation or API remain
   deferred.
10. `SAVE_SCHEMA_VERSION` remains `1`, `SimKernelState` retains exactly its
    three existing fields, and the kernel-only envelope is not called a
    complete playable save.
11. No task-identity, parallelism, resource, scheduling, command-result,
    persistence, scenario, projection, application, UI, formula, threshold,
    probability, difficulty, or balance decision is approved.
12. No discussion material is promoted into a formal mechanism.
13. This document is explicitly insufficient to authorize a start-training
    implementation.
14. The candidate makes no claim of approval, publication, or sealing.
