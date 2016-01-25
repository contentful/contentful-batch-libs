import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import * as publishing from '../../lib/push/publishing'

const logMock = {
  info: sinon.stub()
}

const errorBufferMock = {
  push: sinon.stub()
}

function setup () {
  logMock.info.reset()
  publishing.__Rewire__('log', logMock)
  publishing.__Rewire__('errorBuffer', errorBufferMock)
}

function teardown () {
  publishing.__ResetDependency__('log')
  publishing.__ResetDependency__('errorBuffer')
}

test('Publish entities', t => {
  setup()
  const space = {
    publishAsset: sinon.stub().returns(Promise.resolve({sys: {type: 'Asset', publishedVersion: 2}}))
  }
  return publishing.publishEntities({space: space, type: 'Asset'}, [
    { sys: {id: '123'} },
    { sys: {id: '456'} }
  ])
  .then(response => {
    t.equals(space.publishAsset.callCount, 2, 'publish assets')
    t.ok(response[0].sys.publishedVersion, 'has published version')
    t.equals(logMock.info.callCount, 2, 'logs publishing of two assets')
    teardown()
    t.end()
  })
})

test('Fails to publish entities', t => {
  setup()
  const space = {
    publishAsset: sinon.stub()
  }
  space.publishAsset.onFirstCall().returns(Promise.reject({}))
  space.publishAsset.onSecondCall().returns(Promise.reject({
    sys: {
      type: 'Error',
      id: 'UnresolvedLinks'
    },
    message: 'Validation error',
    details: {
      errors: [
        {
          name: 'notResolvable',
          link: {
            type: 'Link',
            linkType: 'Entry',
            id: 'linkedEntryId'
          },
          path: [
            'fields',
            'category',
            'en-US',
            0
          ]
        }
      ]
    }
  }))
  publishing.publishEntities({space: space, type: 'Asset'}, [
    { sys: {id: '123'} },
    { sys: {id: '456'} }
  ])
  .then(errors => {
    t.equals(space.publishAsset.callCount, 2, 'tries to publish assets')
    t.equals(errorBufferMock.push.callCount, 2, 'logs 2 errors')
    teardown()
    t.end()
  })
})

test('Unpublish entities', t => {
  setup()
  const space = {
    unpublishAsset: sinon.stub().returns(Promise.resolve({sys: {type: 'Asset'}}))
  }
  publishing.unpublishEntities({space: space, type: 'Asset'}, [
    { sys: {id: '123'} },
    { sys: {id: '456'} }
  ])
  .then(response => {
    t.equals(space.unpublishAsset.callCount, 2, 'unpublish assets')
    t.equals(logMock.info.callCount, 2, 'logs unpublishing of two assets')
    teardown()
    t.end()
  })
})

test('Fails to unpublish entities', t => {
  setup()
  const space = {
    unpublishAsset: sinon.stub().returns(Promise.reject({}))
  }
  publishing.unpublishEntities({space: space, type: 'Asset'}, [
    { sys: {id: '123'} },
    { sys: {id: '456'} }
  ])
  .catch(errors => {
    t.equals(space.unpublishAsset.callCount, 2, 'tries to unpublish assets')
    teardown()
    t.end()
  })
})

test('Fails to unpublish entities because theyre already unpublished', t => {
  setup()
  const space = {
    unpublishAsset: sinon.stub().returns(Promise.reject({name: 'BadRequest'}))
  }
  publishing.unpublishEntities({space: space, type: 'Asset'}, [
    { sys: {id: '123', type: 'Asset'} }
  ])
  .then(entities => {
    t.equals(space.unpublishAsset.callCount, 1, 'tries to unpublish assets')
    t.equals(entities[0].sys.type, 'Asset', 'is an entity')
    teardown()
    t.end()
  })
})
