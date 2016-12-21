import Promise from 'bluebird'
import log from 'npmlog'

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
  maxAllowedLimit
}) {
  pageLimit = maxAllowedLimit || MAX_ALLOWED_LIMIT
  log.info('Getting content from source space')

  return managementClient.getSpace(spaceId)
  .then((space) => {
    return Promise.props({
      contentTypes: skipContentModel ? [] : pagedGet(space, 'getContentTypes').then(extractItems),
      entries: skipContent ? [] : pagedGet(space, 'getEntries').then(extractItems).then((items) => filterDrafts(items, includeDrafts)),
      assets: skipContent ? [] : pagedGet(space, 'getAssets').then(extractItems),
      locales: skipContentModel ? [] : pagedGet(space, 'getLocales').then(extractItems),
      webhooks: skipWebhooks ? [] : pagedGet(space, 'getWebhooks').then(extractItems),
      roles: skipRoles ? [] : pagedGet(space, 'getRoles').then(extractItems)
    }).then((response) => {
      if (response.contentTypes.length !== 0) {
        response.editorInterfaces = getEditorInterfaces(response.contentTypes)
        return Promise.props(response)
      }
      response.editorInterfaces = []
      return response
    }).then((response) => {
      response.editorInterfaces = response.editorInterfaces.filter((editorInterface) => {
        return editorInterface !== null
      })
      return response
    })
  }, (err) => {
    log.error(`
The destination space was not found. This can happen for multiple reasons:
- If you haven't yet, you should create your space manually.
- If your destination space is in another organization, and your user from the source space does not have access to it, you'll need to specify separate sourceManagementToken and destinationManagementToken

Full error details below.
`)
    throw err
  })
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
  return !includeDrafts ? items : items.filter((item) => !item.isDraft)
}
