"""Post-fix reference check for plain HTML projects.

Usage: python3 -I check_references.py <project-dir>

Reports, per HTML file: duplicate IDs, `for` / ARIA / in-page `href` references
to IDs that don't exist, and classes with no style rule or script hook.
Exits 1 when any problem is found.
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SKIP_DIRS = {"node_modules", "dist", "build", ".git", "vendor", "coverage"}
ID_REF_ATTRS = ("aria-controls", "aria-labelledby", "aria-describedby", "aria-owns", "aria-activedescendant")


def project_files(root, suffixes):
    for path in root.rglob("*"):
        if path.suffix in suffixes and not SKIP_DIRS.intersection(path.relative_to(root).parts):
            yield path


class Collector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.classes, self.ids, self.refs = set(), [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.classes.update((a.get("class") or "").split())
        if a.get("id"):
            self.ids.append(a["id"])
        if tag == "label" and a.get("for"):
            self.refs.append(("for", a["for"]))
        for attr in ID_REF_ATTRS:
            for ref in (a.get(attr) or "").split():
                self.refs.append((attr, ref))
        href = a.get("href") or ""
        if tag == "a" and href.startswith("#") and len(href) > 1:
            self.refs.append(("href", href[1:]))


def main():
    root = Path(sys.argv[1]).resolve()
    styles = "\n".join(p.read_text(errors="ignore") for p in project_files(root, {".scss", ".css"}))
    scripts = "\n".join(p.read_text(errors="ignore") for p in project_files(root, {".js", ".mjs", ".ts"}))

    problems = 0
    for page in sorted(project_files(root, {".html"})):
        c = Collector()
        c.feed(page.read_text(errors="ignore"))
        dupes = sorted({i for i in c.ids if c.ids.count(i) > 1})
        broken = sorted({f"{attr}={ref}" for attr, ref in c.refs if ref not in c.ids})
        unhooked = sorted(
            cls for cls in c.classes
            if not re.search(r"\." + re.escape(cls) + r"(?![\w-])", styles)
            and not re.search(r"(?<![\w-])" + re.escape(cls) + r"(?![\w-])", scripts)
        )
        name = page.relative_to(root)
        for label, items in (("duplicate ids", dupes), ("broken references", broken), ("classes with no style or script hook", unhooked)):
            if items:
                problems += 1
                print(f"{name}: {label}: {', '.join(items)}")
        print(f"{name}: checked {len(c.classes)} classes, {len(c.ids)} ids, {len(c.refs)} references")

    print("OK" if not problems else f"{problems} problem(s)")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
