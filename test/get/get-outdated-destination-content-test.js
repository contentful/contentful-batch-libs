import test from 'tape'
import sinon from 'sinon'
import Promise from 'bluebird'
import {times} from 'lodash/util'

import getOutdatedDestinationContent from '../../lib/get/get-outdated-destination-content'

const sourceEntryIds = times(2000, (n) => `e${n}`)
const sourceAssetIds = times(2000, (n) => `a${n}`)

const logMock = {
  info: sinon.stub(),
  error: sinon.stub()
}

const mockSpace = {
  getContentTypes: sinon.stub().returns(Promise.resolve([])),
  getEntries: sinon.stub().returns(Promise.resolve([{}])),
  getAssets: sinon.stub().returns(Promise.resolve([{}])),
  getLocales: sinon.stub().returns(Promise.resolve([]))
}

const mockClient = {
  getSpace: sinon.stub()
}

function setup () {
  logMock.error.reset()
  getOutdatedDestinationContent.__Rewire__('log', logMock)
}

function teardown () {
  getOutdatedDestinationContent.__ResetDependency__('log')
}

test('Gets destination content', (t) => {
  setup()
  mockClient.getSpace.returns(Promise.resolve(mockSpace))
  getOutdatedDestinationContent({
    managementClient: mockClient,
    spaceId: 'spaceid',
    entryIds: sourceEntryIds,
    assetIds: sourceAssetIds
  })
  .then((response) => {
    t.equals(mockSpace.getEntries.callCount, 6, 'getEntries is split into multiple calls')
    testQueryLength(t, 'getEntries')
    t.equals(mockSpace.getAssets.callCount, 6, 'getAssets is split into multiple calls')
    testQueryLength(t, 'getAssets')
    t.equals(response.entries.length, 6, 'number of entries matched (one per call)')
    t.equals(response.assets.length, 6, 'number of assets matched (one per call)')
    teardown()
    t.end()
  })
})

function testQueryLength (t, method) {
  const query = mockSpace[method].args[0][0]['sys.id[in]']
  const queryLength = query.length
  t.ok(
    queryLength < 2100,
    `${method} query length is under GET request length limit. Actual value: ${queryLength}`
  )
  t.notEqual(query[query.length - 1], ',', `${method} query last character is not a comma`)
}

test('Fails to get destination space', (t) => {
  setup()
  const errorNotFound = new Error()
  errorNotFound.name = 'NotFound'
  mockClient.getSpace.returns(Promise.reject(errorNotFound))

  getOutdatedDestinationContent({
    managementClient: mockClient,
    spaceId: 'spaceid',
    entryIds: sourceEntryIds,
    assetIds: sourceAssetIds
  })
  .catch((err) => {
    t.ok(err.name === 'NotFound')
    t.equal(logMock.error.callCount, 1, 'User is shown a more helpful error')
    teardown()
    t.end()
  })
})
