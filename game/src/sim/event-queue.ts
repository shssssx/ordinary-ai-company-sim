import type { JsonValue, ReadonlyJsonValue } from "./types"

export interface ScheduledEvent<TPayload extends JsonValue = JsonValue> {
  readonly dueDay: number
  readonly priority: number
  readonly sequenceId: number
  readonly payload: ReadonlyJsonValue<TPayload>
}

export interface ScheduleEventInput<TPayload extends JsonValue = JsonValue> {
  readonly dueDay: number
  readonly priority: number
  readonly payload: TPayload
}

export interface EventQueue<TPayload extends JsonValue = JsonValue> {
  readonly events: readonly ScheduledEvent<TPayload>[]
  readonly nextSequenceId: number
}

export interface ScheduleEventResult<TPayload extends JsonValue = JsonValue> {
  readonly queue: EventQueue<TPayload>
  readonly event: ScheduledEvent<TPayload>
}

export interface PopNextEventResult<TPayload extends JsonValue = JsonValue> {
  readonly queue: EventQueue<TPayload>
  readonly event: ScheduledEvent<TPayload> | undefined
}

type PlainRecord = Record<PropertyKey, unknown>

interface ScheduledEventOrder {
  readonly dueDay: number
  readonly priority: number
  readonly sequenceId: number
}

interface ScheduledEventSnapshot<TPayload extends JsonValue>
  extends ScheduledEventOrder {
  readonly event: ScheduledEvent<TPayload>
}

interface EventQueueSnapshot<TPayload extends JsonValue> {
  readonly events: readonly ScheduledEventSnapshot<TPayload>[]
  readonly nextSequenceId: number
}

interface ScheduleEventInputSnapshot<TPayload extends JsonValue> {
  readonly dueDay: number
  readonly priority: number
  readonly payload: TPayload
}

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function readOwnEnumerableDataProperty(
  value: PlainRecord,
  key: string,
  label: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  if (
    descriptor === undefined ||
    !descriptor.enumerable ||
    !("value" in descriptor)
  ) {
    throw new TypeError(label + " must be an own enumerable data property")
  }

  return descriptor.value
}

function snapshotStandardArray(
  value: unknown,
  label: string,
): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    throw new TypeError(label + " must be a standard array")
  }

  const ownKeys = Reflect.ownKeys(value)
  if (ownKeys.length !== value.length + 1 || !ownKeys.includes("length")) {
    throw new TypeError(label + " must not contain holes or extra properties")
  }

  const elements: unknown[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError(label + " must contain enumerable data properties")
    }
    elements.push(descriptor.value)
  }

  return elements
}

function assertSafeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer`)
  }
}

function assertNonNegativeSafeInteger(
  value: unknown,
  label: string,
): asserts value is number {
  assertSafeInteger(value, label)
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative`)
  }
}

function assertJsonValue(
  value: unknown,
  ancestors: Set<object> = new Set(),
): asserts value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("JSON numbers must be finite")
    }
    return
  }

  if (typeof value !== "object") {
    throw new TypeError("Payload must be a JSON value")
  }

  if (ancestors.has(value)) {
    throw new TypeError("Payload must not contain circular references")
  }

  ancestors.add(value)

  if (Array.isArray(value)) {
    const elements = snapshotStandardArray(value, "JSON arrays")
    for (const element of elements) {
      assertJsonValue(element, ancestors)
    }

    ancestors.delete(value)
    return
  }

  if (!isPlainRecord(value)) {
    throw new TypeError("JSON objects must be plain objects")
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new TypeError("JSON objects must not contain symbol keys")
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError("JSON objects must contain enumerable data properties")
    }
    assertJsonValue(descriptor.value, ancestors)
  }

  ancestors.delete(value)
}

function readonlyJsonValueView<TValue extends JsonValue>(
  value: TValue,
): ReadonlyJsonValue<TValue> {
  return value as ReadonlyJsonValue<TValue>
}

function compareNumbers(left: number, right: number): number {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

function compareScheduledEvents(
  left: ScheduledEventOrder,
  right: ScheduledEventOrder,
): number {
  return (
    compareNumbers(left.dueDay, right.dueDay) ||
    compareNumbers(left.priority, right.priority) ||
    compareNumbers(left.sequenceId, right.sequenceId)
  )
}

function snapshotScheduledEvent<TPayload extends JsonValue>(
  event: unknown,
): ScheduledEventSnapshot<TPayload> {
  if (!isPlainRecord(event)) {
    throw new TypeError("Scheduled events must be plain objects")
  }

  const dueDay = readOwnEnumerableDataProperty(
    event,
    "dueDay",
    "Event dueDay",
  )
  const priority = readOwnEnumerableDataProperty(
    event,
    "priority",
    "Event priority",
  )
  const sequenceId = readOwnEnumerableDataProperty(
    event,
    "sequenceId",
    "Event sequenceId",
  )
  const payload = readOwnEnumerableDataProperty(
    event,
    "payload",
    "Event payload",
  )

  assertNonNegativeSafeInteger(dueDay, "Event dueDay")
  assertSafeInteger(priority, "Event priority")
  assertNonNegativeSafeInteger(sequenceId, "Event sequenceId")
  assertJsonValue(payload)

  return {
    event: event as unknown as ScheduledEvent<TPayload>,
    dueDay,
    priority,
    sequenceId,
  }
}

function snapshotEventQueue<TPayload extends JsonValue>(
  queue: EventQueue<TPayload>,
): EventQueueSnapshot<TPayload> {
  if (!isPlainRecord(queue)) {
    throw new TypeError("Event queue must be a plain object")
  }

  const eventsValue = readOwnEnumerableDataProperty(
    queue,
    "events",
    "Event queue events",
  )
  const nextSequenceId = readOwnEnumerableDataProperty(
    queue,
    "nextSequenceId",
    "nextSequenceId",
  )
  const eventValues = snapshotStandardArray(eventsValue, "Event queue events")
  assertNonNegativeSafeInteger(nextSequenceId, "nextSequenceId")

  const seenSequenceIds = new Set<number>()
  const events: ScheduledEventSnapshot<TPayload>[] = []
  let previous: ScheduledEventSnapshot<TPayload> | undefined

  for (const eventValue of eventValues) {
    const event = snapshotScheduledEvent<TPayload>(eventValue)

    if (event.sequenceId >= nextSequenceId) {
      throw new RangeError("Event sequenceId must be less than nextSequenceId")
    }
    if (seenSequenceIds.has(event.sequenceId)) {
      throw new TypeError("Event sequenceId values must be unique")
    }
    if (previous !== undefined && compareScheduledEvents(previous, event) >= 0) {
      throw new TypeError("Event queue must already be sorted")
    }

    seenSequenceIds.add(event.sequenceId)
    events.push(event)
    previous = event
  }

  return {
    events,
    nextSequenceId,
  }
}

function snapshotScheduleEventInput<TPayload extends JsonValue>(
  input: ScheduleEventInput<TPayload>,
): ScheduleEventInputSnapshot<TPayload> {
  if (!isPlainRecord(input)) {
    throw new TypeError("Scheduled event input must be a plain object")
  }
  if (Object.prototype.hasOwnProperty.call(input, "sequenceId")) {
    throw new TypeError("Scheduled event input must not provide sequenceId")
  }

  const dueDay = readOwnEnumerableDataProperty(
    input,
    "dueDay",
    "Event dueDay",
  )
  const priority = readOwnEnumerableDataProperty(
    input,
    "priority",
    "Event priority",
  )
  const payload = readOwnEnumerableDataProperty(
    input,
    "payload",
    "Event payload",
  )

  assertNonNegativeSafeInteger(dueDay, "Event dueDay")
  assertSafeInteger(priority, "Event priority")
  assertJsonValue(payload)

  return {
    dueDay,
    priority,
    payload: payload as TPayload,
  }
}

export function createEventQueue<
  TPayload extends JsonValue = JsonValue,
>(): EventQueue<TPayload> {
  return {
    events: [],
    nextSequenceId: 0,
  }
}

export function scheduleEvent<TPayload extends JsonValue>(
  queue: EventQueue<TPayload>,
  input: ScheduleEventInput<TPayload>,
): ScheduleEventResult<TPayload> {
  const queueSnapshot = snapshotEventQueue(queue)
  if (queueSnapshot.nextSequenceId === Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Event sequenceId space is exhausted")
  }
  const inputSnapshot = snapshotScheduleEventInput(input)

  const event: ScheduledEvent<TPayload> = {
    dueDay: inputSnapshot.dueDay,
    priority: inputSnapshot.priority,
    sequenceId: queueSnapshot.nextSequenceId,
    payload: readonlyJsonValueView(inputSnapshot.payload),
  }
  const events = [
    ...queueSnapshot.events,
    {
      event,
      dueDay: inputSnapshot.dueDay,
      priority: inputSnapshot.priority,
      sequenceId: queueSnapshot.nextSequenceId,
    },
  ].sort(compareScheduledEvents)

  return {
    queue: {
      events: events.map((entry) => entry.event),
      nextSequenceId: queueSnapshot.nextSequenceId + 1,
    },
    event,
  }
}

export function peekNextEvent<TPayload extends JsonValue>(
  queue: EventQueue<TPayload>,
): ScheduledEvent<TPayload> | undefined {
  const queueSnapshot = snapshotEventQueue(queue)
  return queueSnapshot.events[0]?.event
}

export function popNextEvent<TPayload extends JsonValue>(
  queue: EventQueue<TPayload>,
): PopNextEventResult<TPayload> {
  const queueSnapshot = snapshotEventQueue(queue)

  const first = queueSnapshot.events[0]
  if (first === undefined) {
    return { queue, event: undefined }
  }

  return {
    queue: {
      events: queueSnapshot.events.slice(1).map((entry) => entry.event),
      nextSequenceId: queueSnapshot.nextSequenceId,
    },
    event: first.event,
  }
}
