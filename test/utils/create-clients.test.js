import createClients from '../../lib/utils/create-clients'

import contentful from 'contentful'
import contentfulManagement from 'contentful-management'
import { logEmitter } from '../../lib/utils/logging'

jest.mock('contentful', () => {
  return {
    createClient: jest.fn(() => 'cdaClient')
  }
})

jest.mock('contentful-management', () => {
  return {
    createClient: jest.fn(() => 'cmaClient')
  }
})

jest.mock('../../lib/utils/logging', () => {
  return {
    logEmitter: {
      emit: jest.fn()
    }
  }
})

test('does create clients and passes custom logHandler', () => {
  const opts = {
    deliveryApplication: 'deliveryApplication',
    deliveryHeaders: 'deliveryHeaders',
    deliveryHost: 'deliveryHost',
    deliveryInsecure: 'deliveryInsecure',
    deliveryIntegration: 'deliveryIntegration',
    deliveryPort: 'deliveryPort',
    destinationManagementToken: 'destinationManagementToken',
    httpAgent: 'httpAgent',
    httpsAgent: 'httpsAgent',
    managementApplication: 'managementApplication',
    managementHeaders: 'managementHeaders',
    managementHost: 'managementHost',
    managementInsecure: 'managementInsecure',
    managementIntegration: 'managementIntegration',
    managementPort: 'managementPort',
    proxy: 'proxy',
    sourceDeliveryToken: 'sourceDeliveryToken',
    sourceManagementToken: 'sourceManagementToken',
    sourceSpace: 'sourceSpace',
    destinationSpace: 'destinationSpace'
  }

  const clients = createClients(opts)

  expect(contentful.createClient.mock.calls[0][0]).toMatchObject({
    space: opts.sourceSpace,
    accessToken: opts.sourceDeliveryToken,
    host: opts.deliveryHost,
    port: opts.deliveryPort,
    headers: opts.deliveryHeaders,
    insecure: opts.deliveryInsecure,
    proxy: opts.proxy,
    httpAgent: opts.httpAgent,
    httpsAgent: opts.httpsAgent,
    application: opts.deliveryApplication,
    integration: opts.deliveryIntegration
  })
  expect(contentful.createClient.mock.calls[0][0]).toHaveProperty('logHandler')

  expect(contentfulManagement.createClient.mock.calls[0][0]).toMatchObject({
    accessToken: opts.sourceManagementToken,
    host: opts.managementHost,
    port: opts.managementPort,
    headers: opts.managementHeaders,
    insecure: opts.managementInsecure,
    proxy: opts.proxy,
    httpAgent: opts.httpAgent,
    httpsAgent: opts.httpsAgent,
    timeout: 10000,
    application: opts.managementApplication,
    integration: opts.managementIntegration
  })
  expect(contentfulManagement.createClient.mock.calls[0][0]).toHaveProperty('logHandler')

  expect(contentfulManagement.createClient.mock.calls[1][0]).toMatchObject({
    accessToken: opts.destinationManagementToken,
    host: opts.managementHost,
    port: opts.managementPort,
    headers: opts.managementHeaders,
    insecure: opts.managementInsecure,
    proxy: opts.proxy,
    httpAgent: opts.httpAgent,
    httpsAgent: opts.httpsAgent,
    timeout: 10000,
    application: opts.managementApplication,
    integration: opts.managementIntegration
  })
  expect(contentfulManagement.createClient.mock.calls[1][0]).toHaveProperty('logHandler')

  expect(clients).toHaveProperty('source')
  expect(clients.source.spaceId).toBe(opts.sourceSpace)
  expect(clients.source).toHaveProperty('delivery')
  expect(clients.source.delivery).toBe('cdaClient')
  expect(clients.source).toHaveProperty('management')
  expect(clients.source.management).toBe('cmaClient')
  expect(clients).toHaveProperty('destination')
  expect(clients.destination.spaceId).toBe(opts.destinationSpace)
  expect(clients.destination).toHaveProperty('management')
  expect(clients.destination.management).toBe('cmaClient')

  // Call passed log handler
  contentfulManagement.createClient.mock.calls[1][0].logHandler('level', 'logMessage')

  expect(logEmitter.emit.mock.calls[0][0]).toBe('level')
  expect(logEmitter.emit.mock.calls[0][1]).toBe('logMessage')
})
