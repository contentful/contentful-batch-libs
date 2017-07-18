import test from 'tape'
import sinon from 'sinon'

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
  const publishStub = sinon.stub()
  publishStub.onFirstCall().resolves({sys: {type: 'Asset', id: '123', publishedVersion: 2}})
  publishStub.onSecondCall().resolves({sys: {type: 'Asset', id: '456', publishedVersion: 3}})
  return publishEntities([
    { sys: {id: '123'}, publish: publishStub },
    { sys: {id: '456'}, publish: publishStub }
  ])
    .then((response) => {
      t.equals(publishStub.callCount, 2, 'publish assets')
      t.ok(response[0].sys.publishedVersion, 'has published version')
      t.equals(fakeLogEmitter.emit.callCount, 4, 'logs publishing information')
      const warningCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'warning').length
      const errorCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'error').length
      t.equals(warningCount, 0, 'logs no warnings')
      t.equals(errorCount, 0, 'logs no errors')
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
  publishStub.onFirstCall().resolves({sys: {type: 'Asset', id: '123', publishedVersion: 2}})
  publishStub.onSecondCall().rejects(errorValidation)
  publishStub.onThirdCall().resolves({sys: {type: 'Asset', id: '456', publishedVersion: 3}})
  publishEntities([
    { sys: {id: '123', type: 'asset'}, publish: publishStub },
    undefined,
    { sys: {id: '456', type: 'asset'}, publish: publishStub }
  ])
    .then((result) => {
      t.equals(publishStub.callCount, 3, 'tries to publish both falid assets, while retrying the second one')
      t.equals(fakeLogEmitter.emit.args[0][0], 'warning', 'logs warning for undefined entity')
      t.equals(fakeLogEmitter.emit.args[0][1], 'Unable to publish unknown', 'logs correct warning message for undefined entity')
      t.equals(fakeLogEmitter.emit.args[4][0], 'error', 'logs error at correct point of time')
      t.equals(fakeLogEmitter.emit.args[4][1], errorValidation, 'logs correct error')
      t.equals(fakeLogEmitter.emit.callCount, 7, 'should log start, end, unparseable notice, two publishing messages and one error')
      const lastLogIndex = fakeLogEmitter.emit.args.length - 1
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][0], 'info', 'logs success info at the end')
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][1], 'Successfully published 2 assets', 'logs correct success info message at the end')
      t.equals(result.length, 2, 'Result only contains resolved & valid entities')
      const warningCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'warning').length
      const errorCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'error').length
      t.equals(warningCount, 1, 'logs warning for invalid entity')
      t.equals(errorCount, 1, 'logs no errors')
      teardown()
      t.end()
    })
    .catch((err) => {
      teardown()
      console.error(err)
      t.fail('should log errors instead of throwing them')
      t.end()
    })
})

test('Aborts publishing queue when all publishes fail', (t) => {
  setup()
  const errorValidation = new Error('failed to publish')
  const publishStub = sinon.stub()
  publishStub.rejects(errorValidation)
  publishEntities([
    { sys: {id: '123', type: 'asset'}, publish: publishStub },
    { sys: {id: '456', type: 'asset'}, publish: publishStub }
  ])
    .then((result) => {
      t.equals(publishStub.callCount, 2, 'no retry since all fail')
      t.equals(fakeLogEmitter.emit.args[4][0], 'error', 'logs error at correct point of time')
      t.equals(fakeLogEmitter.emit.args[4][1], errorValidation, 'logs correct error')
      t.equals(fakeLogEmitter.emit.callCount, 7, 'should log start, end, unparseable notice, two publishing messages and one error')
      t.equals(result.length, 0, 'Result is empty since nothing could be published')
      const warningCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'warning').length
      const errorCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'error').length
      t.equals(warningCount, 0, 'logs no warnings')
      t.equals(errorCount, 3, 'logs 2 publishing errors and 1 summary publish error')
      const lastLogIndex = fakeLogEmitter.emit.args.length - 1
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][0], 'info', 'logs (zero) success info at the end')
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][1], 'Successfully published 0 assets', 'logs correct success info message at the end')
      teardown()
      t.end()
    })
    .catch((err) => {
      teardown()
      console.error(err)
      t.fail('should log errors instead of throwing them')
      t.end()
    })
})

test('Aborts publishing queue when all publishes fail', (t) => {
  setup()
  const errorValidation = new Error('failed to publish')
  const publishStub = sinon.stub()
  publishStub.onFirstCall().resolves({sys: {type: 'Asset', id: '123', publishedVersion: 2}})
  publishStub.onSecondCall().rejects(errorValidation)
  publishStub.onThirdCall().rejects(errorValidation)
  publishEntities([
    { sys: {id: '123', type: 'asset'}, publish: publishStub },
    { sys: {id: '456', type: 'asset'}, publish: publishStub }
  ])
    .then((result) => {
      t.equals(publishStub.callCount, 3, 'retries failed entity once while publishing the first')
      t.equals(result.length, 1, 'Result contains only the successfully published entity')
      const warningCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'warning').length
      const errorCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'error').length
      t.equals(warningCount, 0, 'logs no warnings')
      t.equals(errorCount, 3, 'logs 2 publishing errors and 1 summary publish error')
      const lastLogIndex = fakeLogEmitter.emit.args.length - 1
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][0], 'info', 'logs success info at the end')
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][1], 'Successfully published 1 assets', 'logs correct success info message at the end')
      teardown()
      t.end()
    })
    .catch((err) => {
      teardown()
      console.error(err)
      t.fail('should log errors instead of throwing them')
      t.end()
    })
})

test('Skips publishing when no entities are given', (t) => {
  setup()
  publishEntities([])
    .then((result) => {
      t.equals(result.length, 0, 'Result is empty')
      const warningCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'warning').length
      const errorCount = fakeLogEmitter.emit.args.filter((args) => args[0] === 'error').length
      t.equals(warningCount, 0, 'logs no warnings')
      t.equals(errorCount, 0, 'logs no errors')
      const lastLogIndex = fakeLogEmitter.emit.args.length - 1
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][0], 'info', 'logs skip info at the end')
      t.equals(fakeLogEmitter.emit.args[lastLogIndex][1], 'Skipping publishing since zero valid entities passed', 'logs correct skip info message at the end')
      t.equals(fakeLogEmitter.emit.args.length, 1, 'logs only the skip message')
      teardown()
      t.end()
    })
    .catch((err) => {
      teardown()
      console.error(err)
      t.fail('should log errors instead of throwing them')
      t.end()
    })
})
