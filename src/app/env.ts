function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  return value === 'true';
}

export const appConfig = Object.freeze({
  /**
   * Sample data is enabled by default only in Vite development mode.
   * A production build requires an explicit VITE_ENABLE_SAMPLE_DATA=true.
   */
  enableSampleData: parseBoolean(
    import.meta.env.VITE_ENABLE_SAMPLE_DATA,
    import.meta.env.DEV,
  ),
  appVersion: import.meta.env.VITE_APP_VERSION ?? '0.1.0',
});
