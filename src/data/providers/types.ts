/**
 * Verification status for an external data source.
 * READY means browser access and usage conditions have actually been verified.
 */
export type SourceStatus =
  | 'READY'
  | 'CONDITIONAL'
  | 'RESTRICTED'
  | 'UNVERIFIED'
  | 'UNAVAILABLE';

export interface SourceRegistryEntry {
  id: string;
  name: string;
  provider: string;
  status: SourceStatus;
  homepage: string;
  documentationUrl: string | null;
  dataLicense: string | null;
  attribution: string | null;
  accessMethod: string;
  requiresAuthentication: boolean;
  corsVerified: boolean;
  redistributionAllowed: boolean | null;
  lastVerifiedAt: string | null;
  notes: string;
}

export interface ProviderCacheState {
  etag: string | null;
  lastModified: string | null;
}

export interface ProviderRequestContext {
  signal: AbortSignal;
  /** Injectable clock for deterministic tests. */
  now: Date;
  /** Conditional request state supplied by the application cache. */
  cache?: ProviderCacheState | null;
}

export interface ProviderResult<TRecord> {
  records: TRecord[];
  /** Retrieval time of this response, in UTC ISO 8601. */
  retrievedAt: string;
  /** Provider-supplied update time, when available. */
  sourceUpdatedAt?: string;
  warnings: string[];
  /** True when the provider returned 304 and cached records remain valid. */
  notModified?: boolean;
  /** Cache validators returned by the provider response. */
  cache?: ProviderCacheState | null;
}

export interface DataProvider<TQuery, TRecord> {
  readonly id: string;
  readonly name: string;
  fetch(
    query: TQuery,
    context: ProviderRequestContext,
  ): Promise<ProviderResult<TRecord>>;
}
