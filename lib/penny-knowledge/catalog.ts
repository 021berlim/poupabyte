import { PENNY_KNOWLEDGE_SOURCES } from "./registry"
import type { PennyKnowledgeSourceMetadata } from "./types"

export const PENNY_KNOWLEDGE_CATALOG: readonly PennyKnowledgeSourceMetadata[] = PENNY_KNOWLEDGE_SOURCES.map(
  ({ shouldQuery: _shouldQuery, query: _query, ...metadata }) => metadata,
)
