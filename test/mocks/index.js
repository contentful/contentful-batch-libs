import { vi } from 'vitest'
const linkMock = {
  id: 'linkid',
  type: 'Link',
  linkType: 'linkType'
}

const sysMock = {
  type: 'Type',
  id: 'id',
  space: structuredClone(linkMock),
  createdAt: 'createdatdate',
  updatedAt: 'updatedatdate'
}

const spaceMock = {
  sys: Object.assign(structuredClone(sysMock), { type: 'Space' }),
  name: 'name',
  locales: ['en-US']
}

const contentTypeMock = {
  sys: Object.assign(structuredClone(sysMock), { type: 'ContentType' }),
  name: 'name',
  description: 'desc',
  displayField: 'displayfield',
  fields: [
    {
      id: 'fieldid',
      name: 'fieldname',
      type: 'Text',
      localized: true,
      required: false
    }
  ]
}

const entryMock = {
  sys: Object.assign(structuredClone(sysMock), {
    type: 'Entry',
    contentType: Object.assign(structuredClone(linkMock), {
      linkType: 'ContentType'
    }),
    locale: 'locale'
  }),
  fields: {
    field1: 'str'
  }
}
const editorInterfaceMock = {
  sys: Object.assign(structuredClone(sysMock), {
    type: 'EditorInterface',
    contentType: {
      sys: Object.assign(structuredClone(linkMock), { linkType: 'ContentType' })
    },
    space: Object.assign(structuredClone(linkMock), { linkType: 'Space' })
  }),
  controls: [
    {
      fieldId: 'fieldId',
      widgetId: 'singleLine'
    }
  ]
}
const assetMock = {
  sys: Object.assign(structuredClone(sysMock), {
    type: 'Asset',
    locale: 'locale'
  }),
  fields: {
    field1: 'str'
  }
}

const assetWithFilesMock = {
  sys: Object.assign(structuredClone(sysMock), {
    type: 'Asset',
    locale: 'locale'
  }),
  fields: {
    files: {
      locale: {
        contentType: 'image/svg',
        fileName: 'filename.svg',
        uploadFrom: {
          sys: {
            type: 'Link',
            linkType: 'Upload',
            id: 'some_random_id'
          }
        }
      },
      locale2: {
        contentType: 'image/svg',
        fileName: 'filename.svg',
        uploadFrom: {
          sys: {
            type: 'Link',
            linkType: 'Upload',
            id: 'some_random_id'
          }
        }
      }
    }
  }
}

const uploadMock = {
  sys: Object.assign(structuredClone(sysMock), {
    type: 'Upload',
    id: 'some_random_id'
  })
}

const localeMock = {
  sys: Object.assign(structuredClone(sysMock), {
    type: 'Locale'
  }),
  name: 'English',
  code: 'en',
  contentDeliveryApi: true,
  contentManagementApi: true,
  default: true
}

const webhookMock = {
  sys: Object.assign(structuredClone(sysMock), { type: 'WebhookDefinition' })
}

const spaceMembershipMock = {
  sys: Object.assign(structuredClone(sysMock), { type: 'SpaceMembership' })
}

const roleMock = {
  sys: Object.assign(structuredClone(sysMock), { type: 'Role' })
}

const apiKeyMock = {
  sys: Object.assign(structuredClone(sysMock), { type: 'ApiKey' })
}

const errorMock = {
  config: {
    url: 'requesturl',
    headers: {}
  },
  data: {},
  response: {
    status: 404,
    statusText: 'Not Found'
  }
}

const mocks = {
  link: linkMock,
  sys: sysMock,
  contentType: contentTypeMock,
  editorInterface: editorInterfaceMock,
  entry: entryMock,
  asset: assetMock,
  locale: localeMock,
  webhook: webhookMock,
  spaceMembership: spaceMembershipMock,
  role: roleMock,
  apiKey: apiKeyMock,
  error: errorMock,
  upload: uploadMock
}

function cloneMock (name) {
  return structuredClone(mocks[name])
}

function mockCollection (entityMock) {
  return {
    total: 1,
    skip: 0,
    limit: 100,
    items: [entityMock]
  }
}

function setupEntitiesMock (rewiredModuleApi) {
  const entitiesMock = {
    space: {
      wrapSpace: vi.fn(),
      wrapSpaceCollection: vi.fn()
    },
    contentType: {
      wrapContentType: vi.fn(),
      wrapContentTypeCollection: vi.fn()
    },
    entry: {
      wrapEntry: vi.fn(),
      wrapEntryCollection: vi.fn()
    },
    asset: {
      wrapAsset: vi.fn(),
      wrapAssetCollection: vi.fn()
    },
    locale: {
      wrapLocale: vi.fn(),
      wrapLocaleCollection: vi.fn()
    },
    webhook: {
      wrapWebhook: vi.fn(),
      wrapWebhookCollection: vi.fn()
    },
    spaceMembership: {
      wrapSpaceMembership: vi.fn(),
      wrapSpaceMembershipCollection: vi.fn()
    },
    role: {
      wrapRole: vi.fn(),
      wrapRoleCollection: vi.fn()
    },
    apiKey: {
      wrapApiKey: vi.fn(),
      wrapApiKeyCollection: vi.fn()
    },
    editorInterface: {
      wrapEditorInterface: vi.fn()
    },
    upload: {
      wrapUpload: vi.fn()
    }
  }
  rewiredModuleApi.__Rewire__('entities', entitiesMock)

  return entitiesMock
}

export {
  linkMock,
  sysMock,
  spaceMock,
  contentTypeMock,
  editorInterfaceMock,
  entryMock,
  assetMock,
  assetWithFilesMock,
  localeMock,
  webhookMock,
  spaceMembershipMock,
  roleMock,
  apiKeyMock,
  errorMock,
  cloneMock,
  mockCollection,
  setupEntitiesMock,
  uploadMock
}
