import getEntityName from '../lib/get-entity-name'

test('get name by name property', () => {
  const name = getEntityName({
    name: 'entityName'
  })
  expect(name).toBe('entityName')
})

test('get name by field called title', () => {
  const name = getEntityName({
    fields: {
      title: {
        'en-US': 'entityName'
      }
    }
  })
  expect(name).toBe('entityName')
})

test('get name by field called name', () => {
  const name = getEntityName({
    fields: {
      name: {
        'en-US': 'entityName'
      }
    }
  })
  expect(name).toBe('entityName')
})

test('get name by name property and attaches id', () => {
  const name = getEntityName({
    sys: {
      id: 'entityId'
    },
    name: 'entityName'
  })
  expect(name).toBe('entityName (entityId)')
})

test('get name by field called title and attaches id', () => {
  const name = getEntityName({
    sys: {
      id: 'entityId'
    },
    fields: {
      title: {
        'en-US': 'entityName'
      }
    }
  })
  expect(name).toBe('entityName (entityId)')
})

test('get name by field called name and attaches id', () => {
  const name = getEntityName({
    sys: {
      id: 'entityId'
    },
    fields: {
      name: {
        'en-US': 'entityName'
      }
    }
  })
  expect(name).toBe('entityName (entityId)')
})

test('fall back to id when no name is found', () => {
  const name = getEntityName({
    sys: {
      id: 'entityId'
    }
  })
  expect(name).toBe('entityId')
})

test('returns unknown when not even an ID is present', () => {
  const name = getEntityName({})
  expect(name).toBe('unknown')
})
