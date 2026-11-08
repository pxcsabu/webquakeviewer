function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true';
}

export const appConfig = Object.freeze({
  /**
   * Sample data is never a fallback for missing observations. It must be
   * explicitly enabled for a demonstration, in development or production.
   */
  enableSampleData: parseBoolean(
    import.meta.env.VITE_ENABLE_SAMPLE_DATA,
    false,
  ),
  appVersion: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
});
