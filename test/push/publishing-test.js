import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {publishEntities, unpublishEntities, __RewireAPI__ as publishingRewireAPI} from '../../lib/push/publishing'

const fakeLogEmitter = {
  emit: sinon.stub()
}

function setup () {
  publishingRewireAPI.__Rewire__('logEmitter', fakeLogEmitter)
}

function teardown () {
  fakeLogEmitter.emit.reset()
  publishingRewireAPI.__ResetDependency__('logEmitter')
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
    t.equals(fakeLogEmitter.emit.callCount, 4, 'logs publishing information')
    teardown()
    t.end()
  })
  .catch(() => {
    teardown()
    t.fail('should log errors instead of throwing them')
    t.end()
  })
})

test('Only publishes valid entities and does not fail when api error occur', (t) => {
  setup()
  const errorValidation = new Error('failed to publish')
  const publishStub = sinon.stub()
  publishStub.onFirstCall().returns(Promise.resolve({sys: {type: 'Asset', publishedVersion: 2}}))
  publishStub.onSecondCall().returns(Promise.reject(errorValidation))
  publishEntities([
    { sys: {id: '123', type: 'asset'}, publish: publishStub },
    undefined,
    { sys: {id: '456', type: 'asset'}, publish: publishStub }
  ])
  .then((result) => {
    t.equals(publishStub.callCount, 2, 'tries to publish both assets, while skipping the faulty asset')
    t.equals(fakeLogEmitter.emit.args[4][0], 'error', 'logs error at correct point of time')
    t.equals(fakeLogEmitter.emit.args[4][1], errorValidation, 'logs correct error')
    t.equals(fakeLogEmitter.emit.callCount, 6, 'should log start, end, unparseable notice, one success message and one error')
    t.equals(result.length, 2, 'Result only contains resolved & valid entities')
    teardown()
    t.end()
  })
  .catch((err) => {
    teardown()
    console.error({err})
    t.fail('should log errors instead of throwing them')
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
    t.equals(fakeLogEmitter.emit.callCount, 2, 'logs unpublishing of two assets')
    t.equals(fakeErrorEmitter.emit.callCount, 0, 'logs no errors into the buffer')
    teardown()
    t.end()
  })
  .catch(() => {
    teardown()
    t.fail('should log errors instead of throwing them')
    t.end()
  })
})

test('Fails to unpublish entities', (t) => {
  setup()
  const rejectError = new Error('publishing rejected')
  const unpublishStub = sinon.stub().returns(Promise.reject(rejectError))
  unpublishEntities([
    { sys: {id: '123'}, unpublish: unpublishStub },
    { sys: {id: '456'}, unpublish: unpublishStub }
  ])
  .then(() => {
    t.equals(unpublishStub.callCount, 2, 'tries to unpublish assets')
    t.equals(fakeErrorEmitter.emit.callCount, 2, 'logs two errors')
    t.equals(fakeErrorEmitter.emit.args[0][1], rejectError, 'logs correct error')
    t.equals(fakeErrorEmitter.emit.args[1][1], rejectError, 'logs correct error')
    teardown()
    t.end()
  })
  .catch(() => {
    teardown()
    t.fail('should log errors instead of throwing them')
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
    t.equals(fakeErrorEmitter.emit.callCount, 1, 'logs one errors into the buffer')
    t.equals(entities[0], null, 'returns empty entity')
    teardown()
    t.end()
  })
  .catch((error) => {
    console.error({error})
    teardown()
    t.fail('should log errors instead of throwing them')
    t.end()
  })
})
