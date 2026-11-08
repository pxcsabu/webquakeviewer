/**
 * Test-only USGS GeoJSON fixture.
 *
 * The shape follows the official USGS GeoJSON feed, but the events are not
 * claims about real earthquakes. They exist only to exercise the parser.
 */
export const usgsFixture = {
  type: 'FeatureCollection',
  metadata: {
    generated: 1767226000000,
    url: 'https://example.test/feed',
    title: 'USGS Test Feed',
    status: 200,
    api: '1.0.0',
    count: 2,
  },
  features: [
    {
      type: 'Feature',
      id: 'us-test-1',
      properties: {
        mag: 4.8,
        place: 'Test region A',
        time: 1767225600000,
        updated: 1767225900000,
        url: 'https://example.test/event/us-test-1',
        magType: 'mww',
        type: 'earthquake',
        title: 'M 4.8 - Test region A',
      },
      geometry: {
        type: 'Point',
        coordinates: [139.7, 35.6, 42.5],
      },
    },
    {
      type: 'Feature',
      id: 'us-test-2',
      properties: {
        mag: 2.1,
        place: 'Negative depth test',
        time: 1767226500000,
        updated: 1767226500000,
        url: 'https://example.test/event/us-test-2',
        magType: 'ml',
        type: 'quarry blast',
        title: 'M 2.1 - Negative depth test',
      },
      geometry: {
        type: 'Point',
        coordinates: [140.0, 36.0, -1.2],
      },
    },
  ],
};
