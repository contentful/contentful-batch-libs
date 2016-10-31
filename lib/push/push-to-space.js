import Promise from 'bluebird'
import log from 'npmlog'
import { partial } from 'lodash/function'
import { defaults } from 'lodash/object'
import * as creation from './creation'
import * as publishing from './publishing'
import * as assets from './assets'
import * as deletion from './deletion'

const DEFAULT_CONTENT_STRUCTURE = {
  entries: [],
  assets: [],
  contentTypes: [],
  locales: [],
  deletedEntries: [],
  deletedAssets: [],
  deletedContentTypes: [],
  deletedLocales: [],
  webhooks: []
  // editorInterfaces: []
  // roles: []
}

/**
 * Pushes all changes, including deletions, to a given space. Handles (un)publishing
 * as well as delays after creation and before publishing.
 *
 * Creates everything in the right order so that a content type for a given entry
 * is there when entry creation for that content type is attempted.
 *
 * Allows only content model or only content pushing.
 *
 * Options:
 * - sourceContent: see DEFAULT_CONTENT_STRUCTURE
 * - destinationContent: see DEFAULT_CONTENT_STRUCTURE
 * - managementClient: preconfigured management API client
 * - spaceId: ID of space content is being copied to
 * - prePublishDelay: milliseconds wait before publishing
 * - contentModelOnly: synchronizes only content types and locales
 * - skipLocales: skips locales when synchronizing the content model
 * - skipContentModel: synchronizes only entries and assets
 * - skipContentPublishing: create content but don't publish it
 */
export default function ({
  sourceContent,
  destinationContent = {},
  managementClient,
  spaceId,
  prePublishDelay,
  contentModelOnly,
  skipContentModel,
  skipLocales,
  skipContentPublishing
}) {
  if (contentModelOnly && skipContentModel) {
    throw new Error('contentModelOnly and skipContentModel cannot be used together')
  }

  if (skipLocales && !contentModelOnly) {
    throw new Error('skipLocales can only be used together with contentModelOnly')
  }

  defaults(sourceContent, DEFAULT_CONTENT_STRUCTURE)
  defaults(destinationContent, DEFAULT_CONTENT_STRUCTURE)

  log.info('Pushing content to destination space')

  return managementClient.getSpace(spaceId)
    .then((space) => {
      let result = Promise.resolve()

      // Unpublish and delete Entries and Assets
      if (!contentModelOnly) {
        result = result
          .then(partial(publishing.unpublishEntities, sourceContent.deletedEntries))
          .delay(prePublishDelay)
          .then(partial(deletion.deleteEntities, sourceContent.deletedEntries))

          .then(partial(publishing.unpublishEntities, sourceContent.deletedAssets))
          .delay(prePublishDelay)
          .then(partial(deletion.deleteEntities, sourceContent.deletedAssets))
      }

      // Create and publish new Locales and Content Types
      if (!skipContentModel) {
        if (!skipLocales) {
          result = result
            .then(partial(deletion.deleteEntities, sourceContent.deletedLocales))
        }

        result = result
          .then(partial(publishing.unpublishEntities, sourceContent.deletedContentTypes))
          .delay(prePublishDelay)
          .then(partial(deletion.deleteEntities, sourceContent.deletedContentTypes))

        if (!skipLocales) {
          result = result
            .then(partial(creation.createEntities,
              {space: space, type: 'Locale'}, sourceContent.locales, destinationContent.locales))
        }

        result = result
          .then(partial(creation.createEntities,
            {space: space, type: 'ContentType'}, sourceContent.contentTypes, destinationContent.contentTypes))
          .delay(prePublishDelay)
          .then(partial(publishing.publishEntities))
      }
     // Create and publish webhooks
      result = result
        .then(partial(creation.createEntities, {space, type: 'Webhook'}, sourceContent.webhooks, destinationContent.webhooks))
        .delay(prePublishDelay)
        .then(partial(publishing.publishEntities))
      // Create and publish roles
      // result = result
        // .then(partial(creation.createEntities, {space, type: 'Role'}, sourceContent.roles, destinationContent.roles))
        // .delay(prePublishDelay)
        // .then(partial(publishing.publishEntities))

      // Create and publish Assets and Entries
      if (!contentModelOnly) {
        result = result
          .then(partial(creation.createEntities,
            {space: space, type: 'Asset'}, sourceContent.assets, destinationContent.assets))
          .delay(prePublishDelay)
          .then(partial(assets.processAssets))
          .delay(prePublishDelay)
          .then((entities) => {
            return skipContentPublishing
              ? Promise.resolve([])
              : publishing.publishEntities(entities)
          })

          .then(partial(creation.createEntries,
            {space: space, skipContentModel: skipContentModel}, sourceContent.entries, destinationContent.entries))
          .delay(prePublishDelay)
          .then((entities) => {
            return skipContentPublishing
              ? Promise.resolve([])
              : publishing.publishEntities(entities)
          })
      }

      return result
    })
}
