import { type SysLink, type KeyValueMap } from 'contentful-management'

export function isDetails(
  input: Record<string, unknown>
): input is { details: Record<string, unknown> } {
  return Boolean(
    'details' in input && input.details && typeof input.details === 'object'
  )
}

export function isErrors(
  input: Record<string, unknown>
): input is { errors: { name: string }[] } {
  return Boolean(
    'errors' in input &&
      Array.isArray(input.errors) &&
      input.errors.every((err) => err.name)
  )
}

export function isFields<T = KeyValueMap>(
  input: NonNullable<unknown>
): input is { fields: T } {
  return Boolean(
    'fields' in input && typeof input.fields === 'object' && input.fields
  )
}

export function isMessage(input: unknown): input is { message: string } {
  return Boolean(
    input &&
      typeof input === 'object' &&
      'message' in input &&
      typeof input.message === 'string'
  )
}

export function isSysLink(input: NonNullable<unknown>): input is SysLink {
  return Boolean(
    'sys' in input &&
      typeof input.sys === 'object' &&
      input.sys &&
      'id' in input.sys
  )
}
