import { describe, expect, it } from "vitest"

import * as sim from "./index"
import {
  createCheckpointState,
  createHiddenCapabilityVector,
  type CheckpointState,
  type CheckpointStateInput,
  type HiddenCapabilityVector,
  type HiddenCapabilityVectorInput,
} from "./index"

type MutableHiddenCapabilityVectorInput = {
  coding: number
  mathReasoning: number
  writing: number
  dialogue: number
  hallucinationResistance: number
  selfCorrection: number
}

type MutableCheckpointStateInput = {
  id: string
  capability: MutableHiddenCapabilityVectorInput
}

const CHECKPOINT_KEYS = ["id", "capability"] as const

function validCapability(): MutableHiddenCapabilityVectorInput {
  return {
    coding: 11,
    mathReasoning: -22,
    writing: 33,
    dialogue: -44,
    hallucinationResistance: 55,
    selfCorrection: -66,
  }
}

function validInput(): MutableCheckpointStateInput {
  return {
    id: "checkpoint-1",
    capability: validCapability(),
  }
}

function createFromUnknown(value: unknown): CheckpointState {
  return createCheckpointState(value as CheckpointStateInput)
}

function setId(input: MutableCheckpointStateInput, value: unknown): void {
  ;(input as unknown as Record<string, unknown>).id = value
}

describe("checkpoint state", () => {
  it("creates exactly the approved two-field shape as a fresh root", () => {
    const input = validInput()
    const state = createCheckpointState(input)

    expect(state).toEqual(input)
    expect(Reflect.ownKeys(state)).toEqual(CHECKPOINT_KEYS)
    expect(state).not.toBe(input)
  })

  it("does not depend on input property insertion order", () => {
    const input = validInput()
    const reordered = {
      capability: input.capability,
      id: input.id,
    }

    const state = createCheckpointState(reordered)

    expect(state).toEqual(input)
    expect(Reflect.ownKeys(state)).toEqual(CHECKPOINT_KEYS)
  })

  it("preserves an ordinary valid ID", () => {
    expect(createCheckpointState(validInput()).id).toBe("checkpoint-1")
  })

  it("preserves whitespace and case without trimming or conversion", () => {
    const input = validInput()
    input.id = "  CheckPoint-A  "

    expect(createCheckpointState(input).id).toBe("  CheckPoint-A  ")
  })

  it("does not normalize Unicode in an ID", () => {
    const input = validInput()
    const supplied = "e\u0301"
    input.id = supplied

    const state = createCheckpointState(input)

    expect(state.id).toBe(supplied)
    expect(state.id).not.toBe("\u00e9")
  })

  it("accepts duplicate IDs in independent factory calls", () => {
    const first = createCheckpointState(validInput())
    const second = createCheckpointState(validInput())

    expect(first.id).toBe(second.id)
    expect(second).not.toBe(first)
  })

  it.each(["", " ", "\t\n"])("rejects blank ID %j", (id) => {
    const input = validInput()
    input.id = id

    expect(() => createCheckpointState(input)).toThrow()
  })

  it.each([42, true, null, undefined, 1n, Symbol("id"), {}])(
    "rejects non-string ID %s",
    (id) => {
      const input = validInput()
      setId(input, id)

      expect(() => createFromUnknown(input)).toThrow()
    },
  )

  it("accepts an ordinary Object.prototype root", () => {
    const input = validInput()

    expect(Object.getPrototypeOf(input)).toBe(Object.prototype)
    expect(createCheckpointState(input)).toEqual(input)
  })

  it("accepts a null-prototype root", () => {
    const expected = validInput()
    const input = Object.assign(Object.create(null), expected) as
      MutableCheckpointStateInput

    expect(Object.getPrototypeOf(input)).toBe(null)
    expect(createCheckpointState(input)).toEqual(expected)
  })

  it.each([
    ["null", null],
    ["number primitive", 42],
    ["string primitive", "checkpoint"],
    ["boolean primitive", true],
    ["undefined primitive", undefined],
    ["bigint primitive", 1n],
    ["symbol primitive", Symbol("checkpoint")],
    ["array", []],
    [
      "class instance",
      new (class CheckpointContainer {
        id = "checkpoint-1"
        capability = validCapability()
      })(),
    ],
    [
      "custom-prototype object",
      Object.assign(Object.create({ custom: true }), validInput()),
    ],
  ] as const)("rejects a %s root", (_label, candidate) => {
    expect(() => createFromUnknown(candidate)).toThrow()
  })

  it.each(CHECKPOINT_KEYS)("rejects a missing %s field", (field) => {
    const input = validInput()
    expect(Reflect.deleteProperty(input, field)).toBe(true)

    expect(() => createFromUnknown(input)).toThrow()
  })

  it("rejects an extra string key", () => {
    const input = validInput() as MutableCheckpointStateInput & {
      extra?: boolean
    }
    input.extra = true

    expect(() => createFromUnknown(input)).toThrow()
  })

  it("rejects a symbol key", () => {
    const input = validInput() as unknown as Record<PropertyKey, unknown>
    input[Symbol("extra")] = true

    expect(() => createFromUnknown(input)).toThrow()
  })

  it.each(CHECKPOINT_KEYS)(
    "does not accept inherited %s as a replacement for an own property",
    (field) => {
      const input = validInput()
      const value = input[field]
      const previousDescriptor = Object.getOwnPropertyDescriptor(
        Object.prototype,
        field,
      )
      expect(Reflect.deleteProperty(input, field)).toBe(true)

      try {
        Object.defineProperty(Object.prototype, field, {
          configurable: true,
          enumerable: true,
          value,
          writable: true,
        })

        expect(Object.hasOwn(input, field)).toBe(false)
        expect(() => createFromUnknown(input)).toThrow()
      } finally {
        if (previousDescriptor === undefined) {
          Reflect.deleteProperty(Object.prototype, field)
        } else {
          Object.defineProperty(
            Object.prototype,
            field,
            previousDescriptor,
          )
        }
      }
    },
  )

  it.each(CHECKPOINT_KEYS)(
    "rejects a non-enumerable required %s property",
    (field) => {
      const input = validInput()
      Object.defineProperty(input, field, {
        configurable: true,
        enumerable: false,
        value: input[field],
        writable: true,
      })

      expect(() => createFromUnknown(input)).toThrow()
    },
  )

  it.each(CHECKPOINT_KEYS)(
    "rejects a %s accessor without invoking its getter",
    (field) => {
      const input = validInput()
      const original = input[field]
      let getterCalls = 0
      Object.defineProperty(input, field, {
        configurable: true,
        enumerable: true,
        get() {
          getterCalls += 1
          return original
        },
      })

      expect(() => createFromUnknown(input)).toThrow()
      expect(getterCalls).toBe(0)
    },
  )

  it("accepts enumerable non-writable, non-configurable data properties", () => {
    const source = validInput()
    const input: Record<string, unknown> = {}
    for (const field of CHECKPOINT_KEYS) {
      Object.defineProperty(input, field, {
        configurable: false,
        enumerable: true,
        value: source[field],
        writable: false,
      })
    }

    expect(createFromUnknown(input)).toEqual(source)
  })

  it("does not mutate input keys or descriptors", () => {
    const input = validInput()
    const rootKeys = Reflect.ownKeys(input)
    const capabilityKeys = Reflect.ownKeys(input.capability)
    const rootDescriptors = Object.getOwnPropertyDescriptors(input)
    const capabilityDescriptors = Object.getOwnPropertyDescriptors(
      input.capability,
    )

    createCheckpointState(input)

    expect(Reflect.ownKeys(input)).toEqual(rootKeys)
    expect(Reflect.ownKeys(input.capability)).toEqual(capabilityKeys)
    expect(Object.getOwnPropertyDescriptors(input)).toEqual(
      rootDescriptors,
    )
    expect(Object.getOwnPropertyDescriptors(input.capability)).toEqual(
      capabilityDescriptors,
    )
  })

  it("copies supplied capability values into a fresh nested object", () => {
    const input = validInput()
    const rawCapability = input.capability

    const state = createCheckpointState(input)

    expect(state.capability).toEqual(rawCapability)
    expect(state.capability).not.toBe(rawCapability)
  })

  it("recreates an existing HiddenCapabilityVector as a fresh copy", () => {
    const existing: HiddenCapabilityVector =
      createHiddenCapabilityVector(validCapability())
    const input: CheckpointStateInput = {
      id: "checkpoint-existing",
      capability: existing,
    }

    const state = createCheckpointState(input)

    expect(state.capability).toEqual(existing)
    expect(state.capability).not.toBe(existing)
  })

  it("isolates nested capability from later raw input mutation", () => {
    const input = validInput()
    const expected = { ...input.capability }
    const state = createCheckpointState(input)

    input.capability.coding = 999
    input.capability.selfCorrection = 888

    expect(state.capability).toEqual(expected)
  })

  it("rejects an invalid nested capability", () => {
    const input = validInput()
    input.capability.coding = 1.5

    expect(() => createCheckpointState(input)).toThrow()
  })

  it("retains hidden-capability accessor rejection with zero getter calls", () => {
    const directCapability = validCapability()
    const checkpointCapability = validCapability()
    let directGetterCalls = 0
    let checkpointGetterCalls = 0
    Object.defineProperty(directCapability, "coding", {
      configurable: true,
      enumerable: true,
      get() {
        directGetterCalls += 1
        return 11
      },
    })
    Object.defineProperty(checkpointCapability, "coding", {
      configurable: true,
      enumerable: true,
      get() {
        checkpointGetterCalls += 1
        return 11
      },
    })

    expect(() =>
      createHiddenCapabilityVector(directCapability),
    ).toThrow(TypeError)
    expect(() =>
      createCheckpointState({
        id: "checkpoint-accessor",
        capability: checkpointCapability,
      }),
    ).toThrow(TypeError)
    expect(directGetterCalls).toBe(0)
    expect(checkpointGetterCalls).toBe(0)
  })

  it("uses the exact root snapshot operation order without ordinary reads", () => {
    const target = validInput()
    const operations: string[] = []
    let ordinaryReads = 0
    const input = new Proxy(target, {
      get() {
        ordinaryReads += 1
        throw new Error("ordinary root property read")
      },
      getOwnPropertyDescriptor(current, property) {
        operations.push(`root:descriptor:${String(property)}`)
        return Reflect.getOwnPropertyDescriptor(current, property)
      },
      getPrototypeOf(current) {
        operations.push("root:getPrototypeOf")
        return Reflect.getPrototypeOf(current)
      },
      ownKeys(current) {
        operations.push("root:ownKeys")
        return Reflect.ownKeys(current)
      },
    })

    expect(createCheckpointState(input)).toEqual(target)
    expect(operations.slice(0, 3)).toEqual([
      "root:ownKeys",
      "root:descriptor:id",
      "root:descriptor:capability",
    ])
    expect(ordinaryReads).toBe(0)
  })

  it("completes the exact root snapshot before a structural failure", () => {
    const target = Object.assign(validInput(), { extra: true })
    const operations: string[] = []
    let ordinaryReads = 0
    const input = new Proxy(target, {
      get() {
        ordinaryReads += 1
        throw new Error("ordinary root property read")
      },
      getOwnPropertyDescriptor(current, property) {
        operations.push(`root:descriptor:${String(property)}`)
        return Reflect.getOwnPropertyDescriptor(current, property)
      },
      ownKeys(current) {
        operations.push("root:ownKeys")
        return Reflect.ownKeys(current)
      },
    })

    expect(() => createFromUnknown(input)).toThrow()
    expect(operations.slice(0, 3)).toEqual([
      "root:ownKeys",
      "root:descriptor:id",
      "root:descriptor:capability",
    ])
    expect(ordinaryReads).toBe(0)
  })

  it("uses the snapped ID when the capability descriptor mutates the target", () => {
    const target = validInput()
    const originalId = "checkpoint-A"
    target.id = originalId
    const input = new Proxy(target, {
      get() {
        throw new Error("ordinary root property read")
      },
      getOwnPropertyDescriptor(current, property) {
        if (property === "capability") {
          current.id = "checkpoint-B"
        }
        return Reflect.getOwnPropertyDescriptor(current, property)
      },
    })

    const state = createCheckpointState(input)

    expect(target.id).toBe("checkpoint-B")
    expect(state.id).toBe(originalId)
  })

  it("reaches nested validation before rejecting an invalid snapped ID", () => {
    const sentinel = new Error("nested factory reached")
    const capability = new Proxy(validCapability(), {
      ownKeys() {
        throw sentinel
      },
    })
    const target = {
      id: "   ",
      capability,
    }
    const descriptorOperations: PropertyKey[] = []
    let ordinaryReads = 0
    const input = new Proxy(target, {
      get() {
        ordinaryReads += 1
        throw new Error("ordinary root property read")
      },
      getOwnPropertyDescriptor(current, property) {
        descriptorOperations.push(property)
        return Reflect.getOwnPropertyDescriptor(current, property)
      },
    })

    let thrown: unknown
    try {
      createFromUnknown(input)
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBe(sentinel)
    expect(descriptorOperations).toEqual(["id", "capability"])
    expect(ordinaryReads).toBe(0)
  })

  it("provides readonly views without runtime freezing", () => {
    const capabilityInput: HiddenCapabilityVectorInput = validCapability()
    const input: CheckpointStateInput = {
      id: "checkpoint-readonly",
      capability: capabilityInput,
    }
    const state: CheckpointState = createCheckpointState(input)

    expect(Object.isFrozen(state)).toBe(false)
    expect(Object.isFrozen(state.capability)).toBe(false)

    if (false) {
      // @ts-expect-error -- checkpoint id is readonly.
      state.id = "replacement"
      // @ts-expect-error -- checkpoint capability is readonly.
      state.capability = createHiddenCapabilityVector(validCapability())
      // @ts-expect-error -- nested capability fields are readonly.
      state.capability.coding = 0
    }
  })

  it("exposes only the approved checkpoint runtime API", () => {
    expect(
      Object.keys(sim).filter((name) =>
        name.toLowerCase().includes("checkpoint"),
      ),
    ).toEqual(["createCheckpointState"])
    expect(sim).not.toHaveProperty("parseCheckpointState")
    expect(sim).not.toHaveProperty("validateCheckpointState")
    expect(sim).not.toHaveProperty("assertCheckpointState")
    expect(sim).not.toHaveProperty("createCheckpointId")
    expect(sim).not.toHaveProperty("CheckpointCollection")
    expect(sim).not.toHaveProperty("CheckpointReference")
    expect(sim).not.toHaveProperty("CheckpointStatus")
  })
})
