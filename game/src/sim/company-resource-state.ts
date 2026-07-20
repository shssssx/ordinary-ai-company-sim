export interface ComputeResourceState {
  readonly capacity: number
  readonly occupied: number
}

export interface DataQualityState {
  readonly domainCoverage: number
  readonly cleaningQuality: number
  readonly contaminationRisk: number
  readonly legalRisk: number
  readonly feedbackQuality: number
}

export interface ResearchCapacityState {
  readonly capacity: number
  readonly occupied: number
}

export interface CompanyResourceStateInput {
  readonly cash: number
  readonly compute: ComputeResourceState
  readonly dataQuality: DataQualityState
  readonly researchCapacity: ResearchCapacityState
  readonly reputation: number
  readonly users: number
}

export interface CompanyResourceState
  extends CompanyResourceStateInput {}

type PlainRecord = Record<PropertyKey, unknown>

const ROOT_KEYS = [
  "cash",
  "compute",
  "dataQuality",
  "researchCapacity",
  "reputation",
  "users",
] as const

const CAPACITY_KEYS = ["capacity", "occupied"] as const

const DATA_QUALITY_KEYS = [
  "domainCoverage",
  "cleaningQuality",
  "contaminationRisk",
  "legalRisk",
  "feedbackQuality",
] as const

function isPlainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function snapshotExactDataProperties(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new TypeError(`${label} must be a plain object`)
  }

  const expectedKeySet = new Set(expectedKeys)
  const ownKeys = Reflect.ownKeys(value)
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some(
      (key) => typeof key !== "string" || !expectedKeySet.has(key),
    )
  ) {
    throw new TypeError(`${label} must contain exactly the approved fields`)
  }

  const snapshot: Record<string, unknown> = Object.create(null)
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError(
        `${label}.${key} must be an own enumerable data property`,
      )
    }
    snapshot[key] = descriptor.value
  }

  return snapshot
}

function assertSafeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer`)
  }

  return value as number
}

function assertNonNegativeSafeInteger(
  value: unknown,
  label: string,
): number {
  const integer = assertSafeInteger(value, label)
  if (integer < 0) {
    throw new RangeError(`${label} must be non-negative`)
  }

  return integer
}

function assertBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  const integer = assertSafeInteger(value, label)
  if (integer < minimum || integer > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}`)
  }

  return integer
}

export function createCompanyResourceState(
  input: CompanyResourceStateInput,
): CompanyResourceState {
  const rootSnapshot = snapshotExactDataProperties(
    input,
    ROOT_KEYS,
    "Company resource state",
  )
  const computeSnapshot = snapshotExactDataProperties(
    rootSnapshot.compute,
    CAPACITY_KEYS,
    "compute",
  )
  const dataQualitySnapshot = snapshotExactDataProperties(
    rootSnapshot.dataQuality,
    DATA_QUALITY_KEYS,
    "dataQuality",
  )
  const researchCapacitySnapshot = snapshotExactDataProperties(
    rootSnapshot.researchCapacity,
    CAPACITY_KEYS,
    "researchCapacity",
  )

  const cash = assertNonNegativeSafeInteger(rootSnapshot.cash, "cash")
  const computeCapacity = assertNonNegativeSafeInteger(
    computeSnapshot.capacity,
    "compute.capacity",
  )
  const computeOccupied = assertNonNegativeSafeInteger(
    computeSnapshot.occupied,
    "compute.occupied",
  )
  const domainCoverage = assertBoundedInteger(
    dataQualitySnapshot.domainCoverage,
    0,
    10_000,
    "dataQuality.domainCoverage",
  )
  const cleaningQuality = assertBoundedInteger(
    dataQualitySnapshot.cleaningQuality,
    0,
    10_000,
    "dataQuality.cleaningQuality",
  )
  const contaminationRisk = assertBoundedInteger(
    dataQualitySnapshot.contaminationRisk,
    0,
    10_000,
    "dataQuality.contaminationRisk",
  )
  const legalRisk = assertBoundedInteger(
    dataQualitySnapshot.legalRisk,
    0,
    10_000,
    "dataQuality.legalRisk",
  )
  const feedbackQuality = assertBoundedInteger(
    dataQualitySnapshot.feedbackQuality,
    0,
    10_000,
    "dataQuality.feedbackQuality",
  )
  const researchCapacity = assertNonNegativeSafeInteger(
    researchCapacitySnapshot.capacity,
    "researchCapacity.capacity",
  )
  const researchOccupied = assertNonNegativeSafeInteger(
    researchCapacitySnapshot.occupied,
    "researchCapacity.occupied",
  )
  const reputation = assertSafeInteger(rootSnapshot.reputation, "reputation")
  const users = assertNonNegativeSafeInteger(rootSnapshot.users, "users")

  if (computeOccupied > computeCapacity) {
    throw new RangeError("compute.occupied must not exceed compute.capacity")
  }
  if (researchOccupied > researchCapacity) {
    throw new RangeError(
      "researchCapacity.occupied must not exceed researchCapacity.capacity",
    )
  }

  return {
    cash,
    compute: {
      capacity: computeCapacity,
      occupied: computeOccupied,
    },
    dataQuality: {
      domainCoverage,
      cleaningQuality,
      contaminationRisk,
      legalRisk,
      feedbackQuality,
    },
    researchCapacity: {
      capacity: researchCapacity,
      occupied: researchOccupied,
    },
    reputation,
    users,
  }
}
