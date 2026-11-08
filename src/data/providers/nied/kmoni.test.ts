import { describe, expect, it } from 'vitest';
import { buildKmoniImageUrl } from './kmoni';

describe('buildKmoniImageUrl', () => {
  it('builds the JST image path used by KyoshinMonitorLib', () => {
    expect(buildKmoniImageUrl(new Date('2026-11-08T08:53:30Z'))).toBe(
      'http://www.kmoni.bosai.go.jp/data/map_img/RealTimeImg/jma_s/20261108/20261108175330.jma_s.gif',
    );
  });
});
