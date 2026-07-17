import {
  nextUint32,
  peekNextEvent,
  type EventQueue,
  type JsonValue,
  type Mulberry32State,
} from "../sim"

export const SAVE_SCHEMA_VERSION = 1 as const

export interface ScenarioReference {
  readonly id: string
  readonly version: string
}

export interface SimKernelState<
  TEventPayload extends JsonValue = JsonValue,
> {
  readonly currentDay: number
  readonly rngState: Mulberry32State
  readonly eventQueue: EventQueue<TEventPayload>
}

export interface SaveEnvelope<
  TEventPayload extends JsonValue = JsonValue,
> {
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION
  readonly rulesVersion: string
  readonly scenario: ScenarioReference
  readonly simState: SimKernelState<TEventPayload>
}

export interface CreateSaveEnvelopeInput<
  TEventPayload extends JsonValue = JsonValue,
> {
  readonly rulesVersion: string
  readonly scenario: ScenarioReference
  readonly simState: SimKernelState<TEventPayload>
}

export interface SaveCompatibility {
  readonly rulesVersion: string
  readonly scenario: ScenarioReference
}

type PlainRecord = Record<PropertyKey, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function snapshotExactDataProperties(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new TypeError(`${label} must be a plain object`)
  }

  const expectedKeySet = new Set(expectedKeys)
  const ownKeys = Reflect.ownKeys(value)
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some(
      (key) => typeof key !== "string" || !expectedKeySet.has(key),
    )
  ) {
    throw new TypeError(`${label} must contain exactly the approved fields`)
  }

  const snapshot: Record<string, unknown> = {}
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError(
        `${label}.${key} must be an own enumerable data property`,
      )
    }
    snapshot[key] = descriptor.value
  }

  return snapshot
}

function assertNonBlankString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-blank string`)
  }

  return value
}

function assertCurrentDay(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError("simState.currentDay must be a non-negative safe integer")
  }

  return value as number
}

function snapshotScenarioReference(value: unknown): ScenarioReference {
  const properties = snapshotExactDataProperties(
    value,
    ["id", "version"],
    "scenario",
  )

  return {
    id: assertNonBlankString(properties.id, "scenario.id"),
    version: assertNonBlankString(properties.version, "scenario.version"),
  }
}

function validateRngState(value: unknown): Mulberry32State {
  const rngState = value as Mulberry32State
  void nextUint32(rngState)
  return rngState
}

function validateEventQueue<TEventPayload extends JsonValue>(
  value: unknown,
): EventQueue<TEventPayload> {
  const eventQueue = value as EventQueue<TEventPayload>
  void peekNextEvent(eventQueue)
  return eventQueue
}

function snapshotSimKernelState<TEventPayload extends JsonValue>(
  value: unknown,
): SimKernelState<TEventPayload> {
  const properties = snapshotExactDataProperties(
    value,
    ["currentDay", "rngState", "eventQueue"],
    "simState",
  )

  return {
    currentDay: assertCurrentDay(properties.currentDay),
    rngState: validateRngState(properties.rngState),
    eventQueue: validateEventQueue<TEventPayload>(properties.eventQueue),
  }
}

function snapshotCreateSaveEnvelopeInput<
  TEventPayload extends JsonValue,
>(
  input: CreateSaveEnvelopeInput<TEventPayload>,
): CreateSaveEnvelopeInput<TEventPayload> {
  const properties = snapshotExactDataProperties(
    input,
    ["rulesVersion", "scenario", "simState"],
    "create input",
  )

  return {
    rulesVersion: assertNonBlankString(
      properties.rulesVersion,
      "rulesVersion",
    ),
    scenario: snapshotScenarioReference(properties.scenario),
    simState: snapshotSimKernelState<TEventPayload>(properties.simState),
  }
}

function snapshotSaveEnvelope(value: unknown): SaveEnvelope {
  const properties = snapshotExactDataProperties(
    value,
    ["schemaVersion", "rulesVersion", "scenario", "simState"],
    "SaveEnvelope",
  )

  if (properties.schemaVersion !== SAVE_SCHEMA_VERSION) {
    throw new RangeError("Unsupported save schema version")
  }

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    rulesVersion: assertNonBlankString(
      properties.rulesVersion,
      "rulesVersion",
    ),
    scenario: snapshotScenarioReference(properties.scenario),
    simState: snapshotSimKernelState(properties.simState),
  }
}

function snapshotSaveCompatibility(value: unknown): SaveCompatibility {
  const properties = snapshotExactDataProperties(
    value,
    ["rulesVersion", "scenario"],
    "save compatibility",
  )

  return {
    rulesVersion: assertNonBlankString(
      properties.rulesVersion,
      "rulesVersion",
    ),
    scenario: snapshotScenarioReference(properties.scenario),
  }
}

export function createSaveEnvelope<TEventPayload extends JsonValue>(
  input: CreateSaveEnvelopeInput<TEventPayload>,
): SaveEnvelope<TEventPayload> {
  const snapshot = snapshotCreateSaveEnvelopeInput(input)

  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    rulesVersion: snapshot.rulesVersion,
    scenario: snapshot.scenario,
    simState: snapshot.simState,
  }
}

export function parseSaveEnvelope(value: unknown): SaveEnvelope {
  return snapshotSaveEnvelope(value)
}

export function assertSaveCompatibility(
  envelope: SaveEnvelope,
  expected: SaveCompatibility,
): void {
  const envelopeSnapshot = snapshotSaveEnvelope(envelope)
  const expectedSnapshot = snapshotSaveCompatibility(expected)

  if (envelopeSnapshot.rulesVersion !== expectedSnapshot.rulesVersion) {
    throw new Error("Save rulesVersion is incompatible")
  }
  if (envelopeSnapshot.scenario.id !== expectedSnapshot.scenario.id) {
    throw new Error("Save scenario id is incompatible")
  }
  if (
    envelopeSnapshot.scenario.version !== expectedSnapshot.scenario.version
  ) {
    throw new Error("Save scenario version is incompatible")
  }
}
