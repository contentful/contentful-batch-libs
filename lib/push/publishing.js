import Promise from 'bluebird'

import getEntityName from '../utils/get-entity-name'
import { logEmitter } from '../utils/logging'

/**
 * Publish a list of entities.
 * Does not return a rejected promise in the case of an error, pushing it
 * to an error buffer instead.
 */
export function publishEntities (entities) {
  if (entities.length === 0) {
    logEmitter.emit('info', 'Skipping publishing since zero entities passed')
    return entities
  }
  const entity = entities[0].original || entities[0]
  const type = entity.sys.type || 'unknown type'
  logEmitter.emit('info', `Publishing ${entities.length} ${type}s`)

  const entitiesToPublish = entities.filter((entity) => {
    if (!entity || !entity.publish) {
      logEmitter.emit('info', 'Error while publishing entity: Unable to parse entity')
      logEmitter.emit('info', `Unparseable entity: ${JSON.stringify(entity, null, 0)}`)
      return false
    }
    return true
  })

  return Promise.map(entitiesToPublish, (entity, index) => {
    return entity.publish()
      .then((entity) => {
        logEmitter.emit('info', `Published ${entity.sys.type} ${getEntityName(entity)}`)
        return entity
      }, (err) => {
        logEmitter.emit('error', err)
        return null
      })
      .then((entity) => Promise.delay(500, entity))
  }, {concurrency: 1})
  .then((result) => {
    logEmitter.emit('info', `Finished publishing ${entities.length} ${type}s. Returning ${result.length} entities`)
    return result
  })
}
