import { describe, expect, it } from 'vitest';
import { getSourceRegistryEntry, SOURCE_REGISTRY } from './registry';

describe('SOURCE_REGISTRY', () => {
  it('has unique ids and required metadata', () => {
    const ids = SOURCE_REGISTRY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of SOURCE_REGISTRY) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.provider.length).toBeGreaterThan(0);
      expect(entry.accessMethod.length).toBeGreaterThan(0);
      expect(entry.notes.length).toBeGreaterThan(0);
    }
  });

  it('marks USGS as conditional after browser verification but before license review', () => {
    const usgs = getSourceRegistryEntry('usgs-earthquake-feed');
    expect(usgs).toBeDefined();
    expect(usgs?.status).toBe('CONDITIONAL');
    expect(usgs?.corsVerified).toBe(true);
    expect(usgs?.lastVerifiedAt).not.toBeNull();
    expect(usgs?.dataLicense).toBeNull();
    expect(usgs?.redistributionAllowed).toBeNull();
  });

  it('does not claim READY without a verification timestamp and CORS check', () => {
    for (const entry of SOURCE_REGISTRY) {
      if (entry.status === 'READY') {
        expect(entry.corsVerified).toBe(true);
        expect(entry.lastVerifiedAt).not.toBeNull();
      }
    }
  });

  it('does not assert redistribution permission without verification', () => {
    for (const entry of SOURCE_REGISTRY) {
      if (entry.redistributionAllowed === true) {
        expect(entry.dataLicense).not.toBeNull();
      }
    }
  });
});
