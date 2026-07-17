import { describe, expect, it } from "vitest"

import {
  createEventQueue,
  peekNextEvent,
  popNextEvent,
  scheduleEvent,
  type EventQueue,
  type JsonValue,
  type ScheduleEventInput,
} from "./index"

type TestPayload = {
  readonly kind: string
}

function input(
  kind: string,
  dueDay: number,
  priority: number,
): ScheduleEventInput<TestPayload> {
  return { dueDay, priority, payload: { kind } }
}

function scheduleKinds(
  inputs: readonly ScheduleEventInput<TestPayload>[],
): EventQueue<TestPayload> {
  let queue = createEventQueue<TestPayload>()
  for (const eventInput of inputs) {
    queue = scheduleEvent(queue, eventInput).queue
  }
  return queue
}

describe("scheduled event queue", () => {
  it("stores events in complete comparator order", () => {
    const queue = scheduleKinds([
      input("late-first", 5, 2),
      input("earliest", 3, 9),
      input("higher-priority", 5, 1),
      input("late-second", 5, 2),
    ])

    expect(queue.events.map((event) => event.payload.kind)).toEqual([
      "earliest",
      "higher-priority",
      "late-first",
      "late-second",
    ])
    expect(queue.events.map((event) => event.sequenceId)).toEqual([1, 2, 0, 3])
  })

  it("assigns monotonic IDs and returns the exact scheduled event", () => {
    const initial = createEventQueue<TestPayload>()
    const first = scheduleEvent(initial, input("first", 2, 0))
    const second = scheduleEvent(first.queue, input("second", 1, 0))

    expect(first.event.sequenceId).toBe(0)
    expect(second.event.sequenceId).toBe(1)
    expect(second.queue.nextSequenceId).toBe(2)
    expect(second.queue.events.find((event) => event.sequenceId === 1)).toBe(
      second.event,
    )
  })

  it("does not mutate old queue state, arrays, inputs, or payload references", () => {
    const payload = { kind: "shared" } as const
    const eventInput = { dueDay: 1, priority: 0, payload } as const
    const initial = createEventQueue<typeof payload>()
    const initialEvents = initial.events

    const result = scheduleEvent(initial, eventInput)

    expect(initial).toEqual({ events: [], nextSequenceId: 0 })
    expect(initial.events).toBe(initialEvents)
    expect(eventInput).toEqual({ dueDay: 1, priority: 0, payload })
    expect(result.event.payload).toBe(payload)
    expect(result.queue).not.toBe(initial)
    expect(result.queue.events).not.toBe(initial.events)
  })

  it("produces identical state for identical scheduling input", () => {
    const inputs = [
      input("one", 9, -1),
      input("two", 2, 4),
      input("three", 9, -1),
    ]

    expect(scheduleKinds(inputs)).toEqual(scheduleKinds(inputs))
  })

  it("continues the saved counter after a JSON round-trip", () => {
    const queue = scheduleKinds([input("one", 2, 0), input("two", 4, 0)])
    const restored = JSON.parse(JSON.stringify(queue)) as EventQueue<TestPayload>
    const result = scheduleEvent(restored, input("three", 3, 0))

    expect(result.event.sequenceId).toBe(2)
    expect(result.queue.nextSequenceId).toBe(3)
    expect(result.queue.events.map((event) => event.payload.kind)).toEqual([
      "one",
      "three",
      "two",
    ])
  })

  it("pops only the first event and preserves counter gaps", () => {
    const queue = scheduleKinds([
      input("zero", 0, 0),
      input("one", 1, 0),
      input("two", 2, 0),
    ])
    const popped = popNextEvent(queue)
    const scheduled = scheduleEvent(popped.queue, input("three", 3, 0))

    expect(popped.event?.sequenceId).toBe(0)
    expect(popped.queue.events.map((event) => event.sequenceId)).toEqual([1, 2])
    expect(popped.queue.nextSequenceId).toBe(3)
    expect(scheduled.event.sequenceId).toBe(3)
    expect(scheduled.queue.nextSequenceId).toBe(4)
  })

  it("returns undefined without changing an empty queue", () => {
    const queue = createEventQueue()
    const result = popNextEvent(queue)

    expect(result).toEqual({ queue, event: undefined })
    expect(result.queue).toBe(queue)
    expect(result.queue.nextSequenceId).toBe(0)
    expect(peekNextEvent(queue)).toBeUndefined()
  })

  it("rejects duplicate sequence IDs", () => {
    const queue = {
      events: [
        { dueDay: 1, priority: 0, sequenceId: 0, payload: null },
        { dueDay: 2, priority: 0, sequenceId: 0, payload: null },
      ],
      nextSequenceId: 1,
    } satisfies EventQueue

    expect(() => popNextEvent(queue)).toThrow()
  })

  it("rejects unsorted deserialized state", () => {
    const queue = {
      events: [
        { dueDay: 2, priority: 0, sequenceId: 0, payload: null },
        { dueDay: 1, priority: 0, sequenceId: 1, payload: null },
      ],
      nextSequenceId: 2,
    } satisfies EventQueue

    expect(() => peekNextEvent(queue)).toThrow()
  })

  it("rejects sequence IDs at or above the saved counter", () => {
    const queue = {
      events: [{ dueDay: 1, priority: 0, sequenceId: 1, payload: null }],
      nextSequenceId: 1,
    } satisfies EventQueue

    expect(() => scheduleEvent(queue, input("new", 2, 0))).toThrow()
  })

  it("rejects scheduling before changing an exhausted queue", () => {
    const queue = {
      events: [],
      nextSequenceId: Number.MAX_SAFE_INTEGER,
    } satisfies EventQueue
    const before = JSON.stringify(queue)

    expect(() => scheduleEvent(queue, input("never", 0, 0))).toThrow()
    expect(JSON.stringify(queue)).toBe(before)
  })

  it.each([
    input("negative-day", -1, 0),
    input("fractional-day", 1.5, 0),
    input("nan-day", Number.NaN, 0),
    input("infinite-day", Infinity, 0),
    input("fractional-priority", 1, 0.5),
    input("nan-priority", 1, Number.NaN),
  ])("rejects invalid schedule input $payload.kind", (eventInput) => {
    expect(() => scheduleEvent(createEventQueue(), eventInput)).toThrow()
  })

  it.each([-1, 1.5, Number.NaN, Infinity])(
    "rejects invalid nextSequenceId %s",
    (nextSequenceId) => {
      const queue = {
        events: [],
        nextSequenceId,
      } as EventQueue

      expect(() => peekNextEvent(queue)).toThrow()
    },
  )

  it("rejects caller-supplied sequence IDs", () => {
    const eventInput = {
      dueDay: 1,
      priority: 0,
      sequenceId: 99,
      payload: null,
    } as unknown as ScheduleEventInput<null>

    expect(() => scheduleEvent(createEventQueue<null>(), eventInput)).toThrow()
  })

  it("rejects payloads that are not finite, plain, acyclic JSON values", () => {
    class Box {
      readonly value = 1
    }

    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic

    const invalidPayloads: readonly unknown[] = [
      undefined,
      Number.NaN,
      Infinity,
      1n,
      Symbol("payload"),
      () => undefined,
      new Box(),
      new Map(),
      new Set(),
      cyclic,
    ]

    for (const payload of invalidPayloads) {
      const eventInput = {
        dueDay: 1,
        priority: 0,
        payload,
      } as unknown as ScheduleEventInput<JsonValue>

      expect(() => scheduleEvent(createEventQueue(), eventInput)).toThrow()
    }
  })
})
