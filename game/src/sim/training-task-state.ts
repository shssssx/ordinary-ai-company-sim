export interface TrainingTaskStateInput {
  readonly id: string
  readonly baseCheckpointId: string
  readonly computeOccupancy: number
  readonly researchCapacityOccupancy: number
}

export interface TrainingTaskState
  extends TrainingTaskStateInput {}

interface TrainingTaskStateSnapshot {
  readonly id: unknown
  readonly baseCheckpointId: unknown
  readonly computeOccupancy: unknown
  readonly researchCapacityOccupancy: unknown
}

const TRAINING_TASK_KEYS = [
  "id",
  "baseCheckpointId",
  "computeOccupancy",
  "researchCapacityOccupancy",
] as const

function snapshotTrainingTaskState(
  value: unknown,
): TrainingTaskStateSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Training task state must be a plain object")
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Training task state must be a plain object")
  }

  const approvedKeys = new Set<string>(TRAINING_TASK_KEYS)
  const ownKeys = Reflect.ownKeys(value)
  if (
    ownKeys.length !== TRAINING_TASK_KEYS.length ||
    ownKeys.some(
      (key) => typeof key !== "string" || !approvedKeys.has(key),
    )
  ) {
    throw new TypeError(
      "Training task state must contain exactly the approved fields",
    )
  }

  const snappedValues: unknown[] = []
  for (const key of TRAINING_TASK_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError(
        `Training task state.${key} must be an own enumerable data property`,
      )
    }

    snappedValues.push(descriptor.value)
  }

  const [
    id,
    baseCheckpointId,
    computeOccupancy,
    researchCapacityOccupancy,
  ] = snappedValues

  return {
    id,
    baseCheckpointId,
    computeOccupancy,
    researchCapacityOccupancy,
  }
}

function requireNonBlankString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(
      `Training task state.${field} must be a non-blank string`,
    )
  }

  return value
}

function requireNonNegativeSafeInteger(
  value: unknown,
  field: string,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(
      `Training task state.${field} must be a non-negative safe integer`,
    )
  }

  return value as number
}

export function createTrainingTaskState(
  input: TrainingTaskStateInput,
): TrainingTaskState {
  const snapshot = snapshotTrainingTaskState(input)
  const id = requireNonBlankString(snapshot.id, "id")
  const baseCheckpointId = requireNonBlankString(
    snapshot.baseCheckpointId,
    "baseCheckpointId",
  )
  const computeOccupancy = requireNonNegativeSafeInteger(
    snapshot.computeOccupancy,
    "computeOccupancy",
  )
  const researchCapacityOccupancy = requireNonNegativeSafeInteger(
    snapshot.researchCapacityOccupancy,
    "researchCapacityOccupancy",
  )

  return {
    id,
    baseCheckpointId,
    computeOccupancy,
    researchCapacityOccupancy,
  }
}
