import Ajv from 'ajv'
import { logEmitter } from '../utils/logging'
import getEntityName from '../utils/get-entity-name'

const MINIMAL_VALID_ASSET_SCHEMA = {
  'properties': {
    'fields': {
      'type': 'object',
      'properties': {
        'file': {
          'type': 'object',
          'minProperties': 1,
          'patternProperties': {
            '^.*$': { 'type': 'object' }
          }
        }
      },
      required: ['file']
    }
  },
  required: ['fields']
}

const ajv = new Ajv({allErrors: true})

export function assets (asset) {
  if (!asset) {
    return false
  }
  const validate = ajv.compile(MINIMAL_VALID_ASSET_SCHEMA)
  const valid = validate(asset)
  if (valid) {
    return true
  }
  // log to error file and return false
  logEmitter.emit('warning', `Invalid asset payload for ${getEntityName(asset)}, reason: ${ajv.errorsText(validate.errors)}`)
  return false
}

export function entries (entry) {
  // TODO
  return true
}
export function contentTypes (contentType) {
  // TODO
  return true
}
export function locales (locale) {
  // TODO
  return true
}
export function webhooks (webhook) {
  // TODO
  return true
}
export function editorInterfaces (editorInterface) {
  // TODO
  return true
}
