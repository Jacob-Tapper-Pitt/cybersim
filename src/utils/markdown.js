// Custom markdown renderer — no external dependencies.
// Supports: headers, bold/italic, inline code, code blocks (with language),
// unordered & ordered lists, links, images, blockquotes, horizontal rules, paragraphs.
// Used for Tutorials and Installation Guides content.

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function renderMarkdown(raw) {
  if (!raw) return "";

  // Step 1 — protect fenced code blocks before any other processing
  const codeBlocks = [];
  let text = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || "", code: code.trimEnd() });
    return `\x00CODEBLOCK${idx}\x00`;
  });

  // Step 2 — protect inline code
  const inlineCode = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = inlineCode.length;
    inlineCode.push(escapeHtml(code));
    return `\x00INLINE${idx}\x00`;
  });

  // Step 3 — images before links (order matters)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    // src may be relative to the guide's base URL or absolute
    const safeSrc = src.startsWith("http") || src.startsWith("/") || src.startsWith(".")
      ? src
      : src;
    return `<img src="${safeSrc}" alt="${escapeHtml(alt)}" class="md-img" loading="lazy" />`;
  });

  // Step 4 — links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" class="md-link">${escapeHtml(label)}</a>`
  );

  // Step 5 — blockquotes (must run before paragraph processing)
  text = text.replace(/^> (.+)$/gm, (_, content) => `<blockquote class="md-blockquote">${content}</blockquote>`);

  // Step 6 — horizontal rules
  text = text.replace(/^[-*_]{3,}$/gm, "<hr class=\"md-hr\" />");

  // Step 7 — headers
  text = text.replace(/^### (.+)$/gm, "<h3 class=\"md-h3\">$1</h3>");
  text = text.replace(/^## (.+)$/gm,  "<h2 class=\"md-h2\">$1</h2>");
  text = text.replace(/^# (.+)$/gm,   "<h1 class=\"md-h1\">$1</h1>");

  // Step 8 — bold / italic
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*([^*]+)\*\*/g,    "<strong class=\"md-bold\">$1</strong>");
  text = text.replace(/\*([^*\n]+)\*/g,       "<em class=\"md-italic\">$1</em>");

  // Step 9 — tables (a pipe-delimited header followed by a separator row)
  text = text.replace(/((?:^[ \t]*\|[^\n]*(?:\n|$))+)/gm, (block) => {
    const rows = block.trim().split("\n").map((line) => line.trim());
    const separator = /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/;
    if (rows.length < 2 || !separator.test(rows[1])) return block;

    const cells = (row) => row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
    const headers = cells(rows[0]);
    const body = rows.slice(2).map(cells);
    return `<table class="md-table"><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  });

  // Step 10 — lists (contiguous lines starting with - or * or number.)
  // Unordered
  text = text.replace(/((?:^[ \t]*[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map((ln) => {
      const content = ln.replace(/^[ \t]*[-*] /, "");
      return `<li class="md-li">${content}</li>`;
    });
    return `<ul class="md-ul">${items.join("")}</ul>`;
  });
  // Ordered
  text = text.replace(/((?:^[ \t]*\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split("\n").map((ln) => {
      const content = ln.replace(/^[ \t]*\d+\. /, "");
      return `<li class="md-li">${content}</li>`;
    });
    return `<ol class="md-ol">${items.join("")}</ol>`;
  });

  // Step 11 — paragraphs: wrap non-block lines separated by blank lines
  text = text
    .split(/\n\n+/)
    .map((chunk) => {
      const t = chunk.trim();
      if (!t) return "";
      // Don't wrap if chunk is already a block element
      if (/^<(h[1-6]|ul|ol|blockquote|hr|img|pre|table)/.test(t)) return t;
      if (/\x00CODEBLOCK\d+\x00/.test(t)) return t;
      return `<p class="md-p">${t.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  // Step 12 — restore code blocks
  codeBlocks.forEach(({ lang, code }, i) => {
    const highlighted = escapeHtml(code);
    text = text.replace(
      `\x00CODEBLOCK${i}\x00`,
      `<pre class="md-pre" data-lang="${lang}"><code class="md-code">${highlighted}</code></pre>`
    );
  });

  // Step 13 — restore inline code
  inlineCode.forEach((code, i) => {
    text = text.replace(`\x00INLINE${i}\x00`, `<code class="md-inline">${code}</code>`);
  });

  return text;
}
