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
  const space = {
    deleteAsset: sinon.stub().returns(Promise.resolve())
  }
  deleteEntities({space: space, type: 'Asset'}, [
    { sys: {id: '123'} },
    { sys: {id: '456'} }
  ])
  .then((response) => {
    t.equals(space.deleteAsset.callCount, 2, 'delete assets')
    t.equals(logMock.info.callCount, 2, 'logs deletion of two assets')
    deletionRewireAPI.__ResetDependency__('log')
    t.end()
  })
})
