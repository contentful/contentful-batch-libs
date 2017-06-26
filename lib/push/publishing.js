import Promise from 'bluebird'
import log from 'npmlog'
import getEntityName from './get-entity-name'
import errorBuffer from '../utils/error-buffer'

/**
 * Publish a list of entities.
 * Does not return a rejected promise in the case of an error, pushing it
 * to an error buffer instead.
 */
export function publishEntities (entities) {
  if (entities.length === 0) {
    log.info(`Skip publishing since zero entities passed`)
    return entities
  }
  const entity = entities[0].original || entities[0]
  const type = entity.sys.type || 'unknown type'
  log.info(`Publishing ${entities.length} ${type}s`)

  const entitiesToPublish = entities.filter((entity) => {
    if (!entity || !entity.publish) {
      log.info('Error while publishing entity: Unable to parse entity')
      log.info(`Unparseable entity: ${JSON.stringify(entity, null, 0)}`)
      return false
    }
    return true
  })

  return Promise.map(entitiesToPublish, (entity, index) => {
    return entity.publish()
      .then((entity) => {
        log.info(`Published ${entity.sys.type} ${getEntityName(entity)}`)
        return entity
      }, (err) => {
        errorBuffer.push(err)
        log.info(`Failed to publish ${entity.sys.id} (${(getEntityName(entity))})`)
        return null
      })
      .then((entity) => Promise.delay(500, entity))
  }, {concurrency: 1})
  .then((result) => {
    log.info(`Finished publishing ${entities.length} ${type}s. Returning ${result.length} entities`)
    return result
  })
}

/**
 * Unpublish a list of entities.
 * Returns a reject promise if unpublishing fails.
 */
export function unpublishEntities (entities) {
  return Promise.map(entities, (entity, index) => {
    if (!entity || !entity.unpublish) {
      log.info('Error While Unpublishing: entity undefined entity at index ' + index)
      return Promise.resolve(entity)
    }
    return entity.unpublish()
      .then((entity) => {
        log.info(`Unpublished ${entity.sys.type} ${getEntityName(entity)}`)
        return entity
      }, (err) => {
        // In case the entry has already been unpublished
        if (err.name === 'BadRequest') return entity
        throw err
      })
  })
}
