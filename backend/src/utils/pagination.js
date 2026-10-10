export function paginated({ items, total }, { page, limit }) {
  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
