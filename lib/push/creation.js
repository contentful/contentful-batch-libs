import Promise from 'bluebird'
import log from 'npmlog'
import {partial} from 'lodash/function'
import {find} from 'lodash/collection'
import {get, omit} from 'lodash/object'
import getEntityName from './get-entity-name'
import errorBuffer from '../utils/error-buffer'

/**
 * Creates a list of entities
 * Applies to all entities except Entries, as the CMA API for those is slightly different
 * See handleCreationErrors for details on what errors reject the promise or not.
 */
export function createEntities (context, entities, destinationEntities) {
  return Promise.map(entities, entity => {
    const updatedParams = prepareUpdateParams(entity.transformed, destinationEntities)
    return context.space[`${updatedParams.method}${context.type}`](updatedParams.entity)
    .then(
      partial(creationSuccessNotifier, updatedParams.method),
      partial(handleCreationErrors, entity)
    )
  })
}

/**
 * Handles entity creation errors.
 * If the error is a VersionMismatch the error is thrown and a message is returned
 * instructing the user on what this situation probably means.
 */
function handleCreationErrors (entity, err) {
  // Handle the case where a locale already exists and skip it
  if (get(err, 'error.sys.id') === 'ValidationFailed') {
    const errors = get(err, 'error.details.errors')
    if (errors && errors.length > 0 && errors[0].name === 'taken') {
      return entity
    }
  }
  if (get(err, 'error.sys.id') === 'VersionMismatch') {
    log.error('Content update error:')
    log.error('Error', err.error)
    log.error('Request', err.request)
    log.error(`
This probably means you are synchronizing over a space with previously existing
content, or that you don't have the sync token for the last sync you performed
to this space.
    `)
  }
  throw err
}

/**
 * Creates a list of entries
 */
export function createEntries (context, entries, destinationEntries) {
  return Promise.map(entries, entry => createEntry(entry, context.space, context.skipContentModel, destinationEntries))
  .then(function (entries) {
    return entries.filter(entry => entry)
  })
}

function createEntry (entry, space, skipContentModel, destinationEntries) {
  let args = []
  const contentType = entry.original.sys.contentType
  const updatedParams = prepareUpdateParams(entry.transformed, destinationEntries)
  if (updatedParams.method === 'create') args.push(contentType)
  args.push(updatedParams.entity)
  return space[`${updatedParams.method}Entry`].apply(space, args)
  .then(
    partial(creationSuccessNotifier, updatedParams.method),
    partial(handleEntryCreationErrors, entry, space, skipContentModel, destinationEntries)
  )
}

/**
 * Handles entry creation errors.
 * If a field doesn't exist, it means it has been removed from the content types
 * In that case, the field is removed from the entry, and creation is attempted again.
 */
function handleEntryCreationErrors (entry, space, skipContentModel, destinationEntries, err) {
  if (skipContentModel && err.name === 'UnknownField') {
    entry.transformed.fields = cleanupUnknownFields(entry.transformed.fields, err.error.details.errors)
    return createEntry(entry, space, skipContentModel, destinationEntries)
  }
  err.originalEntry = entry.original
  err.transformedEntry = entry.transformed
  err.contentModelWasSkipped = skipContentModel
  errorBuffer.push(err)
  // No need to pass this entry down to publishing if it wasn't created
  return null
}

function cleanupUnknownFields (fields, errors) {
  return omit(fields, (field, fieldId) => {
    return find(errors, error => {
      return error.name === 'unknown' && error.path[1] === fieldId
    })
  })
}

/**
 * Prepares parameters for an entry creation/update
 * Analyzes existing entry and destination entries, and figures out if we're
 * updating an entry. If so, appropriately returns an object with the method
 * to be used on the CMA client and if updating, adds the version of the
 * destination entry to the payload entry
 */
function prepareUpdateParams (transformedEntity, destinationEntities) {
  // Default value for getting a possible existing entity is null
  // because of find's weird behavior with undefineds and paths in objects
  const destinationEntity = find(
    destinationEntities, 'sys.id', get(transformedEntity, 'sys.id', null)
  )
  let method
  if (destinationEntity) {
    method = 'update'
    transformedEntity.sys.version = get(destinationEntity, 'sys.version')
  } else {
    method = 'create'
  }
  return {
    method: method,
    entity: transformedEntity
  }
}

function creationSuccessNotifier (method, createdEntity) {
  const verb = method[0].toUpperCase() + method.substr(1, method.length) + 'd'
  log.info(`${verb} ${createdEntity.sys.type} ${getEntityName(createdEntity)}`)
  return createdEntity
}
