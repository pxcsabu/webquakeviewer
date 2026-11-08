import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { sampleEarthquakes } from '../../data/providers/sample/fixtures';
import { EarthquakeDetail } from './EarthquakeDetail';
import { EarthquakeList } from './EarthquakeList';

describe('earthquake views', () => {
  it('renders illustrative list entries with classification and provenance', () => {
    const html = renderToStaticMarkup(
      <EarthquakeList
        events={[...sampleEarthquakes]}
        status="success"
        selectedId={null}
        onSelect={() => undefined}
      />,
    );

    expect(html).toContain('3 件');
    expect(html).toContain('M4.8 (SAMPLE)');
    expect(html).toContain('35.600°N, 139.700°E');
    expect(html).toContain('深さ 42.5 km');
    expect(html).toContain('説明用');
  });

  it('renders the illustrative warning and missing retrieval time', () => {
    const event = sampleEarthquakes[0];
    if (event === undefined) {
      throw new Error('サンプルフィクスチャが空です。');
    }

    const html = renderToStaticMarkup(<EarthquakeDetail event={event} />);
    expect(html).toContain('開発用サンプルです');
    expect(html).toContain('なし（ILLUSTRATIVE）');
    expect(html).toContain('UNKNOWN');
    expect(html).toContain('未取得');
  });
});
