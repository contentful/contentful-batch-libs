import {createEntities, createEntries} from '../../lib/push/creation'

import { logEmitter } from '../../lib/utils/logging'

jest.mock('../../lib/utils/logging', () => ({
  logEmitter: {
    emit: jest.fn()
  }
}))

afterEach(() => {
  logEmitter.emit.mockClear()
})

test('Create entities', () => {
  const updateStub = jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Asset'}}))
  const space = {
    createAssetWithId: jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Asset'}}))
  }
  return createEntities({space: space, type: 'Asset'}, [
    { original: { sys: {} }, transformed: { sys: {id: '123'} } },
    { original: { sys: {} }, transformed: { sys: {id: '456'} } }
  ], [
    {sys: {id: '123', version: 6}, update: updateStub}
  ])
    .then((response) => {
      expect(space.createAssetWithId.mock.calls).toHaveLength(1)
      expect(updateStub.mock.calls).toHaveLength(1)
      expect(logEmitter.emit.mock.calls).toHaveLength(2)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})

test('Create entries', () => {
  const updateStub = jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Entry'}}))
  const space = {
    createEntryWithId: jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Entry'}})),
    createEntry: jest.fn().mockReturnValue(Promise.resolve({sys: {type: 'Entry'}}))
  }
  const entries = [
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '123'} } },
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {id: '456'} } },
    { original: { sys: {contentType: {sys: {id: 'ctid'}}} }, transformed: { sys: {} } }
  ]
  const destinationEntries = [
    {sys: {id: '123', version: 6}, update: updateStub}
  ]
  return createEntries({space: space, skipContentModel: false}, entries, destinationEntries)
    .then((response) => {
      expect(space.createEntryWithId.mock.calls).toHaveLength(1)
      expect(space.createEntry.mock.calls).toHaveLength(1)
      expect(updateStub.mock.calls).toHaveLength(1)
      expect(logEmitter.emit.mock.calls).toHaveLength(3)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})

test('Create entries and remove unknown fields', () => {
  const updateStub = jest.fn()
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
  updateStub.mockImplementationOnce(() => Promise.reject(errorUnkownField))
  updateStub.mockImplementationOnce(() => Promise.resolve({
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

  return createEntries({space: {}, skipContentModel: true}, entries, destinationEntries)
    .then((response) => {
      expect(updateStub.mock.calls).toHaveLength(2)
      expect('existingfield' in entries[0].transformed.fields).toBeTruthy()
      expect('gonefield' in entries[0].transformed.fields).toBeFalsy()
      expect(logEmitter.emit.mock.calls).toHaveLength(1)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})

test('Fails to create locale if it already exists', () => {
  const space = {
    createLocale: jest.fn(() => Promise.reject(errorValidationFailed))
  }
  const errorValidationFailed = new Error()
  errorValidationFailed.error = {
    sys: {id: 'ValidationFailed'},
    details: {
      errors: [{name: 'taken'}]
    }
  }
  const entity = { original: { sys: {} }, transformed: { sys: {} } }

  return createEntities({space: space, type: 'Locale'}, [entity], [{sys: {}}])
    .then((entities) => {
      expect(entities[0]).toBe(entity)
      const logLevels = logEmitter.emit.mock.calls.map((args) => args[0])
      expect(logLevels.indexOf('error') !== -1).toBeFalsy()
    })
})
