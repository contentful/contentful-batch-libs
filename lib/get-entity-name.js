export function getEntityName(entity) {
  const name = entity?.name;
  if (name) {
    return attachId(name, entity);
  }

  const titleField = entity?.fields?.title;
  if (titleField) {
    const locales = Object.keys(titleField);
    return attachId(titleField[locales[0]], entity);
  }

  const nameField = entity?.fields?.name;
  if (nameField) {
    const locales = Object.keys(nameField);
    return attachId(nameField[locales[0]], entity);
  }

  const id = entity?.sys?.id;
  if (id) {
    return id;
  }

  return 'unknown';
}

function attachId(val, entity) {
  const id = entity?.sys?.id;
  if (id) {
    return `${val} (${id})`;
  }
  return val;
}
