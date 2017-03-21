import Promise from 'bluebird'
import log from 'npmlog'
import getEntityName from './get-entity-name'

export function processAssets (assets) {
  return Promise.map(assets, (asset) => {
    log.info(`Processing Asset ${getEntityName(asset)}`)
    return asset.processForAllLocales().catch(() => {
      log.info('Error Processing this asset, continuing...')
      return Promise.resolve(null)
    })
  }, {concurrency: 4})
}
