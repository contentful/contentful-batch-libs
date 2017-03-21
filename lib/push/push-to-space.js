import Promise from 'bluebird'
import log from 'npmlog'
import partial from 'lodash/partial'
import { defaults } from 'lodash/object'
import * as creation from './creation'
import * as publishing from './publishing'
import * as assets from './assets'

const DEFAULT_CONTENT_STRUCTURE = {
  entries: [],
  assets: [],
  contentTypes: [],
  locales: [],
  deletedEntries: [],
  deletedAssets: [],
  deletedContentTypes: [],
  deletedLocales: [],
  webhooks: [],
  editorInterfaces: []
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
 * - assetProcessDelay: milliseconds wait inbetween each asset puslish
 * - contentModelOnly: synchronizes only content types and locales
 * - skipLocales: skips locales when synchronizing the content model
 * - skipContentModel: synchronizes only entries and assets
 * - skipContentPublishing: create content but don't publish it
 */

export default function ({
  sourceContent, destinationContent = {}, managementClient, spaceId,
  prePublishDelay, contentModelOnly, skipContentModel, skipLocales,
  skipContentPublishing, assetProcessDelay
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

      // Unpublish and delete Locales and Content Types
      // Create and publish new Locales and Content Types
      if (!skipContentModel) {
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
          .then((contentTypes) => {
            let contentTypesWithEditorInterface = contentTypes.map((contentType) => {
              for (let editorInterface of sourceContent.editorInterfaces) {
                if (editorInterface.sys.contentType.sys.id === contentType.sys.id) {
                  return space.getEditorInterfaceForContentType(contentType.sys.id).then((ctEditorInterface) => {
                    ctEditorInterface.controls = editorInterface.controls
                    return ctEditorInterface.update()
                  })
                }
              }
              return Promise.resolve()
            })
            return Promise.all(contentTypesWithEditorInterface)
          })
      }

      // Create and publish Assets and Entries
      if (!contentModelOnly) {
        result = result
          .then(partial(creation.createEntities,
            {space: space, type: 'Webhook'}, sourceContent.webhooks, destinationContent.webhooks))
        const draftsAssets = sourceContent.assets.filter(({original: asset}) =>
        (asset.isDraft && asset.isDraft()))
        const publishedAssets = sourceContent.assets.filter(
        ({original: asset}) => asset.isPublished())
        result = result
          .then(partial(creation.createEntities,
            {space: space, type: 'Asset'}, draftsAssets, destinationContent.assets))
          .then(partial(creation.createEntities,
            {space: space, type: 'Asset'}, publishedAssets, destinationContent.assets))
          .then((assetsToProcess) => {
            return assets.processAssets(assetsToProcess)
          })
          .then((assets) => {
            return assets.filter((asset) => asset !== null)
          })
          .then((assetsToPublish) => {
            return skipContentPublishing
              ? Promise.resolve([])
              : publishing.publishEntities(assetsToPublish)
          })
          // Push Drafts
        const draftsEntries = sourceContent.entries.filter(({original: entry}) =>
        (entry.isDraft && entry.isDraft()))
        const publishedEntries = sourceContent.entries.filter(
        ({original: entry}) => entry.isPublished())

        result = result
          // create and push draftsEntries
          .then(partial(creation.createEntries,
            {space: space, skipContentModel: skipContentModel}, draftsEntries, destinationContent.entries))
          // create, push, and publish published entries
          .then(partial(creation.createEntries,
            {space: space, skipContentModel: skipContentModel},
            publishedEntries, destinationContent.entries
          ))
          .delay(prePublishDelay)
          .then((entities) => skipContentPublishing
              ? Promise.resolve([])
              : publishing.publishEntities(entities))
      }

      return result
    })
}
