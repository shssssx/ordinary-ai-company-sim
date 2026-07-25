# Minimal start-training task-ID ownership and origin boundary

## Status and scope

This document is a docs-only technical specification candidate for `game/`. It
defines only the minimum ownership and origin boundary for the authoritative
task ID used by a future sim-owned start-training operation. It refines the
existing training-task-state, start-training atomic-transition, and
authoritative training-task-membership boundaries without replacing the
gameplay meanings in `content/`.

This candidate creates no TypeScript, tests, public API, public symbol, ID
generator, collection, lookup operation, command, event, runtime aggregate, or
persistence behavior. It does not modify the sim barrel or any sealed
implementation. It neither authorizes a start-training implementation nor
claims approval, publication, or sealing.

The terms **must**, **must not**, and **is** below are normative only for the
future boundary they describe. Every later contract, implementation, and
independent review remains separately authorized.

## Existing sealed boundaries

All existing sealed specifications and implementations remain unchanged:

- Authoritative runtime domain state belongs to `sim/`.
- `TrainingTaskState` remains the running-task value object with exactly `id`,
  `baseCheckpointId`, `computeOccupancy`, and
  `researchCapacityOccupancy`.
- `TrainingTaskStateInput.id` remains an input to the existing public
  `createTrainingTaskState` factory.
- That factory requires `id` to be a non-blank string, preserves every valid
  ID exactly, does not generate an ID, and does not check membership
  uniqueness.
- Authoritative running-task membership belongs to `sim/`, contains existing
  `TrainingTaskState` members, and requires unique preserved raw IDs.
- Candidate-ID collision detection and invalid-membership validation remain
  inside the future start-training pre-commit boundary.
- The start-training atomic-transition boundary requires every pre-commit
  failure to leave all externally observable authoritative state unchanged.
- The deterministic event queue remains the sole owner of scheduling truth
  and retains `dueDay` → `priority` → `sequenceId` ordering.
- `SAVE_SCHEMA_VERSION` remains `1`, and schema 1 remains the kernel-only
  persistence surface.
- No top-level TypeScript `SimState` or complete runtime composition is
  approved.

This document neither re-reviews nor revises those boundaries.

## Why task-ID origin is the next prerequisite

The authoritative running-task-membership boundary requires a candidate task
ID to be checked for an exact collision before a successful start-training
commit, but deliberately leaves the ID's ownership and origin unresolved. A
future start-training command contract cannot safely assign that responsibility
to a caller without weakening sim ownership and the existing atomic
zero-change guarantee.

The next prerequisite is therefore only an authority decision: the future
sim-owned start-training operation must obtain its authoritative candidate task
ID internally. This decision is insufficient to define a command API or an ID
generation mechanism.

## Factory input versus command-caller authority

`TrainingTaskStateInput.id` is only an input required by the sealed
single-value-object factory. Its presence does not prove or imply that a future
start-training command caller owns, chooses, reserves, or generates an
authoritative task ID.

`createTrainingTaskState` remains public and unchanged. A caller may invoke that
factory and receive a valid `TrainingTaskState` value, but the resulting value
does not thereby become a member of authoritative running-task membership. The
factory establishes the shape and primitive invariants of one value object; it
does not confer authority, establish origin, install membership, or establish
membership uniqueness.

No command input, success result, rejection, or placeholder TypeScript surface
is defined by this distinction.

## Sim-owned authoritative origin

The authoritative candidate task ID for a future start-training attempt must be
obtained internally by the sim-owned start-training operation. The operation
must retain authority over that ID from acquisition through task construction,
exact collision validation, and successful membership installation.

No authoritative candidate ID may be accepted as a caller-selected value or
adopted from a task value that a caller constructed in advance. This rule
defines ownership only. It does not define how the operation obtains an ID, the
form of an ID source, or any generation algorithm.

## Higher-layer non-authority

Application, UI, projection, persistence, and every other future command caller
must not:

- choose an authoritative task ID;
- reserve an authoritative task ID;
- generate an authoritative task ID;
- inject an authoritative task ID into the start-training operation;
- preinstall a task or ID in authoritative running-task membership; or
- turn a locally constructed or persisted task-shaped value into authoritative
  membership.

Higher layers may eventually submit a separately approved start-training
intent and consume separately approved results or projections. They must not
coordinate task identity as an authoritative side effect or perform identity
cleanup on failure. This boundary does not define those future inputs, results,
projections, or application behaviors.

## Raw-string identity preservation and uniqueness

An internally acquired candidate ID must still satisfy the sealed task-ID
contract:

- its runtime value is a `string`;
- `id.trim().length > 0` holds;
- the valid raw string is preserved exactly;
- it is not trimmed, case-folded, case-changed, or Unicode-normalized; and
- membership identity and uniqueness use exact equality of preserved raw
  strings.

The internally acquired candidate must be unique against authoritative
running-task membership under that exact comparison. Existing membership with
duplicate preserved raw IDs remains invalid and must not be resolved by
first-wins, last-wins, ordering, or any other arbitrary choice.

Internal sim ownership does not loosen, canonicalize, or replace any sealed
identity invariant.

## Pre-commit collision and atomicity consequences

ID acquisition, candidate `TrainingTaskState` construction through the sealed
factory, exact candidate-collision validation, validation that existing
authoritative membership has no duplicate raw IDs, and authoritative membership
installation all belong to one sim-owned start-training atomic boundary.
Construction and validation occur before successful commit; installation
becomes externally authoritative only as part of that successful commit. None
of these responsibilities may be split across the command caller and the sim.

A candidate collision, invalid duplicate membership, structurally invalid
acquired ID, task-construction failure, ID-acquisition structural failure, or
any other pre-commit failure must preserve the complete existing start-training
zero-change guarantee:

- `CompanyResourceState` is unchanged;
- authoritative running-task membership is unchanged;
- no candidate `TrainingTaskState` or candidate ID is installed;
- authoritative checkpoint membership is unchanged;
- `EventQueue` is unchanged;
- `nextSequenceId` is not incremented;
- `currentDay` is not advanced;
- RNG state is unchanged; and
- the caller performs no rollback, compensation, or cleanup.

Operation-local candidate values or other temporary work must be discarded
inside the start-training operation. This guarantee does not select a
transaction abstraction, rollback mechanism, staging object, mutation
strategy, retry policy, or command API.

## Future generator-state failure zero-change

This candidate does not define or propose an ID generator. If a separately
approved future design uses a counter, RNG, or any other state while acquiring
a task ID, every change to that state is an authoritative success effect of the
same start-training atomic commit.

No collision, invalid duplicate membership, structural failure in a separately
approved future generator or other ID acquisition, task-construction failure,
or other pre-commit failure may consume, advance, reserve, or otherwise change
that state. A failed attempt must be indistinguishable from no attempt with
respect to every such authoritative state value.

This failure rule does not approve a counter, RNG use, retry, exhaustion
behavior, draw order, or any other algorithm.

## Task ID versus output checkpoint ID separation

The running task's ID and a future output checkpoint's ID are separate
identities. This boundary makes no assumption that they share a format, source,
counter, RNG, namespace, acquisition mechanism, or generation order.

No output checkpoint ID is acquired, reserved, derived, or returned by this
candidate. Whether an output checkpoint ID is obtained when training starts,
when training completes, or at another separately approved boundary remains
deferred, as do output-checkpoint construction and membership.

## Runtime composition and API boundary

This candidate establishes only that the future sim-owned start-training
operation owns authoritative task-ID acquisition and coordinates it with the
existing conceptual authoritative running-task membership.

It creates, proposes, and approves no:

- top-level `SimState`;
- representation for running-task membership;
- collection, lookup, insert, remove, or replacement API;
- ID-source or generator symbol;
- command input, success result, or rejection;
- public symbol, public API, sim-barrel export, or provisional TypeScript
  signature; or
- runtime composition choice.

The existing public `createTrainingTaskState` API and all existing barrel
exports remain exactly unchanged.

## Persistence boundary

`SAVE_SCHEMA_VERSION` remains `1`. `SimKernelState` continues to contain
exactly:

- `currentDay`;
- `rngState`; and
- `eventQueue`.

Neither authoritative running-task membership nor task-ID acquisition state
enters schema 1. This candidate creates no storage representation, serializer,
parser, migration, full-state save, persistence default, or schema change.

If a future task-ID mechanism requires a persistent counter or any other
persistent state, that state requires a separate proposal, authorization,
implementation, and independent review. It must not be silently inserted into
schema 1 or reconstructed from a default.

A generic event payload is not authoritative task identity, running-task
membership, or task-ID acquisition-state persistence. The existing kernel-only
envelope remains insufficient to represent a complete playable save and must
not be described as one.

## Explicitly deferred decisions

The following remain unapproved:

- UUID, hash, counter, numeric sequence, prefix, RNG, or any other ID
  algorithm or format;
- any generator name, function, interface, class, service, factory, source, or
  public surface;
- collision retry and generation-exhaustion behavior;
- RNG use and draw order;
- caller-supplied or caller-owned authoritative task IDs;
- a task-ID field in a success result;
- output checkpoint ID, source, timing, format, and membership;
- a start-training command, input, success result, rejection, or result union;
- authoritative checkpoint- or task-membership representation;
- collection lookup, insert, remove, or replacement APIs;
- resource arithmetic, reservation, cash cost, capacity rejection, release,
  and cross-task occupancy rules;
- duration, `dueDay` calculation, and priority;
- `TrainingCompleted` kind, payload, handler, executor, and task/event linkage;
- cardinality, parallelism, concurrency, and single-active-task rules;
- top-level runtime composition or `SimState`;
- scenario, projection, application behavior, and UI;
- storage, full-state persistence, migration, serialization, and schema
  change; and
- initial values, formulas, thresholds, probabilities, difficulty, and
  balance.

No optional field, metadata container, discriminator, version field, extension
bag, `Record<string, unknown>`, generic result, string error, generic
collection or entity framework, generic identity or task framework, generic
command framework, generic transaction or unit-of-work framework, or generic
resource or reservation framework may carry these deferred decisions.

## Non-goals

This docs-only candidate does not:

- create or modify TypeScript, tests, content, packages, lockfiles, README
  files, configuration, workflows, dependencies, or existing `game/docs/`;
- implement task state, authoritative membership, lookup, ID acquisition, ID
  generation, a resource transition, completion scheduling, a command, an
  event, a `SimState`, a scenario, a projection, application behavior, UI, or
  persistence;
- create a repository, registry, manager, service, parser, public validator,
  cache, generic framework, or reusable infrastructure abstraction;
- define resource arithmetic, reservation, cost, capacity rejection, release,
  duration, due-day calculation, priority, training outcome, capability
  change, output checkpoint, or completion behavior;
- alter schema 1 or describe a generic event payload as task persistence;
- promote discussion, chat, issue text, or temporary suggestions into a formal
  mechanism;
- authorize a later implementation or final-review stage; or
- claim approval, publication, or sealing.

## Acceptance criteria

An independent reviewer can accept this candidate only if:

1. The sole repository change is
   `game/docs/start-training-task-id-origin-boundary.md`.
2. The stage remains docs-only and creates no public API, public symbol, or
   provisional TypeScript surface.
3. `TrainingTaskStateInput.id` is identified only as sealed factory input and
   not as evidence of command-caller authority.
4. The existing public `createTrainingTaskState` remains unchanged, and a
   value returned by an external factory call does not automatically become
   authoritative membership.
5. The future sim-owned start-training operation internally obtains and retains
   authority over the candidate task ID.
6. Application, UI, projection, persistence, and other command callers cannot
   choose, reserve, generate, inject, or preinstall the authoritative task ID.
7. Non-blank validation, exact preservation, exact-string identity, and
   authoritative membership uniqueness remain unchanged.
8. ID acquisition, task construction, exact collision validation, existing
   membership validation, and membership installation share one atomic
   start-training boundary.
9. Candidate collision, invalid duplicate membership, structural failure in a
   separately approved future generator or other ID acquisition, and every
   other pre-commit failure preserve complete authoritative zero-change
   without caller cleanup.
10. Any future state used for ID acquisition changes only as an authoritative
    success effect and is neither consumed nor advanced on failure.
11. Task ID and output checkpoint ID remain separate, with no shared-format,
    counter, RNG, source, or ordering assumption.
12. Generator algorithm and surface, retry, exhaustion, command API, result,
    rejection, resources, scheduling, completion, runtime composition,
    scenario, projection, application, UI, persistence, and balance remain
    deferred.
13. `SAVE_SCHEMA_VERSION` remains `1`; `SimKernelState` retains exactly
    `currentDay`, `rngState`, and `eventQueue`; membership and ID-acquisition
    state do not enter schema 1.
14. A future persistent counter or other ID-acquisition state requires a
    separate proposal, and a generic event payload is not task identity
    persistence.
15. No implementation or later stage is authorized, and this candidate makes
    no claim of approval, publication, or sealing.
