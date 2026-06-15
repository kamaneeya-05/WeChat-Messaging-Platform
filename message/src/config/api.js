export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function toMediaUrl(url) {
  if (!url) return undefined;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
