import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {createEntities, createEntries, __RewireAPI__ as creationRewireAPI} from '../../lib/push/creation'

const logMock = {
  info: sinon.stub(),
  error: sinon.stub()
}

function setup () {
  logMock.info.reset()
  creationRewireAPI.__Rewire__('log', logMock)
}

function teardown () {
  creationRewireAPI.__ResetDependency__('log')
}

test('Create entities', (t) => {
  setup()
  const updateStub = sinon.stub().returns(Promise.resolve({sys: {type: 'Asset'}}))
  const space = {
    createAssetWithId: sinon.stub().returns(Promise.resolve({sys: {type: 'Asset'}}))
  }
  createEntities({space: space, type: 'Asset'}, [
    { original: { sys: {} }, transformed: { sys: {id: '123'} } },
    { original: { sys: {} }, transformed: { sys: {id: '456'} } }
  ], [
    {sys: {id: '123', version: 6}, update: updateStub}
  ])
  .then((response) => {
    t.equals(space.createAssetWithId.callCount, 1, 'create assets')
    t.equals(updateStub.callCount, 1, 'update assets')
    t.equals(logMock.info.callCount, 2, 'logs creation of two assets')
    teardown()
    t.end()
  })
})

test('Create entries', (t) => {
  setup()
  const updateStub = sinon.stub().returns(Promise.resolve({sys: {type: 'Entry'}}))
  const space = {
    createEntryWithId: sinon.stub().returns(Promise.resolve({sys: {type: 'Entry'}}))
  }
  const entries = [
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '123'} } },
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '456'} } }
  ]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]
  createEntries({space: space, skipContentModel: false}, entries, destinationEntries)
  .then((response) => {
    t.equals(space.createEntryWithId.callCount, 1, 'create entries')
    t.equals(updateStub.callCount, 1, 'update entries')
    t.equals(logMock.info.callCount, 2, 'logs creation of two entries')
    teardown()
    t.end()
  })
})

test('Create entries and remove unknown fields', (t) => {
  setup()
  const updateStub = sinon.stub()
  const errorUnkownField = new Error()
  errorUnkownField.name = 'UnknownField'
  errorUnkownField.error = {
    details: {
      errors: [{
        name: 'unknown',
        path: ['fields', 'gonefield']
      }]
    }
  }
  updateStub.onFirstCall().returns(Promise.reject(errorUnkownField))
  updateStub.onSecondCall().returns(Promise.resolve({
    sys: {type: 'Entry', id: '123'},
    fields: {}
  }))

  const entries = [{
    original: { sys: {contentType: {sys: {id: 'ctid'}}} },
    transformed: { sys: {id: '123'}, fields: {gonefield: '', existingfield: ''} }
  }]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]

  createEntries({space: {}, skipContentModel: true}, entries, destinationEntries)
  .then((response) => {
    t.equals(updateStub.callCount, 2, 'update entries')
    t.ok('existingfield' in entries[0].transformed.fields, 'keeps known field')
    t.notOk('gonefield' in entries[0].transformed.fields, 'removes unknown field')
    t.equals(logMock.info.callCount, 1, 'logs creation of one entry')
    teardown()
    t.end()
  })
})

test('Fails to create locale if it already exists', (t) => {
  setup()
  const space = {
    createLocale: sinon.stub()
  }
  const errorValidationFailed = new Error()
  errorValidationFailed.error = {
    sys: {id: 'ValidationFailed'},
    details: {
      errors: [{name: 'taken'}]
    }
  }
  space.createLocale.returns(Promise.reject(errorValidationFailed))
  const entity = { original: { sys: {} }, transformed: { sys: {} } }
  createEntities({space: space, type: 'Locale'}, [entity], [{sys: {}}])
  .then((entities) => {
    t.equals(entities[0], entity)
    t.end()
    teardown()
  })
})

test('Fails to create entities due to version mismatch', (t) => {
  setup()
  const space = {
    createAsset: sinon.stub()
  }
  const errorVersionMismatch = new Error()
  errorVersionMismatch.error = {
    sys: {
      id: 'VersionMismatch'
    }
  }
  space.createAsset.returns(Promise.reject(errorVersionMismatch))
  const entity = { original: { sys: {} }, transformed: { sys: {} } }
  createEntities({space: space, type: 'Asset'}, [entity], [{sys: {}}])
  .catch((err) => {
    t.equals(err.error.sys.id, 'VersionMismatch')
    teardown()
    t.end()
  })
})
