import { describe, expect, it } from "vitest"

import {
  createEventQueue,
  createRng,
  nextUint32,
  scheduleEvent,
  type EventQueue,
  type JsonValue,
  type Mulberry32State,
} from "../sim"
import {
  SAVE_SCHEMA_VERSION,
  assertSaveCompatibility,
  createSaveEnvelope,
  parseSaveEnvelope,
  type CreateSaveEnvelopeInput,
  type SaveCompatibility,
  type SaveEnvelope,
  type ScenarioReference,
  type SimKernelState,
} from "./index"

type TestEventPayload = {
  readonly kind: string
  readonly values?: readonly number[]
}

const TEST_RULES_VERSION = "test-rules-version"
const TEST_SCENARIO: ScenarioReference = {
  id: "test-scenario-id",
  version: "test-scenario-version",
}
const TEST_COMPATIBILITY: SaveCompatibility = {
  rulesVersion: TEST_RULES_VERSION,
  scenario: TEST_SCENARIO,
}

function advancedTestRngState(): Mulberry32State {
  let state = createRng(123_456)
  for (let index = 0; index < 4; index += 1) {
    state = nextUint32(state).state
  }
  return state
}

function populatedTestQueue(): EventQueue<TestEventPayload> {
  let queue = createEventQueue<TestEventPayload>()
  queue = scheduleEvent(queue, {
    dueDay: 8,
    priority: 1,
    payload: { kind: "test-event-later", values: [8] },
  }).queue
  queue = scheduleEvent(queue, {
    dueDay: 4,
    priority: 0,
    payload: { kind: "test-event-earlier", values: [4] },
  }).queue
  return queue
}

function testCreateInput(
  currentDay = 12,
): CreateSaveEnvelopeInput<TestEventPayload> {
  return {
    rulesVersion: TEST_RULES_VERSION,
    scenario: TEST_SCENARIO,
    simState: {
      currentDay,
      rngState: advancedTestRngState(),
      eventQueue: populatedTestQueue(),
    },
  }
}

function testEnvelope(currentDay = 12): SaveEnvelope<TestEventPayload> {
  return createSaveEnvelope(testCreateInput(currentDay))
}

function serializedTestEnvelope(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(testEnvelope())) as Record<string, unknown>
}

function nestedRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return record[key] as Record<string, unknown>
}

describe("versioned SaveEnvelope", () => {
  it("creates the complete current schema shape and writes schemaVersion", () => {
    const input = testCreateInput(0)
    const envelope = createSaveEnvelope(input)

    expect(SAVE_SCHEMA_VERSION).toBe(1)
    expect(envelope).toEqual({
      schemaVersion: 1,
      rulesVersion: TEST_RULES_VERSION,
      scenario: TEST_SCENARIO,
      simState: input.simState,
    })
    expect(Object.keys(envelope)).toEqual([
      "schemaVersion",
      "rulesVersion",
      "scenario",
      "simState",
    ])
    expect(Object.keys(envelope.scenario)).toEqual(["id", "version"])
    expect(Object.keys(envelope.simState)).toEqual([
      "currentDay",
      "rngState",
      "eventQueue",
    ])
    expect(envelope.simState.rngState).toBe(input.simState.rngState)
    expect(envelope.simState.eventQueue).toBe(input.simState.eventQueue)
    expect(envelope.simState.eventQueue.events[0]?.payload).toBe(
      input.simState.eventQueue.events[0]?.payload,
    )
  })

  it.each([0, 37])("accepts currentDay fixture %s", (currentDay) => {
    expect(createSaveEnvelope(testCreateInput(currentDay)).simState.currentDay).toBe(
      currentDay,
    )
  })

  it("round-trips the full envelope through native JSON", () => {
    const envelope = testEnvelope()
    const restored = parseSaveEnvelope(
      JSON.parse(JSON.stringify(envelope)) as unknown,
    )

    expect(restored).toEqual(envelope)
    expect(restored.simState.eventQueue.events).toHaveLength(2)
    expect(restored.simState.eventQueue.nextSequenceId).toBe(2)
  })

  it("continues an advanced RNG identically after the round-trip", () => {
    const envelope = testEnvelope()
    const restored = parseSaveEnvelope(
      JSON.parse(JSON.stringify(envelope)) as unknown,
    )

    expect(nextUint32(restored.simState.rngState)).toEqual(
      nextUint32(envelope.simState.rngState),
    )
  })

  it("continues queue sequence and ordering identically after round-trip", () => {
    const envelope = testEnvelope()
    const restored = parseSaveEnvelope(
      JSON.parse(JSON.stringify(envelope)) as unknown,
    )
    const eventInput = {
      dueDay: 6,
      priority: 0,
      payload: { kind: "test-event-new", values: [6] },
    } as const

    const expected = scheduleEvent(envelope.simState.eventQueue, eventInput)
    const actual = scheduleEvent(restored.simState.eventQueue, eventInput)

    expect(actual).toEqual(expected)
    expect(actual.event.sequenceId).toBe(2)
    expect(actual.queue.nextSequenceId).toBe(3)
    expect(actual.queue.events.map((event) => event.dueDay)).toEqual([4, 6, 8])
  })

  it("accepts an exactly matching compatibility contract", () => {
    const envelope = testEnvelope()

    expect(() =>
      assertSaveCompatibility(envelope, TEST_COMPATIBILITY),
    ).not.toThrow()
  })

  it("rejects a rulesVersion mismatch", () => {
    expect(() =>
      assertSaveCompatibility(testEnvelope(), {
        ...TEST_COMPATIBILITY,
        rulesVersion: "test-other-rules-version",
      }),
    ).toThrow()
  })

  it("rejects a scenario id mismatch", () => {
    expect(() =>
      assertSaveCompatibility(testEnvelope(), {
        ...TEST_COMPATIBILITY,
        scenario: { ...TEST_SCENARIO, id: "test-other-scenario-id" },
      }),
    ).toThrow()
  })

  it("rejects a scenario version mismatch", () => {
    expect(() =>
      assertSaveCompatibility(testEnvelope(), {
        ...TEST_COMPATIBILITY,
        scenario: {
          ...TEST_SCENARIO,
          version: "test-other-scenario-version",
        },
      }),
    ).toThrow()
  })

  it.each([0, 2, "1", null])(
    "rejects unsupported schemaVersion fixture %s",
    (schemaVersion) => {
      const candidate = serializedTestEnvelope()
      candidate.schemaVersion = schemaVersion

      expect(() => parseSaveEnvelope(candidate)).toThrow()
    },
  )

  it.each(["schemaVersion", "rulesVersion", "scenario", "simState"])(
    "rejects a missing top-level %s field",
    (field) => {
      const candidate = serializedTestEnvelope()
      delete candidate[field]

      expect(() => parseSaveEnvelope(candidate)).toThrow()
    },
  )

  it("rejects an extra top-level field", () => {
    const candidate = serializedTestEnvelope()
    candidate.extra = "test-extra-field"

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it.each(["id", "version"])(
    "rejects a missing scenario %s field",
    (field) => {
      const candidate = serializedTestEnvelope()
      delete nestedRecord(candidate, "scenario")[field]

      expect(() => parseSaveEnvelope(candidate)).toThrow()
    },
  )

  it("rejects an extra scenario field", () => {
    const candidate = serializedTestEnvelope()
    nestedRecord(candidate, "scenario").extra = "test-extra-field"

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it.each(["currentDay", "rngState", "eventQueue"])(
    "rejects a missing simState %s field",
    (field) => {
      const candidate = serializedTestEnvelope()
      delete nestedRecord(candidate, "simState")[field]

      expect(() => parseSaveEnvelope(candidate)).toThrow()
    },
  )

  it("rejects an extra simState field", () => {
    const candidate = serializedTestEnvelope()
    nestedRecord(candidate, "simState").extra = "test-extra-field"

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it.each(["", " ", "\t\n"])(
    "rejects blank rulesVersion fixture %j",
    (rulesVersion) => {
      const candidate = serializedTestEnvelope()
      candidate.rulesVersion = rulesVersion

      expect(() => parseSaveEnvelope(candidate)).toThrow()
    },
  )

  it.each(["id", "version"] as const)(
    "rejects blank scenario %s fixtures",
    (field) => {
      for (const value of ["", " \t\n"]) {
        const candidate = serializedTestEnvelope()
        nestedRecord(candidate, "scenario")[field] = value

        expect(() => parseSaveEnvelope(candidate)).toThrow()
      }
    },
  )

  it.each([
    -1,
    1.5,
    Number.NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid currentDay fixture %s", (currentDay) => {
    const candidate = serializedTestEnvelope()
    nestedRecord(candidate, "simState").currentDay = currentDay

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it.each([
    { algorithm: "test-other-rng", state: 0 },
    { algorithm: "mulberry32-v1", state: -1 },
    { algorithm: "mulberry32-v1", state: 0, extra: true },
  ])("rejects invalid RNG state fixture", (rngState) => {
    const candidate = serializedTestEnvelope()
    nestedRecord(candidate, "simState").rngState = rngState

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it("rejects an invalid event queue container", () => {
    const candidate = serializedTestEnvelope()
    nestedRecord(candidate, "simState").eventQueue = {
      events: "test-not-an-array",
      nextSequenceId: 0,
    }

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it("rejects an unsorted event queue", () => {
    const candidate = serializedTestEnvelope()
    nestedRecord(candidate, "simState").eventQueue = {
      events: [
        { dueDay: 2, priority: 0, sequenceId: 0, payload: null },
        { dueDay: 1, priority: 0, sequenceId: 1, payload: null },
      ],
      nextSequenceId: 2,
    }

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it("rejects an event queue counter below a saved sequenceId", () => {
    const candidate = serializedTestEnvelope()
    nestedRecord(candidate, "simState").eventQueue = {
      events: [{ dueDay: 1, priority: 0, sequenceId: 1, payload: null }],
      nextSequenceId: 1,
    }

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it.each(["envelope", "scenario", "simState", "create input"] as const)(
    "rejects a %s accessor without invoking its getter",
    (location) => {
      let reads = 0

      if (location === "create input") {
        const input = testCreateInput()
        Object.defineProperty(input, "rulesVersion", {
          enumerable: true,
          get() {
            reads += 1
            return TEST_RULES_VERSION
          },
        })
        expect(() => createSaveEnvelope(input)).toThrow()
      } else {
        const candidate = serializedTestEnvelope()
        const target =
          location === "envelope"
            ? candidate
            : nestedRecord(candidate, location)
        const field =
          location === "envelope"
            ? "rulesVersion"
            : location === "scenario"
              ? "id"
              : "currentDay"
        Object.defineProperty(target, field, {
          enumerable: true,
          get() {
            reads += 1
            if (location === "envelope") {
              return TEST_RULES_VERSION
            }
            return location === "scenario" ? TEST_SCENARIO.id : 12
          },
        })
        expect(() => parseSaveEnvelope(candidate)).toThrow()
      }

      expect(reads).toBe(0)
    },
  )

  it("rejects non-enumerable required fields", () => {
    const candidate = serializedTestEnvelope()
    Object.defineProperty(candidate, "rulesVersion", {
      enumerable: false,
      value: TEST_RULES_VERSION,
    })

    expect(() => parseSaveEnvelope(candidate)).toThrow()
  })

  it("rejects arrays, class instances, and custom-prototype envelopes", () => {
    class TestEnvelopeContainer {}

    const classInstance = Object.assign(
      new TestEnvelopeContainer(),
      serializedTestEnvelope(),
    )
    const customPrototype = Object.setPrototypeOf(serializedTestEnvelope(), {
      testPrototype: true,
    })

    expect(() => parseSaveEnvelope([])).toThrow()
    expect(() => parseSaveEnvelope(classInstance)).toThrow()
    expect(() => parseSaveEnvelope(customPrototype)).toThrow()
  })

  it("accepts null-prototype plain object snapshots", () => {
    const rngState = Object.assign(Object.create(null), advancedTestRngState())
    const payload = Object.assign(Object.create(null), {
      kind: "test-null-prototype-payload",
    })
    const event = Object.assign(Object.create(null), {
      dueDay: 3,
      priority: 0,
      sequenceId: 0,
      payload,
    })
    const eventQueue = Object.assign(Object.create(null), {
      events: [event],
      nextSequenceId: 1,
    })
    const simState = Object.assign(Object.create(null), {
      currentDay: 3,
      rngState,
      eventQueue,
    })
    const scenario = Object.assign(Object.create(null), TEST_SCENARIO)
    const envelope = Object.assign(Object.create(null), {
      schemaVersion: 1,
      rulesVersion: TEST_RULES_VERSION,
      scenario,
      simState,
    })

    expect(parseSaveEnvelope(envelope)).toEqual(testEnvelopeFromParts(3, rngState, eventQueue))
  })

  it("does not mutate creation, parsing, or compatibility inputs", () => {
    const input = testCreateInput()
    const inputBefore = JSON.stringify(input)
    const envelope = createSaveEnvelope(input)
    const serialized = JSON.parse(JSON.stringify(envelope)) as unknown
    const serializedBefore = JSON.stringify(serialized)
    const compatibility = {
      rulesVersion: TEST_RULES_VERSION,
      scenario: { ...TEST_SCENARIO },
    }
    const compatibilityBefore = JSON.stringify(compatibility)

    const parsed = parseSaveEnvelope(serialized)
    const parsedBefore = JSON.stringify(parsed)
    assertSaveCompatibility(parsed, compatibility)

    expect(JSON.stringify(input)).toBe(inputBefore)
    expect(JSON.stringify(serialized)).toBe(serializedBefore)
    expect(JSON.stringify(parsed)).toBe(parsedBefore)
    expect(JSON.stringify(compatibility)).toBe(compatibilityBefore)
  })

  it("exposes readonly public views in TypeScript", () => {
    const input: CreateSaveEnvelopeInput<TestEventPayload> = testCreateInput()
    const envelope: SaveEnvelope<TestEventPayload> = createSaveEnvelope(input)
    const kernel: SimKernelState<TestEventPayload> = envelope.simState
    const scenario: ScenarioReference = envelope.scenario

    expect(kernel).toBe(envelope.simState)
    expect(scenario).toBe(envelope.scenario)

    if (false) {
      // @ts-expect-error -- schemaVersion is readonly.
      envelope.schemaVersion = 1
      // @ts-expect-error -- scenario fields are readonly.
      envelope.scenario.id = "test-replacement"
      // @ts-expect-error -- kernel fields are readonly.
      envelope.simState.currentDay = 99
      // @ts-expect-error -- RNG fields are readonly.
      envelope.simState.rngState.state = 0
      // @ts-expect-error -- queue fields are readonly.
      envelope.simState.eventQueue.nextSequenceId = 0
      // @ts-expect-error -- the event list is readonly.
      envelope.simState.eventQueue.events.push(
        envelope.simState.eventQueue.events[0]!,
      )
      // @ts-expect-error -- event payload views are recursively readonly.
      envelope.simState.eventQueue.events[0]!.payload.kind = "test-replacement"
    }
  })

  it("does not generate or save real-time fields", () => {
    const envelope = testEnvelope()
    const serialized = JSON.stringify(envelope)

    expect(Object.keys(envelope)).toEqual([
      "schemaVersion",
      "rulesVersion",
      "scenario",
      "simState",
    ])
    expect(serialized).not.toMatch(/timestamp|savedAt|createdAt|updatedAt/)
  })
})

function testEnvelopeFromParts(
  currentDay: number,
  rngState: Mulberry32State,
  eventQueue: EventQueue<JsonValue>,
): SaveEnvelope {
  return {
    schemaVersion: 1,
    rulesVersion: TEST_RULES_VERSION,
    scenario: TEST_SCENARIO,
    simState: { currentDay, rngState, eventQueue },
  }
}
