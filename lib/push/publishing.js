import Promise from 'bluebird'
import log from 'npmlog'
import getEntityName from './get-entity-name'
import errorBuffer from '../utils/error-buffer'

let lastQueueLength = 0

function runQueue (queue, result) {
  if (!result) {
    result = []
  }
  queue = queue.filter((entity) => {
    if (!entity || !entity.publish) {
      log.info('Error while publishing entity: Unable to parse entity')
      log.info(`Unparseable entity: ${JSON.stringify(entity, null, 0)}`)
      return false
    }
    return true
  })
  log.info(`Starting new publishing queue: ${queue.map((entity) => entity.sys.id).join(', ')}`)
  return Promise.map(queue, (entity, index) => {
    return entity.publish()
      .then((entity) => {
        log.info(`Published ${entity.sys.type} ${getEntityName(entity)}`)
        result.push(entity)
        return null
      }, (err) => {
        errorBuffer.push(err)
        const apiError = JSON.parse(err.message)
        const errors = apiError.details.errors || []
        if (apiError.status === 422 && errors.findIndex((error) => error.name === 'notResolvable') !== -1) {
          log.info(`Unable to resolve ${entity.sys.id} (${(getEntityName(entity))})`)
          return entity
        }
        log.info(`Failed to publish ${entity.sys.id} (${(getEntityName(entity))})`)
        return null
      })
      .then((entity) => Promise.delay(500, entity))
  }, {concurrency: 1})
  .then((entities) => entities.filter((entity) => entity))
  .then((entities) => {
    if (entities.length > 0) {
      if (lastQueueLength && lastQueueLength === entities.length) {
        errorBuffer.push(new Error('Queue was not able to publish at least one entity. Aborting.'))
        const failedEntities = entities.map((entitiy) => entitiy.sys.id)
        return result.filter((entity) => !failedEntities.includes(entity.sys.id))
      }
      lastQueueLength = entities.length

      log.info(`Found ${entities.length} unpublished entities`)
      return runQueue(entities, result)
    }
    return result
  })
}

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
  log.info(`Starting publishing ${entities.length} ${type}s`)

  lastQueueLength = entities.length
  return runQueue(entities)
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
