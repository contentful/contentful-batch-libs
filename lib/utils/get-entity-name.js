import { get } from 'lodash'

export default function getEntityName (entity) {
  const name = get(entity, 'name')
  if (name) {
    return attachId(name, entity)
  }

  const titleField = get(entity, 'fields.title')
  if (titleField) {
    const locales = Object.keys(titleField)
    return attachId(titleField[locales[0]], entity)
  }

  const id = get(entity, 'sys.id')
  if (id) {
    return id
  }

  return 'unknown'
}

function attachId (val, entity) {
  const id = get(entity, 'sys.id')
  if (id) {
    return `${val} (${id})`
  }
  return val
}
