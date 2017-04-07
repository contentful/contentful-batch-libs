import Promise from 'bluebird'
import Listr from 'listr'
import verboseRenderer from 'listr-verbose-renderer'

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
  listrOptions
}) {
  pageLimit = maxAllowedLimit || MAX_ALLOWED_LIMIT
  listrOptions = listrOptions || {
    renderer: verboseRenderer
  }

  return new Listr([
    {
      title: 'Connecting to space',
      task: (ctx) => {
        return managementClient.getSpace(spaceId)
        .then((space) => {
          ctx.space = space
        })
        .catch((err) => {
          console.error(`
The destination space was not found. This can happen for multiple reasons:
- If you haven't yet, you should create your space manually.
- If your destination space is in another organization, and your user from the source space does not have access to it, you'll need to specify separate sourceManagementToken and destinationManagementToken

Full error details below.
`)
          throw err
        })
      }
    },
    {
      title: 'Fetching content types data',
      task: (ctx) => {
        return pagedGet(ctx.space, 'getContentTypes')
        .then(extractItems)
        .then((items) => {
          ctx.data.contentTypes = items
        })
      },
      skip: () => skipContentModel
    },
    {
      title: 'Fetching editor interfaces data',
      task: (ctx) => {
        return getEditorInterfaces(ctx.data.contentTypes)
        .then((editorInterfaces) => {
          ctx.data.editorInterfaces = editorInterfaces
        })
      },
      skip: (ctx) => skipContentModel || (ctx.data.contentTypes.length === 0 && 'Skipped since no content types downloaded')
    },
    {
      title: 'Fetching content entries data',
      task: (ctx) => {
        return pagedGet(ctx.space, 'getEntries')
        .then(extractItems)
        .then(filterDrafts)
        .then((items) => {
          ctx.data.entries = items
        })
      },
      skip: () => skipContent
    },
    {
      title: 'Fetching assets data',
      task: (ctx) => {
        return pagedGet(ctx.space, 'getAssets')
        .then(extractItems)
        .then((items) => {
          ctx.data.assets = items
        })
      },
      skip: () => skipContent
    },
    {
      title: 'Fetching locales data',
      task: (ctx) => {
        return pagedGet(ctx.space, 'getLocales')
        .then(extractItems)
        .then((items) => {
          ctx.data.locales = items
        })
      },
      skip: () => skipContentModel
    },
    {
      title: 'Fetching webhooks data',
      task: (ctx) => {
        return pagedGet(ctx.space, 'getWebhooks')
        .then(extractItems)
        .then((items) => {
          ctx.data.webhooks = items
        })
      },
      skip: () => skipWebhooks
    },
    {
      title: 'Fetching roles data',
      task: (ctx) => {
        return pagedGet(ctx.space, 'getRoles')
        .then(extractItems)
        .then((items) => {
          ctx.data.roles = items
        })
      },
      skip: () => skipRoles
    }
  ], listrOptions)
}
function getEditorInterfaces (contentTypes) {
  const editorInterfacePromises = contentTypes.map((contentType) => {
    // old contentTypes may not have an editor interface but we'll handle in a later stage
    // but it should not stop getting the data process
    return contentType.getEditorInterface().catch(() => {
      return Promise.resolve(null)
    })
  })
  return Promise.all(editorInterfacePromises)
}

/**
 * Gets all the existing entities based on pagination parameters.
 * The first call will have no aggregated response. Subsequent calls will
 * concatenate the new responses to the original one.
 */
function pagedGet (space, method, skip = 0, aggregatedResponse = null) {
  return space[method]({
    skip: skip,
    limit: pageLimit,
    order: 'sys.createdAt'
  })
  .then((response) => {
    if (!aggregatedResponse) {
      aggregatedResponse = response
    } else {
      aggregatedResponse.items = aggregatedResponse.items.concat(response.items)
    }
    if (skip + pageLimit <= response.total) {
      return pagedGet(space, method, skip + pageLimit, aggregatedResponse)
    }
    return aggregatedResponse
  })
}

function extractItems (response) {
  return response.items
}

function filterDrafts (items, includeDrafts) {
  return includeDrafts ? items : items.filter((item) => item.sys.publishedVersion)
}
