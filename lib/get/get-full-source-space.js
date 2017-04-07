import Promise from 'bluebird'
import Listr from 'listr'
import verboseRenderer from 'listr-verbose-renderer'

import {
  createPagedProgressObservable,
  createPagedObservable
} from '../utils/progress'

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
        ctx.data.contentTypes = []
        const content$ = pagedGet(ctx.space, 'getContentTypes')
        .do((result) => {
          ctx.data.contentTypes = [
            ...ctx.data.contentTypes,
            ...result.items
          ]
        })
        return createPagedProgressObservable(content$, pageLimit)
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
      skip: (ctx) => skipContentModel || (ctx.data.contentTypes.length === 0 && 'Skipped since no content types were fetched')
    },
    {
      title: 'Fetching content entries data',
      task: (ctx) => {
        ctx.data.entries = []
        const entrie$ = pagedGet(ctx.space, 'getEntries')
        .map(filterDrafts)
        .do((result) => {
          ctx.data.entries = [
            ...ctx.data.entries,
            ...result.items
          ]
        })
        return createPagedProgressObservable(entrie$, pageLimit)
      },
      skip: () => skipContent
    },
    {
      title: 'Fetching assets data',
      task: (ctx) => {
        ctx.data.assets = []
        const asset$ = pagedGet(ctx.space, 'getAssets')
        .do((result) => {
          ctx.data.assets = [
            ...ctx.data.assets,
            ...result.items
          ]
        })
        return createPagedProgressObservable(asset$, pageLimit)
      },
      skip: () => skipContent
    },
    {
      title: 'Fetching locales data',
      task: (ctx) => {
        ctx.data.locales = []
        const locale$ = pagedGet(ctx.space, 'getLocales')
        .do((result) => {
          ctx.data.locales = [
            ...ctx.data.locales,
            ...result.items
          ]
        })
        return createPagedProgressObservable(locale$, pageLimit)
      },
      skip: () => skipContentModel
    },
    {
      title: 'Fetching webhooks data',
      task: (ctx) => {
        ctx.data.webhooks = []
        const webhook$ = pagedGet(ctx.space, 'getWebhooks')
        .do((result) => {
          ctx.data.webhooks = [
            ...ctx.data.webhooks,
            ...result.items
          ]
        })
        return createPagedProgressObservable(webhook$, pageLimit)
      },
      skip: () => skipWebhooks
    },
    {
      title: 'Fetching roles data',
      task: (ctx) => {
        ctx.data.roles = []
        const role$ = pagedGet(ctx.space, 'getRoles')
        .do((result) => {
          ctx.data.roles = [
            ...ctx.data.roles,
            ...result.items
          ]
        })
        return createPagedProgressObservable(role$, pageLimit)
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
 * Gets all the existing entities based on paged request.
 * A generator function yields to an observable, emitting each response individually
 */
function pagedGet (space, method) {
  function fetchPage (skip, limit) {
    return space[method]({
      skip,
      limit,
      order: 'sys.createdAt'
    })
  }
  return createPagedObservable(fetchPage, pageLimit)
}

function filterDrafts (response, includeDrafts) {
  return {
    ...response,
    items: includeDrafts ? response.items : response.items.filter((item) => item.sys.publishedVersion)
  }
}
