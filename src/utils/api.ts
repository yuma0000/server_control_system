export const getCustomApiUrl = (): string => {
  try {
    return localStorage.getItem('CUSTOM_API_URL') || '';
  } catch (_) {
    return '';
  }
};

export const setCustomApiUrl = (url: string): void => {
  try {
    if (url) {
      localStorage.setItem('CUSTOM_API_URL', url.trim());
    } else {
      localStorage.removeItem('CUSTOM_API_URL');
    }
  } catch (_) {}
};

export const buildApiUrl = (path: string, baseUrl?: string): string => {
  const base = baseUrl !== undefined ? baseUrl : getCustomApiUrl();
  if (!base) return path;
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
};

export const parseJsonResponse = async (res: Response): Promise<any> => {
  const text = await res.text();
  if (!text || !text.trim()) {
    if (!res.ok) {
      throw new Error(`サーバーレスポンスが空です (HTTP ${res.status})。Render サーバーがスリープ中または起動中の可能性があります。`);
    }
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    if (text.includes('<!DOCTYPE html>') || text.includes('<html') || text.includes('Render')) {
      throw new Error(`サーバーからHTMLが返されました (HTTP ${res.status})。Render が起動中（約30〜50秒）かURL設定をご確認ください。`);
    }
    throw new Error(`JSON解析エラー (HTTP ${res.status}): ${text.substring(0, 120)}`);
  }
};

export const safeFetch = async (endpoint: string, options?: RequestInit, baseUrl?: string): Promise<any> => {
  const url = buildApiUrl(endpoint, baseUrl);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  const data = await parseJsonResponse(res);
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP Error ${res.status}`);
  }
  return data;
};
