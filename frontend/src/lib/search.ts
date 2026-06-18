export function filterByQuery<T>(
  items: T[],
  getSearchText: (item: T) => string,
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => getSearchText(item).toLowerCase().includes(q));
}
