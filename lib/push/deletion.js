import Promise from 'bluebird'
import log from 'npmlog'
import getEntityName from './get-entity-name'

/**
 * Deletes a list of entities, which should've been previously unpublished.
 */
export function deleteEntities (entities) {
  return Promise.map(entities, (entity, index) => {
    if (!entity || !entity.delete) {
      log.info('Error While deleting entity: undefined entity at index ' + index)
      return Promise.resolve(entity)
    }
    return entity.delete()
      .then(() => {
        log.info(`Deleted ${entity.sys.type} ${getEntityName(entity)}`)
        return entity
      }, (err) => {
        if (err.name === 'DefaultLocaleNotDeletable') {
          return entity
        } else {
          throw err
        }
      })
  })
}
