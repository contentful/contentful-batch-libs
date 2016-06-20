import fs from 'fs'
import log from 'npmlog'
import sortEntries from './sort-entries'

/**
 * Gets all existing content types, locales, entries and assets, from a space
 * intended to be used as a source to be copied somewhere else or manipulated.
 *
 * For entries and assets it uses the sync API, so it can get only the entities
 * which were changed, created or deleted since the last sync, based on a sync token
 *
 * Entries are sorted so that entries which are linked to by other entries come
 * first in the list. This is so that if those entries are copied somewhere else,
 * there are no link reference errors when creating and publishing new entries.
 */
export default function ({deliveryClient, managementClient, sourceSpaceId, nextSyncTokenFile, syncFromScratch, skipContentModel = false, skipContent = false}) {
  return generateSyncConfig(nextSyncTokenFile, syncFromScratch)
    // get entries and assets
    .then((syncConfig) => {
      log.info('Getting content from source space')

      if (!skipContent) {
        syncConfig.resolveLinks = false
        return deliveryClient.sync(syncConfig)
          .then((response) => {
            return {
              entries: sortEntries(response.entries),
              assets: response.assets,
              deletedEntries: response.deletedEntries,
              deletedAssets: response.deletedAssets,
              nextSyncToken: response.nextSyncToken,
              isInitialSync: !!syncConfig.initial
            }
          })
      } else {
        return {
          entries: [],
          assets: [],
          deletedEntries: [],
          deletedAssets: []
        }
      }
    })
    // get content types
    .then((response) => {
      if (!skipContentModel) {
        return managementClient.getSpace(sourceSpaceId)
          .then((space) => {
            return space.getContentTypes()
              .then((contentTypes) => {
                response.contentTypes = contentTypes.items
                return response
              })
          })
      } else {
        response.contentTypes = []
        return response
      }
    })
    // get locales
    .then((response) => {
      if (!skipContentModel) {
        return deliveryClient.getSpace()
          .then((space) => {
            response.locales = space.locales
            return response
          })
      } else {
        response.locales = []
        return response
      }
    })
}

function generateSyncConfig (nextSyncTokenFile, syncFromScratch) {
  return fs.readFileAsync(nextSyncTokenFile, 'utf-8')
    .then((nextSyncToken) => {
      return nextSyncToken && !syncFromScratch
        ? { nextSyncToken: nextSyncToken }
        : { initial: true }
    }, () => ({ initial: true }))
}
