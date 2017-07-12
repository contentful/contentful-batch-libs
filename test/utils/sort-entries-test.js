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

const complexEntries = [
  {
    'sys': {
      'id': 'FJlJfypzaewiwyukGi2kI'
    },
    'fields': {}
  },
  {
    'sys': {
      'id': '5JQ715oDQW68k8EiEuKOk8'
    },
    'fields': {
      'createdEntries': {
        'en-US': [
          {
            'sys': {
              'type': 'Link',
              'linkType': 'Entry',
              'id': 'A96usFSlY4G0W4kwAqswk'
            }
          }
        ]
      }
    }
  },
  {
    'sys': {
      'id': '6EczfGnuHCIYGGwEwIqiq2'
    },
    'fields': {
      'profilePhoto': {
        'en-US': {
          'sys': {
            'type': 'Link',
            'linkType': 'Asset',
            'id': '2ReMHJhXoAcy4AyamgsgwQ'
          }
        }
      },
      'createdEntries': {
        'en-US': [
          {
            'sys': {
              'type': 'Link',
              'linkType': 'Entry',
              'id': '1asN98Ph3mUiCYIYiiqwko'
            }
          }
        ]
      }
    }
  },
  {
    'sys': {
      'id': '1asN98Ph3mUiCYIYiiqwko'
    },
    'fields': {
      /*
      Circular dependencies are not supported yet.
       'author': {
        'en-US': [
          {
            'sys': {
              'type': 'Link',
              'linkType': 'Entry',
              'id': '6EczfGnuHCIYGGwEwIqiq2'
            }
          }
        ]
      },
      */
      'category': {
        'en-US': [
          {
            'sys': {
              'type': 'Link',
              'linkType': 'Entry',
              'id': '6XL7nwqRZ6yEw0cUe4y0y6'
            }
          },
          {
            'sys': {
              'type': 'Link',
              'linkType': 'Entry',
              'id': 'FJlJfypzaewiwyukGi2kI'
            }
          }
        ]
      },
      'featuredImage': {
        'en-US': {
          'sys': {
            'type': 'Link',
            'linkType': 'Asset',
            'id': 'bXvdSYHB3Guy2uUmuEco8'
          }
        }
      }
    }
  },
  {
    'sys': {
      'id': '6XL7nwqRZ6yEw0cUe4y0y6'
    },
    'fields': {
      'icon': {
        'en-US': {
          'sys': {
            'type': 'Link',
            'linkType': 'Asset',
            'id': '5Q6yYElPe8w8AEsKeki4M4'
          }
        }
      }
    }
  },
  {
    'sys': {
      'id': 'A96usFSlY4G0W4kwAqswk'
    },
    'fields': {
      /*
      Circular dependencies are not supported yet.
      'author': {
        'en-US': [
          {
            'sys': {
              'type': 'Link',
              'linkType': 'Entry',
              'id': '5JQ715oDQW68k8EiEuKOk8'
            }
          }
        ]
      },
      */
      'category': {
        'en-US': [
          {
            'sys': {
              'type': 'Link',
              'linkType': 'Entry',
              'id': '6XL7nwqRZ6yEw0cUe4y0y6'
            }
          }
        ]
      }
    }
  }
]

test('Sorts complex entries by link order', (t) => {
  const sortedEntries = sortEntries(complexEntries)
  t.ok(findEntityIndex(sortedEntries, '5JQ715oDQW68k8EiEuKOk8') > findEntityIndex(sortedEntries, 'A96usFSlY4G0W4kwAqswk'), '5JQ715oDQW68k8EiEuKOk8 must be after A96usFSlY4G0W4kwAqswk')
  t.ok(findEntityIndex(sortedEntries, '6EczfGnuHCIYGGwEwIqiq2') > findEntityIndex(sortedEntries, '1asN98Ph3mUiCYIYiiqwko'), '6EczfGnuHCIYGGwEwIqiq2 must be after 1asN98Ph3mUiCYIYiiqwko')
  t.ok(findEntityIndex(sortedEntries, '1asN98Ph3mUiCYIYiiqwko') > findEntityIndex(sortedEntries, '6XL7nwqRZ6yEw0cUe4y0y6'), '1asN98Ph3mUiCYIYiiqwko must be after 6XL7nwqRZ6yEw0cUe4y0y6')
  t.ok(findEntityIndex(sortedEntries, '1asN98Ph3mUiCYIYiiqwko') > findEntityIndex(sortedEntries, 'FJlJfypzaewiwyukGi2kI'), '1asN98Ph3mUiCYIYiiqwko must be after FJlJfypzaewiwyukGi2kI')
  t.ok(findEntityIndex(sortedEntries, 'A96usFSlY4G0W4kwAqswk') > findEntityIndex(sortedEntries, '6XL7nwqRZ6yEw0cUe4y0y6'), 'A96usFSlY4G0W4kwAqswk must be after 6XL7nwqRZ6yEw0cUe4y0y6')
  t.end()
})

function findEntityIndex (entities, id) {
  return entities.findIndex((entity) => entity.sys.id === id)
}
