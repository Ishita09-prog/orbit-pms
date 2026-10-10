/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
export const escapeLike = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Tiny parameter collector: `add(value)` returns the next `$n` placeholder, so callers can build
 * dynamic WHERE clauses while every value still travels as a bound parameter (no SQL injection).
 */
export function createParams(initial = []) {
  const values = [...initial];
  return {
    values,
    add(value) {
      values.push(value);
      return `$${values.length}`;
    },
  };
}
