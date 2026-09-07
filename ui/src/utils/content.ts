import DOMPurify from 'dompurify';

export const richText = (text = '') => DOMPurify.sanitize(text.replace(/\r\n|\r|\n/g, '<br>'), {
  ALLOWED_TAGS: ['a', 'br', 'p', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'span'],
  ALLOWED_ATTR: ['href', 'title'],
});
export const embedSource = (value = '') => {
  try { const url = new URL(value, location.origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
};
