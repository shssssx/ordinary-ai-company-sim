export interface HiddenCapabilityVectorInput {
  readonly coding: number
  readonly mathReasoning: number
  readonly writing: number
  readonly dialogue: number
  readonly hallucinationResistance: number
  readonly selfCorrection: number
}

export interface HiddenCapabilityVector
  extends HiddenCapabilityVectorInput {}

const CAPABILITY_KEYS = [
  "coding",
  "mathReasoning",
  "writing",
  "dialogue",
  "hallucinationResistance",
  "selfCorrection",
] as const

function isPlainObject(value: unknown): value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function snapshotCapabilityValues(value: unknown): readonly unknown[] {
  if (!isPlainObject(value)) {
    throw new TypeError("Hidden capability vector must be a plain object")
  }

  const approvedKeys = new Set<string>(CAPABILITY_KEYS)
  const ownKeys = Reflect.ownKeys(value)
  if (
    ownKeys.length !== CAPABILITY_KEYS.length ||
    ownKeys.some(
      (key) => typeof key !== "string" || !approvedKeys.has(key),
    )
  ) {
    throw new TypeError(
      "Hidden capability vector must contain exactly the approved fields",
    )
  }

  return CAPABILITY_KEYS.map((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new TypeError(
        `Hidden capability vector.${key} must be an own enumerable data property`,
      )
    }

    return descriptor.value as unknown
  })
}

function requireSafeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Hidden capability vector.${field} must be a safe integer`,
    )
  }

  return value as number
}

export function createHiddenCapabilityVector(
  input: HiddenCapabilityVectorInput,
): HiddenCapabilityVector {
  const [
    codingValue,
    mathReasoningValue,
    writingValue,
    dialogueValue,
    hallucinationResistanceValue,
    selfCorrectionValue,
  ] = snapshotCapabilityValues(input)

  const coding = requireSafeInteger(codingValue, "coding")
  const mathReasoning = requireSafeInteger(
    mathReasoningValue,
    "mathReasoning",
  )
  const writing = requireSafeInteger(writingValue, "writing")
  const dialogue = requireSafeInteger(dialogueValue, "dialogue")
  const hallucinationResistance = requireSafeInteger(
    hallucinationResistanceValue,
    "hallucinationResistance",
  )
  const selfCorrection = requireSafeInteger(
    selfCorrectionValue,
    "selfCorrection",
  )

  return {
    coding,
    mathReasoning,
    writing,
    dialogue,
    hallucinationResistance,
    selfCorrection,
  }
}
