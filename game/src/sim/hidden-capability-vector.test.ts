import { describe, expect, it } from "vitest"

import * as sim from "./index"
import {
  createHiddenCapabilityVector,
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

type CapabilityField = keyof MutableHiddenCapabilityVectorInput

const CAPABILITY_FIELDS = [
  "coding",
  "mathReasoning",
  "writing",
  "dialogue",
  "hallucinationResistance",
  "selfCorrection",
] as const satisfies readonly CapabilityField[]

const INVALID_VALUES: readonly unknown[] = [
  Number.NaN,
  Infinity,
  -Infinity,
  1.5,
  Number.MAX_SAFE_INTEGER + 1,
  Number.MIN_SAFE_INTEGER - 1,
  "1",
  true,
  null,
  undefined,
  1n,
  Symbol("capability"),
  {},
]

function validInput(): MutableHiddenCapabilityVectorInput {
  return {
    coding: 11,
    mathReasoning: -22,
    writing: 33,
    dialogue: -44,
    hallucinationResistance: 55,
    selfCorrection: -66,
  }
}

function createFromUnknown(value: unknown): HiddenCapabilityVector {
  return createHiddenCapabilityVector(
    value as HiddenCapabilityVectorInput,
  )
}

function setField(
  input: object,
  field: CapabilityField,
  value: unknown,
): void {
  Object.defineProperty(input, field, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  })
}

describe("hidden capability vector", () => {
  it("creates exactly the approved six-field shape as a new root", () => {
    const input = validInput()
    const vector = createHiddenCapabilityVector(input)

    expect(vector).toEqual(input)
    expect(Reflect.ownKeys(vector)).toEqual(CAPABILITY_FIELDS)
    expect(vector).not.toBe(input)
  })

  it("does not depend on property insertion order", () => {
    const expected = validInput()
    const reordered = {
      selfCorrection: expected.selfCorrection,
      hallucinationResistance: expected.hallucinationResistance,
      dialogue: expected.dialogue,
      writing: expected.writing,
      mathReasoning: expected.mathReasoning,
      coding: expected.coding,
    }

    expect(createHiddenCapabilityVector(reordered)).toEqual(expected)
  })

  it("is deterministic for repeated creation from the same input", () => {
    const input = validInput()
    const first = createHiddenCapabilityVector(input)
    const second = createHiddenCapabilityVector(input)

    expect(second).toEqual(first)
    expect(second).not.toBe(first)
  })

  it.each(CAPABILITY_FIELDS)(
    "accepts every signed safe-integer boundary for %s",
    (field) => {
      for (const value of [
        Number.MIN_SAFE_INTEGER,
        0,
        Number.MAX_SAFE_INTEGER,
      ]) {
        const input = validInput()
        setField(input, field, value)

        expect(createHiddenCapabilityVector(input)[field]).toBe(value)
      }
    },
  )

  it.each(CAPABILITY_FIELDS)(
    "rejects every invalid runtime value for %s",
    (field) => {
      for (const value of INVALID_VALUES) {
        const input = validInput()
        setField(input, field, value)

        expect(() => createFromUnknown(input)).toThrow()
      }
    },
  )

  it.each(CAPABILITY_FIELDS)("rejects a missing %s field", (field) => {
    const input = validInput()
    expect(Reflect.deleteProperty(input, field)).toBe(true)

    expect(() => createFromUnknown(input)).toThrow()
  })

  it("rejects an extra string key", () => {
    const input = validInput()
    Object.defineProperty(input, "extra", {
      configurable: true,
      enumerable: true,
      value: 1,
      writable: true,
    })

    expect(() => createFromUnknown(input)).toThrow()
  })

  it("rejects a symbol key", () => {
    const input = validInput()
    Object.defineProperty(input, Symbol("extra"), {
      configurable: true,
      enumerable: true,
      value: 1,
      writable: true,
    })

    expect(() => createFromUnknown(input)).toThrow()
  })

  it("accepts an ordinary Object.prototype object", () => {
    const input = validInput()

    expect(Object.getPrototypeOf(input)).toBe(Object.prototype)
    expect(createHiddenCapabilityVector(input)).toEqual(input)
  })

  it("accepts a null-prototype plain object", () => {
    const expected = validInput()
    const input = Object.assign(Object.create(null), expected) as
      MutableHiddenCapabilityVectorInput

    expect(Object.getPrototypeOf(input)).toBe(null)
    expect(createHiddenCapabilityVector(input)).toEqual(expected)
  })

  it.each([
    ["null", null],
    ["number primitive", 42],
    ["string primitive", "capability"],
    ["boolean primitive", true],
    ["undefined primitive", undefined],
    ["bigint primitive", 1n],
    ["symbol primitive", Symbol("capability")],
    ["array", []],
    ["class instance", new (class CapabilityContainer {})()],
    ["custom-prototype object", Object.create({ custom: true })],
  ] as const)("rejects a %s root", (_label, candidate) => {
    expect(() => createFromUnknown(candidate)).toThrow()
  })

  it.each(CAPABILITY_FIELDS)(
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

  it.each(CAPABILITY_FIELDS)(
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

  it.each(CAPABILITY_FIELDS)(
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
        expect(input[field]).toBe(value)
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

  it.each(CAPABILITY_FIELDS)(
    "accepts %s as an enumerable non-writable, non-configurable data property",
    (field) => {
      const input = validInput()
      Object.defineProperty(input, field, {
        configurable: false,
        enumerable: true,
        value: input[field],
        writable: false,
      })

      expect(createHiddenCapabilityVector(input)).toEqual(input)
    },
  )

  it("snapshots all six descriptors before validating any primitive", () => {
    const target = validInput()
    target.coding = Number.NaN
    const descriptorOperations: PropertyKey[] = []
    let ownKeyOperations = 0
    const input = new Proxy(target, {
      get() {
        throw new Error("ordinary property reads are forbidden")
      },
      getOwnPropertyDescriptor(current, property) {
        descriptorOperations.push(property)
        return Reflect.getOwnPropertyDescriptor(current, property)
      },
      ownKeys(current) {
        ownKeyOperations += 1
        return Reflect.ownKeys(current)
      },
    })

    expect(() => createFromUnknown(input)).toThrow()
    expect(ownKeyOperations).toBeGreaterThan(0)
    expect(descriptorOperations).toEqual(CAPABILITY_FIELDS)
  })

  it("creates from descriptor snapshots without ordinary property reads", () => {
    const target = validInput()
    let ordinaryReads = 0
    const input = new Proxy(target, {
      get() {
        ordinaryReads += 1
        throw new Error("ordinary property reads are forbidden")
      },
    })

    expect(createHiddenCapabilityVector(input)).toEqual(target)
    expect(ordinaryReads).toBe(0)
  })

  it("keeps an earlier snapped value when a later descriptor mutates it", () => {
    const target = validInput()
    const originalCoding = target.coding
    const descriptorOperations: PropertyKey[] = []
    const input = new Proxy(target, {
      get() {
        throw new Error("ordinary property reads are forbidden")
      },
      getOwnPropertyDescriptor(current, property) {
        descriptorOperations.push(property)
        if (property === "mathReasoning") {
          current.coding = 777
        }
        return Reflect.getOwnPropertyDescriptor(current, property)
      },
    })

    const vector = createHiddenCapabilityVector(input)

    expect(target.coding).toBe(777)
    expect(vector.coding).toBe(originalCoding)
    expect(descriptorOperations).toEqual(CAPABILITY_FIELDS)
  })

  it("does not mutate input keys or property descriptors", () => {
    const input = validInput()
    const keysBefore = Reflect.ownKeys(input)
    const descriptorsBefore = Object.getOwnPropertyDescriptors(input)

    createHiddenCapabilityVector(input)

    expect(Reflect.ownKeys(input)).toEqual(keysBefore)
    expect(Object.getOwnPropertyDescriptors(input)).toEqual(
      descriptorsBefore,
    )
  })

  it("isolates the returned vector from later input changes", () => {
    const input = validInput()
    const vector = createHiddenCapabilityVector(input)
    const expected = { ...vector }

    for (const field of CAPABILITY_FIELDS) {
      input[field] = input[field] + 1
    }

    expect(vector).toEqual(expected)
  })

  it("provides readonly public fields without freezing the result", () => {
    const input: HiddenCapabilityVectorInput = validInput()
    const vector: HiddenCapabilityVector =
      createHiddenCapabilityVector(input)

    expect(Object.isFrozen(vector)).toBe(false)

    if (false) {
      // @ts-expect-error -- coding is readonly.
      vector.coding = 0
      // @ts-expect-error -- mathReasoning is readonly.
      vector.mathReasoning = 0
      // @ts-expect-error -- writing is readonly.
      vector.writing = 0
      // @ts-expect-error -- dialogue is readonly.
      vector.dialogue = 0
      // @ts-expect-error -- hallucinationResistance is readonly.
      vector.hallucinationResistance = 0
      // @ts-expect-error -- selfCorrection is readonly.
      vector.selfCorrection = 0
    }
  })

  it("exposes no unapproved capability runtime API", () => {
    expect(
      Object.keys(sim).filter(
        (name) =>
          name.toLowerCase().includes("capability") ||
          name.toLowerCase().includes("dimension"),
      ),
    ).toEqual(["createHiddenCapabilityVector"])
    expect(sim).not.toHaveProperty("parseHiddenCapabilityVector")
    expect(sim).not.toHaveProperty("validateHiddenCapabilityVector")
    expect(sim).not.toHaveProperty("assertHiddenCapabilityVector")
    expect(sim).not.toHaveProperty("HIDDEN_CAPABILITY_DIMENSIONS")
  })
})
