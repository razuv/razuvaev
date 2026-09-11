import DOMPurify from 'dompurify';

export const richText = (text = '') => DOMPurify.sanitize(text.replace(/\r\n|\r|\n/g, '<br>'), {
  ALLOWED_TAGS: ['a', 'br', 'p', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'span'],
  ALLOWED_ATTR: ['href', 'title'],
});
export const embedSource = (value = '') => {
  let source = value.trim();
  if (!source) return undefined;
  if (source.startsWith('<')) {
    // Parse pasted embed markup without inserting it into the live document.
    const document = new DOMParser().parseFromString(source, 'text/html');
    source = document.querySelector('iframe')?.getAttribute('src')?.trim() || '';
  }
  // Never resolve malformed markup or plain text against the portfolio URL.
  if (!/^https?:\/\//i.test(source) && !/^\/(?!\/)/.test(source)) return undefined;
  try {
    const url = new URL(source, location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
};
