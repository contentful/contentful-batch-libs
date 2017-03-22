import * as transformers from '../../lib/transform/transformers'
import test from 'tape'
import {cloneMock} from '../mocks/'

test('It should transform processed asset', (t) => {
  const assetMock = cloneMock('asset')
  assetMock.fields = {
    file: {
      'en-US': {fileName: 'filename.jpg', url: '//server/filename.jpg'},
      'de-DE': {fileName: 'filename.jpg', url: '//server/filename-de.jpg'}
    }
  }
  const transformedAsset = transformers.assets(assetMock)
  t.ok(transformedAsset.fields.file['en-US'].upload)
  t.ok(transformedAsset.fields.file['de-DE'].upload)
  t.equals(transformedAsset.fields.file['en-US'].upload, 'https:' + assetMock.fields.file['en-US'].url)
  t.equals(transformedAsset.fields.file['de-DE'].upload, 'https:' + assetMock.fields.file['de-DE'].url)
  t.end()
})

test('It should transform unprocessed asset', (t) => {
  const assetMock = cloneMock('asset')
  assetMock.fields = {
    file: {
      'en-US': {fileName: 'filename.jpg', upload: '//server/filename.jpg'},
      'de-DE': {fileName: 'filename.jpg', upload: '//server/filename-de.jpg'}
    }
  }
  const transformedAsset = transformers.assets(assetMock)
  t.ok(transformedAsset.fields.file['en-US'].upload)
  t.ok(transformedAsset.fields.file['de-DE'].upload)
  t.equals(transformedAsset.fields.file['en-US'].upload, 'https:' + assetMock.fields.file['en-US'].upload)
  t.equals(transformedAsset.fields.file['de-DE'].upload, 'https:' + assetMock.fields.file['de-DE'].upload)
  t.end()
})

test('It should transform unprocessed asset with uploadFrom', (t) => {
  const assetMock = cloneMock('asset')
  assetMock.fields = {
    file: {
      'en-US': {fileName: 'filename.jpg', uploadFrom: {sys: {id: 'upload-en-US'}}},
      'de-DE': {fileName: 'filename.jpg', uploadFrom: {sys: {id: 'upload-de-DE'}}}
    }
  }
  const transformedAsset = transformers.assets(assetMock)
  t.ok(transformedAsset.fields.file['en-US'].uploadFrom)
  t.ok(transformedAsset.fields.file['de-DE'].uploadFrom)
  t.equals(transformedAsset.fields.file['en-US'].uploadFrom.sys.id, assetMock.fields.file['en-US'].uploadFrom.sys.id)
  t.equals(transformedAsset.fields.file['de-DE'].uploadFrom.sys.id, assetMock.fields.file['de-DE'].uploadFrom.sys.id)
  t.end()
})

test('It should transform webhook with credentials to normal webhook', (t) => {
  const webhookMock = cloneMock('webhook')
  webhookMock.httpBasicUsername = 'user name'
  const transformedWebhook = transformers.webhooks(webhookMock)
  t.notOk(transformedWebhook.httpBasicUsername)
  t.end()
})
