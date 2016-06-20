import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {processAssets, __RewireAPI__ as assetsRewireAPI} from '../../lib/push/assets'

const logMock = {
  info: sinon.stub()
}

function setup () {
  logMock.info.reset()
  assetsRewireAPI.__Rewire__('log', logMock)
}

function teardown () {
  assetsRewireAPI.__ResetDependency__('log')
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
    t.equals(logMock.info.callCount, 2, 'logs processing of assets')
    teardown()
    t.end()
  })
})
