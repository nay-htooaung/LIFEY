#!/usr/bin/env node

/**
 * convert-templates.js — Convert any .md file to .docx and .pdf
 *
 * Reads .md file(s) passed as CLI arguments, parses them with marked,
 * and outputs styled .docx and .pdf versions to docs/dist/.
 *
 * Dependencies: marked, html-to-docx, pdfkit (no browser needed)
 *
 * Usage:
 *   node scripts/convert-templates.js path/to/file.md [path/to/another.md...]
 *   pnpm run convert-md -- path/to/file.md
 *   mise run convert-md path/to/file.md
 */

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const PDFDocument = require("pdfkit");

// ──────────────────────────────────────────────
// Paths
// ──────────────────────────────────────────────
const OUTPUT_DIR = path.join(__dirname, "..", "docs", "dist");

// ──────────────────────────────────────────────
// CLI argument parsing
// ──────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(`
Usage:
  node scripts/convert-templates.js <file.md> [file2.md ...]
  mise run convert-md <file.md> [file2.md ...]

Converts one or more .md files to .docx and .pdf, saved in docs/dist/.

Examples:
  mise run convert-md docs/project-management/templates/07-client-discovery-brief.md
  mise run convert-md docs/project-management/04-story/EP0001-ST0001-*.md
`);
  process.exit(0);
}

// ──────────────────────────────────────────────
// HTML wrapper for .docx output
// ──────────────────────────────────────────────
function wrapHTML(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page { margin: 20mm 25mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Arial', 'Helvetica', sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #1a1a1a;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }
  h1 { font-size: 20pt; color: #1e3a5f; margin-top: 0; margin-bottom: 6pt; }
  h2 { font-size: 14pt; color: #2563eb; margin-top: 18pt; margin-bottom: 8pt; border-bottom: 1.5px solid #d1d5db; padding-bottom: 3pt; }
  h3 { font-size: 12pt; color: #1e40af; margin-top: 14pt; margin-bottom: 6pt; }
  p { margin: 6pt 0; }
  strong { font-weight: 700; }
  hr { border: none; border-top: 1px solid #d1d5db; margin: 14pt 0; }
  ol, ul { margin: 6pt 0 6pt 18pt; padding: 0; }
  li { margin: 3pt 0; }
  blockquote { border-left: 3px solid #93c5fd; padding: 6pt 0 6pt 12pt; margin: 10pt 0; color: #4b5563; font-style: italic; }
  code { font-family: 'Consolas', 'Courier New', monospace; font-size: 9.5pt; background: #f3f4f6; padding: 1pt 4pt; border-radius: 3pt; }
</style>
</head>
<body>${body}</body>
</html>`;
}

// ──────────────────────────────────────────────
// Strips inline markdown formatting for PDF text
// ──────────────────────────────────────────────
function stripInline(md) {
  return md.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`(.+?)`/g, "$1");
}

// ──────────────────────────────────────────────
// PDF renderer using pdfkit
// ──────────────────────────────────────────────
function renderPDF(md, outputPath) {
  const tokens = marked.lexer(md);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 55, right: 55 },
    info: { Title: "Client Discovery Brief", Creator: "LIFEY convert-templates" },
  });

  const writeStream = fs.createWriteStream(outputPath);
  doc.pipe(writeStream);

  // Colors
  const BLUE = "#2563eb";
  const DARK_BLUE = "#1e3a5f";
  const BODY = "#1a1a1a";
  const MUTED = "#4b5563";
  const LINE = "#d1d5db";

  let pageTop = doc.page.margins.top;

  function y(pos) {
    return pageTop + pos;
  }

  function currentY() {
    return doc.y;
  }

  function writeLine(text, opts = {}) {
    const {
      size = 11,
      color = BODY,
      bold = false,
      indent = 0,
      spacing = 6,
      align = "left",
    } = opts;

    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.fontSize(size);
    doc.fillColor(color);
    doc.text(text, doc.page.margins.left + indent, currentY(), {
      align,
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right - indent,
      lineGap: 1,
    });
    // pdfkit's text() already advances y, but add a small extra gap after
    if (spacing > 0) doc.moveDown(spacing / 12);
  }

  function writeBlankLine() {
    doc.moveDown(0.5);
  }

  function writeHR() {
    const yPos = currentY() + 4;
    doc.moveTo(doc.page.margins.left, yPos)
      .lineTo(doc.page.width - doc.page.margins.right, yPos)
      .strokeColor(LINE)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.8);
  }

  /**
   * Render inline token content, returning pieces with formatting info
   */
  function renderInlines(inlineTokens) {
    if (!inlineTokens || !inlineTokens.length) return [{ text: "", bold: false }];
    return inlineTokens.map((t) => {
      if (t.type === "text" || t.type === "escape") return { text: t.text || "", bold: false };
      if (t.type === "strong") return { text: t.text || "", bold: true };
      if (t.type === "em") return { text: t.text || "", bold: false };
      if (t.type === "codespan") return { text: t.text || "", bold: false };
      if (t.type === "br") return { text: " ", bold: false };
      return { text: t.raw || "", bold: false };
    });
  }

  /**
   * Render a line with mixed bold/normal text
   */
  function writeMixedLine(parts, opts = {}) {
    const { size = 11, color = BODY, indent = 0, spacing = 6 } = opts;

    // Build pdfkit "continued" text with inline bold
    let first = true;
    for (const p of parts) {
      if (!p.text) continue;
      doc.font(p.bold ? "Helvetica-Bold" : "Helvetica");
      doc.fontSize(size);
      doc.fillColor(color);
      if (first) {
        doc.text(p.text, doc.page.margins.left + indent, currentY(), {
          continued: true,
          lineGap: 1,
        });
        first = false;
      } else {
        doc.text(p.text, { continued: true, lineGap: 1 });
      }
    }
    // End the line
    doc.text("", { lineGap: 1 });
    if (spacing > 0) doc.moveDown(spacing / 12);
  }

  function writeInlineLine(tokens, opts = {}) {
    const parts = renderInlines(tokens);
    writeMixedLine(parts, opts);
  }

  // ── Process tokens ──────────────────────────
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const nextTok = tokens[i + 1];

    switch (tok.type) {
      case "heading": {
        const sizes = { 1: 20, 2: 14, 3: 12 };
        const colors = { 1: DARK_BLUE, 2: BLUE, 3: DARK_BLUE };
        const spacings = { 1: 4, 2: 6, 3: 4 };
        const size = sizes[tok.depth] || 11;
        const color = colors[tok.depth] || BODY;

        doc.font("Helvetica-Bold");
        doc.fontSize(size);
        doc.fillColor(color);
        doc.text(stripInline(tok.text), doc.page.margins.left, currentY(), {
          lineGap: 1,
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });
        doc.moveDown(spacings[tok.depth] / 12 || 0.3);

        // Underline for h2
        if (tok.depth === 2) {
          const yPos = currentY() - 2;
          doc.moveTo(doc.page.margins.left, yPos)
            .lineTo(doc.page.width - doc.page.margins.right, yPos)
            .strokeColor(LINE)
            .lineWidth(1)
            .stroke();
          doc.moveDown(0.2);
        }
        break;
      }

      case "paragraph": {
        // Check if it's a "Feeds into" or blockquote-looking paragraph
        const text = tok.tokens ? tok.tokens.map((t) => t.raw || "").join("") : tok.text || "";

        if (text.startsWith(">")) {
          // It's a blockquote-style paragraph (Feeds into)
          doc.fillColor(MUTED);
          doc.font("Helvetica-Oblique");
          doc.fontSize(9.5);
          doc.text(stripInline(text.replace(/^>\s?/, "")), doc.page.margins.left + 10, currentY(), {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 10,
            lineGap: 1,
          });
          doc.fillColor(BODY);
          doc.moveDown(0.3);
        } else if (tok.tokens && tok.tokens.length > 0) {
          writeInlineLine(tok.tokens);
        } else {
          writeLine(tok.text || "");
        }
        break;
      }

      case "list": {
        for (let j = 0; j < tok.items.length; j++) {
          const item = tok.items[j];
          const prefix = tok.ordered ? `${j + 1}. ` : "• ";
          const itemText = item.tokens
            ? item.tokens.map((t) => (t.tokens ? t.tokens.map((s) => s.raw || "").join("") : t.raw || "")).join("")
            : item.text || "";

          doc.font("Helvetica");
          doc.fontSize(10.5);
          doc.fillColor(BODY);
          // Prefix in bold for ordered lists
          doc.text(`${prefix}${stripInline(itemText)}`, doc.page.margins.left + 8, currentY(), {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 16,
            lineGap: 1,
            indent: -4,
          });
          doc.moveDown(0.2);
        }
        doc.moveDown(0.2);
        break;
      }

      case "blockquote": {
        const quoteText = tok.tokens
          ? tok.tokens.map((t) => (t.tokens ? t.tokens.map((s) => s.raw || "").join("") : t.raw || "")).join("")
          : tok.text || "";

        // Draw left border
        const yStart = currentY();
        doc.fillColor(MUTED);
        doc.font("Helvetica-Oblique");
        doc.fontSize(10.5);
        doc.text(stripInline(quoteText), doc.page.margins.left + 12, yStart, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 24,
          lineGap: 1,
        });
        // Left border line
        const yEnd = currentY();
        doc.moveTo(doc.page.margins.left + 4, yStart + 2)
          .lineTo(doc.page.margins.left + 4, yEnd - 2)
          .strokeColor("#93c5fd")
          .lineWidth(2.5)
          .stroke();
        doc.fillColor(BODY);
        doc.moveDown(0.3);
        break;
      }

      case "hr":
        writeHR();
        break;

      case "code": {
        doc.font("Courier");
        doc.fontSize(9);
        doc.fillColor("#4b5563");
        const lines = tok.text.split("\n");
        for (const line of lines) {
          doc.text(line, doc.page.margins.left + 8, currentY(), {
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 16,
            lineGap: 0.5,
          });
        }
        doc.fillColor(BODY);
        doc.moveDown(0.3);
        break;
      }

      case "space":
        doc.moveDown(0.5);
        break;

      default:
        // Fallback: try to render raw text
        if (tok.raw && tok.raw.trim()) {
          writeLine(stripInline(tok.raw), { size: 10, color: MUTED });
        }
        break;
    }
  }

  doc.end();
  return new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let htmlToDocx;

  for (const filePath of args) {
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠  Skipping — file not found: ${filePath}`);
      continue;
    }

    const basename = path.basename(filePath, ".md");
    console.log(`\nProcessing: ${filePath}`);

    console.log(`\nProcessing: ${filePath}`);

    const md = fs.readFileSync(filePath, "utf-8");

    // ── .pdf (via pdfkit — no browser needed) ──
    try {
      const pdfPath = path.join(OUTPUT_DIR, `${basename}.pdf`);
      await renderPDF(md, pdfPath);
      console.log(`  ✓ ${basename}.pdf`);
    } catch (err) {
      console.error(`  ✗ PDF failed: ${err.message}`);
    }

    // ── .docx (via html-to-docx) ───────────────
    try {
      if (!htmlToDocx) htmlToDocx = require("html-to-docx");
      const htmlBody = marked.parse(md);
      const html = wrapHTML(htmlBody);
      const docxBuffer = await htmlToDocx(html, null, {
        table: {
          style: {
            heading1: { run: { size: 20, font: "Calibri", bold: true } },
            heading2: { run: { size: 14, font: "Calibri", bold: true, color: "2563eb" } },
            default: { run: { size: 11, font: "Calibri" } },
          },
        },
      });
      const docxPath = path.join(OUTPUT_DIR, `${basename}.docx`);
      fs.writeFileSync(docxPath, docxBuffer);
      console.log(`  ✓ ${basename}.docx`);
    } catch (err) {
      console.error(`  ✗ DOCX failed: ${err.message}`);
    }
  }

  console.log(`\n✅ Done. Files saved to: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
