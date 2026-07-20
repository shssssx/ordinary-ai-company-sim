import { describe, expect, it } from "vitest"

import {
  createCompanyResourceState,
  type CompanyResourceState,
  type CompanyResourceStateInput,
  type ComputeResourceState,
  type DataQualityState,
  type ResearchCapacityState,
} from "./index"

type MutableCompanyResourceStateInput = {
  cash: number
  compute: {
    capacity: number
    occupied: number
  }
  dataQuality: {
    domainCoverage: number
    cleaningQuality: number
    contaminationRisk: number
    legalRisk: number
    feedbackQuality: number
  }
  researchCapacity: {
    capacity: number
    occupied: number
  }
  reputation: number
  users: number
}

type RootKey = keyof MutableCompanyResourceStateInput
type NestedKey = "compute" | "dataQuality" | "researchCapacity"

const ROOT_KEYS = [
  "cash",
  "compute",
  "dataQuality",
  "researchCapacity",
  "reputation",
  "users",
] as const

const NESTED_KEYS = {
  compute: ["capacity", "occupied"],
  dataQuality: [
    "domainCoverage",
    "cleaningQuality",
    "contaminationRisk",
    "legalRisk",
    "feedbackQuality",
  ],
  researchCapacity: ["capacity", "occupied"],
} as const

const NON_NEGATIVE_PATHS = [
  { label: "cash", path: ["cash"] },
  { label: "compute.capacity", path: ["compute", "capacity"] },
  { label: "compute.occupied", path: ["compute", "occupied"] },
  {
    label: "researchCapacity.capacity",
    path: ["researchCapacity", "capacity"],
  },
  {
    label: "researchCapacity.occupied",
    path: ["researchCapacity", "occupied"],
  },
  { label: "users", path: ["users"] },
] as const

const DATA_QUALITY_KEYS = NESTED_KEYS.dataQuality

const INHERITED_FIELD_CASES = [
  { boundary: "root", field: "cash" },
  { boundary: "root", field: "compute" },
  { boundary: "root", field: "dataQuality" },
  { boundary: "root", field: "researchCapacity" },
  { boundary: "root", field: "reputation" },
  { boundary: "root", field: "users" },
  { boundary: "compute", field: "capacity" },
  { boundary: "compute", field: "occupied" },
  { boundary: "dataQuality", field: "domainCoverage" },
  { boundary: "dataQuality", field: "cleaningQuality" },
  { boundary: "dataQuality", field: "contaminationRisk" },
  { boundary: "dataQuality", field: "legalRisk" },
  { boundary: "dataQuality", field: "feedbackQuality" },
  { boundary: "researchCapacity", field: "capacity" },
  { boundary: "researchCapacity", field: "occupied" },
] as const

function validInput(): MutableCompanyResourceStateInput {
  return {
    cash: 1_000_000,
    compute: {
      capacity: 64,
      occupied: 16,
    },
    dataQuality: {
      domainCoverage: 8_000,
      cleaningQuality: 7_500,
      contaminationRisk: 500,
      legalRisk: 250,
      feedbackQuality: 6_000,
    },
    researchCapacity: {
      capacity: 20,
      occupied: 5,
    },
    reputation: -10,
    users: 2_500,
  }
}

function createFromUnknown(value: unknown): CompanyResourceState {
  return createCompanyResourceState(value as CompanyResourceStateInput)
}

function nestedObject(
  input: MutableCompanyResourceStateInput,
  key: NestedKey,
): Record<PropertyKey, unknown> {
  return input[key] as Record<PropertyKey, unknown>
}

function replaceNested(
  input: MutableCompanyResourceStateInput,
  key: NestedKey,
  value: unknown,
): void {
  ;(input as unknown as Record<PropertyKey, unknown>)[key] = value
}

function setPath(
  input: MutableCompanyResourceStateInput,
  path: readonly [string] | readonly [NestedKey, string],
  value: number,
): void {
  if (path.length === 1) {
    ;(input as unknown as Record<string, unknown>)[path[0]] = value
    return
  }

  nestedObject(input, path[0])[path[1]] = value
}

function nullPrototypeCopy<T extends object>(value: T): T {
  return Object.assign(Object.create(null), value) as T
}

function descriptors(value: object): PropertyDescriptorMap {
  return Object.getOwnPropertyDescriptors(value)
}

describe("company resource state", () => {
  it("creates the exact approved shape with isolated object references", () => {
    const input = validInput()
    const state = createCompanyResourceState(input)

    expect(state).toEqual(input)
    expect(Reflect.ownKeys(state)).toEqual(ROOT_KEYS)
    expect(Reflect.ownKeys(state.compute)).toEqual(NESTED_KEYS.compute)
    expect(Reflect.ownKeys(state.dataQuality)).toEqual(
      NESTED_KEYS.dataQuality,
    )
    expect(Reflect.ownKeys(state.researchCapacity)).toEqual(
      NESTED_KEYS.researchCapacity,
    )
    expect(state).not.toBe(input)
    expect(state.compute).not.toBe(input.compute)
    expect(state.dataQuality).not.toBe(input.dataQuality)
    expect(state.researchCapacity).not.toBe(input.researchCapacity)
    expect("available" in state.compute).toBe(false)
    expect("available" in state.researchCapacity).toBe(false)
    expect("runwayDays" in state).toBe(false)
  })

  it("does not depend on property insertion order", () => {
    const input = validInput()
    const reordered = {
      users: input.users,
      reputation: input.reputation,
      researchCapacity: {
        occupied: input.researchCapacity.occupied,
        capacity: input.researchCapacity.capacity,
      },
      dataQuality: {
        feedbackQuality: input.dataQuality.feedbackQuality,
        legalRisk: input.dataQuality.legalRisk,
        contaminationRisk: input.dataQuality.contaminationRisk,
        cleaningQuality: input.dataQuality.cleaningQuality,
        domainCoverage: input.dataQuality.domainCoverage,
      },
      compute: {
        occupied: input.compute.occupied,
        capacity: input.compute.capacity,
      },
      cash: input.cash,
    }

    expect(createCompanyResourceState(reordered)).toEqual(input)
  })

  it("accepts all approved numeric boundaries", () => {
    const input = validInput()
    input.cash = Number.MAX_SAFE_INTEGER
    input.compute = {
      capacity: Number.MAX_SAFE_INTEGER,
      occupied: Number.MAX_SAFE_INTEGER,
    }
    input.dataQuality = {
      domainCoverage: 0,
      cleaningQuality: 10_000,
      contaminationRisk: 0,
      legalRisk: 10_000,
      feedbackQuality: 0,
    }
    input.researchCapacity = {
      capacity: Number.MAX_SAFE_INTEGER,
      occupied: Number.MAX_SAFE_INTEGER,
    }
    input.reputation = Number.MIN_SAFE_INTEGER
    input.users = Number.MAX_SAFE_INTEGER

    expect(createCompanyResourceState(input)).toEqual(input)

    input.cash = 0
    input.compute = { capacity: 0, occupied: 0 }
    input.dataQuality = {
      domainCoverage: 10_000,
      cleaningQuality: 0,
      contaminationRisk: 10_000,
      legalRisk: 0,
      feedbackQuality: 10_000,
    }
    input.researchCapacity = { capacity: 0, occupied: 0 }
    input.reputation = Number.MAX_SAFE_INTEGER
    input.users = 0

    expect(createCompanyResourceState(input)).toEqual(input)

    input.reputation = 0
    expect(createCompanyResourceState(input).reputation).toBe(0)
  })

  it.each(ROOT_KEYS)("rejects a missing root %s field", (field) => {
    const input = validInput()
    delete (input as unknown as Record<string, unknown>)[field]

    expect(() => createFromUnknown(input)).toThrow()
  })

  it.each(Object.entries(NESTED_KEYS) as readonly [
    NestedKey,
    readonly string[],
  ][])("rejects every missing %s field", (boundary, keys) => {
    for (const key of keys) {
      const input = validInput()
      delete nestedObject(input, boundary)[key]

      expect(() => createFromUnknown(input)).toThrow()
    }
  })

  it.each(["root", "compute", "dataQuality", "researchCapacity"] as const)(
    "rejects an extra string key at the %s boundary",
    (boundary) => {
      const input = validInput()
      const target =
        boundary === "root"
          ? (input as unknown as Record<PropertyKey, unknown>)
          : nestedObject(input, boundary)
      target.extra = true

      expect(() => createFromUnknown(input)).toThrow()
    },
  )

  it.each(["root", "compute", "dataQuality", "researchCapacity"] as const)(
    "rejects a symbol key at the %s boundary",
    (boundary) => {
      const input = validInput()
      const target =
        boundary === "root"
          ? (input as unknown as Record<PropertyKey, unknown>)
          : nestedObject(input, boundary)
      target[Symbol("extra")] = true

      expect(() => createFromUnknown(input)).toThrow()
    },
  )

  it("accepts null-prototype root and nested objects", () => {
    const input = validInput()
    const nullPrototypeInput = nullPrototypeCopy({
      ...input,
      compute: nullPrototypeCopy(input.compute),
      dataQuality: nullPrototypeCopy(input.dataQuality),
      researchCapacity: nullPrototypeCopy(input.researchCapacity),
    })

    expect(createCompanyResourceState(nullPrototypeInput)).toEqual(input)
  })

  it("accepts mixed ordinary and null-prototype boundaries", () => {
    const input = validInput()
    input.compute = nullPrototypeCopy(input.compute)
    input.researchCapacity = nullPrototypeCopy(input.researchCapacity)

    expect(createCompanyResourceState(input)).toEqual(validInput())

    const nullRoot = nullPrototypeCopy(validInput())
    expect(createCompanyResourceState(nullRoot)).toEqual(validInput())
  })

  it.each([
    ["null", null],
    ["primitive", 42],
    ["array", []],
    ["class instance", new (class TestContainer {})()],
    ["custom prototype", Object.create({ custom: true })],
  ] as const)("rejects a %s root", (_label, candidate) => {
    expect(() => createFromUnknown(candidate)).toThrow()
  })

  it.each(["compute", "dataQuality", "researchCapacity"] as const)(
    "rejects invalid plain-object shapes at the %s boundary",
    (boundary) => {
      class TestContainer {}
      const invalidValues: readonly unknown[] = [
        null,
        42,
        [],
        new TestContainer(),
        Object.create({ custom: true }),
      ]

      for (const value of invalidValues) {
        const input = validInput()
        replaceNested(input, boundary, value)

        expect(() => createFromUnknown(input)).toThrow()
      }
    },
  )

  it.each(ROOT_KEYS)(
    "rejects a root %s accessor without invoking it",
    (field) => {
      const input = validInput()
      let reads = 0
      const original = input[field]
      Object.defineProperty(input, field, {
        enumerable: true,
        get() {
          reads += 1
          return original
        },
      })

      expect(() => createFromUnknown(input)).toThrow()
      expect(reads).toBe(0)
    },
  )

  it.each(Object.keys(NESTED_KEYS) as readonly NestedKey[])(
    "rejects every %s accessor without invoking it",
    (boundary) => {
      for (const field of NESTED_KEYS[boundary]) {
        const input = validInput()
        const target = nestedObject(input, boundary)
        const original = target[field]
        let reads = 0
        Object.defineProperty(target, field, {
          enumerable: true,
          get() {
            reads += 1
            return original
          },
        })

        expect(() => createFromUnknown(input)).toThrow()
        expect(reads).toBe(0)
      }
    },
  )

  it.each(["root", "compute", "dataQuality", "researchCapacity"] as const)(
    "rejects a non-enumerable required field at the %s boundary",
    (boundary) => {
      const input = validInput()
      const target =
        boundary === "root"
          ? (input as unknown as Record<PropertyKey, unknown>)
          : nestedObject(input, boundary)
      const field = boundary === "root" ? "cash" : NESTED_KEYS[boundary][0]
      Object.defineProperty(target, field, {
        enumerable: false,
        value: target[field],
      })

      expect(() => createFromUnknown(input)).toThrow()
    },
  )

  it.each(INHERITED_FIELD_CASES)(
    "does not accept inherited $boundary.$field on an ordinary object",
    ({ boundary, field }) => {
      const input = validInput()
      const target =
        boundary === "root"
          ? (input as unknown as Record<PropertyKey, unknown>)
          : nestedObject(input, boundary)
      const inheritedValue = target[field]
      const previousDescriptor = Object.getOwnPropertyDescriptor(
        Object.prototype,
        field,
      )

      try {
        Object.defineProperty(Object.prototype, field, {
          configurable: true,
          enumerable: true,
          value: inheritedValue,
          writable: true,
        })
        expect(Object.getPrototypeOf(target)).toBe(Object.prototype)
        expect(Reflect.deleteProperty(target, field)).toBe(true)
        expect(Object.getPrototypeOf(target)).toBe(Object.prototype)
        expect(Object.hasOwn(target, field)).toBe(false)
        expect(target[field]).toBe(inheritedValue)

        expect(() => createFromUnknown(input)).toThrow()
      } finally {
        if (previousDescriptor === undefined) {
          Reflect.deleteProperty(Object.prototype, field)
        } else {
          Object.defineProperty(Object.prototype, field, previousDescriptor)
        }
      }

      expect(Object.getOwnPropertyDescriptor(Object.prototype, field)).toEqual(
        previousDescriptor,
      )
    },
  )

  it("accepts enumerable non-writable, non-configurable data properties", () => {
    const source = validInput()
    const lockedNested = (boundary: NestedKey): Record<string, unknown> => {
      const result: Record<string, unknown> = {}
      for (const key of NESTED_KEYS[boundary]) {
        Object.defineProperty(result, key, {
          configurable: false,
          enumerable: true,
          value: nestedObject(source, boundary)[key],
          writable: false,
        })
      }
      return result
    }
    const input: Record<string, unknown> = {}
    const values: Record<RootKey, unknown> = {
      ...source,
      compute: lockedNested("compute"),
      dataQuality: lockedNested("dataQuality"),
      researchCapacity: lockedNested("researchCapacity"),
    }
    for (const key of ROOT_KEYS) {
      Object.defineProperty(input, key, {
        configurable: false,
        enumerable: true,
        value: values[key],
        writable: false,
      })
    }

    expect(createFromUnknown(input)).toEqual(source)
  })

  it.each(NON_NEGATIVE_PATHS)(
    "rejects invalid non-negative safe integer at $label",
    ({ path }) => {
      for (const value of [
        -1,
        1.5,
        Number.NaN,
        Infinity,
        -Infinity,
        Number.MAX_SAFE_INTEGER + 1,
      ]) {
        const input = validInput()
        setPath(input, path, value)

        expect(() => createFromUnknown(input)).toThrow()
      }
    },
  )

  it.each([
    1.5,
    Number.NaN,
    Infinity,
    -Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    Number.MIN_SAFE_INTEGER - 1,
  ])("rejects invalid reputation %s", (reputation) => {
    const input = validInput()
    input.reputation = reputation

    expect(() => createFromUnknown(input)).toThrow()
  })

  it.each(DATA_QUALITY_KEYS)(
    "rejects every invalid dataQuality.%s value",
    (field) => {
      for (const value of [-1, 10_001, 1.5, Number.NaN, Infinity, -Infinity]) {
        const input = validInput()
        input.dataQuality[field] = value

        expect(() => createFromUnknown(input)).toThrow()
      }
    },
  )

  it("enforces both capacity occupancy invariants", () => {
    const invalidCompute = validInput()
    invalidCompute.compute = { capacity: 4, occupied: 5 }
    expect(() => createFromUnknown(invalidCompute)).toThrow()

    const invalidResearch = validInput()
    invalidResearch.researchCapacity = { capacity: 4, occupied: 5 }
    expect(() => createFromUnknown(invalidResearch)).toThrow()

    const equal = validInput()
    equal.compute = { capacity: 5, occupied: 5 }
    equal.researchCapacity = { capacity: 5, occupied: 5 }
    expect(createCompanyResourceState(equal)).toEqual(equal)
  })

  it("uses descriptor snapshots and never ordinary property reads", () => {
    const target = validInput()
    const originalCash = target.cash
    const proxy = new Proxy(target, {
      get() {
        throw new Error("ordinary property access is forbidden")
      },
      getOwnPropertyDescriptor(current, property) {
        if (property === "users") {
          current.cash = 1
        }
        return Reflect.getOwnPropertyDescriptor(current, property)
      },
    })

    const state = createCompanyResourceState(proxy)

    expect(target.cash).toBe(1)
    expect(state.cash).toBe(originalCash)
  })

  it("never normally rereads any nested input after descriptor snapshots", () => {
    const input = validInput()
    const expected = structuredClone(input)
    const getReads: Record<NestedKey, number> = {
      compute: 0,
      dataQuality: 0,
      researchCapacity: 0,
    }

    for (const boundary of Object.keys(NESTED_KEYS) as readonly NestedKey[]) {
      const target = input[boundary]
      replaceNested(
        input,
        boundary,
        new Proxy(target, {
          get() {
            getReads[boundary] += 1
            throw new Error("nested properties must not be read normally")
          },
        }),
      )
    }

    const state = createCompanyResourceState(input)

    expect(state).toEqual(expected)
    expect(getReads).toEqual({
      compute: 0,
      dataQuality: 0,
      researchCapacity: 0,
    })
  })

  it("snapshots all nested boundaries before validating primitive values", () => {
    const input = validInput()
    input.cash = -1
    const descriptorOperations: string[] = []

    for (const boundary of Object.keys(NESTED_KEYS) as readonly NestedKey[]) {
      const target = input[boundary]
      replaceNested(
        input,
        boundary,
        new Proxy(target, {
          get() {
            throw new Error("nested properties must not be read normally")
          },
          getOwnPropertyDescriptor(current, property) {
            if (typeof property === "string") {
              descriptorOperations.push(`${boundary}.${property}`)
            }
            return Reflect.getOwnPropertyDescriptor(current, property)
          },
        }),
      )
    }

    expect(() => createFromUnknown(input)).toThrow()
    expect(new Set(descriptorOperations)).toEqual(
      new Set([
        "compute.capacity",
        "compute.occupied",
        "dataQuality.domainCoverage",
        "dataQuality.cleaningQuality",
        "dataQuality.contaminationRisk",
        "dataQuality.legalRisk",
        "dataQuality.feedbackQuality",
        "researchCapacity.capacity",
        "researchCapacity.occupied",
      ]),
    )
  })

  it("keeps every nested snapshot stable across later boundary mutations", () => {
    const input = validInput()
    const computeTarget = input.compute
    const dataQualityTarget = input.dataQuality
    const researchCapacityTarget = input.researchCapacity
    const expectedCompute = { ...computeTarget }
    const expectedDataQuality = { ...dataQualityTarget }
    const expectedResearchCapacity = { ...researchCapacityTarget }
    const getReads: Record<NestedKey, number> = {
      compute: 0,
      dataQuality: 0,
      researchCapacity: 0,
    }

    input.compute = new Proxy(computeTarget, {
      get() {
        getReads.compute += 1
        throw new Error("nested properties must not be read normally")
      },
    })
    input.dataQuality = new Proxy(dataQualityTarget, {
      get() {
        getReads.dataQuality += 1
        throw new Error("nested properties must not be read normally")
      },
      getOwnPropertyDescriptor(target, property) {
        if (property === "domainCoverage") {
          computeTarget.capacity = 1
          computeTarget.occupied = 1
        }
        return Reflect.getOwnPropertyDescriptor(target, property)
      },
    })
    input.researchCapacity = new Proxy(researchCapacityTarget, {
      get() {
        getReads.researchCapacity += 1
        throw new Error("nested properties must not be read normally")
      },
      getOwnPropertyDescriptor(target, property) {
        if (property === "capacity") {
          dataQualityTarget.domainCoverage = 1
          dataQualityTarget.cleaningQuality = 1
          dataQualityTarget.contaminationRisk = 1
          dataQualityTarget.legalRisk = 1
          dataQualityTarget.feedbackQuality = 1
        }
        if (property === "occupied") {
          researchCapacityTarget.capacity = 5
        }
        return Reflect.getOwnPropertyDescriptor(target, property)
      },
    })

    const state = createCompanyResourceState(input)

    expect(computeTarget).toEqual({ capacity: 1, occupied: 1 })
    expect(dataQualityTarget).toEqual({
      domainCoverage: 1,
      cleaningQuality: 1,
      contaminationRisk: 1,
      legalRisk: 1,
      feedbackQuality: 1,
    })
    expect(researchCapacityTarget).toEqual({ capacity: 5, occupied: 5 })
    expect(state.compute).toEqual(expectedCompute)
    expect(state.dataQuality).toEqual(expectedDataQuality)
    expect(state.researchCapacity).toEqual(expectedResearchCapacity)
    expect(getReads).toEqual({
      compute: 0,
      dataQuality: 0,
      researchCapacity: 0,
    })
  })

  it("does not mutate inputs or their property descriptors", () => {
    const input = validInput()
    const rootKeys = Reflect.ownKeys(input)
    const computeKeys = Reflect.ownKeys(input.compute)
    const dataQualityKeys = Reflect.ownKeys(input.dataQuality)
    const researchKeys = Reflect.ownKeys(input.researchCapacity)
    const rootDescriptors = descriptors(input)
    const computeDescriptors = descriptors(input.compute)
    const dataQualityDescriptors = descriptors(input.dataQuality)
    const researchDescriptors = descriptors(input.researchCapacity)

    createCompanyResourceState(input)

    expect(Reflect.ownKeys(input)).toEqual(rootKeys)
    expect(Reflect.ownKeys(input.compute)).toEqual(computeKeys)
    expect(Reflect.ownKeys(input.dataQuality)).toEqual(dataQualityKeys)
    expect(Reflect.ownKeys(input.researchCapacity)).toEqual(researchKeys)
    expect(descriptors(input)).toEqual(rootDescriptors)
    expect(descriptors(input.compute)).toEqual(computeDescriptors)
    expect(descriptors(input.dataQuality)).toEqual(dataQualityDescriptors)
    expect(descriptors(input.researchCapacity)).toEqual(researchDescriptors)
  })

  it("keeps output isolated from later input changes", () => {
    const input = validInput()
    const state = createCompanyResourceState(input)
    const expected = structuredClone(state)

    input.cash = 0
    input.compute.capacity = 0
    input.dataQuality.domainCoverage = 0
    input.researchCapacity.capacity = 0
    input.reputation = 0
    input.users = 0

    expect(state).toEqual(expected)
  })

  it("exports readonly root and nested TypeScript views", () => {
    const compute: ComputeResourceState = { capacity: 1, occupied: 0 }
    const dataQuality: DataQualityState = {
      domainCoverage: 1,
      cleaningQuality: 1,
      contaminationRisk: 1,
      legalRisk: 1,
      feedbackQuality: 1,
    }
    const researchCapacity: ResearchCapacityState = {
      capacity: 1,
      occupied: 0,
    }
    const input: CompanyResourceStateInput = {
      cash: 1,
      compute,
      dataQuality,
      researchCapacity,
      reputation: 0,
      users: 0,
    }
    const state: CompanyResourceState = createCompanyResourceState(input)

    expect(state).toEqual(input)

    if (false) {
      // @ts-expect-error -- root fields are readonly.
      state.cash = 2
      // @ts-expect-error -- nested compute fields are readonly.
      state.compute.capacity = 2
      // @ts-expect-error -- nested data-quality fields are readonly.
      state.dataQuality.legalRisk = 2
      // @ts-expect-error -- nested research-capacity fields are readonly.
      state.researchCapacity.occupied = 1
    }
  })
})
