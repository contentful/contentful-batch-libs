import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import getSourceSpaceViaSync from '../../lib/get/get-source-space-via-sync'

function setup () {
  const fsMock = {
    readFileAsync: sinon.stub()
  }

  const deliveryClientMock = {
    sync: sinon.stub().returns(Promise.resolve({
      entries: [{sys: {type: 'Entry'}}],
      assets: [{sys: {type: 'Asset'}}],
      webhooks: [],
      deletedEntries: [{sys: {type: 'DeletedEntry'}}],
      deletedAssets: [{sys: {type: 'DeletedAsset'}}],
      nextSyncToken: 'token'
    })),
    getSpace: sinon.stub().returns(Promise.resolve({
      locales: ['en-US']
    }))
  }

  const managementClientMock = {
    getSpace: sinon.stub().returns(Promise.resolve({
      getContentTypes: sinon.stub().returns(Promise.resolve({
        items: [
          {sys: {type: 'ContentType'}}
        ]
      }))
    }))
  }

  const preparedResponse = {
    entries: [{sys: {type: 'Entry'}}],
    assets: [{sys: {type: 'Asset'}}],
    webhooks: [],
    deletedEntries: [{sys: {type: 'DeletedEntry'}}],
    deletedAssets: [{sys: {type: 'DeletedAsset'}}],
    contentTypes: [{sys: {type: 'ContentType'}}],
    locales: ['en-US'],
    nextSyncToken: 'token',
    isInitialSync: false
  }

  getSourceSpaceViaSync.__Rewire__('fs', fsMock)

  return {
    fsMock,
    deliveryClientMock,
    managementClientMock,
    preparedResponse
  }
}

function teardown () {
  getSourceSpaceViaSync.__ResetDependency__('fs')
}

test('Get source space with no file token', (t) => {
  const {deliveryClientMock, managementClientMock, preparedResponse, fsMock} = setup()
  fsMock.readFileAsync.returns(Promise.reject(new Error('file not found')))
  getSourceSpaceViaSync({
    deliveryClient: deliveryClientMock,
    managementClient: managementClientMock,
    sourceSpaceId: 'spaceid'
  })
  .then((response) => {
    const newResponse = Object.assign({}, preparedResponse)
    newResponse.isInitialSync = true
    t.deepLooseEqual(response, newResponse)
    teardown()
    t.end()
  })
})

test('Get source space with file token', (t) => {
  const {deliveryClientMock, managementClientMock, preparedResponse, fsMock} = setup()
  fsMock.readFileAsync.withArgs('tokenfile').returns(Promise.resolve('newtoken'))
  getSourceSpaceViaSync({
    deliveryClient: deliveryClientMock,
    managementClient: managementClientMock,
    sourceSpaceId: 'spaceid',
    nextSyncTokenFile: 'tokenfile'
  })
  .then((response) => {
    t.equals(deliveryClientMock.sync.firstCall.args[0].nextSyncToken, 'newtoken', 'syncs with provided token')
    t.deepLooseEqual(response, Object.assign({}, preparedResponse))
    teardown()
    t.end()
  })
})

test('Get source space with forced sync from scratch', (t) => {
  const {deliveryClientMock, managementClientMock, preparedResponse, fsMock} = setup()
  fsMock.readFileAsync.withArgs('tokenfile').returns(Promise.resolve('newtoken'))
  getSourceSpaceViaSync({
    deliveryClient: deliveryClientMock,
    managementClient: managementClientMock,
    sourceSpaceId: 'spaceid',
    nextSyncTokenFile: 'tokenfile',
    syncFromScratch: true
  })
  .then((response) => {
    const newResponse = Object.assign({}, preparedResponse)
    newResponse.isInitialSync = true
    t.deepLooseEqual(response, newResponse)
    teardown()
    t.end()
  })
})
