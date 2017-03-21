import { omit, pick } from 'lodash/object'
import { find, reduce } from 'lodash/collection'
/**
 * Default transformer methods for each kind of entity.
 *
 * In the case of assets it also changes the asset url to the upload property
 * as the whole upload process needs to be followed again.
 */

export function contentTypes (contentType) {
  return contentType
}

export function entries (entry) {
  return entry
}

export function webhooks (webhook) {
  // Workaround for webhooks with credentials
  if (webhook.httpBasicUsername) {
    delete webhook.httpBasicUsername
  }
  return webhook
}

export function assets (asset) {
  const transformedAsset = omit(asset, 'sys')
  transformedAsset.sys = pick(asset.sys, 'id')
  transformedAsset.fields = pick(asset.fields, 'title', 'description')
  transformedAsset.fields.file = reduce(
    asset.fields.file,
     (newFile, file, locale) => {
       newFile[locale] = omit(file, 'url', 'details')
       if (!newFile[locale].uploadFrom) {
         newFile[locale] = pick(file, 'contentType', 'fileName')
         newFile[locale].upload = `https:${file.url || file.upload}`
       }
       return newFile
     },
     {}
   )
  return transformedAsset
}

export function locales (locale, destinationLocales) {
  const transformedLocale = pick(locale, 'code', 'name', 'contentManagementApi', 'contentDeliveryApi', 'fallbackCode', 'optional')
  const destinationLocale = find(destinationLocales, {code: locale.code})
  if (destinationLocale) {
    transformedLocale.sys = pick(destinationLocale.sys, 'id')
  }

  return transformedLocale
}
