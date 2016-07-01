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

export function assets (asset) {
  asset.fields = pick(asset.fields, 'title', 'description')
  asset.fields.file = reduce(
    asset.fields.file,
    (newFile, file, locale) => {
      newFile[locale] = omit(file, 'url', 'details')
      newFile[locale].upload = 'https:' + file.url
      return newFile
    },
    {}
  )
  return asset
}

export function locales (locale, destinationLocales) {
  const transformedLocale = pick(locale, 'code', 'name', 'contentManagementApi', 'contentDeliveryApi', 'fallback_code', 'optional')
  const destinationLocale = find(destinationLocales, {code: locale.code})
  if (destinationLocale) {
    transformedLocale.sys = pick(destinationLocale.sys, 'id')
  }

  return transformedLocale
}
