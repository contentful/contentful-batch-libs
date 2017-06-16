import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'

import {createEntities, createEntries, __RewireAPI__ as creationRewireAPI} from '../../lib/push/creation'

const fakeLogEmitter = {
  emit: sinon.stub()
}

function setup () {
  creationRewireAPI.__Rewire__('logEmitter', fakeLogEmitter)
}

function teardown () {
  fakeLogEmitter.emit.reset()
  creationRewireAPI.__ResetDependency__('logEmitter')
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
    t.equals(space.createAssetWithId.callCount, 1, 'creates one missing asset')
    t.equals(updateStub.callCount, 1, 'updates one existing assets')
    t.equals(fakeLogEmitter.emit.callCount, 2, 'logs creation of two assets')
    const logLevels = fakeLogEmitter.emit.args.map((args) => args[0])
    t.notOk(logLevels.includes('error'), 0, 'logs no errors')
    teardown()
    t.end()
  })
})

test('Create entries', (t) => {
  setup()
  const updateStub = sinon.stub().returns(Promise.resolve({sys: {type: 'Entry'}}))
  const space = {
    createEntryWithId: sinon.stub().returns(Promise.resolve({sys: {type: 'Entry'}})),
    createEntry: sinon.stub().returns(Promise.resolve({sys: {type: 'Entry'}}))
  }
  const entries = [
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '123'} } },
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '456'} } },
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {} } }
  ]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]
  createEntries({space: space, skipContentModel: false}, entries, destinationEntries)
  .then((response) => {
    t.equals(space.createEntryWithId.callCount, 1, 'create entries with the same id')
    t.equals(space.createEntry.callCount, 1, 'create entries even when the id is not provided')
    t.equals(updateStub.callCount, 1, 'update entries')
    t.equals(fakeLogEmitter.emit.callCount, 3, 'logs creation/update of three entries')
    const logLevels = fakeLogEmitter.emit.args.map((args) => args[0])
    t.notOk(logLevels.includes('error'), 0, 'logs no errors')
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
    t.equals(fakeLogEmitter.emit.callCount, 1, 'logs creation of one entry')
    const logLevels = fakeLogEmitter.emit.args.map((args) => args[0])
    t.notOk(logLevels.includes('error'), 0, 'logs no errors')
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
    const logLevels = fakeLogEmitter.emit.args.map((args) => args[0])
    t.notOk(logLevels.includes('error'), 0, 'logs no errors')
    t.end()
    teardown()
  })
})
