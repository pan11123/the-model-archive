export function modelSlug(model: string): string {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function releaseAnchor(vendor: string, model: string, date: string): string {
  return `${vendor}-${modelSlug(model)}-${date}`;
}
