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
    t.equals(logMock.info.callCount, 5, 'logs publishing of two assets including queue information')
    teardown()
    t.end()
  })
})

test('Fails to publish entities', (t) => {
  setup()
  const publishStub = sinon.stub()
  publishStub.onFirstCall().returns(Promise.resolve({sys: {type: 'Asset', publishedVersion: 2}}))
  const apiError = {
    status: 422,
    details: {
      errors: [
        {
          name: 'notResolvable'
        }
      ]
    }
  }
  const errorValidation = new Error(JSON.stringify(apiError))
  publishStub.onSecondCall().returns(Promise.reject(errorValidation))
  publishStub.onThirdCall().returns(Promise.resolve({sys: {type: 'Asset', publishedVersion: 2}}))
  publishEntities([
    { sys: {id: '123', type: 'asset'}, publish: publishStub },
    undefined,
    { sys: {id: '456', type: 'asset'}, publish: publishStub }
  ])
  .then((result) => {
    t.equals(publishStub.callCount, 3, 'tries to publish both assets, while retrying one asset')
    t.equals(errorBufferMock.push.callCount, 1, 'logs 1 error')
    t.ok(logMock.info.args[3][0].includes('Starting new publishing queue'), 'runs a fresh queue at the beginning')
    t.ok(logMock.info.args[7][0].includes('Starting new publishing queue'), 'runs a second queue since one entity was not resolved')
    t.equals(result.length, 2, 'Result only contains resolved & valid entities')
    teardown()
    t.end()
  })
})

test('Queue does abort itself', (t) => {
  setup()
  const publishStub = sinon.stub()
  const apiError = {
    status: 422,
    details: {
      errors: [
        {
          name: 'notResolvable'
        }
      ]
    }
  }
  const errorValidation = new Error(JSON.stringify(apiError))
  // First call resolves, others fail
  publishStub.returns(Promise.reject(errorValidation))
  publishStub.onFirstCall().returns(Promise.resolve({sys: {type: 'Asset', publishedVersion: 2, id: '123'}}))
  return publishEntities([
    { sys: {id: '123', type: 'asset'}, publish: publishStub },
    { sys: {id: '456', type: 'asset'}, publish: publishStub }
  ])
  .then((result) => {
    const logs = logMock.info.args.map((args) => args[0])
    t.equals(publishStub.callCount, 3, 'publishes the first, retries the second only once')
    t.equals(errorBufferMock.push.callCount, 4, 'logs 4 errors')
    t.equals(errorBufferMock.push.lastCall.args[0].message, 'Queue was not able to publish at least one entitiy. Aborting.', 'Aborted queue with error')
    t.equals(logs.filter((log) => log.includes('Starting new publishing queue')).length, 2, 'Starts queue twice')
    t.equals(logs.filter((log) => log.includes('Unable to resolve 456 (456)')).length, 2, 'Is unable to resolve 456 twice')
    t.equals(logs.filter((log) => log.includes('Published Asset 123')).length, 1, 'Is able to publish 123')
    t.equals(result.filter((entity) => entity.sys.id === '123').length, 1, 'Result contains the published entity')
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
  const unpublishStub = sinon.stub().returns(Promise.reject(new Error()))
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
  const errorBadRequest = new Error()
  errorBadRequest.name = 'BadRequest'
  const unpublishStub = sinon.stub().returns(Promise.reject(errorBadRequest))
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
