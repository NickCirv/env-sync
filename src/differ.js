/**
 * Side-by-side diff of two env file Maps.
 * Values are masked: show first 3 chars + *** (or *** if shorter than 4 chars).
 */

/**
 * @param {Map} mapA
 * @param {Map} mapB
 * @param {string} labelA
 * @param {string} labelB
 * @returns {{ added: Array, removed: Array, changed: Array, unchanged: Array }}
 */
export function diffEnvFiles(mapA, mapB, labelA, labelB) {
  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const key of [...allKeys].sort()) {
    const inA = mapA.has(key);
    const inB = mapB.has(key);

    if (inA && !inB) {
      removed.push({
        key,
        valueA: maskValue(mapA.get(key).value),
        valueB: null,
        lineA: mapA.get(key).line,
        lineB: null,
      });
    } else if (!inA && inB) {
      added.push({
        key,
        valueA: null,
        valueB: maskValue(mapB.get(key).value),
        lineA: null,
        lineB: mapB.get(key).line,
      });
    } else {
      const entA = mapA.get(key);
      const entB = mapB.get(key);
      if (entA.value !== entB.value) {
        changed.push({
          key,
          valueA: maskValue(entA.value),
          valueB: maskValue(entB.value),
          lineA: entA.line,
          lineB: entB.line,
        });
      } else {
        unchanged.push({
          key,
          valueA: maskValue(entA.value),
          valueB: maskValue(entB.value),
          lineA: entA.line,
          lineB: entB.line,
        });
      }
    }
  }

  return { added, removed, changed, unchanged };
}

/**
 * Mask a value for display: show first 3 chars + *** if long enough, else ***.
 * Empty strings stay as (empty).
 *
 * @param {string} value
 * @returns {string}
 */
export function maskValue(value) {
  if (value === null || value === undefined) return '';
  if (value === '') return '(empty)';
  if (value.length <= 3) return '***';
  return value.slice(0, 3) + '***';
}
