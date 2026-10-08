import { useEffect } from 'react';
export function usePageMetadata(title?: string, description?: string | null, image?: string | null) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · WebtoonHub`;
    const values: Record<string, string> = { 'description': (description || title).slice(0, 240), 'og:title': title, 'og:description': (description || title).slice(0, 240), 'og:url': window.location.href, 'og:type': 'article', 'twitter:card': image ? 'summary_large_image' : 'summary', 'twitter:title': title };
    if (image) values['og:image'] = new URL(image, window.location.origin).href;
    else document.querySelector('meta[property="og:image"]')?.remove();
    for (const [name, content] of Object.entries(values)) {
      const attribute = name.startsWith('og:') ? 'property' : 'name';
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.append(element); }
      element.content = content;
    }
  }, [title, description, image]);
}
