import { describe, expect, it } from 'vitest';
import { validateEarthquake } from '../../../domain/earthquake/validation';
import { sampleProvider } from './sampleProvider';

const context = {
  signal: new AbortController().signal,
  now: new Date('2026-01-01T12:00:00Z'),
};

describe('sampleProvider', () => {
  it('returns only explicitly illustrative records', async () => {
    const result = await sampleProvider.fetch(undefined, context);
    expect(result.records.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('ILLUSTRATIVE');
    for (const event of result.records) {
      expect(event.classification).toBe('ILLUSTRATIVE');
      expect(event.source.retrievedAt).toBeNull();
      expect(event.location.crs).toBe('UNKNOWN');
      const validation = validateEarthquake(event);
      expect(validation.ok).toBe(true);
    }
  });

  it('does not use a real retrieval timestamp for illustrative records', async () => {
    const result = await sampleProvider.fetch(undefined, context);
    expect(result.retrievedAt).toBe('2026-01-01T12:00:00.000Z');
    for (const event of result.records) {
      expect(event.source.retrievedAt).not.toBe(result.retrievedAt);
    }
  });

  it('reports an aborted request as a provider error', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      sampleProvider.fetch(undefined, {
        signal: controller.signal,
        now: context.now,
      }),
    ).rejects.toMatchObject({ code: 'ABORTED' });
  });
});
