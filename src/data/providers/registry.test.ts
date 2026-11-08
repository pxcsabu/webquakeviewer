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

  it('marks USGS READY with verified CORS and public-domain provenance', () => {
    const usgs = getSourceRegistryEntry('usgs-earthquake-feed');
    expect(usgs).toBeDefined();
    expect(usgs?.status).toBe('READY');
    expect(usgs?.corsVerified).toBe(true);
    expect(usgs?.lastVerifiedAt).not.toBeNull();
    expect(usgs?.dataLicense).toBe('Public Domain (U.S. Government Work)');
    expect(usgs?.redistributionAllowed).toBe(true);
    expect(usgs?.attribution).toBe('U.S. Geological Survey');
  });

  it('marks GSI tiles READY with attribution and verified CORS', () => {
    const gsi = getSourceRegistryEntry('gsi-tiles');
    expect(gsi).toBeDefined();
    expect(gsi?.status).toBe('READY');
    expect(gsi?.corsVerified).toBe(true);
    expect(gsi?.lastVerifiedAt).not.toBeNull();
    expect(gsi?.dataLicense).toContain('PDL1.0');
    expect(gsi?.attribution).toBe('国土地理院');
  });

  it('marks the JMA earthquake list READY with CORS and attribution', () => {
    const jma = getSourceRegistryEntry('jma-earthquake-list-json');
    expect(jma).toBeDefined();
    expect(jma?.status).toBe('READY');
    expect(jma?.corsVerified).toBe(true);
    expect(jma?.lastVerifiedAt).not.toBeNull();
    expect(jma?.dataLicense).toContain('PDL1.0');
    expect(jma?.attribution).toBe('気象庁');
  });

  it('registers Slab2 as a READY model-derived source', () => {
    const slab = getSourceRegistryEntry('usgs-slab2');
    expect(slab).toBeDefined();
    expect(slab?.status).toBe('READY');
    expect(slab?.dataLicense).toContain('Public Domain');
    expect(slab?.attribution).toContain('Slab2');
  });

  it('keeps the NIED kmoni strong-motion source restricted', () => {
    const kmoni = getSourceRegistryEntry('nied-kmoni');
    expect(kmoni).toBeDefined();
    expect(kmoni?.status).toBe('RESTRICTED');
    expect(kmoni?.corsVerified).toBe(false);
    expect(kmoni?.redistributionAllowed).toBe(false);
    expect(kmoni?.dataLicense).toContain('転載');
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
