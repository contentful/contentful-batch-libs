import {each} from 'lodash/collection'

import pushToSpace from '../../lib/push/push-to-space'

import creation from '../../lib/push/creation'
import publishing from '../../lib/push/publishing'
import assets from '../../lib/push/assets'

jest.mock('../../lib/push/creation', () => ({
  createEntities: jest.fn((context) => {
    // Actually return one content type to get editor interfaces imported
    if (context.type === 'ContentType') {
      return Promise.resolve([
        {
          sys: {
            id: 'someId',
            type: 'ContentType',
            publishedVersion: 1
          }
        }
      ])
    }
    return Promise.resolve([])
  }),
  createEntries: jest.fn(() => Promise.resolve([]))
}))
jest.mock('../../lib/push/publishing', () => ({
  publishEntities: jest.fn((entitiesToPublish) => {
    // Actually return one content type to get editor interfaces imported
    if (entitiesToPublish[0] && entitiesToPublish[0].sys.type === 'ContentType') {
      return Promise.resolve([{
        sys: {
          id: 'someId',
          type: 'ContentType'
        }
      }])
    }
    return Promise.resolve([])
  }),
  archiveEntities: jest.fn(() => Promise.resolve([])),
  unpublishEntities: jest.fn(() => Promise.resolve())
}))
jest.mock('../../lib/push/assets', () => ({
  processAssets: jest.fn(() => Promise.resolve([]))
}))

const sourceResponse = {
  locales: [],
  contentTypes: [
    {
      original: {
        sys: {
          id: 'someId',
          type: 'ContentType',
          publishedVersion: 1
        }
      }
    }
  ],
  assets: [],
  editorInterfaces: [
    {
      sys: {
        type: 'EditorInterface',
        contentType: {
          sys: {
            id: 'someId'
          }
        }
      }
    }
  ],
  entries: []
}

const destinationResponse = {}

const editorInterfaceUpdateMock = jest.fn()

const clientMock = {
  getSpace: jest.fn(() => Promise.resolve({
    getEditorInterfaceForContentType: () => {
      return Promise.resolve({
        sys: {
          type: 'EditorInterface',
          contentType: {
            sys: {
              id: 'someId'
            }
          }
        },
        update: editorInterfaceUpdateMock
      })
    }
  }))
}

afterEach(() => {
  each(creation, (fn) => fn.mockClear())
  each(publishing, (fn) => fn.mockClear())
  each(assets, (fn) => fn.mockClear())
  editorInterfaceUpdateMock.mockClear()
})

test('Push content to destination space', () => {
  return pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0
  })
    .run({ data: {} })
    .then(() => {
      expect(creation.createEntities.mock.calls).toHaveLength(4)
      expect(creation.createEntries.mock.calls).toHaveLength(1)
      expect(publishing.publishEntities.mock.calls).toHaveLength(3)
      expect(publishing.archiveEntities.mock.calls).toHaveLength(2)
      expect(editorInterfaceUpdateMock.mock.calls).toHaveLength(1)
      expect(assets.processAssets.mock.calls).toHaveLength(1)
    })
})

test('Push only content types and locales to destination space', () => {
  return pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0,
    contentModelOnly: true
  })
    .run({ data: {} })
    .then(() => {
      expect(creation.createEntities.mock.calls).toHaveLength(2)
      expect(creation.createEntries.mock.calls).toHaveLength(0)
      expect(publishing.publishEntities.mock.calls).toHaveLength(1)
      expect(editorInterfaceUpdateMock.mock.calls).toHaveLength(1)
      expect(assets.processAssets.mock.calls).toHaveLength(0)
    })
})

test('Push only content types', () => {
  return pushToSpace({
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
      expect(creation.createEntities.mock.calls).toHaveLength(1)
      expect(creation.createEntries.mock.calls).toHaveLength(0)
      expect(publishing.publishEntities.mock.calls).toHaveLength(1)
      expect(editorInterfaceUpdateMock.mock.calls).toHaveLength(1)
      expect(assets.processAssets.mock.calls).toHaveLength(0)
    })
})

test('Push only entries and assets to destination space', () => {
  return pushToSpace({
    sourceContent: sourceResponse,
    destinationContent: destinationResponse,
    managementClient: clientMock,
    spaceId: 'spaceid',
    prePublishDelay: 0,
    skipContentModel: true
  })
    .run({ data: {} })
    .then(() => {
      expect(creation.createEntities.mock.calls).toHaveLength(2)
      expect(creation.createEntries.mock.calls).toHaveLength(1)
      expect(publishing.publishEntities.mock.calls).toHaveLength(2)
      expect(assets.processAssets.mock.calls).toHaveLength(1)
      expect(editorInterfaceUpdateMock.mock.calls).toHaveLength(0)
    })
})

test('Push only entries and assets to destination space and skip publishing', () => {
  return pushToSpace({
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
      expect(creation.createEntities.mock.calls).toHaveLength(2)
      expect(creation.createEntries.mock.calls).toHaveLength(1)
      expect(publishing.publishEntities.mock.calls).toHaveLength(0)
      expect(assets.processAssets.mock.calls).toHaveLength(1)
      expect(editorInterfaceUpdateMock.mock.calls).toHaveLength(0)
    })
})
