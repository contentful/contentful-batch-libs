import * as contentful from 'contentful'
import * as contentfulManagement from 'contentful-management'

/**
 * Generates object with delivery and management clients for both
 * source and destination spaces, as well as the space ids being used
 *
 * opts:
 * - sourceSpace
 * - sourceDeliveryToken
 * - sourceManagementToken
 * - destinationSpace
 * - destinationDeliveryToken
 * - destinationManagementToken
 */
export default function createClients (opts) {
  const clients = {}

  clients.source = {
    spaceId: opts.sourceSpace
  }
  if (opts.sourceDeliveryToken) {
    clients.source.delivery = contentful.createClient({
      space: opts.sourceSpace,
      accessToken: opts.sourceDeliveryToken,
      host: opts.deliveryHost,
      port: opts.deliveryPort,
      headers: opts.deliveryHeaders,
      insecure: opts.deliveryInsecure,
      proxy: opts.proxy
    })
  }

  if (opts.sourceManagementToken) {
    clients.source.management = contentfulManagement.createClient({
      accessToken: opts.sourceManagementToken,
      host: opts.managementHost,
      port: opts.managementPort,
      headers: opts.managementHeaders,
      insecure: opts.managementInsecure,
      proxy: opts.proxy
    })
  }

  if (opts.destinationSpace) {
    clients.destination = {
      spaceId: opts.destinationSpace,
      management: contentfulManagement.createClient({
        accessToken: opts.destinationManagementToken,
        host: opts.managementHost,
        port: opts.managementPort,
        headers: opts.managementHeaders,
        insecure: opts.managementInsecure,
        proxy: opts.proxy
      })
    }
  }

  return clients
}
