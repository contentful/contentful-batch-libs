import { v4 as uuidv4 } from 'uuid'

/**
 * Adds a sequence header to a header object
 * @param {object} headers
 */
export default function addSequenceHeader (headers) {
  if (typeof headers !== 'object') throw new Error('addSequence function expects an object as input')

  return {
    ...headers,
    // Unique sequence header
    'CF-Sequence': uuidv4()
  }
}
