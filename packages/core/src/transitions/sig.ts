/**
 * Stable string signature for an arbitrary value — used as a dep-array
 * member so a fresh object literal each render doesn't re-fire an effect
 * unless something structurally changed. Functions serialize as `null`
 * (their identity isn't useful in a sig); `undefined` collapses to an empty
 * string so omitted props compare equal across renders.
 */
export function stableSig(value: unknown): string {
  if (value === undefined) return ''
  try {
    return stableStringify(value)
  } catch {
    return String(value)
  }
}

/**
 * JSON.stringify with keys sorted at every level so a sig is invariant under
 * property-declaration order. Functions and `undefined` both serialize as
 * `null` — we accept the latter's information loss (rare in practice) in
 * exchange for not crashing on circular function-bearing graphs.
 */
function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') {
    if (typeof v === 'function' || v === undefined) return 'null'
    return JSON.stringify(v)
  }
  if (Array.isArray(v)) {
    return '[' + v.map(stableStringify).join(',') + ']'
  }
  const obj = v as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k]))
      .join(',') +
    '}'
  )
}
