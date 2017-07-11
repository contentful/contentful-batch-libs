import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {processAssets, __RewireAPI__ as assetsRewireAPI} from '../../lib/push/assets'

const fakeLogEmitter = {
  emit: sinon.stub()
}

function setup () {
  assetsRewireAPI.__Rewire__('logEmitter', fakeLogEmitter)
}

function teardown () {
  fakeLogEmitter.emit.reset()
  assetsRewireAPI.__ResetDependency__('logEmitter')
}

test('Process assets', (t) => {
  setup()
  const processStub = sinon.stub().returns(Promise.resolve({sys: {type: 'Asset'}}))

  processAssets([
    { sys: {id: '123'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}}, processForAllLocales: processStub },
    { sys: {id: '456'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}}, processForAllLocales: processStub }
  ])
    .then((response) => {
      t.equals(processStub.callCount, 2, 'processes assets')
      t.equals(fakeLogEmitter.emit.callCount, 2, 'logs processing of assets')
      teardown()
      t.end()
    })
})

test('Process assets fails', (t) => {
  setup()
  const processStub = sinon.stub()
  const failedError = new Error('processing failed')
  processStub.onCall(0).returns(Promise.resolve({sys: {type: 'Asset'}}))
  processStub.onCall(1).returns(Promise.reject(failedError))

  processAssets([
    { sys: {id: '123'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}}, processForAllLocales: processStub },
    { sys: {id: '456'}, fields: {file: {'en-US': 'file object', 'en-GB': {}}}, processForAllLocales: processStub }
  ])
    .then((response) => {
      t.equals(processStub.callCount, 2, 'processes assets')
      t.equals(fakeLogEmitter.emit.callCount, 3, 'logs three times')
      t.equals(fakeLogEmitter.emit.args[0][0], 'info', 'logs processing of first asset')
      t.equals(fakeLogEmitter.emit.args[0][1], 'Processing Asset 123', 'logs processing of first asset')
      t.equals(fakeLogEmitter.emit.args[1][0], 'info', 'logs processing of second asset')
      t.equals(fakeLogEmitter.emit.args[1][1], 'Processing Asset 456', 'logs processing of first asset')
      t.equals(fakeLogEmitter.emit.args[2][0], 'error', 'logs error at last')
      t.equals(fakeLogEmitter.emit.args[2][1], failedError, 'logs failed to delete error as second log')
      teardown()
      t.end()
    })
})
