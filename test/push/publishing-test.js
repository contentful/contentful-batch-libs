import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {publishEntities, __RewireAPI__ as publishingRewireAPI} from '../../lib/push/publishing'

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
