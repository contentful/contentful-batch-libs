import Promise from 'bluebird'

import getEntityName from '../utils/get-entity-name'
import { logEmitter, errorEmitter } from '../utils/logging'

/**
 * Deletes a list of entities, which should've been previously unpublished.
 */
export function deleteEntities (entities) {
  return Promise.map(entities, (entity, index) => {
    if (!entity || !entity.delete) {
      errorEmitter.emit('error', new Error('Error While deleting entity: undefined entity at index ' + index))
      return Promise.resolve(entity)
    }
    return entity.delete()
      .then(() => {
        logEmitter.emit('log', `Deleted ${entity.sys.type} ${getEntityName(entity)}`)
        return entity
      })
      .catch((err) => {
        if (err.name === 'DefaultLocaleNotDeletable') {
          return entity
        } else {
          errorEmitter.emit('error', err)
          return null
        }
      })
  })
}
