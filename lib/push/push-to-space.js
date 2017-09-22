import Promise from 'bluebird'
import { defaults } from 'lodash/object'
import Listr from 'listr'
import verboseRenderer from 'listr-verbose-renderer'

import * as assets from './assets'
import * as creation from './creation'
import { logEmitter, logToTaskOutput } from '../utils/logging'
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
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return managementClient.getSpace(spaceId)
          .then((space) => {
            ctx.space = space
            teardownTaskListeners()
          })
      }
    },
    {
      title: 'Importing Locales',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return creation.createEntities(
          { space: ctx.space, type: 'Locale' },
          sourceContent.locales,
          destinationContent.locales
        )
          .then((locales) => {
            ctx.data.locales = locales
            teardownTaskListeners()
          })
      },
      skip: () => skipContentModel || skipLocales
    },
    {
      title: 'Importing Content Types',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return creation.createEntities(
          {space: ctx.space, type: 'ContentType'},
          sourceContent.contentTypes,
          destinationContent.contentTypes
        )
          .then((contentTypes) => {
            ctx.data.contentTypes = contentTypes
            teardownTaskListeners()

            if (contentTypes.length < 5) {
              return Promise.delay(prePublishDelay)
            }
          })
      },
      skip: () => skipContentModel
    },
    {
      title: 'Publishing Content Types',
      task: createPublishTask('contentTypes', sourceContent),
      skip: (ctx) => skipContentModel
    },
    {
      title: 'Importing Editor Interfaces',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)

        let contentTypesWithEditorInterface = ctx.data.contentTypes.map((contentType) => {
          // @todo -> potential bug: only exports on editorinterface, multiple possible?
          for (let editorInterface of sourceContent.editorInterfaces) {
            if (editorInterface.sys.contentType.sys.id === contentType.sys.id) {
              return ctx.space.getEditorInterfaceForContentType(contentType.sys.id)
                .then((ctEditorInterface) => {
                  logEmitter.emit('info', `Fetched editor interface for ${contentType.name}`)
                  ctEditorInterface.controls = editorInterface.controls
                  return ctEditorInterface.update()
                })
            }
          }
          return Promise.resolve()
        })
        return Promise.all(contentTypesWithEditorInterface)
          .then((editorInterfaces) => {
            ctx.data.editorInterfaces = editorInterfaces
            teardownTaskListeners()
          })
      },
      skip: (ctx) => skipContentModel || ctx.data.contentTypes.length === 0
    },
    {
      title: 'Importing Assets',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)

        return creation.createEntities(
          {space: ctx.space, type: 'Asset'},
          sourceContent.assets,
          destinationContent.assets
        )
          .then((assetsToProcess) => {
            return assets.processAssets(assetsToProcess)
          })
          .then((assets) => {
            return assets.filter((asset) => asset !== null)
          })
          .then((assets) => {
            ctx.data.assets = assets
            teardownTaskListeners()

            if (assets.length < 5) {
              return Promise.delay(prePublishDelay)
            }
          })
      },
      skip: (ctx) => contentModelOnly
    },
    {
      title: 'Publishing Assets',
      task: createPublishTask('assets', sourceContent),
      skip: (ctx) => contentModelOnly
    },
    {
      title: 'Importing Content Entries',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)

        return creation.createEntries(
          {space: ctx.space, skipContentModel},
          sourceContent.entries,
          destinationContent.entries
        )
          .then((entries) => {
            return entries.filter((entry) => entry !== null)
          })
          .then((entries) => {
            ctx.data.entries = entries
            teardownTaskListeners()

            if (assets.length < 5) {
              return Promise.delay(prePublishDelay)
            }
          })
      },
      skip: (ctx) => contentModelOnly
    },
    {
      title: 'Publishing Content Entries',
      task: createPublishTask('entries', sourceContent),
      skip: (ctx) => contentModelOnly
    },
    {
      title: 'Creating Web Hooks',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)

        return creation.createEntities(
          {space: ctx.space, type: 'Webhook'},
          sourceContent.webhooks,
          destinationContent.webhooks
        )
          .then((webhooks) => {
            return webhooks.filter((webhook) => webhook !== null)
          })
          .then((webhooks) => {
            ctx.data.webhooks = webhooks
            teardownTaskListeners()
          })
      },
      skip: (ctx) => contentModelOnly
    }
  ], listrOptions)
}

function createPublishTask (type, sourceContent) {
  return (ctx, task) => {
    const teardownTaskListeners = logToTaskOutput(task)

    const entityIdsToPublish = sourceContent[type]
      .filter(({original}) => original.sys.publishedVersion)
      .map((entity) => entity.original.sys.id)

    const entitiesToPublish = ctx.data[type]
      .filter((entity) => entityIdsToPublish.includes(entity.sys.id))

    return publishing.publishEntities(entitiesToPublish)
      .then(teardownTaskListeners)
  }
}
