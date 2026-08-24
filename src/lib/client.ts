// Small fetch wrapper used by client components to call the API.
export async function api<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    // Network-level failure: server unreachable (e.g. restarting / offline).
    throw new Error('Cannot reach the server — it may be restarting. Refresh in a moment and try again.');
  }
  let data: unknown = {};
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Request failed. Please try again.';
    throw new Error(message);
  }
  return data as T;
}

export const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR', 'XOF'] as const;
