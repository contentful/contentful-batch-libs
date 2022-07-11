import type { EntityMetaSysProps } from 'contentful-management';
import { getEntityName } from '../lib';

function buildEntityMetaSysMock(id: string): EntityMetaSysProps {
  return { id } as unknown as EntityMetaSysProps;
}

test('get name by name property', () => {
  const name = getEntityName({ name: 'entityName' });
  expect(name).toBe('entityName');
});

test('get name by field called title', () => {
  const name = getEntityName({
    fields: {
      title: {
        'en-US': 'entityName'
      }
    }
  });
  expect(name).toBe('entityName');
});

test('get name by field called name', () => {
  const name = getEntityName({
    fields: {
      name: {
        'en-US': 'entityName'
      }
    }
  });
  expect(name).toBe('entityName');
});

test('get name by name property and attaches id', () => {
  const name = getEntityName({
    sys: buildEntityMetaSysMock('entityId'),
    name: 'entityName'
  });
  expect(name).toBe('entityName (entityId)');
});

test('get name by field called title and attaches id', () => {
  const name = getEntityName({
    sys: buildEntityMetaSysMock('entityId'),
    fields: {
      title: {
        'en-US': 'entityName'
      }
    }
  });
  expect(name).toBe('entityName (entityId)');
});

test('get name by field called name and attaches id', () => {
  const name = getEntityName({
    sys: buildEntityMetaSysMock('entityId'),
    fields: {
      name: {
        'en-US': 'entityName'
      }
    }
  });
  expect(name).toBe('entityName (entityId)');
});

test('fall back to id when no name is found', () => {
  const name = getEntityName({ sys: buildEntityMetaSysMock('entityId') });
  expect(name).toBe('entityId');
});

test('returns unknown when not even an ID is present', () => {
  const name = getEntityName({});
  expect(name).toBe('unknown');
});
