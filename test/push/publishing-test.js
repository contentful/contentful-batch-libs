import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {publishEntities, unpublishEntities, __RewireAPI__ as publishingRewireAPI} from '../../lib/push/publishing'

const logMock = {
  info: sinon.stub()
}

const errorBufferMock = {
  push: sinon.stub()
}

function setup () {
  logMock.info.reset()
  publishingRewireAPI.__Rewire__('log', logMock)
  publishingRewireAPI.__Rewire__('errorBuffer', errorBufferMock)
}

function teardown () {
  publishingRewireAPI.__ResetDependency__('log')
  publishingRewireAPI.__ResetDependency__('errorBuffer')
}

test('Publish entities', (t) => {
  setup()
  const publishStub = sinon.stub().returns(Promise.resolve({sys: {type: 'Asset', publishedVersion: 2}}))
  return publishEntities([
    { sys: {id: '123'}, publish: publishStub },
    { sys: {id: '456'}, publish: publishStub }
  ])
  .then((response) => {
    t.equals(publishStub.callCount, 2, 'publish assets')
    t.ok(response[0].sys.publishedVersion, 'has published version')
    t.equals(logMock.info.callCount, 2, 'logs publishing of two assets')
    teardown()
    t.end()
  })
})

test('Fails to publish entities', (t) => {
  setup()
  const publishStub = sinon.stub()
  publishStub.onFirstCall().returns(Promise.reject({}))
  publishStub.onSecondCall().returns(Promise.reject({
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
  publishEntities([
    { sys: {id: '123'}, publish: publishStub },
    undefined,
    { sys: {id: '456'}, publish: publishStub }
  ])
  .then((errors) => {
    t.equals(publishStub.callCount, 2, 'tries to publish assets')
    t.equals(errorBufferMock.push.callCount, 3, 'logs 3 errors')
    teardown()
    t.end()
  })
})

test('Unpublish entities', (t) => {
  setup()
  const unpublishStub = sinon.stub().returns(Promise.resolve({sys: {type: 'Asset'}}))
  unpublishEntities([
    { sys: {id: '123'}, unpublish: unpublishStub },
    { sys: {id: '456'}, unpublish: unpublishStub }
  ])
  .then((response) => {
    t.equals(unpublishStub.callCount, 2, 'unpublish assets')
    t.equals(logMock.info.callCount, 2, 'logs unpublishing of two assets')
    teardown()
    t.end()
  })
})

test('Fails to unpublish entities', (t) => {
  setup()
  const unpublishStub = sinon.stub().returns(Promise.reject({}))
  unpublishEntities([
    { sys: {id: '123'}, unpublish: unpublishStub },
    { sys: {id: '456'}, unpublish: unpublishStub }
  ])
  .catch((errors) => {
    t.equals(unpublishStub.callCount, 2, 'tries to unpublish assets')
    teardown()
    t.end()
  })
})

test('Fails to unpublish entities because theyre already unpublished', (t) => {
  setup()
  const unpublishStub = sinon.stub().returns(Promise.reject({name: 'BadRequest'}))
  unpublishEntities([
    { sys: {id: '123', type: 'Asset'}, undefined, unpublish: unpublishStub }
  ])
  .then((entities) => {
    t.equals(unpublishStub.callCount, 1, 'tries to unpublish assets')
    t.equals(entities[0].sys.type, 'Asset', 'is an entity')
    teardown()
    t.end()
  })
})
