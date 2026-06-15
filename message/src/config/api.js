// In production, use relative URLs to the same domain
// In development, use localhost:5000
const DEFAULT_API_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5000' : '');
export const API_BASE_URL = DEFAULT_API_URL;

export function toMediaUrl(url) {
  if (!url) return undefined;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
