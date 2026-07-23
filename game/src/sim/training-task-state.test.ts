import { describe, expect, it } from "vitest"

import * as sim from "./index"
import {
  createTrainingTaskState,
  type TrainingTaskState,
  type TrainingTaskStateInput,
} from "./index"
// @ts-expect-error -- TrainingTaskId is not an approved public type.
import type { TrainingTaskId } from "./index"
// @ts-expect-error -- TrainingTaskReference is not an approved public type.
import type { TrainingTaskReference } from "./index"
// @ts-expect-error -- TrainingTaskStatus is not an approved public type.
import type { TrainingTaskStatus } from "./index"
// @ts-expect-error -- TrainingTaskKind is not an approved public type.
import type { TrainingTaskKind } from "./index"
// @ts-expect-error -- TrainingTaskResult is not an approved public type.
import type { TrainingTaskResult } from "./index"
// @ts-expect-error -- TrainingTaskFailure is not an approved public type.
import type { TrainingTaskFailure } from "./index"
// @ts-expect-error -- TrainingTaskCollection is not an approved public type.
import type { TrainingTaskCollection } from "./index"
// @ts-expect-error -- TrainingTaskRegistry is not an approved public type.
import type { TrainingTaskRegistry } from "./index"
// @ts-expect-error -- TrainingTaskRepository is not an approved public type.
import type { TrainingTaskRepository } from "./index"
// @ts-expect-error -- TrainingCompleted is not an approved public type.
import type { TrainingCompleted } from "./index"

type MutableTrainingTaskStateInput = {
  id: string
  baseCheckpointId: string
  computeOccupancy: number
  researchCapacityOccupancy: number
}

type TrainingTaskField = keyof MutableTrainingTaskStateInput

const TRAINING_TASK_FIELDS = [
  "id",
  "baseCheckpointId",
  "computeOccupancy",
  "researchCapacityOccupancy",
] as const satisfies readonly TrainingTaskField[]

const ID_FIELDS = [
  "id",
  "baseCheckpointId",
] as const satisfies readonly TrainingTaskField[]

const OCCUPANCY_FIELDS = [
  "computeOccupancy",
  "researchCapacityOccupancy",
] as const satisfies readonly TrainingTaskField[]

function validInput(): MutableTrainingTaskStateInput {
  return {
    id: "training-task-1",
    baseCheckpointId: "checkpoint-1",
    computeOccupancy: 32,
    researchCapacityOccupancy: 4,
  }
}

function createFromUnknown(value: unknown): TrainingTaskState {
  return createTrainingTaskState(value as TrainingTaskStateInput)
}

function setField(
  input: object,
  field: TrainingTaskField,
  value: unknown,
): void {
  Object.defineProperty(input, field, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  })
}

describe("training task state", () => {
  it("creates exactly the approved four-field shape as a fresh root", () => {
    const input = validInput()
    const state = createTrainingTaskState(input)

    expect(state).toEqual(input)
    expect(Reflect.ownKeys(state)).toEqual(TRAINING_TASK_FIELDS)
    expect(state).not.toBe(input)
    expect("duration" in state).toBe(false)
    expect("dueDay" in state).toBe(false)
    expect("priority" in state).toBe(false)
    expect("eventSequenceId" in state).toBe(false)
    expect("status" in state).toBe(false)
    expect("outputCheckpointId" in state).toBe(false)
  })

  it("does not depend on input property insertion order", () => {
    const expected = validInput()
    const reordered = {
      researchCapacityOccupancy: expected.researchCapacityOccupancy,
      computeOccupancy: expected.computeOccupancy,
      baseCheckpointId: expected.baseCheckpointId,
      id: expected.id,
    }

    const state = createTrainingTaskState(reordered)

    expect(state).toEqual(expected)
    expect(Reflect.ownKeys(state)).toEqual(TRAINING_TASK_FIELDS)
  })

  it("preserves ordinary valid IDs without generation or defaulting", () => {
    const input = validInput()
    const state = createTrainingTaskState(input)

    expect(state.id).toBe(input.id)
    expect(state.baseCheckpointId).toBe(input.baseCheckpointId)
  })

  it("preserves ID whitespace and case", () => {
    const input = validInput()
    input.id = "  Training-Task-A  "
    input.baseCheckpointId = "  CheckPoint-B  "

    const state = createTrainingTaskState(input)

    expect(state.id).toBe("  Training-Task-A  ")
    expect(state.baseCheckpointId).toBe("  CheckPoint-B  ")
  })

  it("does not normalize Unicode IDs", () => {
    const input = validInput()
    input.id = "task-e\u0301"
    input.baseCheckpointId = "base-a\u030a"

    const state = createTrainingTaskState(input)

    expect(state.id).toBe("task-e\u0301")
    expect(state.id).not.toBe("task-\u00e9")
    expect(state.baseCheckpointId).toBe("base-a\u030a")
    expect(state.baseCheckpointId).not.toBe("base-\u00e5")
  })

  it.each(ID_FIELDS)("rejects blank %s values", (field) => {
    for (const value of ["", " ", "\t\n"]) {
      const input = validInput()
      setField(input, field, value)

      expect(() => createFromUnknown(input)).toThrow()
    }
  })

  it.each(ID_FIELDS)("rejects non-string %s values", (field) => {
    for (const value of [
      42,
      true,
      null,
      undefined,
      1n,
      Symbol("id"),
      {},
    ]) {
      const input = validInput()
      setField(input, field, value)

      expect(() => createFromUnknown(input)).toThrow()
    }
  })

  it("accepts duplicate task IDs across independent calls", () => {
    const first = createTrainingTaskState(validInput())
    const second = createTrainingTaskState(validInput())

    expect(first.id).toBe(second.id)
    expect(second).not.toBe(first)
  })

  it("accepts an arbitrary non-blank base checkpoint ID without lookup", () => {
    const input = validInput()
    input.baseCheckpointId = "unknown://checkpoint/does-not-exist"

    expect(createTrainingTaskState(input).baseCheckpointId).toBe(
      input.baseCheckpointId,
    )
  })

  it("accepts zero occupancy", () => {
    const input = validInput()
    input.computeOccupancy = 0
    input.researchCapacityOccupancy = 0

    expect(createTrainingTaskState(input)).toEqual(input)
  })

  it("accepts Number.MAX_SAFE_INTEGER occupancy", () => {
    const input = validInput()
    input.computeOccupancy = Number.MAX_SAFE_INTEGER
    input.researchCapacityOccupancy = Number.MAX_SAFE_INTEGER

    expect(createTrainingTaskState(input)).toEqual(input)
  })

  it.each(OCCUPANCY_FIELDS)(
    "rejects invalid numeric %s values",
    (field) => {
      for (const value of [
        -1,
        1.5,
        Number.NaN,
        Infinity,
        -Infinity,
        Number.MAX_SAFE_INTEGER + 1,
      ]) {
        const input = validInput()
        setField(input, field, value)

        expect(() => createFromUnknown(input)).toThrow()
      }
    },
  )

  it.each(OCCUPANCY_FIELDS)(
    "rejects representative non-number %s values",
    (field) => {
      for (const value of [
        "1",
        true,
        null,
        undefined,
        1n,
        Symbol("occupancy"),
        {},
      ]) {
        const input = validInput()
        setField(input, field, value)

        expect(() => createFromUnknown(input)).toThrow()
      }
    },
  )

  it("accepts an ordinary Object.prototype root", () => {
    const input = validInput()

    expect(Object.getPrototypeOf(input)).toBe(Object.prototype)
    expect(createTrainingTaskState(input)).toEqual(input)
  })

  it("accepts a null-prototype root", () => {
    const expected = validInput()
    const input = Object.assign(Object.create(null), expected) as
      MutableTrainingTaskStateInput

    expect(Object.getPrototypeOf(input)).toBe(null)
    expect(createTrainingTaskState(input)).toEqual(expected)
  })

  it.each([
    ["null", null],
    ["number primitive", 42],
    ["string primitive", "training-task"],
    ["boolean primitive", true],
    ["undefined primitive", undefined],
    ["bigint primitive", 1n],
    ["symbol primitive", Symbol("training-task")],
    ["array", []],
    [
      "class instance",
      new (class TrainingTaskContainer {
        id = "training-task-1"
        baseCheckpointId = "checkpoint-1"
        computeOccupancy = 32
        researchCapacityOccupancy = 4
      })(),
    ],
    [
      "custom-prototype object",
      Object.assign(Object.create({ custom: true }), validInput()),
    ],
  ] as const)("rejects a %s root", (_label, candidate) => {
    expect(() => createFromUnknown(candidate)).toThrow()
  })

  it.each(TRAINING_TASK_FIELDS)(
    "rejects a missing %s field",
    (field) => {
      const input = validInput()
      expect(Reflect.deleteProperty(input, field)).toBe(true)

      expect(() => createFromUnknown(input)).toThrow()
    },
  )

  it("rejects an extra string key", () => {
    const input = validInput() as MutableTrainingTaskStateInput & {
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

  it.each(TRAINING_TASK_FIELDS)(
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

  it.each(TRAINING_TASK_FIELDS)(
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

  it.each(TRAINING_TASK_FIELDS)(
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
    for (const field of TRAINING_TASK_FIELDS) {
      Object.defineProperty(input, field, {
        configurable: false,
        enumerable: true,
        value: source[field],
        writable: false,
      })
    }

    expect(createFromUnknown(input)).toEqual(source)
  })

  it.each([
    ["id", " "],
    ["baseCheckpointId", " "],
    ["computeOccupancy", -1],
    ["researchCapacityOccupancy", -1],
  ] as const)(
    "snapshots all four descriptors before validating invalid %s",
    (field, invalidValue) => {
      const target = validInput()
      setField(target, field, invalidValue)
      const descriptorOperations: PropertyKey[] = []
      const input = new Proxy(target, {
        get() {
          throw new Error("ordinary root property reads are forbidden")
        },
        getOwnPropertyDescriptor(current, property) {
          descriptorOperations.push(property)
          return Reflect.getOwnPropertyDescriptor(current, property)
        },
      })

      expect(() => createFromUnknown(input)).toThrow()
      expect(new Set(descriptorOperations)).toEqual(
        new Set(TRAINING_TASK_FIELDS),
      )
    },
  )

  it("creates from descriptor snapshots without ordinary property reads", () => {
    const target = validInput()
    let ordinaryReads = 0
    const input = new Proxy(target, {
      get() {
        ordinaryReads += 1
        throw new Error("ordinary root property reads are forbidden")
      },
    })

    expect(createTrainingTaskState(input)).toEqual(target)
    expect(ordinaryReads).toBe(0)
  })

  it("keeps earlier snapshots stable across later descriptor mutations", () => {
    const target = validInput()
    const expected = { ...target }
    const snappedFields: TrainingTaskField[] = []
    const replacements: MutableTrainingTaskStateInput = {
      id: "mutated-task",
      baseCheckpointId: "mutated-checkpoint",
      computeOccupancy: 1,
      researchCapacityOccupancy: 2,
    }
    const input = new Proxy(target, {
      get() {
        throw new Error("ordinary root property reads are forbidden")
      },
      getOwnPropertyDescriptor(current, property) {
        for (const snappedField of snappedFields) {
          current[snappedField] = replacements[snappedField] as never
        }
        const descriptor = Reflect.getOwnPropertyDescriptor(
          current,
          property,
        )
        if (
          typeof property === "string" &&
          TRAINING_TASK_FIELDS.includes(property as TrainingTaskField)
        ) {
          snappedFields.push(property as TrainingTaskField)
        }
        return descriptor
      },
    })

    const state = createTrainingTaskState(input)

    expect(state).toEqual(expected)
    expect(new Set(snappedFields)).toEqual(new Set(TRAINING_TASK_FIELDS))
    expect(target).not.toEqual(expected)
  })

  it("does not mutate input keys or property descriptors", () => {
    const input = validInput()
    const keysBefore = Reflect.ownKeys(input)
    const descriptorsBefore = Object.getOwnPropertyDescriptors(input)

    createTrainingTaskState(input)

    expect(Reflect.ownKeys(input)).toEqual(keysBefore)
    expect(Object.getOwnPropertyDescriptors(input)).toEqual(
      descriptorsBefore,
    )
  })

  it("isolates output from later input mutation", () => {
    const input = validInput()
    const state = createTrainingTaskState(input)
    const expected = { ...state }

    input.id = "mutated-task"
    input.baseCheckpointId = "mutated-checkpoint"
    input.computeOccupancy = 0
    input.researchCapacityOccupancy = 0

    expect(state).toEqual(expected)
  })

  it("rejects structural violations without ordinary reads or getters", () => {
    const target = Object.assign(validInput(), { extra: true })
    let ordinaryReads = 0
    const input = new Proxy(target, {
      get() {
        ordinaryReads += 1
        throw new Error("ordinary root property reads are forbidden")
      },
    })

    expect(() => createFromUnknown(input)).toThrow()
    expect(ordinaryReads).toBe(0)
  })

  it("provides readonly fields without runtime freezing", () => {
    const input: TrainingTaskStateInput = validInput()
    const state: TrainingTaskState = createTrainingTaskState(input)

    expect(Object.isFrozen(state)).toBe(false)

    if (false) {
      // @ts-expect-error -- input id is readonly.
      input.id = "replacement"
      // @ts-expect-error -- input baseCheckpointId is readonly.
      input.baseCheckpointId = "replacement"
      // @ts-expect-error -- input computeOccupancy is readonly.
      input.computeOccupancy = 0
      // @ts-expect-error -- input researchCapacityOccupancy is readonly.
      input.researchCapacityOccupancy = 0
      // @ts-expect-error -- state id is readonly.
      state.id = "replacement"
      // @ts-expect-error -- state baseCheckpointId is readonly.
      state.baseCheckpointId = "replacement"
      // @ts-expect-error -- state computeOccupancy is readonly.
      state.computeOccupancy = 0
      // @ts-expect-error -- state researchCapacityOccupancy is readonly.
      state.researchCapacityOccupancy = 0
    }
  })

  it("exposes only the approved training-task runtime API", () => {
    expect(
      Object.keys(sim).filter((name) => /training|task/i.test(name)),
    ).toEqual(["createTrainingTaskState"])
    expect(sim).not.toHaveProperty("TrainingTaskState")
    expect(sim).not.toHaveProperty("TrainingTaskStateInput")
    expect(sim).not.toHaveProperty("parseTrainingTaskState")
    expect(sim).not.toHaveProperty("validateTrainingTaskState")
    expect(sim).not.toHaveProperty("assertTrainingTaskState")
    expect(sim).not.toHaveProperty("createTrainingTaskId")
    expect(sim).not.toHaveProperty("TrainingTaskCollection")
    expect(sim).not.toHaveProperty("TrainingTaskStatus")
    expect(sim).not.toHaveProperty("TrainingTaskResult")
    expect(sim).not.toHaveProperty("TrainingCompleted")

    if (false) {
      const forbiddenTypes: [
        TrainingTaskId,
        TrainingTaskReference,
        TrainingTaskStatus,
        TrainingTaskKind,
        TrainingTaskResult,
        TrainingTaskFailure,
        TrainingTaskCollection,
        TrainingTaskRegistry,
        TrainingTaskRepository,
        TrainingCompleted,
      ] = [] as never
      void forbiddenTypes
    }
  })
})
