import { describe, expect, it } from "vitest"

import {
  createRng,
  nextUint32,
  nextUnitFloat,
  type Mulberry32State,
} from "./index"

describe("mulberry32-v1", () => {
  it("matches the approved seed-zero known-answer vector", () => {
    const expected = [
      1_144_304_738, 1_416_247, 958_946_056, 627_933_444, 2_007_157_716,
    ]
    const actual: number[] = []
    let state = createRng(0)

    for (let index = 0; index < expected.length; index += 1) {
      const result = nextUint32(state)
      actual.push(result.value)
      state = result.state
    }

    expect(actual).toEqual(expected)
    expect(state).toEqual({
      algorithm: "mulberry32-v1",
      state: 567_894_473,
    })
  })

  it("does not advance before the first draw", () => {
    expect(createRng(0xffff_ffff)).toEqual({
      algorithm: "mulberry32-v1",
      state: 0xffff_ffff,
    })
  })

  it("returns the same sequence and final state for the same seed", () => {
    function draw(seed: number): readonly [readonly number[], Mulberry32State] {
      const values: number[] = []
      let state = createRng(seed)

      for (let index = 0; index < 12; index += 1) {
        const result = nextUint32(state)
        values.push(result.value)
        state = result.state
      }

      return [values, state]
    }

    expect(draw(123_456_789)).toEqual(draw(123_456_789))
  })

  it("derives the unit float from the same single uint32 draw", () => {
    const state = createRng(0)
    const integerResult = nextUint32(state)
    const floatResult = nextUnitFloat(state)

    expect(floatResult.value).toBe(integerResult.value / 4_294_967_296)
    expect(floatResult.state).toEqual(integerResult.state)
    expect(floatResult.value).toBeGreaterThanOrEqual(0)
    expect(floatResult.value).toBeLessThan(1)
  })

  it("keeps uint32 output inside the approved range", () => {
    let state = createRng(987_654_321)

    for (let index = 0; index < 32; index += 1) {
      const result = nextUint32(state)
      expect(Number.isInteger(result.value)).toBe(true)
      expect(result.value).toBeGreaterThanOrEqual(0)
      expect(result.value).toBeLessThanOrEqual(0xffff_ffff)
      state = result.state
    }
  })

  it("continues identically after a JSON round-trip", () => {
    let state = createRng(42)
    for (let index = 0; index < 7; index += 1) {
      state = nextUint32(state).state
    }

    const restored = JSON.parse(JSON.stringify(state)) as Mulberry32State

    expect(nextUint32(restored)).toEqual(nextUint32(state))
  })

  it.each([-1, 4_294_967_296, 1.5, Number.NaN, Infinity, -Infinity])(
    "rejects invalid seed %s",
    (seed) => {
      expect(() => createRng(seed)).toThrow()
    },
  )

  it("rejects unknown algorithms and invalid serialized state", () => {
    const unknownAlgorithm = {
      algorithm: "other-v1",
      state: 0,
    } as unknown as Mulberry32State
    const invalidState = {
      algorithm: "mulberry32-v1",
      state: Number.NaN,
    } as Mulberry32State

    expect(() => nextUint32(unknownAlgorithm)).toThrow()
    expect(() => nextUint32(invalidState)).toThrow()
  })

  it.each([-1, 4_294_967_296, 1.5, Infinity])(
    "rejects invalid serialized state value %s",
    (value) => {
      const state = {
        algorithm: "mulberry32-v1",
        state: value,
      } as Mulberry32State

      expect(() => nextUint32(state)).toThrow()
    },
  )

  it("rejects non-plain serialized state containers", () => {
    class StateContainer {
      readonly algorithm = "mulberry32-v1" as const
      readonly state = 0
    }

    const arrayState = Object.assign([], {
      algorithm: "mulberry32-v1" as const,
      state: 0,
    }) as unknown as Mulberry32State
    const stateWithExtraData = {
      algorithm: "mulberry32-v1",
      state: 0,
      extra: true,
    } as unknown as Mulberry32State

    expect(() => nextUint32(new StateContainer())).toThrow()
    expect(() => nextUint32(arrayState)).toThrow()
    expect(() => nextUint32(stateWithExtraData)).toThrow()
  })
})
