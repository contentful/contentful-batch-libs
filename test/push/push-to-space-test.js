import test from 'tape'
import sinon from 'sinon'
import {each} from 'lodash/collection'

import pushToSpace from '../../lib/push/push-to-space'

const creationMock = {
  createEntities: sinon.stub().resolves([]),
  createEntries: sinon.stub().resolves([])
}

const publishingMock = {
  publishEntities: sinon.stub().resolves([]),
  unpublishEntities: sinon.stub().resolves()
}

const assetsMock = {
  processAssets: sinon.stub().resolves([])
}
const editorInterfaceMock = {
  controls: [],
  update: sinon.stub().resolves()
}
const spaceMock = {
  getEditorInterfaceForContentType: sinon.stub().resolves(editorInterfaceMock)
}

const sourceResponse = {
  locales: [],
  contentTypes: [],
  assets: [],
  editorInterfaces: [],
  entries: []
}

const destinationResponse = {}

const clientMock = {
  getSpace: sinon.stub().resolves({})
}

function setup () {
  each(creationMock, (fn) => fn.resetHistory())
  each(publishingMock, (fn) => fn.resetHistory())
  each(assetsMock, (fn) => fn.resetHistory())
  pushToSpace.__Rewire__('creation', creationMock)
  pushToSpace.__Rewire__('publishing', publishingMock)
  pushToSpace.__Rewire__('assets', assetsMock)
  pushToSpace.__Rewire__('space', spaceMock)
}

function teardown () {
  pushToSpace.__ResetDependency__('creation')
  pushToSpace.__ResetDependency__('publishing')
  pushToSpace.__ResetDependency__('assets')
  pushToSpace.__ResetDependency__('space')
}
test('Push content to destination space', (t) => {
  setup()
  pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0
  })
    .run({ data: {} })
    .then(() => {
      t.equals(creationMock.createEntities.callCount, 5, 'create entities')
      t.equals(creationMock.createEntries.callCount, 2, 'create entries')
      t.equals(publishingMock.publishEntities.callCount, 3, 'publish entities')
      t.equals(assetsMock.processAssets.callCount, 1, 'process assets')
      teardown()
      t.end()
    })
})

test('Push only content types and locales to destination space', (t) => {
  setup()
  pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0,
    contentModelOnly: true
  })
    .run({ data: {} })
    .then(() => {
      t.equals(creationMock.createEntities.callCount, 2, 'create entities')
      t.equals(creationMock.createEntries.callCount, 0, 'create entries')
      t.equals(publishingMock.publishEntities.callCount, 1, 'publish entities')
      t.equals(assetsMock.processAssets.callCount, 0, 'process assets')
      teardown()
      t.end()
    })
})

test('Push only content types', (t) => {
  setup()
  pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0,
    contentModelOnly: true,
    skipLocales: true
  })
    .run({ data: {} })
    .then(() => {
      t.equals(creationMock.createEntities.callCount, 1, 'create entities')
      t.equals(creationMock.createEntries.callCount, 0, 'create entries')
      t.equals(publishingMock.publishEntities.callCount, 1, 'publish entities')
      t.equals(assetsMock.processAssets.callCount, 0, 'process assets')
      teardown()
      t.end()
    })
})

test('Push only entries and assets to destination space', (t) => {
  setup()
  pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0,
    skipContentModel: true
  })
    .run({ data: {} })
    .then(() => {
      t.equals(creationMock.createEntities.callCount, 3, 'create entities')
      t.equals(creationMock.createEntries.callCount, 2, 'create entries')
      t.equals(publishingMock.publishEntities.callCount, 2, 'publish entities')
      t.equals(assetsMock.processAssets.callCount, 1, 'process assets')
      teardown()
      t.end()
    })
})

test('Push only entries and assets to destination space and skip publishing', (t) => {
  setup()
  pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0,
    skipContentModel: true,
    skipContentPublishing: true
  })
    .run({ data: {} })
    .then(() => {
      t.equals(creationMock.createEntities.callCount, 3, 'create entities')
      t.equals(creationMock.createEntries.callCount, 2, 'create entries')
      t.equals(publishingMock.publishEntities.callCount, 0, 'publish entities')
      t.equals(assetsMock.processAssets.callCount, 1, 'process assets')
      teardown()
      t.end()
    })
})
