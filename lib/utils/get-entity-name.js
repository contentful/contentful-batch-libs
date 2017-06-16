import { get } from 'lodash'

export default function getEntityName (entity) {
  const name = get(entity, 'name')
  const titleField = get(entity, 'fields.title')
  const id = get(entity, 'sys.id')
  if (name) {
    return name
  }
  if (titleField) {
    const locales = Object.keys(titleField)
    return titleField[locales[0]]
  }
  if (id) {
    return id
  }
  return 'unknown'
}
