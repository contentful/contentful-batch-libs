import Promise from 'bluebird'
import log from 'npmlog'

const BATCH_CHAR_LIMIT = 1990
const BATCH_SIZE_LIMIT = 100

/**
 * Gets content from a space which will have content copied to it, based on a
 * collection of existing content.
 *
 * Only the supplied entry/asset IDs will be retrieved. All contentTypes
 * and Locales will be retrieved.
 */
export default function getOutdatedDestinationContent ({managementClient, spaceId, entryIds = [], assetIds = [], webhookIds = [], skipContentModel, skipContent}) {
  log.info('Checking if destination space already has any content and retrieving it')

  return managementClient.getSpace(spaceId)
    .then((space) => {
      return Promise.props({
        contentTypes: skipContentModel ? Promise.resolve([]) : space.getContentTypes().then(extractItems),
        entries: skipContent ? Promise.resolve([]) : batchedIdQuery(space, 'getEntries', entryIds),
        assets: skipContent ? Promise.resolve([]) : batchedIdQuery(space, 'getAssets', assetIds),
        locales: skipContentModel ? Promise.resolve([]) : space.getLocales().then(extractItems),
        webhooks: []
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

function batchedIdQuery (space, method, ids) {
  return Promise.reduce(getIdBatches(ids), (fullResponse, batch) => {
    return space[method]({
      'sys.id[in]': batch,
      limit: batch.length
    })
      .then((response) => {
        fullResponse = fullResponse.concat(response.items)
        return fullResponse
      })
  }, [])
}

function extractItems (response) {
  return response.items
}

function getIdBatches (ids) {
  const batches = []
  let currentBatch = ''
  let currentSize = 0
  while (ids.length > 0) {
    let id = ids.splice(0, 1)
    currentBatch += id
    currentSize = currentSize + 1
    if (currentSize === BATCH_SIZE_LIMIT || currentBatch.length > BATCH_CHAR_LIMIT || ids.length === 0) {
      batches.push(currentBatch)
      currentBatch = ''
      currentSize = 0
    } else {
      currentBatch += ','
    }
  }
  return batches
}
