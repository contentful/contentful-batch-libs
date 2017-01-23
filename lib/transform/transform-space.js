import Promise from 'bluebird'
import { omit, defaults } from 'lodash/object'
import { partialRight } from 'lodash/partialRight'
import * as defaultTransformers from './transformers'

const spaceEntities = [
  'contentTypes', 'entries', 'assets', 'locales', 'webhooks'
]

/**
 * Run transformer methods on each item for each kind of entity, in case there
 * is a need to transform data when copying it to the destination space
 */
export default function (
  sourceSpace, destinationSpace, customTransformers, entities = spaceEntities
) {
  const transformers = defaults(customTransformers, defaultTransformers)
  const newSpace = omit(sourceSpace, ...entities)
  // Use bluebird collection methods to support async transforms.
  return Promise.reduce(entities, (newSpace, type) => {
    const transformer = transformers[type]
    const sourceEntities = sourceSpace[type]
    const destinationEntities = destinationSpace[type]
    const typeTransform = partialRight(applyTransformer, transformer,
      destinationEntities, destinationSpace)

    return Promise.map(sourceEntities, typeTransform).then((entities) => {
      newSpace[type] = entities
      return newSpace
    })
  }, newSpace)
}

function applyTransform (entity, transform, destinationEntities, destinationSpace) {
  return Promise.resolve(transform(entity, destinationEntities, destinationSpace))
    .then(transformed => ({
      original: entity,
      transformed
    }))
}
