import { times } from 'lodash/util'

import getOutdatedDestinationContent from '../../lib/get/get-outdated-destination-content'

const sourceResponse = {
  contentTypes: times(150, (n) => ({sys: {id: `ct-${n}`}})),
  entries: times(2000, (n) => ({sys: {id: `e-${n}`}})),
  assets: times(1500, (n) => ({sys: {id: `a-${n}`}}))
}

const mockSpace = {
  getContentTypes: jest.fn(() => Promise.resolve([])),
  getEntries: jest.fn(() => Promise.resolve([{}])),
  getAssets: jest.fn(() => Promise.resolve([{}])),
  getLocales: jest.fn(() => Promise.resolve([]))
}

const mockClient = {
  getSpace: jest.fn()
}

afterEach(() => {
  mockSpace.getContentTypes.mockClear()
  mockSpace.getEntries.mockClear()
  mockSpace.getAssets.mockClear()
  mockSpace.getLocales.mockClear()
})

test('Gets destination content', () => {
  mockClient.getSpace = jest.fn(() => Promise.resolve(mockSpace))
  return getOutdatedDestinationContent({
    managementClient: mockClient,
    spaceId: 'spaceid',
    sourceResponse
  })
    .then((response) => {
      expect(mockSpace.getEntries.mock.calls).toHaveLength(20)
      testQueryLength('getEntries')
      expect(mockSpace.getAssets.mock.calls).toHaveLength(15)
      testQueryLength('getAssets')
      expect(response.entries).toHaveLength(20)
      expect(response.assets).toHaveLength(15)
    })
})

function testQueryLength (method) {
  const query = mockSpace[method].mock.calls[0][0]['sys.id[in]']
  const queryLength = query.length
  expect(queryLength < 2100).toBeTruthy()
  expect(query[query.length - 1]).not.toBe(',')
}

test('Fails to get destination space', () => {
  const errorNotFound = new Error()
  errorNotFound.name = 'NotFound'
  mockClient.getSpace = jest.fn(() => Promise.reject(errorNotFound))

  return getOutdatedDestinationContent({
    managementClient: mockClient,
    spaceId: 'spaceid',
    sourceResponse
  })
    .catch((err) => {
      expect(err.name === 'NotFound').toBeTruthy()
    })
})
