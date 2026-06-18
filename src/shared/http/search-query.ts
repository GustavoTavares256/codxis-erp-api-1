const SEARCH_KEYS = ['search', 'q', 'busca', 'term', 'query', 'name']

function normalizeSearchValue(value: unknown) {
  const rawValue = Array.isArray(value) ? value[0] : value

  if (rawValue === null || rawValue === undefined) {
    return undefined
  }

  const search = String(rawValue).trim()

  return search || undefined
}

export function getSearchFromQuery(query: unknown) {
  if (!query || typeof query !== 'object') {
    return undefined
  }

  const queryRecord = query as Record<string, unknown>

  for (const key of SEARCH_KEYS) {
    const search = normalizeSearchValue(queryRecord[key])

    if (search) {
      return search
    }
  }

  return undefined
}
