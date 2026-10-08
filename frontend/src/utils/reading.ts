export interface NovelPage { text: string; startWord: number; endWord: number }

/** Preserve paragraph boundaries and stable word anchors when text is repaginated. */
export function paginateNovel(text: string, targetWords: number): NovelPage[] {
  const pages: NovelPage[] = [];
  const limit = Number.isFinite(targetWords) ? Math.max(1, Math.floor(targetWords)) : 350;
  let paragraphs: string[] = [];
  let word = 0;
  let start = 0;
  for (const paragraph of text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)) {
    const words = paragraph.split(/\s+/);
    const count = words.length;
    if (paragraphs.length && word - start + count > limit) {
      pages.push({ text: paragraphs.join('\n\n'), startWord: start, endWord: word });
      paragraphs = [];
      start = word;
    }
    if (count > limit) {
      for (let offset = 0; offset < count; offset += limit) {
        const part = words.slice(offset, offset + limit);
        paragraphs.push(part.join(' ')); word += part.length;
        if (offset + limit < count) {
          pages.push({ text: paragraphs.join('\n\n'), startWord: start, endWord: word });
          paragraphs = []; start = word;
        }
      }
      continue;
    }
    paragraphs.push(paragraph);
    word += count;
  }
  if (paragraphs.length) pages.push({ text: paragraphs.join('\n\n'), startWord: start, endWord: word });
  return pages.length ? pages : [{ text: '', startWord: 0, endWord: 0 }];
}

export function pageForWord(pages: NovelPage[], word: number): number {
  const index = pages.findIndex(page => word < page.endWord);
  return index < 0 ? Math.max(0, pages.length - 1) : index;
}

export function clampPage(page: number, count: number): number {
  return Math.max(0, Math.min(Number.isFinite(page) ? Math.floor(page) : 0, Math.max(0, count - 1)));
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]');
}

export function readerUrl(chapterId: number, startOver = false): string {
  return `/chapters/${chapterId}${startOver ? '?restart=1' : ''}`;
}
