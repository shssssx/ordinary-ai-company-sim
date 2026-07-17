const UINT32_MAX = 0xffff_ffff
const UINT32_RANGE = 0x1_0000_0000
const MULBERRY32_INCREMENT = 0x6d2b_79f5

export const MULBERRY32_ALGORITHM = "mulberry32-v1" as const

export interface Mulberry32State {
  readonly algorithm: typeof MULBERRY32_ALGORITHM
  readonly state: number
}

export interface RngResult<T> {
  readonly value: T
  readonly state: Mulberry32State
}

function assertUint32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new RangeError(`${label} must be an unsigned 32-bit integer`)
  }
}

function assertMulberry32State(state: Mulberry32State): void {
  const prototype =
    typeof state === "object" && state !== null
      ? Object.getPrototypeOf(state)
      : undefined

  if (
    typeof state !== "object" ||
    state === null ||
    Array.isArray(state) ||
    (prototype !== Object.prototype && prototype !== null)
  ) {
    throw new TypeError(`RNG state must use ${MULBERRY32_ALGORITHM}`)
  }

  const ownKeys = Reflect.ownKeys(state)
  const algorithmDescriptor = Object.getOwnPropertyDescriptor(state, "algorithm")
  const stateDescriptor = Object.getOwnPropertyDescriptor(state, "state")
  if (
    ownKeys.length !== 2 ||
    !ownKeys.includes("algorithm") ||
    !ownKeys.includes("state") ||
    algorithmDescriptor === undefined ||
    stateDescriptor === undefined ||
    !algorithmDescriptor.enumerable ||
    !stateDescriptor.enumerable ||
    !("value" in algorithmDescriptor) ||
    !("value" in stateDescriptor) ||
    algorithmDescriptor.value !== MULBERRY32_ALGORITHM
  ) {
    throw new TypeError(`RNG state must use ${MULBERRY32_ALGORITHM}`)
  }

  assertUint32(stateDescriptor.value as number, "RNG state")
}

export function createRng(seed: number): Mulberry32State {
  assertUint32(seed, "RNG seed")

  return {
    algorithm: MULBERRY32_ALGORITHM,
    state: seed,
  }
}

export function nextUint32(state: Mulberry32State): RngResult<number> {
  assertMulberry32State(state)

  const newState = (state.state + MULBERRY32_INCREMENT) >>> 0
  let mixed = newState
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
  const value = (mixed ^ (mixed >>> 14)) >>> 0

  return {
    value,
    state: {
      algorithm: MULBERRY32_ALGORITHM,
      state: newState,
    },
  }
}

export function nextUnitFloat(state: Mulberry32State): RngResult<number> {
  const result = nextUint32(state)

  return {
    value: result.value / UINT32_RANGE,
    state: result.state,
  }
}
