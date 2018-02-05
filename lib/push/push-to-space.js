import Promise from 'bluebird'
import { defaults } from 'lodash/object'
import Listr from 'listr'
import verboseRenderer from 'listr-verbose-renderer'

import * as assets from './assets'
import * as creation from './creation'
import { logEmitter } from '../utils/logging'
import { wrapTask } from '../utils/listr'
import * as publishing from './publishing'

const DEFAULT_CONTENT_STRUCTURE = {
  entries: [],
  assets: [],
  contentTypes: [],
  locales: [],
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

export default function pushToSpace ({
  sourceContent,
  destinationContent = {},
  managementClient,
  spaceId,
  prePublishDelay,
  contentModelOnly,
  skipContentModel,
  skipLocales,
  skipContentPublishing,
  assetProcessDelay,
  listrOptions
}) {
  if (contentModelOnly && skipContentModel) {
    throw new Error('contentModelOnly and skipContentModel cannot be used together')
  }

  if (skipLocales && !contentModelOnly) {
    throw new Error('skipLocales can only be used together with contentModelOnly')
  }

  defaults(sourceContent, DEFAULT_CONTENT_STRUCTURE)
  defaults(destinationContent, DEFAULT_CONTENT_STRUCTURE)

  listrOptions = listrOptions || {
    renderer: verboseRenderer
  }

  return new Listr([
    {
      title: 'Connecting to space',
      task: wrapTask((ctx, task) => {
        return managementClient.getSpace(spaceId)
          .then((space) => {
            ctx.space = space
          })
      })
    },
    {
      title: 'Importing Locales',
      task: wrapTask((ctx, task) => {
        return creation.createEntities(
          { space: ctx.space, type: 'Locale' },
          sourceContent.locales,
          destinationContent.locales
        )
          .then((locales) => {
            ctx.data.locales = locales
          })
      }),
      skip: () => skipContentModel || skipLocales
    },
    {
      title: 'Importing Content Types',
      task: wrapTask((ctx, task) => {
        return creation.createEntities(
          {space: ctx.space, type: 'ContentType'},
          sourceContent.contentTypes,
          destinationContent.contentTypes
        )
          .then(removeEmptyEntities)
          .then((contentTypes) => {
            ctx.data.contentTypes = contentTypes

            if (contentTypes.length < 5) {
              return Promise.delay(prePublishDelay)
            }
          })
      }),
      skip: () => skipContentModel
    },
    {
      title: 'Publishing Content Types',
      task: wrapTask((ctx, task) => {
        return publishEntities(ctx, task, ctx.data.contentTypes, sourceContent.contentTypes)
          .then(removeEmptyEntities)
          .then((contentTypes) => {
            ctx.data.contentTypes = contentTypes
          })
      }),
      skip: (ctx) => skipContentModel
    },
    {
      title: 'Importing Editor Interfaces',
      task: wrapTask((ctx, task) => {
        let contentTypesWithEditorInterface = ctx.data.contentTypes.map((contentType) => {
          for (let editorInterface of sourceContent.editorInterfaces) {
            if (editorInterface.sys.contentType.sys.id === contentType.sys.id) {
              return ctx.space.getEditorInterfaceForContentType(contentType.sys.id)
                .then((ctEditorInterface) => {
                  logEmitter.emit('info', `Fetched editor interface for ${contentType.name}`)
                  ctEditorInterface.controls = editorInterface.controls
                  return ctEditorInterface.update()
                })
                .catch((err) => {
                  err.entity = editorInterface
                  throw err
                })
            }
          }
          return Promise.resolve()
        })
        return Promise.all(contentTypesWithEditorInterface)
          .then(removeEmptyEntities)
          .then((editorInterfaces) => {
            ctx.data.editorInterfaces = editorInterfaces
          })
      }),
      skip: (ctx) => skipContentModel || ctx.data.contentTypes.length === 0
    },
    {
      title: 'Importing Assets',
      task: wrapTask((ctx, task) => {
        return creation.createEntities(
          {space: ctx.space, type: 'Asset'},
          sourceContent.assets,
          destinationContent.assets
        )
          .then(removeEmptyEntities)
          .then((assetsToProcess) => {
            return assets.processAssets(assetsToProcess)
          })
          .then(removeEmptyEntities)
          .then((assets) => {
            ctx.data.assets = assets

            if (assets.length < 5) {
              return Promise.delay(prePublishDelay)
            }
          })
      }),
      skip: (ctx) => contentModelOnly
    },
    {
      title: 'Publishing Assets',
      task: wrapTask((ctx, task) => {
        return publishEntities(ctx, task, ctx.data.assets, sourceContent.assets)
          .then(removeEmptyEntities)
          .then((assets) => {
            ctx.data.publishedAssets = assets
          })
      }),
      skip: (ctx) => contentModelOnly || skipContentPublishing
    },
    {
      title: 'Archiving Assets',
      task: wrapTask((ctx, task) => {
        return archiveEntities(ctx, task, ctx.data.assets, sourceContent.assets)
          .then(removeEmptyEntities)
          .then((assets) => {
            ctx.data.archivedAssets = assets
          })
      }),
      skip: (ctx) => contentModelOnly || skipContentPublishing
    },
    {
      title: 'Importing Content Entries',
      task: wrapTask((ctx, task) => {
        return creation.createEntries(
          {space: ctx.space, skipContentModel},
          sourceContent.entries,
          destinationContent.entries
        )
          .then(removeEmptyEntities)
          .then((entries) => {
            ctx.data.entries = entries

            if (entries.length < 5) {
              return Promise.delay(prePublishDelay)
            }
          })
      }),
      skip: (ctx) => contentModelOnly
    },
    {
      title: 'Publishing Content Entries',
      task: wrapTask((ctx, task) => {
        return publishEntities(ctx, task, ctx.data.entries, sourceContent.entries)
          .then(removeEmptyEntities)
          .then((entries) => {
            ctx.data.publishedEntries = entries
          })
      }),
      skip: (ctx) => contentModelOnly || skipContentPublishing
    },
    {
      title: 'Archiving Entries',
      task: wrapTask((ctx, task) => {
        return archiveEntities(ctx, task, ctx.data.entries, sourceContent.entries)
          .then(removeEmptyEntities)
          .then((entries) => {
            ctx.data.archivedEntries = entries
          })
      }),
      skip: (ctx) => contentModelOnly || skipContentPublishing
    },
    {
      title: 'Creating Web Hooks',
      task: wrapTask((ctx, task) => {
        return creation.createEntities(
          {space: ctx.space, type: 'Webhook'},
          sourceContent.webhooks,
          destinationContent.webhooks
        )
          .then(removeEmptyEntities)
          .then((webhooks) => {
            ctx.data.webhooks = webhooks
          })
      }),
      skip: (ctx) => contentModelOnly
    }
  ], listrOptions)
}

// In case some entity throws an error, we null it in the list to avoid further processing.
// This functions removes the nulled entities from the lists.
function removeEmptyEntities (entityList) {
  return entityList.filter((entity) => !!entity && entity.sys)
}

function archiveEntities (ctx, task, entities, sourceEntities) {
  const entityIdsToArchive = sourceEntities
    .filter(({original}) => original.sys.archivedVersion)
    .map(({original}) => original.sys.id)

  const entitiesToArchive = entities
    .filter((entity) => entityIdsToArchive.indexOf(entity.sys.id) !== -1)

  return publishing.archiveEntities(entitiesToArchive)
}

function publishEntities (ctx, task, entities, sourceEntities) {
  // Find all entities in source content which are published
  const entityIdsToPublish = sourceEntities
    .filter(({original}) => original.sys.publishedVersion)
    .map(({original}) => original.sys.id)

  // Filter imported entities and publish only these who got published in the source
  const entitiesToPublish = entities
    .filter((entity) => entityIdsToPublish.indexOf(entity.sys.id) !== -1)

  return publishing.publishEntities(entitiesToPublish)
}
