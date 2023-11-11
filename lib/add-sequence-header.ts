import { v4 as uuidv4 } from 'uuid';

/**
 * Adds a sequence header to a header object
 */
export function addSequenceHeader(headers: Record<string, unknown>) {
  if (typeof headers !== 'object') {
    throw new Error('addSequence function expects an object as input');
  }

  return {
    ...headers,
    // Unique sequence header
    'CF-Sequence': uuidv4(),
  };
}
