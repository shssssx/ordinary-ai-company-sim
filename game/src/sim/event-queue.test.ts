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

  it("rejects a changing payload getter without invoking it", () => {
    const queue = createEventQueue<JsonValue>()
    const before = JSON.stringify(queue)
    let payloadReads = 0
    const eventInput = {
      dueDay: 1,
      priority: 0,
      get payload(): JsonValue {
        payloadReads += 1
        return payloadReads === 1 ? null : Infinity
      },
    }

    expect(() => scheduleEvent(queue, eventInput)).toThrow()
    expect(payloadReads).toBe(0)
    expect(JSON.stringify(queue)).toBe(before)
  })

  it.each(["dueDay", "priority"] as const)(
    "rejects a schedule input %s getter without invoking it",
    (field) => {
      const queue = createEventQueue<null>()
      const eventInput = { dueDay: 1, priority: 0, payload: null }
      let reads = 0

      Object.defineProperty(eventInput, field, {
        enumerable: true,
        get() {
          reads += 1
          return field === "dueDay" ? 1 : 0
        },
      })

      expect(() => scheduleEvent(queue, eventInput)).toThrow()
      expect(reads).toBe(0)
      expect(queue).toEqual({ events: [], nextSequenceId: 0 })
    },
  )

  it.each(["events", "nextSequenceId"] as const)(
    "rejects an event queue %s getter without invoking it",
    (field) => {
      const queue: EventQueue = { events: [], nextSequenceId: 0 }
      let reads = 0

      Object.defineProperty(queue, field, {
        enumerable: true,
        get() {
          reads += 1
          return field === "events" ? [] : 0
        },
      })

      expect(() => peekNextEvent(queue)).toThrow()
      expect(reads).toBe(0)
    },
  )

  it.each(["dueDay", "priority", "sequenceId", "payload"] as const)(
    "rejects a scheduled event %s accessor without invoking it",
    (field) => {
      const event = {
        dueDay: 1,
        priority: 0,
        sequenceId: 0,
        payload: null,
      }
      let reads = 0

      Object.defineProperty(event, field, {
        enumerable: true,
        get() {
          reads += 1
          return field === "payload" ? null : 0
        },
      })

      const queue = {
        events: [event],
        nextSequenceId: 1,
      } as EventQueue<null>

      expect(() => peekNextEvent(queue)).toThrow()
      expect(reads).toBe(0)
    },
  )

  it("exposes returned payloads as recursive readonly views", () => {
    type MutablePayload = {
      nested: {
        value: number
        items: number[]
      }
    }

    const payload: MutablePayload = {
      nested: {
        value: 1,
        items: [1],
      },
    }
    const scheduled = scheduleEvent(createEventQueue<MutablePayload>(), {
      dueDay: 1,
      priority: 0,
      payload,
    })
    const peeked = peekNextEvent(scheduled.queue)
    const popped = popNextEvent(scheduled.queue)

    expect(scheduled.event.payload).toBe(payload)
    expect(peeked?.payload).toBe(payload)
    expect(popped.event?.payload).toBe(payload)

    if (false) {
      // @ts-expect-error -- public event payload objects are recursively readonly.
      scheduled.event.payload.nested.value = 2
      // @ts-expect-error -- public queue payload arrays do not expose mutable methods.
      scheduled.queue.events[0]?.payload.nested.items.push(2)
      // @ts-expect-error -- public pop results cannot replace readonly nested fields.
      popped.event!.payload.nested = { value: 2, items: [] }
    }
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

  it("rejects Array subclass payloads", () => {
    class PayloadArray extends Array<JsonValue> {}

    const payload = new PayloadArray()
    payload.push({ kind: "subclass" })

    expect(() =>
      scheduleEvent(createEventQueue<PayloadArray>(), {
        dueDay: 1,
        priority: 0,
        payload,
      }),
    ).toThrow()
  })

  it("rejects payload arrays with a replaced prototype", () => {
    const payload: JsonValue[] = [null]
    Object.setPrototypeOf(payload, null)

    expect(() =>
      scheduleEvent(createEventQueue<JsonValue[]>(), {
        dueDay: 1,
        priority: 0,
        payload,
      }),
    ).toThrow()
  })

  it("accepts dense standard array payloads without copying them", () => {
    const payload = [{ nested: [1, true, null] }] as const
    const result = scheduleEvent(createEventQueue<typeof payload>(), {
      dueDay: 1,
      priority: 0,
      payload,
    })

    expect(result.event.payload).toBe(payload)
  })

  it("rejects an event queue backed by an Array subclass", () => {
    class EventArray extends Array<{
      readonly dueDay: number
      readonly priority: number
      readonly sequenceId: number
      readonly payload: null
    }> {}

    const events = new EventArray()
    events.push({ dueDay: 1, priority: 0, sequenceId: 0, payload: null })
    const queue = {
      events,
      nextSequenceId: 1,
    } satisfies EventQueue<null>

    expect(() => peekNextEvent(queue)).toThrow()
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
