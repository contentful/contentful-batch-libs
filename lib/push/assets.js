import Promise from 'bluebird'
import log from 'npmlog'
import getEntityName from './get-entity-name'
import errorBuffer from '../utils/error-buffer'

export function processAssets (assets) {
  return Promise.map(assets, (asset) => {
    log.info(`Processing Asset ${getEntityName(asset)}`)
    return asset.processForAllLocales().catch((err) => {
      log.info('Error Processing this asset, continuing...')
      err.entity = asset
      errorBuffer.push(err)
      return Promise.resolve(null)
    })
  }, {concurrency: 4})
}
