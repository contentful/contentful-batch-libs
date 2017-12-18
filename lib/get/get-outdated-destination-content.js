import Promise from 'bluebird'
import { logEmitter } from '../utils/logging'

const BATCH_CHAR_LIMIT = 1990
const BATCH_SIZE_LIMIT = 100

const METHODS = {
  contentTypes: { name: 'content types', method: 'getContentTypes' },
  locales: { name: 'locales', method: 'getLocales' },
  entries: { name: 'entries', method: 'getEntries' },
  assets: { name: 'assets', method: 'getAssets' }
}

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
  sourceResponse,
  contentModelOnly,
  skipLocales,
  skipContentModel
}) {
  return managementClient.getSpace(spaceId)
    .then((space) => {
      const result = {}
      const sourceContent = {
        contentTypes: sourceResponse.contentTypes || [],
        locales: sourceResponse.locales || [],
        entries: sourceResponse.entries || [],
        assets: sourceResponse.assets || []
      }

      if (!skipContentModel) {
        const contentTypeIds = sourceContent.contentTypes.map((e) => e.sys.id)
        result.contentTypes = batchedIdQuery(space, 'contentTypes', contentTypeIds)

        if (!skipLocales) {
          const localeIds = sourceContent.locales.map((e) => e.sys.id)
          result.locales = batchedIdQuery(space, 'locales', localeIds)
        }
      }

      if (contentModelOnly) {
        return Promise.props(result)
      }

      const entryIds = sourceContent.entries.map((e) => e.sys.id)
      const assetIds = sourceContent.assets.map((e) => e.sys.id)
      result.entries = batchedIdQuery(space, 'entries', entryIds)
      result.assets = batchedIdQuery(space, 'assets', assetIds)
      result.webhooks = []

      return Promise.props(result)
    }, (err) => {
      throw err
    })
}

function batchedIdQuery (space, type, ids) {
  const method = METHODS[type].method
  const entityTypeName = METHODS[type].name
  return Promise.reduce(getIdBatches(ids), (fullResponse, batch) => {
    return space[method]({
      'sys.id[in]': batch,
      limit: batch.split(',').length
    })
      .then((response) => {
        fullResponse = fullResponse.concat(response.items)
        logEmitter.emit('info', `Fetched ${fullResponse.length} of ${response.total} ${entityTypeName}`)
        return fullResponse
      })
  }, [])
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
