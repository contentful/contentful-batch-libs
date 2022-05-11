import { addSequenceHeader } from '../lib'

test('adds sequence header to empty object', () => {
  const headers = addSequenceHeader({})
  expect(headers).toEqual({ 'CF-Sequence': expect.any(String) })
})

test('adds sequence header to headers object', () => {
  const predefinedHeaders = {
    Accept: 'Any',
    'X-Version': '1'
  }

  const headers = addSequenceHeader(predefinedHeaders)
  expect(headers).toEqual({
    Accept: 'Any',
    'X-Version': '1',
    'CF-Sequence': expect.any(String)
  })
})

test('throws error when input is not an object', () => {
  const predefinedHeaders = 'Accept: Any'

  expect(() => addSequenceHeader(predefinedHeaders)).toThrow()
})
