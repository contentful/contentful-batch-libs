import Promise from 'bluebird'
import Listr from 'listr'
import verboseRenderer from 'listr-verbose-renderer'

import { logEmitter, logToTaskOutput } from '../utils/logging'
import sortEntries from '../utils/sort-entries'

const MAX_ALLOWED_LIMIT = 1000
let pageLimit = MAX_ALLOWED_LIMIT

/**
 * Gets all the content from a space via the management API. This includes
 * content in draft state.
 */
export default function getFullSourceSpace ({
  managementClient,
  deliveryClient,
  spaceId,
  skipContentModel,
  skipContent,
  skipWebhooks,
  skipRoles,
  includeDrafts,
  maxAllowedLimit,
  listrOptions,
  query
}) {
  pageLimit = maxAllowedLimit || MAX_ALLOWED_LIMIT
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
      title: 'Fetching content types data',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return pagedGet({space: ctx.space, method: 'getContentTypes'})
          .then(extractItems)
          .then((items) => {
            ctx.data.contentTypes = items
            teardownTaskListeners()
          })
      },
      skip: () => skipContentModel
    },
    {
      title: 'Fetching editor interfaces data',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return getEditorInterfaces(ctx.data.contentTypes)
          .then((editorInterfaces) => {
            ctx.data.editorInterfaces = editorInterfaces.filter((editorInterface) => {
              return editorInterface !== null
            })
            teardownTaskListeners()
          })
      },
      skip: (ctx) => skipContentModel || (ctx.data.contentTypes.length === 0 && 'Skipped since no content types downloaded')
    },
    {
      title: 'Fetching content entries data',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return pagedGet({space: ctx.space, method: 'getEntries', query})
          .then(extractItems)
          .then(sortEntries)
          .then((items) => filterDrafts(items, includeDrafts))
          .then((items) => {
            ctx.data.entries = items
            teardownTaskListeners()
          })
      },
      skip: () => skipContent
    },
    {
      title: 'Fetching assets data',
      task: (ctx, task) => {
        const assetsQuery = Object.assign({}, query)
        // no content_type query for the assets endpoint
        delete assetsQuery.content_type
        const teardownTaskListeners = logToTaskOutput(task)
        return pagedGet({space: ctx.space, method: 'getAssets', assetsQuery})
          .then(extractItems)
          .then((items) => {
            ctx.data.assets = items
            teardownTaskListeners()
          })
      },
      skip: () => skipContent
    },
    {
      title: 'Fetching locales data',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return pagedGet({space: ctx.space, method: 'getLocales'})
          .then(extractItems)
          .then((items) => {
            ctx.data.locales = items
            teardownTaskListeners()
          })
      },
      skip: () => skipContentModel
    },
    {
      title: 'Fetching webhooks data',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return pagedGet({space: ctx.space, method: 'getWebhooks'})
          .then(extractItems)
          .then((items) => {
            ctx.data.webhooks = items
            teardownTaskListeners()
          })
      },
      skip: () => skipWebhooks
    },
    {
      title: 'Fetching roles data',
      task: (ctx, task) => {
        const teardownTaskListeners = logToTaskOutput(task)
        return pagedGet({space: ctx.space, method: 'getRoles'})
          .then(extractItems)
          .then((items) => {
            ctx.data.roles = items
            teardownTaskListeners()
          })
      },
      skip: () => skipRoles
    }
  ], listrOptions)
}

function getEditorInterfaces (contentTypes) {
  return Promise.map(contentTypes, (contentType, index, length) => {
    return contentType.getEditorInterface()
      .then((editorInterface) => {
        logEmitter.emit('info', `Fetched editor interface for ${contentType.name}`)
        return editorInterface
      })
      .catch(() => {
      // old contentTypes may not have an editor interface but we'll handle in a later stage
      // but it should not stop getting the data process
        logEmitter.emit('warning', `No editor interface found for ${contentType}`)
        return Promise.resolve(null)
      })
  }, {
    concurrency: 6
  })
}

/**
 * Gets all the existing entities based on pagination parameters.
 * The first call will have no aggregated response. Subsequent calls will
 * concatenate the new responses to the original one.
 */
function pagedGet ({space, method, skip = 0, aggregatedResponse = null, query = null}) {
  const fullQuery = Object.assign({},
    {
      skip: skip,
      limit: pageLimit,
      order: 'sys.createdAt,sys.id'
    },
    query
  )

  return space[method](fullQuery)
    .then((response) => {
      if (!aggregatedResponse) {
        aggregatedResponse = response
      } else {
        aggregatedResponse.items = aggregatedResponse.items.concat(response.items)
      }
      const page = Math.ceil(skip / pageLimit) + 1
      const pages = Math.ceil(response.total / pageLimit)
      logEmitter.emit('info', `Fetched page ${page} of ${pages}`)
      if (skip + pageLimit <= response.total) {
        return pagedGet({space, method, skip: skip + pageLimit, aggregatedResponse, query})
      }
      return aggregatedResponse
    })
}

function extractItems (response) {
  return response.items
}

function filterDrafts (items, includeDrafts) {
  return includeDrafts ? items : items.filter((item) => !!item.sys.publishedVersion)
}
