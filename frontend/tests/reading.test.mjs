import test from 'node:test';
import assert from 'node:assert/strict';
import { loadUtility } from './helpers.mjs';

const { paginateNovel, pageForWord, clampPage, readerUrl } = await loadUtility('src/utils/reading.ts');
const paragraph = (start, count) => Array.from({ length: count }, (_, index) => 'word' + (start + index)).join(' ');
const text = Array.from({ length: 12 }, (_, index) => paragraph(index * 40, 40)).join('\n\n');

test('font repagination preserves the reader word anchor and all original words', () => {
  const oldPages = paginateNovel(text, 100);
  const anchor = oldPages[4].startWord;
  for (const limit of [240, 190, 140, 100]) {
    const pages = paginateNovel(text, limit);
    const page = pages[pageForWord(pages, anchor)];
    assert.ok(page.startWord <= anchor && anchor < page.endWord, 'saved word must remain on the visible page');
    assert.deepEqual(pages.flatMap(item => item.text.split(/\s+/)), text.split(/\s+/), 'repagination must not drop or duplicate content');
    assert.equal(pages.at(-1).endWord, 480);
  }
});

test('shrinking the page count at the end never produces a blank or out-of-range page', () => {
  const smallPages = paginateNovel(text, 100);
  const largePages = paginateNovel(text, 240);
  const previousLast = smallPages.length - 1;
  const anchoredPage = pageForWord(largePages, smallPages[previousLast].startWord);
  assert.equal(anchoredPage, largePages.length - 1);
  assert.equal(clampPage(previousLast, largePages.length), largePages.length - 1);
  assert.ok(largePages[anchoredPage].text);
  assert.ok((anchoredPage + 1) / largePages.length * 100 <= 100);
  assert.equal(pageForWord(largePages, 999999), largePages.length - 1, 'obsolete anchors clamp to the final page');
});

test('paragraphs and Markdown boundaries survive pagination', () => {
  const markdown = '# Heading\n\nFirst paragraph has five words.\n\n> Quoted paragraph is kept together.\n\n---';
  const pages = paginateNovel(markdown, 7);
  assert.equal(pages.map(page => page.text).join('\n\n'), markdown);
  assert.equal(pages[0].startWord, 0);
  for (let index = 1; index < pages.length; index++) assert.equal(pages[index].startWord, pages[index - 1].endWord);
});

test('a long chapter with no blank lines is bounded and preserves every word across font sizes', () => {
  const singleParagraph = paragraph(0, 2047);
  for (const limit of [240, 190, 140, 100]) {
    const pages = paginateNovel(singleParagraph, limit);
    assert.ok(pages.length > 1, 'one long paragraph must not bypass page limits');
    assert.deepEqual(pages.flatMap(page => page.text.split(/\s+/)), singleParagraph.split(/\s+/));
    assert.equal(pages[0].startWord, 0);
    assert.equal(pages.at(-1).endWord, 2047);
    for (const page of pages) assert.ok(page.endWord - page.startWord <= limit, 'each page has a bounded amount of text');
    for (const anchor of [0, 99, 240, 1001, 2046]) {
      const page = pages[pageForWord(pages, anchor)];
      assert.ok(page.startWord <= anchor && anchor < page.endWord);
    }
  }
});

test('empty text and malformed saved page numbers have a safe page', () => {
  assert.deepEqual(paginateNovel(' \n\n ', 100), [{ text: '', startWord: 0, endWord: 0 }]);
  for (const page of [-50, NaN, Infinity, -Infinity]) assert.equal(clampPage(page, 0), 0);
  assert.equal(clampPage(2.9, 4), 2);
  assert.equal(pageForWord([], 100), 0);
  assert.equal(readerUrl(12), '/chapters/12');
  assert.equal(readerUrl(12, true), '/chapters/12?restart=1');
});
