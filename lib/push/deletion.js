import Promise from 'bluebird'
import log from 'npmlog'
import getEntityName from './get-entity-name'

/**
 * Deletes a list of entities, which should've been previously unpublished.
 */
export function deleteEntities (entities) {
  return Promise.map(entities, (entity) => {
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
