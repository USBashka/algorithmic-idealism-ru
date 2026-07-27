#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { marked } = await import(pathToFileURL(require.resolve("marked")).href);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "algorithmic-idealism-ru.md");
const outputPath = path.join(root, "index.html");
const standalonePath = path.join(root, "downloads", "algorithmic-idealism-ru.html");
const source = fs.readFileSync(sourcePath, "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(root, "script.js"), "utf8");

marked.setOptions({ gfm: true, breaks: false, mangle: false, headerIds: false });

const escapeHtml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function renderMarkdown(value, inline = false) {
  const math = [];
  const protectedValue = value.replace(
    /\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\.|[^$\n])+(?<!\\)\$/g,
    (formula) => {
      const token = `AIDMATHPLACEHOLDER${math.length}X`;
      math.push(escapeHtml(formula));
      return token;
    },
  );
  const rendered = inline ? marked.parseInline(protectedValue) : marked.parse(protectedValue);
  return rendered.replace(/AIDMATHPLACEHOLDER(\d+)X/g, (_, index) => math[Number(index)]);
}

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return [{}, markdown];
  const data = {};
  const lines = match[1].split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const field = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!field) continue;
    const [, key, raw] = field;
    if (raw === ">-" || raw === "|-") {
      const folded = [];
      while (index + 1 < lines.length && /^\s{2}/.test(lines[index + 1])) {
        folded.push(lines[index + 1].trim());
        index += 1;
      }
      data[key] = folded.join(" ");
    } else {
      data[key] = raw.replace(/^"(.*)"$/, "$1");
    }
  }
  return [data, markdown.slice(match[0].length)];
}

function slugify(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`[\]()]/g, "")
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
}

function prepareHeadings(markdown) {
  const headings = [];
  let pendingAnchor = null;
  const lines = markdown.split("\n");
  const rendered = [];
  for (const line of lines) {
    const anchor = line.match(/^<a id="([^"]+)"><\/a>$/);
    if (anchor) {
      pendingAnchor = anchor[1];
      continue;
    }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const plain = heading[2].replace(/\[(.*?)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");
      const id = pendingAnchor || slugify(plain) || `section-${headings.length + 1}`;
      headings.push({ level, title: plain, id });
      rendered.push(`<h${level} id="${escapeHtml(id)}">${renderMarkdown(heading[2], true)}</h${level}>`);
      pendingAnchor = null;
      continue;
    }
    rendered.push(line);
  }
  return [rendered.join("\n"), headings];
}

function extractFootnotes(markdown) {
  const definitions = [];
  const lines = markdown.split("\n");
  const kept = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\[\^([^\]]+)\]:\s*(.*)$/);
    if (!match) {
      kept.push(lines[index]);
      continue;
    }
    const body = [match[2]];
    while (index + 1 < lines.length && (/^\s{4}/.test(lines[index + 1]) || lines[index + 1] === "")) {
      index += 1;
      body.push(lines[index].replace(/^\s{4}/, ""));
    }
    definitions.push({ id: match[1], body: body.join("\n").trim() });
  }
  let clean = kept.join("\n");
  clean = clean.replace(/\[\^([^\]]+)\]/g, (_, id) => (
    `<sup id="fnref-${id}"><a href="#fn-${id}" aria-label="Сноска ${id}">${id}</a></sup>`
  ));
  const html = definitions.length
    ? `<section class="footnotes" aria-label="Сноски"><h2 id="footnotes">Сноски</h2><ol>${definitions
        .map(({ id, body }) => `<li id="fn-${id}">${renderMarkdown(body)} <a href="#fnref-${id}" aria-label="Назад">↩</a></li>`)
        .join("")}</ol></section>`
    : "";
  return [clean, html];
}

function prepareMain(markdown) {
  markdown = markdown.replace(/^# .+\n+/, "");
  markdown = markdown.replace(
    /^## (?:Table of Contents|Оглавление)[\s\S]*?(?=<a id="Section1"><\/a>)/m,
    "",
  );
  let footnotes;
  [markdown, footnotes] = extractFootnotes(markdown);
  let headings;
  [markdown, headings] = prepareHeadings(markdown);
  return { html: renderMarkdown(markdown) + footnotes, headings };
}

function prepareSidebar(markdown) {
  const faqStart = markdown.search(/^## (?:FAQ[^]*?|Часто задаваемые вопросы.*?)$/m);
  const resourcesRaw = faqStart >= 0 ? markdown.slice(0, faqStart) : "";
  const faqRaw = faqStart >= 0 ? markdown.slice(faqStart).replace(/^## .+\n+/, "") : markdown;
  const resources = resourcesRaw.trim()
    ? `<div class="resources">${renderMarkdown(resourcesRaw.replace(/^## .+\n+/, ""))}</div>`
    : "";
  const questions = [];
  const pattern = /\*\*(?:Q|В)(\d+):\*\*\s*([\s\S]*?)\n\*\*(?:A|О):\*\*\s*([\s\S]*?)(?=\n\*\*(?:Q|В)\d+:\*\*|$)/g;
  for (const match of faqRaw.matchAll(pattern)) {
    questions.push({
      number: match[1],
      question: match[2].trim(),
      answer: match[3].replace(/New questions[\s\S]*$/i, "").trim(),
    });
  }
  const faq = questions
    .map(
      ({ number, question, answer }) =>
        `<details><summary><span>${number.padStart(2, "0")}</span> ${renderMarkdown(question, true)}</summary>` +
        `<div class="faq-answer">${renderMarkdown(answer)}</div></details>`,
    )
    .join("");
  return { resources, faq, count: questions.length };
}

function renderToc(headings) {
  return headings
    .filter(({ title }) => !/^(Сноски|Footnotes)$/i.test(title))
    .map(
      ({ level, title, id }) =>
        `<a data-level="${level}" href="#${escapeHtml(id)}">${escapeHtml(title)}</a>`,
    )
    .join("");
}

function embedImages(html) {
  return html.replace(/(?:src=")(assets\/[^"]+)(?:")/g, (whole, relative) => {
    const file = path.join(root, relative);
    const data = fs.readFileSync(file).toString("base64");
    return `src="data:image/webp;base64,${data}"`;
  });
}

function pageTemplate({ inline = false } = {}) {
  const styles = inline ? `<style>${css}</style>` : `<link rel="stylesheet" href="styles.css?v=1.0.1">`;
  const scripts = inline ? `<script>${js}</script>` : `<script src="script.js?v=1.0.1"></script>`;
  const coverDeck =
    "Математически строгий взгляд на физику от первого лица — через квантовую теорию, " +
    "алгоритмическую вероятность, личную идентичность и гипотезу симуляции.";
  return `<!doctype html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${escapeHtml(metadata.abstract || "Русский перевод статьи об алгоритмическом идеализме.")}">
  <meta name="theme-color" content="#111310">
  <title>${escapeHtml(metadata.title)}</title>
  ${styles}
  <script>
    window.MathJax = {
      tex: { inlineMath: [["$", "$"]], displayMath: [["$$", "$$"]] },
      options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"] }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
  <div class="reading-progress" aria-hidden="true"></div>
  <header class="topbar">
    <div style="display:flex;align-items:center;gap:.5rem">
      <button class="icon-button" data-open-drawer="left" aria-label="Открыть оглавление">☰</button>
      <a class="brand" href="#top"><span class="brand-mark">Aᵢ</span><span>Алгоритмический идеализм</span></a>
    </div>
    <div class="appearance" aria-label="Настройки чтения">
      <label for="theme">Тема</label>
      <select id="theme"><option value="oled">OLED</option><option value="dark">Тёмная</option><option value="light">Светлая</option><option value="eink">E-INK</option></select>
      <label for="text-size">Размер</label>
      <select id="text-size"><option value="17">S</option><option value="19">M</option><option value="21">L</option><option value="23">XL</option></select>
      <label class="font-control" for="text-font">Шрифт</label>
      <select class="font-control" id="text-font"><option value="serif">Книжный</option><option value="sans">Гротеск</option><option value="mono">Моно</option></select>
      <button class="icon-button" data-open-drawer="right" aria-label="Открыть вопросы и ответы">?</button>
    </div>
  </header>
  <main id="top">
    <section class="cover">
      <div class="cover-copy">
        <div class="eyebrow">Философия физики · 2026</div>
        <h1>${escapeHtml(metadata.title)}</h1>
        <p class="cover-deck">${escapeHtml(coverDeck)}</p>
      </div>
      <div class="cover-meta">
        <div class="meta-item"><span>Автор</span><strong>${escapeHtml(metadata.author || "Маркус П. Мюллер")}</strong></div>
        <div class="meta-item"><span>Перевод</span><strong>Сава × GPT‑5.6 Sol</strong></div>
        <div class="meta-item"><span>Время чтения</span><strong id="reading-time">—</strong></div>
        <div class="meta-item"><span>Оригинал</span><strong><a href="https://mpmueller.net/aid/" rel="noopener">mpmueller.net/aid ↗</a></strong></div>
      </div>
    </section>
    <div class="page-grid">
      <aside class="rail rail-left" aria-label="Оглавление"><div class="rail-inner"><h2 class="rail-title">Оглавление <span>${main.headings.length}</span></h2><nav class="toc">${renderToc(main.headings)}</nav></div></aside>
      <article class="article">${main.html}</article>
      <aside class="rail rail-right" aria-label="Дополнительные материалы"><div class="rail-inner"><h2 class="rail-title">Вопросы и ответы <span>${sidebar.count}</span></h2>${sidebar.resources}<div class="faq-list">${sidebar.faq}</div></div></aside>
    </div>
  </main>
  <div class="drawer-scrim" aria-hidden="true"></div>
  <footer class="footer">Независимый русский перевод. Авторские права на оригинальный текст принадлежат Маркусу П. Мюллеру.</footer>
  ${scripts}
</body>
</html>`;
}

const [metadata, body] = parseFrontMatter(source);
const rightMarker = body.search(/^# (?:Правая колонка|Right column)\s*$/m);
const mainRaw = rightMarker >= 0 ? body.slice(0, rightMarker) : body;
const sidebarRaw = rightMarker >= 0 ? body.slice(rightMarker).replace(/^# .+\n+/, "") : "";
const main = prepareMain(mainRaw);
const sidebar = prepareSidebar(sidebarRaw);

fs.mkdirSync(path.dirname(standalonePath), { recursive: true });
fs.writeFileSync(outputPath, pageTemplate(), "utf8");
fs.writeFileSync(standalonePath, embedImages(pageTemplate({ inline: true })), "utf8");
console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${standalonePath}`);
console.log(`Sections: ${main.headings.length}; FAQ: ${sidebar.count}`);
