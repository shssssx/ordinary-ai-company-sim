import {
  createHiddenCapabilityVector,
  type HiddenCapabilityVector,
  type HiddenCapabilityVectorInput,
} from "./hidden-capability-vector"

export interface CheckpointStateInput {
  readonly id: string
  readonly capability: HiddenCapabilityVectorInput
}

export interface CheckpointState {
  readonly id: string
  readonly capability: HiddenCapabilityVector
}

interface CheckpointStateSnapshot {
  readonly id: unknown
  readonly capability: unknown
}

const CHECKPOINT_KEYS = ["id", "capability"] as const

function snapshotCheckpointState(value: unknown): CheckpointStateSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Checkpoint state must be a plain object")
  }

  const ownKeys = Reflect.ownKeys(value)
  const idDescriptor = Object.getOwnPropertyDescriptor(value, "id")
  const capabilityDescriptor = Object.getOwnPropertyDescriptor(
    value,
    "capability",
  )

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Checkpoint state must be a plain object")
  }

  const approvedKeys = new Set<string>(CHECKPOINT_KEYS)
  if (
    ownKeys.length !== CHECKPOINT_KEYS.length ||
    ownKeys.some(
      (key) => typeof key !== "string" || !approvedKeys.has(key),
    )
  ) {
    throw new TypeError(
      "Checkpoint state must contain exactly the approved fields",
    )
  }

  if (
    idDescriptor === undefined ||
    !idDescriptor.enumerable ||
    !("value" in idDescriptor)
  ) {
    throw new TypeError(
      "Checkpoint state.id must be an own enumerable data property",
    )
  }
  if (
    capabilityDescriptor === undefined ||
    !capabilityDescriptor.enumerable ||
    !("value" in capabilityDescriptor)
  ) {
    throw new TypeError(
      "Checkpoint state.capability must be an own enumerable data property",
    )
  }

  return {
    id: idDescriptor.value,
    capability: capabilityDescriptor.value,
  }
}

function requireCheckpointId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("Checkpoint state.id must be a non-blank string")
  }

  return value
}

export function createCheckpointState(
  input: CheckpointStateInput,
): CheckpointState {
  const snapshot = snapshotCheckpointState(input)
  const capability = createHiddenCapabilityVector(
    snapshot.capability as HiddenCapabilityVectorInput,
  )
  const id = requireCheckpointId(snapshot.id)

  return {
    id,
    capability,
  }
}
