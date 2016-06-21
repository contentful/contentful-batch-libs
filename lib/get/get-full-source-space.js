import Promise from 'bluebird'
import log from 'npmlog'

const MAX_ALLOWED_LIMIT = 1000

/**
 * Gets all the content from a space via the management API. This includes
 * content in draft state.
 */
export default function getFullSourceSpace ({
  managementClient,
  spaceId,
  skipContentModel,
  skipContent
}) {
  log.info('Getting content from source space via the sync api')

  return managementClient.getSpace(spaceId)
  .then((space) => {
    return Promise.props({
      contentTypes: skipContentModel ? [] : pagedGet(space, 'getContentTypes').then(extractItems),
      entries: skipContent ? [] : pagedGet(space, 'getEntries').then(extractItems),
      assets: skipContent ? [] : pagedGet(space, 'getAssets').then(extractItems),
      locales: skipContentModel ? [] : pagedGet(space, 'getLocales').then(extractItems)
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

/**
 * Gets all the existing entities based on pagination parameters.
 * The first call will have no aggregated response. Subsequent calls will
 * concatenate the new responses to the original one.
 */
function pagedGet (space, method, skip = 0, aggregatedResponse = null) {
  return space[method]({
    skip: skip,
    limit: MAX_ALLOWED_LIMIT,
    order: 'sys.createdAt'
  })
  .then((response) => {
    if (!aggregatedResponse) {
      aggregatedResponse = response
    } else {
      aggregatedResponse.items = aggregatedResponse.items.concat(response.items)
    }
    if (skip + MAX_ALLOWED_LIMIT <= response.total) {
      return pagedGet(space, method, skip + MAX_ALLOWED_LIMIT, aggregatedResponse)
    }
    return aggregatedResponse
  })
}

function extractItems (response) {
  return response.items
}
