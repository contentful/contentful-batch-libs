import test from 'tape'

import sortEntries from '../../lib/utils/sort-entries'

const entries = [
  {
    sys: {id: 'abc'},
    fields: {}
  },
  {
    sys: {id: '123'},
    fields: {
      links: [
        {
          sys: {
            type: 'Link',
            linkType: 'Entry',
            id: '456'
          }
        }
      ]
    }
  },
  {
    sys: {id: '456'},
    fields: {}
  },
  {
    sys: {id: '789'},
    fields: {}
  }
]

test('Sorts entries by link order', (t) => {
  const sortedEntries = sortEntries(entries)
  t.equals(sortedEntries[0].sys.id, 'abc')
  t.equals(sortedEntries[1].sys.id, '456')
  t.equals(sortedEntries[2].sys.id, '789')
  t.equals(sortedEntries[3].sys.id, '123')
  t.equals(sortedEntries.length, 4)
  t.end()
})
