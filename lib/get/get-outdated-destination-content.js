import Promise from 'bluebird'

const BATCH_CHAR_LIMIT = 1990

/**
 * Gets content from a space which will have content copied to it, based on a
 * collection of existing content.
 *
 * Only the supplied entry/asset IDs will be retrieved. All contentTypes
 * and Locales will be retrieved.
 */
export default function getOutdatedDestinationContent ({
  managementClient,
  spaceId,
  entryIds = [],
  assetIds = [],
  skipContentModel,
  skipContent
}) {
  return managementClient.getSpace(spaceId)
  .then(space => {
    return Promise.props({
      contentTypes: skipContentModel ? [] : space.getContentTypes(),
      entries: skipContent ? [] : batchedIdQuery(space, 'getEntries', entryIds),
      assets: skipContent ? [] : batchedIdQuery(space, 'getAssets', assetIds),
      locales: skipContentModel ? [] : space.getLocales()
    })
  })
}

function batchedIdQuery (space, method, ids) {
  return Promise.reduce(getIdBatches(ids), (fullResponse, batch) => {
    return space[method]({'sys.id[in]': batch})
    .then(response => {
      fullResponse = fullResponse.concat(response)
      return fullResponse
    })
  }, [])
}

function getIdBatches (ids) {
  const batches = []
  let currentBatch = ''
  while (ids.length > 0) {
    let id = ids.splice(0, 1)
    currentBatch += id
    if (currentBatch.length > BATCH_CHAR_LIMIT || ids.length === 0) {
      batches.push(currentBatch)
      currentBatch = ''
    } else {
      currentBatch += ','
    }
  }
  return batches
}
