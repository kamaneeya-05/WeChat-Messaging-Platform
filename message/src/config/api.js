// In production, use the configured backend URL via VITE_API_URL.
// In development, use localhost:5000.
const DEFAULT_API_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5000' : window.location.origin);
export const API_BASE_URL = DEFAULT_API_URL;

if (import.meta.env.MODE === 'production') {
  console.log('API_BASE_URL (production):', API_BASE_URL);
}

export function toMediaUrl(url) {
  if (!url) return undefined;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
