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
      wrapSpace: jest.fn(),
      wrapSpaceCollection: jest.fn()
    },
    contentType: {
      wrapContentType: jest.fn(),
      wrapContentTypeCollection: jest.fn()
    },
    entry: {
      wrapEntry: jest.fn(),
      wrapEntryCollection: jest.fn()
    },
    asset: {
      wrapAsset: jest.fn(),
      wrapAssetCollection: jest.fn()
    },
    locale: {
      wrapLocale: jest.fn(),
      wrapLocaleCollection: jest.fn()
    },
    webhook: {
      wrapWebhook: jest.fn(),
      wrapWebhookCollection: jest.fn()
    },
    spaceMembership: {
      wrapSpaceMembership: jest.fn(),
      wrapSpaceMembershipCollection: jest.fn()
    },
    role: {
      wrapRole: jest.fn(),
      wrapRoleCollection: jest.fn()
    },
    apiKey: {
      wrapApiKey: jest.fn(),
      wrapApiKeyCollection: jest.fn()
    },
    editorInterface: {
      wrapEditorInterface: jest.fn()
    },
    upload: {
      wrapUpload: jest.fn()
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
