"""Sync the homepage-style footer into the standalone design pages.

Run from any directory: python design/shared/sync-footer.py
The root design/index.html is a redirect and does not contain a page footer.
"""
from html.parser import HTMLParser
from pathlib import Path
import re

DESIGN = Path(__file__).resolve().parent.parent
FOOTER = (DESIGN / 'shared/site-footer.html').read_text(encoding='utf-8').rstrip()
STYLESHEET = '  <link rel="stylesheet" href="../shared/site-footer.css">'


class ContentBoundary(HTMLParser):
    """Find the end of the main content without reformatting existing HTML."""
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.lines = source.splitlines(keepends=True)
        self.stack = []
        self.end = None
        self.capture = None

    def handle_starttag(self, tag, attrs):
        if tag in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            return
        data = dict(attrs)
        direct_body = self.stack and self.stack[-1] == 'body'
        if direct_body and (tag == 'main' or {'ep-layout', 'ap-layout'}.intersection(data.get('class', '').split())):
            self.capture = len(self.stack)
        self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag not in self.stack:
            return
        index = len(self.stack) - 1 - self.stack[::-1].index(tag)
        if self.capture == index:
            line, column = self.getpos()
            start = sum(map(len, self.lines[:line - 1])) + column
            self.end = self.source.index('>', start) + 1
            self.capture = None
        del self.stack[index:]


def sync():
    changed = 0
    for page in sorted(DESIGN.glob('*/index.html')):
        with page.open(encoding='utf-8', newline='') as stream:
            original = stream.read()
        # Remove both old compact footers and the previously synced full footer.
        source = re.sub(r'\s*<footer\b[^>]*>.*?</footer>\s*', '', original, flags=re.S)
        if 'href="../shared/site-footer.css"' not in source:
            source = source.replace('</head>', STYLESHEET + '\n</head>', 1)
        parser = ContentBoundary(source)
        parser.feed(source)
        if parser.end is None:
            raise ValueError(f'No body-level main content found in {page}')
        source = source[:parser.end] + '\n\n' + FOOTER + '\n\n' + source[parser.end:].lstrip()
        if source != original:
            with page.open('w', encoding='utf-8', newline='') as stream:
                stream.write(source)
            changed += 1
    print(f'Synced homepage footer: {changed} pages updated.')


if __name__ == '__main__':
    sync()
