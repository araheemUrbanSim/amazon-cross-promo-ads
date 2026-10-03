export interface PublicConfig {
  /** Base URL of the analytics collector (public information, contains no secret). */
  apiBaseUrl: string;
  defaultTimeZone: string;
  /** Optional ribbon text, e.g. "Staging". */
  environmentLabel: string;
}

const DEFAULTS: PublicConfig = { apiBaseUrl: '', defaultTimeZone: 'Asia/Karachi', environmentLabel: '' };

/** Reads config.json that sits next to the page, so the API URL can change without rebuilding the bundle. */
export async function loadConfig(fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<PublicConfig> {
  try {
    const res = await fetchImpl(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' });
    if (!res.ok) return DEFAULTS;
    const j = (await res.json()) as Partial<PublicConfig>;
    return {
      apiBaseUrl: typeof j.apiBaseUrl === 'string' ? j.apiBaseUrl.trim() : '',
      defaultTimeZone: typeof j.defaultTimeZone === 'string' && j.defaultTimeZone ? j.defaultTimeZone : DEFAULTS.defaultTimeZone,
      environmentLabel: typeof j.environmentLabel === 'string' ? j.environmentLabel : ''
    };
  } catch { return DEFAULTS; }
}
