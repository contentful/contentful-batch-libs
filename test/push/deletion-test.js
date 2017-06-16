import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {deleteEntities, __RewireAPI__ as deletionRewireAPI} from '../../lib/push/deletion'

const fakeLogEmitter = {
  emit: sinon.stub()
}

const fakeErrorEmitter = {
  emit: sinon.stub()
}

function setup () {
  deletionRewireAPI.__Rewire__('logEmitter', fakeLogEmitter)
  deletionRewireAPI.__Rewire__('errorEmitter', fakeErrorEmitter)
}

function teardown () {
  fakeLogEmitter.emit.reset()
  fakeErrorEmitter.emit.reset()
  deletionRewireAPI.__ResetDependency__('logEmitter')
  deletionRewireAPI.__ResetDependency__('errorEmitter')
}

test('Delete entities', (t) => {
  setup()

  const entities = [
    { sys: {id: '123'}, delete: sinon.stub().returns(Promise.resolve()) },
    { sys: {id: '456'}, delete: sinon.stub().returns(Promise.resolve()) }
  ]
  deleteEntities(entities)
  .then((response) => {
    t.ok(entities[0].delete.called, 'delete asset 1')
    t.ok(entities[1].delete.called, 'delete asset 2')
    t.equals(fakeLogEmitter.emit.callCount, 2, 'logs deletion of two assets')
    t.equals(fakeErrorEmitter.emit.callCount, 0, 'logs no errors')
    teardown()
    t.end()
  })
})

test('Fails to delete one entity', (t) => {
  setup()

  const failedError = new Error('failed to delete')

  const entities = [
    { sys: {id: '123'}, delete: sinon.stub().returns(Promise.resolve()) },
    { sys: {id: '456'}, delete: sinon.stub().returns(Promise.reject(failedError)) }
  ]
  deleteEntities(entities)
  .then((response) => {
    t.ok(entities[0].delete.called, 'delete asset 1')
    t.ok(entities[1].delete.called, 'delete asset 2')
    t.equals(fakeLogEmitter.emit.callCount, 1, 'logs deletion of one asset')
    t.equals(fakeErrorEmitter.emit.callCount, 1, 'log one error')
    t.equals(fakeErrorEmitter.emit.args[0][1], failedError, 'logs failed to delete error')
    teardown()
    t.end()
  })
})
