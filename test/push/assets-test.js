import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import * as assets from '../../lib/push/assets'

const logMock = {
  info: sinon.stub(),
  warn: sinon.stub()
}

function setup () {
  logMock.info.reset()
  logMock.warn.reset()
  assets.__Rewire__('log', logMock)
}

function teardown () {
  assets.__ResetDependency__('log')
}

test('Process assets', t => {
  setup()
  const space = {
    processAssetFile: sinon.stub().returns(Promise.resolve())
  }
  assets.processAssets({space: space}, [
    { sys: {id: '123'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}} },
    { sys: {id: '456'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}} }
  ])
  .then(response => {
    t.equals(space.processAssetFile.callCount, 4, 'processes assets')
    // 2 for each asset at the start, 4 for each 2 locales in 2 assets
    t.equals(logMock.info.callCount, 6, 'logs processing of assets')
    teardown()
    t.end()
  })
})

test.only('Fails to process assets', t => {
  setup()
  const space = {
    processAssetFile: sinon.stub().returns(Promise.reject({name: 'ProcessingError'}))
  }
  assets.processAssets({space: space}, [
    { sys: {id: '123'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}} },
    { sys: {id: '456'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}} }
  ])
  .catch((response, r2, r3) => {
    console.log('in test', response, r2, r3)
    t.equals(space.processAssetFile.callCount, 4, 'processes assets')
    t.equals(logMock.warn.callCount, 2, 'logs processing failure of assets')
    teardown()
    t.end()
  })
})

test('Check if assets are processed', t => {
  setup()
  const space = { getAsset: sinon.stub() }
  space.getAsset.onFirstCall().returns(Promise.resolve({
    sys: {id: '123'}, fields: {
      file: {
        'en-US': {url: 'url'},
        'en-GB': {upload: 'upload'}
      }
    }
  }))
  space.getAsset.onSecondCall().returns(Promise.resolve({
    sys: {id: '123'}, fields: {
      file: {
        'en-US': {url: 'url'},
        'en-GB': {url: 'url'}
      }
    }
  }))

  assets.checkAssets({space: space}, [
    { sys: {id: '123'}, fields: {file: {'en-US': {}, 'en-GB': {}}} }
  ])
  .then(assets => {
    t.equals(space.getAsset.callCount, 2, 'gets assets')
    t.ok(assets[0].fields.file['en-US'].url, 'first asset has url')
    t.ok(assets[0].fields.file['en-GB'].url, 'second asset has url')
    teardown()
    t.end()
  })
})
