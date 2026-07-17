import type { JsonValue } from "./types"

export interface ScheduledEvent<TPayload extends JsonValue = JsonValue> {
  readonly dueDay: number
  readonly priority: number
  readonly sequenceId: number
  readonly payload: TPayload
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

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
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
    const ownKeys = Reflect.ownKeys(value)
    if (ownKeys.length !== value.length + 1 || !ownKeys.includes("length")) {
      throw new TypeError("JSON arrays must not contain holes or extra properties")
    }

    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        throw new TypeError("JSON arrays must contain plain values")
      }
      assertJsonValue(descriptor.value, ancestors)
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
  left: ScheduledEvent,
  right: ScheduledEvent,
): number {
  return (
    compareNumbers(left.dueDay, right.dueDay) ||
    compareNumbers(left.priority, right.priority) ||
    compareNumbers(left.sequenceId, right.sequenceId)
  )
}

function assertScheduledEvent(event: unknown): asserts event is ScheduledEvent {
  if (!isPlainRecord(event)) {
    throw new TypeError("Scheduled events must be plain objects")
  }

  assertNonNegativeSafeInteger(event.dueDay, "Event dueDay")
  assertSafeInteger(event.priority, "Event priority")
  assertNonNegativeSafeInteger(event.sequenceId, "Event sequenceId")
  assertJsonValue(event.payload)
}

function assertEventQueue<TPayload extends JsonValue>(
  queue: EventQueue<TPayload>,
): void {
  if (!isPlainRecord(queue) || !Array.isArray(queue.events)) {
    throw new TypeError("Event queue must be a plain object with an events array")
  }

  assertNonNegativeSafeInteger(queue.nextSequenceId, "nextSequenceId")

  const seenSequenceIds = new Set<number>()
  let previous: ScheduledEvent | undefined

  for (const event of queue.events) {
    assertScheduledEvent(event)

    if (event.sequenceId >= queue.nextSequenceId) {
      throw new RangeError("Event sequenceId must be less than nextSequenceId")
    }
    if (seenSequenceIds.has(event.sequenceId)) {
      throw new TypeError("Event sequenceId values must be unique")
    }
    if (previous !== undefined && compareScheduledEvents(previous, event) >= 0) {
      throw new TypeError("Event queue must already be sorted")
    }

    seenSequenceIds.add(event.sequenceId)
    previous = event
  }
}

function assertScheduleEventInput(
  input: ScheduleEventInput,
): asserts input is ScheduleEventInput {
  if (!isPlainRecord(input)) {
    throw new TypeError("Scheduled event input must be a plain object")
  }
  if (Object.prototype.hasOwnProperty.call(input, "sequenceId")) {
    throw new TypeError("Scheduled event input must not provide sequenceId")
  }

  assertNonNegativeSafeInteger(input.dueDay, "Event dueDay")
  assertSafeInteger(input.priority, "Event priority")
  assertJsonValue(input.payload)
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
  assertEventQueue(queue)
  if (queue.nextSequenceId === Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Event sequenceId space is exhausted")
  }
  assertScheduleEventInput(input)

  const event: ScheduledEvent<TPayload> = {
    dueDay: input.dueDay,
    priority: input.priority,
    sequenceId: queue.nextSequenceId,
    payload: input.payload,
  }
  const events = [...queue.events, event].sort(compareScheduledEvents)

  return {
    queue: {
      events,
      nextSequenceId: queue.nextSequenceId + 1,
    },
    event,
  }
}

export function peekNextEvent<TPayload extends JsonValue>(
  queue: EventQueue<TPayload>,
): ScheduledEvent<TPayload> | undefined {
  assertEventQueue(queue)
  return queue.events[0]
}

export function popNextEvent<TPayload extends JsonValue>(
  queue: EventQueue<TPayload>,
): PopNextEventResult<TPayload> {
  assertEventQueue(queue)

  const event = queue.events[0]
  if (event === undefined) {
    return { queue, event: undefined }
  }

  return {
    queue: {
      events: queue.events.slice(1),
      nextSequenceId: queue.nextSequenceId,
    },
    event,
  }
}
