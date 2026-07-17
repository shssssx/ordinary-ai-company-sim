export type JsonPrimitive = null | boolean | number | string

export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[]

export type ReadonlyJsonValue<TValue extends JsonValue> =
  TValue extends JsonPrimitive
    ? TValue
    : TValue extends readonly (infer TElement extends JsonValue)[]
      ? readonly ReadonlyJsonValue<TElement>[]
      : TValue extends { readonly [key: string]: JsonValue }
        ? {
            readonly [TKey in keyof TValue]: TValue[TKey] extends JsonValue
              ? ReadonlyJsonValue<TValue[TKey]>
              : never
          }
        : never
