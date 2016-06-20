import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {deleteEntities, __RewireAPI__ as deletionRewireAPI} from '../../lib/push/deletion'

const logMock = {
  info: sinon.stub()
}
deletionRewireAPI.__Rewire__('log', logMock)

test('Delete entities', (t) => {
  logMock.info.reset()
  const entities = [
    { sys: {id: '123'}, delete: sinon.stub().returns(Promise.resolve()) },
    { sys: {id: '456'}, delete: sinon.stub().returns(Promise.resolve()) }
  ]
  deleteEntities(entities)
  .then((response) => {
    t.ok(entities[0].delete.called, 'delete asset 1')
    t.ok(entities[1].delete.called, 'delete asset 2')
    t.equals(logMock.info.callCount, 2, 'logs deletion of two assets')
    deletionRewireAPI.__ResetDependency__('log')
    t.end()
  })
})
