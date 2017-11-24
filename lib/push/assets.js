import Promise from 'bluebird'

import getEntityName from '../utils/get-entity-name'
import { logEmitter } from '../utils/logging'

export function processAssets (assets) {
  return Promise.map(assets, (asset) => {
    logEmitter.emit('info', `Processing Asset ${getEntityName(asset)}`)
    if (asset) {
      return asset.processForAllLocales().catch((err) => {
        err.entity = asset
        logEmitter.emit('error', err)
        return Promise.resolve(null)
      })
    }
    logEmitter.emit('warning', 'Falsy asset, skipping...')
    return Promise.resolve(null)
    
  }, {concurrency: 4})
}
