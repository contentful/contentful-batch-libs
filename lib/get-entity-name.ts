import { isFields, isSysLink } from './type-guards'

export function getEntityName (entity: NonNullable<unknown>): string {
  if ('name' in entity && typeof entity.name === 'string') {
    return attachId(entity.name, entity)
  }

  if (isFields(entity)) {
    const titleOrNameField = entity.fields.title ?? entity.fields.name
    if (titleOrNameField) {
      const locales = Object.keys(titleOrNameField)
      return attachId(titleOrNameField[locales[0]], entity)
    }
  }

  return isSysLink(entity) ? entity.sys.id : 'unknown'
}

function attachId (val: string, entity: NonNullable<unknown>) {
  if (isSysLink(entity)) {
    return `${val} (${entity.sys.id})`
  }
  return val
}
