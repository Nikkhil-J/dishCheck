import { Client } from 'typesense'

let adminClient: Client | null = null
let searchClient: Client | null = null

export function isTypesenseConfigured(): boolean {
  return !!(
    process.env.TYPESENSE_HOST &&
    process.env.TYPESENSE_API_KEY
  )
}

const baseNodes = () => [
  {
    host: process.env.TYPESENSE_HOST!,
    port: Number(process.env.TYPESENSE_PORT ?? '443'),
    protocol: process.env.TYPESENSE_PROTOCOL ?? 'https',
  },
]

/** Admin client — used for indexing, upserts, and collection management. */
export function getTypesenseClient(): Client {
  if (adminClient) return adminClient

  adminClient = new Client({
    nodes: baseNodes(),
    apiKey: process.env.TYPESENSE_API_KEY!,
    connectionTimeoutSeconds: 5,
  })

  return adminClient
}

/**
 * Search client — uses TYPESENSE_SEARCH_API_KEY when available for
 * least-privilege access. Falls back to the admin key if absent.
 */
export function getTypesenseSearchClient(): Client {
  if (searchClient) return searchClient

  const apiKey =
    process.env.TYPESENSE_SEARCH_API_KEY ??
    process.env.TYPESENSE_API_KEY!

  searchClient = new Client({
    nodes: baseNodes(),
    apiKey,
    connectionTimeoutSeconds: 5,
  })

  return searchClient
}
