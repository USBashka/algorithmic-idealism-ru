#!/usr/bin/env python3
"""Build a compact EPUB 3 package from the rendered article HTML."""

from __future__ import annotations

import re
import shutil
import uuid
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

from lxml import etree, html


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
OUTPUT = ROOT / "downloads" / "algorithmic-idealism-ru.epub"
BUILD = ROOT / ".epub-build"
NS = "http://www.w3.org/1999/xhtml"


def xhtml_document(title: str, body_nodes: list[etree._Element]) -> bytes:
    html_node = etree.Element(f"{{{NS}}}html", nsmap={None: NS})
    html_node.set("{http://www.w3.org/XML/1998/namespace}lang", "ru")
    head = etree.SubElement(html_node, f"{{{NS}}}head")
    etree.SubElement(head, f"{{{NS}}}meta", charset="utf-8")
    etree.SubElement(head, f"{{{NS}}}title").text = title
    link = etree.SubElement(head, f"{{{NS}}}link", rel="stylesheet", href="styles.css")
    link.set("type", "text/css")
    body = etree.SubElement(html_node, f"{{{NS}}}body")
    for node in body_nodes:
        body.append(node)
    return etree.tostring(
        html_node,
        encoding="utf-8",
        xml_declaration=True,
        doctype="<!DOCTYPE html>",
    )


def main() -> None:
    if BUILD.exists():
        shutil.rmtree(BUILD)
    oebps = BUILD / "OEBPS"
    meta_inf = BUILD / "META-INF"
    (oebps / "assets").mkdir(parents=True)
    meta_inf.mkdir(parents=True)
    (BUILD / "mimetype").write_text("application/epub+zip", encoding="ascii")
    (meta_inf / "container.xml").write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>""",
        encoding="utf-8",
    )

    document = html.parse(str(INDEX)).getroot()
    article = document.xpath('//article[contains(@class,"article")]')[0]
    cover = document.xpath('//section[contains(@class,"cover")]')[0]
    title = "".join(document.xpath("//title/text()"))

    for element in article.xpath(".//*[@style]"):
        element.attrib.pop("style", None)
    for image in article.xpath(".//img[@src]"):
        image.set("src", image.get("src", "").replace("assets/", "assets/"))
        image.attrib.pop("loading", None)
    for element in article.xpath(".//*[@id]"):
        element.set("id", re.sub(r"[^A-Za-z0-9_.:-]", "-", element.get("id")))

    cover_nodes = [etree.fromstring(etree.tostring(cover))]
    article_nodes = [etree.fromstring(etree.tostring(child)) for child in article]
    (oebps / "cover.xhtml").write_bytes(xhtml_document(title, cover_nodes))
    (oebps / "article.xhtml").write_bytes(xhtml_document(title, article_nodes))

    epub_css = """
body{font-family:serif;line-height:1.55;color:#202020;margin:5%}
h1,h2,h3{font-family:sans-serif;line-height:1.2}
h2{margin-top:2.5em;border-top:1px solid #aaa;padding-top:.8em}
img{display:block;max-width:100%;height:auto;margin:1.5em auto}
blockquote{border-left:.25em solid #657a38;padding-left:1em}
table{border-collapse:collapse;max-width:100%;font-size:.85em}
td,th{border:1px solid #888;padding:.4em}
.cover-meta{margin-top:2em}.meta-item{margin:.7em 0}.meta-item span{font-weight:bold}
.eyebrow{letter-spacing:.1em;text-transform:uppercase}.footnotes{font-size:.85em}
"""
    (oebps / "styles.css").write_text(epub_css, encoding="utf-8")

    images = sorted(ROOT.joinpath("assets").glob("*.webp"))
    for image in images:
        shutil.copy2(image, oebps / "assets" / image.name)

    headings = article.xpath(".//h2[@id] | .//h3[@id]")
    nav_items = "\n".join(
        f'<li><a href="article.xhtml#{heading.get("id")}">{escape("".join(heading.itertext()))}</a></li>'
        for heading in headings
    )
    nav = f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="{NS}" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ru">
<head><title>Оглавление</title></head>
<body><nav epub:type="toc" id="toc"><h1>Оглавление</h1><ol>{nav_items}</ol></nav></body>
</html>"""
    (oebps / "nav.xhtml").write_text(nav, encoding="utf-8")

    book_id = f"urn:uuid:{uuid.uuid5(uuid.NAMESPACE_URL, 'https://usbashka.github.io/algorithmic-idealism-ru/')}"
    image_manifest = "\n".join(
        f'<item id="img-{index}" href="assets/{image.name}" media-type="image/webp"/>'
        for index, image in enumerate(images, 1)
    )
    opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="ru">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">{book_id}</dc:identifier>
    <dc:title>{title}</dc:title>
    <dc:creator>Markus P. Müller</dc:creator>
    <dc:contributor>Сава; GPT-5.6 Sol</dc:contributor>
    <dc:language>ru</dc:language>
    <meta property="dcterms:modified">2026-07-27T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="article" href="article.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    {image_manifest}
  </manifest>
  <spine><itemref idref="cover"/><itemref idref="article"/></spine>
</package>"""
    (oebps / "package.opf").write_text(opf, encoding="utf-8")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w") as epub:
        epub.write(BUILD / "mimetype", "mimetype", compress_type=zipfile.ZIP_STORED)
        for file in sorted(BUILD.rglob("*")):
            if file.is_file() and file.name != "mimetype":
                epub.write(file, file.relative_to(BUILD).as_posix(), compress_type=zipfile.ZIP_DEFLATED)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")
    shutil.rmtree(BUILD)


if __name__ == "__main__":
    main()
