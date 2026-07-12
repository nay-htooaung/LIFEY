#!/usr/bin/env node

/**
 * build-docs.js — Project Management Documentation Site Builder
 *
 * Parses .md files with YAML frontmatter, validates relationships,
 * auto-links cross-references, and generates a single-page HTML site
 * with navigation, content, an interactive D3.js graph, and a
 * validation dashboard.
 *
 * Usage:
 *   node scripts/build-docs.js              # build once
 *   node scripts/build-docs.js --watch      # rebuild on file changes
 *   node scripts/build-docs.js --validate-only  # just run validation
 */

// ──────────────────────────────────────────────
// Imports
// ──────────────────────────────────────────────
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

let grayMatter, marked, chokidar;

try {
  grayMatter = require("gray-matter");
  marked = require("marked");
  chokidar = require("chokidar");
} catch (e) {
  console.error(
    "Missing dependencies. Run: npm install"
  );
  process.exit(1);
}

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────
const ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(ROOT, "docs");
const RULES_DIR = path.join(DOCS_DIR, "rules", "project-management");
const ARTIFACTS_DIR = path.join(DOCS_DIR, "project-management");
const TEMPLATES_DIR = path.join(ARTIFACTS_DIR, "templates");
const OUTPUT_DIR = path.join(DOCS_DIR, "dist");

// Only include actual project management artifacts (not templates or rules).
const SOURCE_DIRS = [ARTIFACTS_DIR];

// Type definitions for validation
const HIERARCHY_RULES = {
  vision: {
    label: "Vision",
    icon: "★",
    color: "#e6b800",
    requiredFields: ["title", "status", "type"],
    parentField: null,
    description: "North star — singular, enduring",
  },
  roadmap: {
    label: "Roadmap",
    icon: "◆",
    color: "#3b82f6",
    requiredFields: ["title", "status", "type", "quarter"],
    parentField: null,
    description: "Time-bounded strategic plan",
  },
  epic: {
    label: "Epic",
    icon: "▲",
    color: "#8b5cf6",
    requiredFields: ["title", "status", "type", "theme"],
    parentField: null,  // themes are embedded in roadmap docs, not separate artifacts
    description: "Feature-bounded initiative",
  },
  user_story: {
    label: "Story",
    icon: "●",
    color: "#10b981",
    requiredFields: ["title", "status", "type", "epic"],
    parentField: "epic",
    description: "Single user action or goal",
  },
  task: {
    label: "Task",
    icon: "◼",
    color: "#14b8a6",
    requiredFields: ["title", "status", "type", "story"],
    parentField: "story",
    description: "Technical implementation step",
  },
  reference: {
    label: "Reference",
    icon: "■",
    color: "#6b7280",
    requiredFields: ["title", "type"],
    parentField: null,
    description: "Supporting document",
  },
  template: {
    label: "Template",
    icon: "📄",
    color: "#f59e0b",
    requiredFields: ["title", "type"],
    parentField: null,
    description: "Reusable template",
  },
};

// ──────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, "utf8");
}

function relativePath(absPath) {
  return path.relative(ROOT, absPath);
}

function detectType(frontmatter, filePath) {
  if (frontmatter.type) return frontmatter.type;
  const basename = path.basename(filePath).toLowerCase();
  if (basename.startsWith("01-") || basename.includes("vision")) return "vision";
  if (basename.startsWith("02-") || basename.includes("roadmap")) return "roadmap";
  if (basename.startsWith("03-") || basename.includes("epic")) return "epic";
  if (basename.startsWith("04-") || basename.includes("userstory") || basename.includes("story")) return "user_story";
  if (basename.startsWith("05-") || basename.includes("task")) return "task";
  if (basename.startsWith("06-") || basename.includes("granularity") || basename.includes("matrix")) return "reference";
  if (basename.includes("template")) return "template";
  return "reference";
}

// ──────────────────────────────────────────────
// Phase 1: Document Discovery & Parsing
// ──────────────────────────────────────────────
function discoverFiles() {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { recursive: false });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isFile() && entry.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function parseDocument(filePath) {
  const raw = readFile(filePath);
  if (!raw) return null;

  const parsed = grayMatter(raw);
  const frontmatter = parsed.data || {};
  const body = parsed.content || "";

  const type = detectType(frontmatter, filePath);
  const title = frontmatter.title || path.parse(filePath).name;
  const id = slugify(title);
  const filename = path.basename(filePath);

  return {
    id,
    title,
    filename,
    filePath,
    relativePath: relativePath(filePath),
    type,
    status: frontmatter.status || "unknown",
    frontmatter,
    body,
    rendered: null, // filled later
    errors: [],
    warnings: [],
  };
}

function buildDocumentMap(docs) {
  const map = new Map();
  for (const doc of docs) {
    map.set(doc.id, doc);
    map.set(doc.filename.replace(/\.md$/, ""), doc);
    // Also map by title (case-insensitive)
    map.set(doc.title.toLowerCase(), doc);
  }
  return map;
}

// ──────────────────────────────────────────────
// Phase 2: Relationship Graph
// ──────────────────────────────────────────────
function buildGraph(docs, docMap) {
  const nodes = [];
  const edges = [];
  const nodeSet = new Set();

  for (const doc of docs) {
    if (!nodeSet.has(doc.id)) {
      const typeDef = HIERARCHY_RULES[doc.type] || HIERARCHY_RULES.reference;
      nodes.push({
        id: doc.id,
        label: doc.title,
        type: doc.type,
        icon: typeDef.icon,
        color: typeDef.color,
        status: doc.status,
        filePath: doc.relativePath,
      });
      nodeSet.add(doc.id);
    }

    // Follow parentField to create edges
    const typeDef = HIERARCHY_RULES[doc.type];
    if (typeDef && typeDef.parentField) {
      const parentRef = doc.frontmatter[typeDef.parentField];
      if (parentRef) {
        const parentId = slugify(parentRef);
        if (nodeSet.has(parentId)) {
          edges.push({ source: parentId, target: doc.id, label: typeDef.parentField });
        } else {
          // Try to find by title fuzzy match
          const parentDoc = docMap.get(parentRef.toLowerCase()) || docMap.get(parentRef);
          if (parentDoc) {
            edges.push({ source: parentDoc.id, target: doc.id, label: typeDef.parentField });
          } else {
            // Reference to potentially missing doc - add as unknown node
            if (!nodeSet.has(parentId)) {
              nodes.push({
                id: parentId,
                label: parentRef,
                type: "unknown",
                icon: "?",
                color: "#ef4444",
                status: "missing",
                filePath: null,
              });
              nodeSet.add(parentId);
            }
            edges.push({ source: parentId, target: doc.id, label: typeDef.parentField });
          }
        }
      }
    }
  }

  // Add reverse edges (children)
  const reverseEdges = [];
  for (const edge of edges) {
    reverseEdges.push({
      source: edge.target,
      target: edge.source,
      label: `parent: ${edge.label}`,
    });
  }

  return { nodes, edges, reverseEdges };
}

// ──────────────────────────────────────────────
// Phase 3: Validation
// ──────────────────────────────────────────────
function isPlaceholder(value) {
  // Detect template placeholders like [something] or [Something]
  return typeof value === "string" && /^\[.*\]$/.test(value.trim());
}

function validate(docs, docMap) {
  const errors = [];
  const warnings = [];

  for (const doc of docs) {
    // Skip validation for templates — they intentionally use placeholder values
    if (doc.type === "template") continue;

    const typeDef = HIERARCHY_RULES[doc.type];
    if (!typeDef) {
      warnings.push({ doc: doc.id, message: `Unknown type "${doc.type}"` });
      continue;
    }

    // Check required fields
    for (const field of typeDef.requiredFields) {
      const value = doc.frontmatter[field];
      if (!value && value !== false) {
        errors.push({
          doc: doc.id,
          file: doc.relativePath,
          message: `Missing required field "${field}" for type "${doc.type}"`,
          severity: "error",
        });
      } else if (isPlaceholder(value)) {
        warnings.push({
          doc: doc.id,
          file: doc.relativePath,
          message: `Field "${field}" still contains a placeholder: ${value}`,
          severity: "warning",
        });
      }
    }

    // Check parent reference exists
    if (typeDef.parentField) {
      const parentRef = doc.frontmatter[typeDef.parentField];
      if (parentRef) {
        if (isPlaceholder(parentRef)) {
          warnings.push({
            doc: doc.id,
            file: doc.relativePath,
            message: `Parent reference "${typeDef.parentField}" still contains a placeholder: ${parentRef}`,
            severity: "warning",
          });
        } else {
          const parentSlug = slugify(parentRef);
          const parentExists =
            docMap.has(parentSlug) ||
            docMap.has(parentRef.toLowerCase()) ||
            docMap.has(parentRef);
          if (!parentExists) {
            errors.push({
              doc: doc.id,
              file: doc.relativePath,
              message: `References "${typeDef.parentField}": "${parentRef}" but no matching document found`,
              severity: "error",
            });
          }
        }
      }
    }

    // Check title is not a placeholder
    if (doc.title && isPlaceholder(doc.title)) {
      warnings.push({
        doc: doc.id,
        file: doc.relativePath,
        message: `Title is still a placeholder: ${doc.title}`,
        severity: "warning",
      });
    }
  }

  // Cross-check: detect orphans (documents not referenced by any parent)
  const referencedIds = new Set();
  for (const doc of docs) {
    const typeDef = HIERARCHY_RULES[doc.type];
    if (typeDef && typeDef.parentField) {
      const parentRef = doc.frontmatter[typeDef.parentField];
      if (parentRef) {
        const parentId = docMap.get(parentRef.toLowerCase()) || docMap.get(parentRef);
        if (parentId) referencedIds.add(parentId.id);
      }
    }
    // Also add children references
    referencedIds.add(doc.id);
  }

  // Check for missing parent documents (orphans with missing parents)
  for (const doc of docs) {
    const typeDef = HIERARCHY_RULES[doc.type];
    if (typeDef && typeDef.parentField) {
      const parentRef = doc.frontmatter[typeDef.parentField];
      if (parentRef) {
        const parentDoc = docMap.get(parentRef.toLowerCase()) || docMap.get(parentRef);
        if (!parentDoc) {
          // Already reported as error above
        }
      } else if (typeDef.parentField) {
        warnings.push({
          doc: doc.id,
          file: doc.relativePath,
          message: `No "${typeDef.parentField}" specified — this ${typeDef.label} is not linked to a parent`,
          severity: "warning",
        });
      }
    }
  }

  // Hierarchy depth consistency
  for (const doc of docs) {
    if (doc.type === "task") {
      const storyRef = doc.frontmatter.story;
      if (storyRef) {
        const storyDoc = docMap.get(storyRef.toLowerCase()) || docMap.get(storyRef);
        if (storyDoc && storyDoc.type !== "user_story") {
          warnings.push({
            doc: doc.id,
            file: doc.relativePath,
            message: `Task's parent "${storyRef}" is type "${storyDoc.type}", expected "user_story"`,
            severity: "warning",
          });
        }
      }
    }
    if (doc.type === "user_story") {
      const epicRef = doc.frontmatter.epic;
      if (epicRef) {
        const epicDoc = docMap.get(epicRef.toLowerCase()) || docMap.get(epicRef);
        if (epicDoc && epicDoc.type !== "epic") {
          warnings.push({
            doc: doc.id,
            file: doc.relativePath,
            message: `Story's parent "${epicRef}" is type "${epicDoc.type}", expected "epic"`,
            severity: "warning",
          });
        }
      }
    }
  }

  return { errors, warnings };
}

// ──────────────────────────────────────────────
// Phase 4: Auto-Linking (wiki-style [[links]])
// ──────────────────────────────────────────────
// Single-page site — all links point to index.html hash routes

function autoLink(content, docMap) {
  // Replace [[Document Title]] with hash-based anchor links
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
    const trimmed = title.trim();
    const doc =
      docMap.get(trimmed.toLowerCase()) ||
      docMap.get(slugify(trimmed)) ||
      docMap.get(trimmed);
    if (doc) {
      return `<a href="#doc-${doc.id}" class="doc-link" data-doc-id="${doc.id}">${trimmed}</a>`;
    }
    return `<span class="broken-link" title="Document not found: ${trimmed}">${trimmed}</span>`;
  });
}

// ──────────────────────────────────────────────
// Phase 5: Page Generation
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Phase 5: Single-Page Site with Folder/List/Detail
// ──────────────────────────────────────────────

const CATEGORIES = [
  { type: "vision",     icon: "★",  label: "Vision",      plural: "Vision" },
  { type: "roadmap",    icon: "◆",  label: "Roadmap",     plural: "Roadmap" },
  { type: "epic",       icon: "▲",  label: "Epic",        plural: "Epics" },
  { type: "user_story", icon: "●",  label: "Story",       plural: "Stories" },
  { type: "task",       icon: "◼",  label: "Task",        plural: "Tasks" },
];

const STATUS_COLORS = {
  approved: "#34d399", done: "#34d399", refined: "#a78bfa",
  in_progress: "#60a5fa", review: "#f59e0b", draft: "#f59e0b",
  backlog: "#6b7280", todo: "#6b7280",
};

function renderDocArticle(doc, docMap) {
  const typeDef = HIERARCHY_RULES[doc.type] || {};
  const icon = typeDef.icon || "■";
  const color = typeDef.color || "#6b7280";
  const typeLabel = typeDef.label || doc.type;

  let rendered;
  try {
    rendered = marked.parse(doc.body);
  } catch {
    rendered = `<pre>${doc.body}</pre>`;
  }
  rendered = autoLink(rendered, docMap);

  const skipFields = ["title", "type", "body"];
  const labelMap = {
    status: "Status", version: "Version", last_updated: "Last Updated", author: "Author",
    created: "Created", quarter: "Quarter", theme: "Theme", epic: "Epic", story: "Story",
    size: "Size", feature_area: "Feature Area", scope_boundary: "Scope Boundary",
    story_points: "Story Points", category: "Category", assignee: "Assignee",
    dependencies: "Dependencies",
  };
  let metaRows = "";
  for (const [key, value] of Object.entries(doc.frontmatter)) {
    if (skipFields.includes(key) || key.startsWith("_")) continue;
    if (value === null || value === undefined || value === "") continue;
    let displayValue = value;
    if (Array.isArray(value)) {
      displayValue = value.map((v) => `• ${autoLink(String(v), docMap)}`).join("<br>");
    } else if (typeof value === "object") {
      displayValue = `<pre>${JSON.stringify(value, null, 2)}</pre>`;
    } else if (typeof value === "boolean") {
      displayValue = value ? "✅ Yes" : "❌ No";
    } else {
      displayValue = autoLink(String(value), docMap);
    }
    const label = labelMap[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    metaRows += `<tr><td class="meta-key">${label}</td><td class="meta-value">${displayValue}</td></tr>`;
  }

  return `
    <article id="doc-${doc.id}" class="doc-article" data-type="${doc.type}" data-status="${doc.status}">
      <div class="doc-header">
        <span class="doc-type-badge" style="background:${color}20; color:${color}; border:1px solid ${color}40;">
          ${icon} ${typeLabel}
        </span>
        <span class="doc-status-badge status-${doc.status}">${doc.status}</span>
      </div>
      <h1 class="doc-title">${doc.title}</h1>
      <div class="doc-meta"><table>${metaRows}</table></div>
      <div class="doc-body">${rendered}</div>
    </article>
  `;
}

function renderSidebar(docs) {
  let html = `<div class="nav-section"><a href="#" onclick="showOverview();return false;" id="nav-overview" class="nav-section-header">🏠 Overview</a></div>`;

  for (const cat of CATEGORIES) {
    const items = docs.filter((d) => d.type === cat.type);
    html += `<div class="nav-section">
      <a href="#" onclick="showCategory('${cat.type}');return false;" id="nav-cat-${cat.type}" class="nav-section-header" data-category="${cat.type}">
        ${cat.icon} ${cat.plural}
      </a>`;
    for (const doc of items) {
      const sc = STATUS_COLORS[doc.status] || "#6b7280";
      html += `<div class="nav-children">
        <a href="#" onclick="showDoc('${doc.id}');return false;" id="nav-doc-${doc.id}" class="nav-item" data-doc="${doc.id}">
          <span class="status-dot" style="background:${sc}"></span>
          <span>${doc.title}</span>
          <span class="nav-badge">${doc.status}</span>
        </a>
      </div>`;
    }
    html += `</div>`;
  }

  // Reference docs
  const refs = docs.filter((d) => d.type === "reference");
  if (refs.length > 0) {
    html += `<div class="nav-section"><div class="nav-section-title">📋 Other</div>`;
    for (const doc of refs) {
      const sc = STATUS_COLORS[doc.status] || "#6b7280";
      html += `<a href="#" onclick="showDoc('${doc.id}');return false;" id="nav-doc-${doc.id}" class="nav-item" data-doc="${doc.id}">
        <span class="status-dot" style="background:${sc}"></span>
        <span>${doc.title}</span>
        <span class="nav-badge">${doc.status}</span>
      </a>`;
    }
    html += `</div>`;
  }

  return html;
}

function renderListViews(docs) {
  let html = "";
  for (const cat of CATEGORIES) {
    const items = docs.filter((d) => d.type === cat.type);
    let rows = "";
    for (const doc of items) {
      const sc = STATUS_COLORS[doc.status] || "#6b7280";
      const typeDef = HIERARCHY_RULES[doc.type] || {};
      const color = typeDef.color || "#6b7280";
      rows += `<div class="list-item" onclick="showDoc('${doc.id}')" style="border-left-color:${color}">
        <span class="status-dot" style="background:${sc};width:10px;height:10px;flex-shrink:0;"></span>
        <div class="list-item-info">
          <div class="list-item-title">${doc.title}</div>
          <div class="list-item-meta">${doc.frontmatter.status || ""}${doc.frontmatter.theme ? " · " + doc.frontmatter.theme : ""}${doc.frontmatter.epic ? " · " + doc.frontmatter.epic : ""}${doc.frontmatter.story ? " · " + doc.frontmatter.story : ""}</div>
        </div>
        <span class="nav-badge">${doc.status}</span>
      </div>`;
    }

    html += `<div id="list-${cat.type}" class="view-panel list-panel">
      <div class="list-header">
        <span class="list-icon">${cat.icon}</span>
        <span class="list-title">${cat.plural}</span>
        <span class="list-count">${items.length} document${items.length !== 1 ? "s" : ""}</span>
      </div>
      ${rows || '<p style="color:#6b7280;padding:1rem;">No documents in this category.</p>'}
    </div>`;
  }
  return html;
}

function renderDetailViews(docs, docMap) {
  let html = "";
  for (const doc of docs) {
    html += `<div id="detail-${doc.id}" class="view-panel detail-panel">
      <a href="#" onclick="showCategory('${doc.type}');return false;" class="back-link">← Back to ${CATEGORIES.find(c => c.type === doc.type)?.plural || doc.type}</a>
      ${renderDocArticle(doc, docMap)}
    </div>`;
  }
  return html;
}

function renderValidationPanel(validation) {
  const { errors, warnings } = validation;
  const total = errors.length + warnings.length;
  let itemsHTML = "";
  const allItems = [
    ...errors.map((e) => ({ ...e, severity: "error" })),
    ...warnings.map((w) => ({ ...w, severity: "warning" })),
  ];
  for (const item of allItems) {
    const sev = item.severity || "warning";
    itemsHTML += `<div class="validation-item severity-${sev}">
      <span class="sev-badge ${sev}">${sev}</span>
      <div><strong>${item.doc}:</strong> ${item.message}${item.file ? `<br><span style="color:#6b7280;font-size:0.75rem;">${item.file}</span>` : ""}</div>
    </div>`;
  }
  const passCount = total === 0 ? "100%" : `${Math.round((1 - errors.length / total) * 100)}%`;
  return `<div id="validation-panel">
    <h2>🔍 Validation Report</h2>
    <div class="validation-summary">
      <div class="validation-stat ${errors.length === 0 ? "pass" : "fail"}">
        <div class="count">${errors.length}</div><div class="label">Errors</div>
      </div>
      <div class="validation-stat ${warnings.length === 0 ? "pass" : "warn"}">
        <div class="count">${warnings.length}</div><div class="label">Warnings</div>
      </div>
      <div class="validation-stat ${errors.length === 0 ? "pass" : "fail"}">
        <div class="count">${passCount}</div><div class="label">Pass Rate</div>
      </div>
    </div>
    ${itemsHTML ? `<div style="margin-top:1rem;">${itemsHTML}</div>` : '<p style="color:#34d399;font-size:0.9rem;">✅ All checks passed.</p>'}
  </div>`;
}

function renderOverviewContent(docs, validation, graphJSON) {
  const typeCounts = {};
  for (const doc of docs) typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;

  let cards = "";
  for (const cat of CATEGORIES) {
    const count = typeCounts[cat.type] || 0;
    cards += `<a href="#" onclick="showCategory('${cat.type}');return false;" class="overview-card">
      <div class="icon">${cat.icon}</div>
      <div class="count">${count}</div>
      <div class="label">${cat.plural}</div>
    </a>`;
  }

  return `
    <div id="view-overview" class="view-panel">
      <h1 style="font-size:2rem;font-weight:700;color:#fff;margin-bottom:0.5rem;">📋 Project Management Docs</h1>
      <p style="color:#6b7280;margin-bottom:2rem;">${docs.length} documents · ${validation.errors.length} errors · ${validation.warnings.length} warnings</p>

      ${renderValidationPanel(validation)}

      <h2 style="font-size:1.25rem;font-weight:600;color:#f3f4f6;margin-bottom:1rem;">Artifacts by Type</h2>
      <div class="overview-grid">${cards}</div>

      <h2 style="font-size:1.25rem;font-weight:600;color:#f3f4f6;margin:2rem 0 1rem;">Relationship Graph</h2>
      <p style="font-size:0.85rem;color:#6b7280;margin-bottom:1rem;">Drag nodes to explore. Click a node to navigate.</p>
      <div class="graph-legend" id="graphLegend"></div>
      <div id="graph-container"></div>
    </div>
  `;
}

function generateHTML(docs, graph, validation, docMap) {
  const graphJSON = JSON.stringify(graph);
  const navHTML = renderSidebar(docs);
  const overviewHTML = renderOverviewContent(docs, validation, graphJSON);
  const listViews = renderListViews(docs);
  const detailViews = renderDetailViews(docs, docMap);

  // Build a JS map: docId -> type
  const docTypeMap = {};
  for (const doc of docs) docTypeMap[doc.id] = doc.type;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PM Docs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 16px; scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0f1117; color: #e1e4eb;
      line-height: 1.6; display: flex; min-height: 100vh;
    }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code, pre { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    pre { background: #1a1d27; padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid #2a2d37; margin: 1rem 0; }
    code { background: #1a1d27; padding: 0.15em 0.4em; border-radius: 4px; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #2a2d37; }
    th { background: #1a1d27; font-weight: 600; }

    /* Layout */
    #sidebar { width: 300px; min-width: 300px; background: #14161f; border-right: 1px solid #2a2d37; height: 100vh; position: sticky; top: 0; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; }
    #main { flex: 1; overflow-y: auto; height: 100vh; }
    #content-area { padding: 2rem 3rem; max-width: 960px; }

    /* Sidebar */
    .sidebar-title { font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.25rem; }
    .sidebar-subtitle { font-size: 0.75rem; color: #6b7280; margin-bottom: 1.5rem; }
    .nav-section { margin-bottom: 1rem; }
    .nav-section-title { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.35rem; padding-left: 0.5rem; }
    .nav-item, .nav-section-header {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.35rem 0.5rem; border-radius: 6px;
      font-size: 0.85rem; color: #c4c9d4; transition: background 0.15s;
      cursor: pointer;
    }
    .nav-section-header { font-weight: 600; }
    .nav-item:hover, .nav-section-header:hover { background: #1e2130; color: #fff; }
    .nav-item.active, .nav-section-header.active { background: #1e3a5f; color: #60a5fa; }
    .nav-item .nav-badge { margin-left: auto; font-size: 0.6rem; padding: 0.1rem 0.4rem; border-radius: 10px; background: #2a2d37; color: #6b7280; }
    .nav-item .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .nav-children { padding-left: 1.25rem; }
    .nav-search { margin-bottom: 1rem; }
    .nav-search input { width: 100%; padding: 0.5rem 0.75rem; background: #1a1d27; border: 1px solid #2a2d37; border-radius: 8px; color: #e1e4eb; font-size: 0.8rem; outline: none; }
    .nav-search input:focus { border-color: #3b82f6; }

    /* View panels */
    .view-panel { display: none; }
    .view-panel.active { display: block; }

    /* Back link */
    .back-link { display: inline-block; font-size: 0.8rem; color: #6b7280; margin-bottom: 1rem; padding: 0.25rem 0; }
    .back-link:hover { color: #60a5fa; }

    /* List panel */
    .list-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
    .list-icon { font-size: 2rem; }
    .list-title { font-size: 1.5rem; font-weight: 700; color: #fff; }
    .list-count { font-size: 0.8rem; color: #6b7280; margin-left: auto; }
    .list-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; margin-bottom: 0.5rem;
      background: #1a1d27; border-radius: 8px;
      border-left: 3px solid #2a2d37;
      cursor: pointer; transition: background 0.15s;
    }
    .list-item:hover { background: #1e2130; }
    .list-item-info { flex: 1; min-width: 0; }
    .list-item-title { font-size: 0.9rem; font-weight: 600; color: #e1e4eb; }
    .list-item-meta { font-size: 0.7rem; color: #6b7280; margin-top: 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Detail panel */
    .detail-panel { }

    /* Document */
    .doc-header { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.5rem; }
    .doc-type-badge { font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.75rem; border-radius: 20px; }
    .doc-status-badge { font-size: 0.7rem; font-weight: 500; padding: 0.15rem 0.6rem; border-radius: 10px; }
    .status-draft { background: #f59e0b20; color: #f59e0b; }
    .status-review { background: #3b82f620; color: #60a5fa; }
    .status-approved { background: #10b98120; color: #34d399; }
    .status-refined { background: #8b5cf620; color: #a78bfa; }
    .status-in_progress { background: #3b82f620; color: #60a5fa; }
    .status-done { background: #10b98120; color: #34d399; }
    .status-backlog { background: #6b728020; color: #9ca3af; }
    .status-todo { background: #6b728020; color: #9ca3af; }
    .status-unknown { background: #6b728020; color: #6b7280; }
    .doc-title { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 1rem; line-height: 1.3; }
    .doc-meta table { margin: 1rem 0 2rem; font-size: 0.85rem; }
    .doc-meta .meta-key { color: #6b7280; font-weight: 500; width: 140px; vertical-align: top; }
    .doc-meta .meta-value { color: #c4c9d4; }
    .doc-body h2 { font-size: 1.35rem; font-weight: 600; color: #f3f4f6; margin-top: 2rem; margin-bottom: 0.75rem; padding-bottom: 0.25rem; border-bottom: 1px solid #2a2d37; }
    .doc-body h3 { font-size: 1.1rem; font-weight: 600; color: #d1d5db; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    .doc-body h4 { font-size: 0.95rem; font-weight: 600; color: #9ca3af; margin-top: 1rem; margin-bottom: 0.5rem; }
    .doc-body p { margin-bottom: 0.75rem; }
    .doc-body ul, .doc-body ol { margin: 0.5rem 0 1rem 1.5rem; }
    .doc-body li { margin-bottom: 0.25rem; }
    .doc-body blockquote { border-left: 3px solid #3b82f6; margin: 1rem 0; padding: 0.75rem 1rem; background: #1a1d27; border-radius: 0 8px 8px 0; color: #9ca3af; }
    .doc-body blockquote p:last-child { margin-bottom: 0; }
    .doc-body hr { border: none; border-top: 1px solid #2a2d37; margin: 2rem 0; }
    .doc-body img { max-width: 100%; border-radius: 8px; }
    .doc-body pre code { background: none; padding: 0; }
    .doc-link { color: #60a5fa; font-weight: 500; border-bottom: 1px dashed #3b82f640; }
    .doc-link:hover { border-bottom-style: solid; }
    .broken-link { color: #ef4444; border-bottom: 1px dashed #ef444480; cursor: help; }

    /* Graph */
    #graph-container { width: 100%; height: 450px; background: #0a0c12; border-radius: 12px; border: 1px solid #2a2d37; overflow: hidden; position: relative; margin-top: 1rem; }
    #graph-container svg { display: block; }
    .graph-legend { display: flex; flex-wrap: wrap; gap: 1rem; margin: 0.5rem 0; font-size: 0.8rem; }
    .graph-legend-item { display: flex; align-items: center; gap: 0.4rem; }

    /* Validation */
    #validation-panel { background: #1a1d27; border-radius: 12px; border: 1px solid #2a2d37; padding: 1.5rem; margin-bottom: 2rem; }
    #validation-panel h2 { font-size: 1.1rem; margin-top: 0; border-bottom: none; }
    .validation-summary { display: flex; gap: 1.5rem; margin: 1rem 0; }
    .validation-stat { text-align: center; padding: 0.75rem 1.25rem; border-radius: 8px; background: #0f1117; min-width: 80px; }
    .validation-stat .count { font-size: 1.5rem; font-weight: 700; }
    .validation-stat .label { font-size: 0.7rem; color: #6b7280; text-transform: uppercase; }
    .validation-stat.pass .count { color: #34d399; }
    .validation-stat.fail .count { color: #ef4444; }
    .validation-stat.warn .count { color: #f59e0b; }
    .validation-item { padding: 0.5rem 0.75rem; border-radius: 6px; margin: 0.25rem 0; font-size: 0.8rem; display: flex; align-items: flex-start; gap: 0.5rem; }
    .validation-item.severity-error { background: #ef444410; border-left: 3px solid #ef4444; }
    .validation-item.severity-warning { background: #f59e0b10; border-left: 3px solid #f59e0b; }
    .validation-item .sev-badge { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 4px; flex-shrink: 0; }
    .validation-item .sev-badge.error { background: #ef444420; color: #ef4444; }
    .validation-item .sev-badge.warning { background: #f59e0b20; color: #f59e0b; }
    .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1rem 0 2rem; }
    .overview-card { background: #1a1d27; border: 1px solid #2a2d37; border-radius: 12px; padding: 1.25rem; text-align: center; cursor: pointer; transition: background 0.15s; display: block; text-decoration: none; }
    .overview-card:hover { background: #1e2130; }
    .overview-card .icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .overview-card .count { font-size: 2.5rem; font-weight: 700; color: #fff; }
    .overview-card .label { font-size: 0.8rem; color: #6b7280; }

    /* Roadmap Timeline */
    .roadmap-timeline { display: flex; gap: 0.5rem; margin: 2rem 0; align-items: stretch; }
    .roadmap-timeline .phase { flex: 1; border-radius: 12px; padding: 1.25rem; border: 1px solid #2a2d37; position: relative; }
    .roadmap-timeline .phase.now { background: linear-gradient(135deg, #1e3a5f40, #1a1d27); border-color: #3b82f660; }
    .roadmap-timeline .phase.next { background: linear-gradient(135deg, #3b1f6e40, #1a1d27); border-color: #8b5cf660; }
    .roadmap-timeline .phase.later { background: linear-gradient(135deg, #1f293740, #1a1d27); border-color: #4a4d5760; }
    .roadmap-timeline .phase .label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .roadmap-timeline .phase.now .label { color: #60a5fa; }
    .roadmap-timeline .phase.next .label { color: #a78bfa; }
    .roadmap-timeline .phase.later .label { color: #6b7280; }
    .roadmap-timeline .phase .period { font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0.15rem 0 0.75rem; }
    .roadmap-timeline .phase .theme { font-size: 0.85rem; font-weight: 600; color: #d1d5db; margin-bottom: 0.5rem; }
    .roadmap-timeline .phase .epic-list { list-style: none; padding: 0; margin: 0; }
    .roadmap-timeline .phase .epic-list li { font-size: 0.8rem; color: #9ca3af; padding: 0.3rem 0; border-bottom: 1px solid #2a2d3730; display: flex; align-items: center; gap: 0.4rem; }
    .roadmap-timeline .phase .epic-list li:last-child { border-bottom: none; }
    .roadmap-timeline .phase .epic-list li::before { content: ""; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .roadmap-timeline .phase.now .epic-list li::before { background: #60a5fa; }
    .roadmap-timeline .phase.next .epic-list li::before { background: #a78bfa; }
    .roadmap-timeline .phase.later .epic-list li::before { background: #4a4d57; }
    .roadmap-timeline .phase .key-result { font-size: 0.7rem; color: #6b7280; font-style: italic; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px dashed #2a2d3740; }
    .roadmap-timeline .arrow { display: flex; align-items: center; color: #4a4d57; font-size: 1.5rem; flex-shrink: 0; padding: 0 0.25rem; user-select: none; }

    @media (max-width: 768px) {
      body { flex-direction: column; }
      #sidebar { width: 100%; min-width: auto; height: auto; position: static; }
      #content-area { padding: 1.5rem; }
      .roadmap-timeline { flex-direction: column; }
      .roadmap-timeline .arrow { transform: rotate(90deg); padding: 0.25rem 0; justify-content: center; }
      .view-panel.active { display: block; }
    }
  </style>
</head>
<body>
  <aside id="sidebar">
    <div class="sidebar-title">📋 PM Docs</div>
    <div class="sidebar-subtitle">${docs.length} documents</div>
    <div class="nav-search">
      <input type="text" id="searchInput" placeholder="Search..." oninput="filterNav(this.value)">
    </div>
    ${navHTML}
  </aside>
  <div id="main">
    <div id="content-area">
      ${overviewHTML}
      ${listViews}
      ${detailViews}
    </div>
  </div>

  <script>
    const graphData = ${graphJSON};
    const docTypeMap = ${JSON.stringify(docTypeMap)};

    // ─── Views ───
    function showOverview() {
      setActiveView('view-overview');
      setActiveNav('nav-overview');
      window.location.hash = '#';
    }

    function showCategory(type) {
      setActiveView('list-' + type);
      setActiveNav('nav-cat-' + type);
      window.location.hash = '#' + type;
    }

    function showDoc(id) {
      setActiveView('detail-' + id);
      setActiveNav('nav-doc-' + id);
      window.location.hash = '#doc-' + id;
    }

    function setActiveView(id) {
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
      const el = document.getElementById(id);
      if (el) { el.classList.add('active'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }

    function setActiveNav(id) {
      document.querySelectorAll('.nav-item, .nav-section-header').forEach(n => n.classList.remove('active'));
      const el = document.getElementById(id);
      if (el) el.classList.add('active');
    }

    // ─── Search ───
    function filterNav(query) {
      const q = query.toLowerCase().trim();
      document.querySelectorAll('.nav-item, .nav-section-header').forEach(item => {
        item.style.display = (!q || item.textContent.toLowerCase().includes(q)) ? '' : 'none';
      });
      document.querySelectorAll('.nav-section').forEach(section => {
        const visible = Array.from(section.querySelectorAll('.nav-item, .nav-section-header')).some(i => i.style.display !== 'none');
        section.style.display = visible ? '' : 'none';
      });
    }

    // ─── Hash routing ───
    function routeFromHash() {
      const hash = window.location.hash.slice(1);
      if (!hash || hash === '/') { showOverview(); return; }
      if (hash.startsWith('doc-')) { showDoc(hash.slice(4)); return; }
      // Check if it's a category name
      const cats = ['vision','roadmap','epic','user_story','task'];
      if (cats.includes(hash)) { showCategory(hash); return; }
      showOverview();
    }

    // ─── Graph ───
    function renderGraph() {
      const container = document.getElementById('graph-container');
      if (!container) return;
      const width = container.clientWidth;
      const height = 450;
      const legendEl = document.getElementById('graphLegend');
      const types = [...new Set(graphData.nodes.map(n => n.type))];
      const typeColors = { vision:'#e6b800', roadmap:'#3b82f6', epic:'#8b5cf6', user_story:'#10b981', task:'#14b8a6', reference:'#6b7280', unknown:'#ef4444' };
      const typeIcons = { vision:'★', roadmap:'◆', epic:'▲', user_story:'●', task:'◼', reference:'■', unknown:'?' };
      types.forEach(t => {
        const item = document.createElement('div'); item.className = 'graph-legend-item';
        item.innerHTML = '<span class="graph-legend-dot" style="background:' + (typeColors[t]||'#6b7280') + '"></span> ' + (typeIcons[t]||'') + ' ' + t.replace(/_/g,' ');
        legendEl.appendChild(item);
      });
      const nodes = graphData.nodes.map(n => ({...n}));
      const edges = graphData.edges.map(e => ({...e}));
      const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);
      const defs = svg.append('defs');
      defs.append('marker').attr('id','arrowhead').attr('viewBox','0 -5 10 10').attr('refX',25).attr('refY',0).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto').append('path').attr('d','M0,-5L10,0L0,5').attr('fill','#4a4d57');
      const simulation = d3.forceSimulation(nodes).force('link', d3.forceLink(edges).id(d=>d.id).distance(120)).force('charge', d3.forceManyBody().strength(-300)).force('center', d3.forceCenter(width/2, height/2)).force('collision', d3.forceCollide(40));
      const link = svg.append('g').selectAll('line').data(edges).join('line').attr('stroke','#4a4d57').attr('stroke-width',1.5).attr('stroke-opacity',0.5).attr('marker-end','url(#arrowhead)');
      const node = svg.append('g').selectAll('g').data(nodes).join('g').attr('cursor','pointer').call(d3.drag().on('start',(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;}).on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;}).on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}));
      node.append('circle').attr('r', d=>d.type==='vision'?14:d.type==='roadmap'?12:d.type==='epic'?10:d.type==='user_story'?8:6).attr('fill', d=>typeColors[d.type]||'#6b7280').attr('stroke','#0f1117').attr('stroke-width',2).attr('opacity',0.9);
      node.append('text').text(d=>{const i=typeIcons[d.type]||'■';return d.label.length>20?i+' '+d.label.substring(0,18)+'…':i+' '+d.label;}).attr('x', d=>d.type==='vision'?18:16).attr('y',4).attr('font-size','0.65rem').attr('fill','#c4c9d4').style('pointer-events','none');
      node.append('title').text(d=>d.label+' ('+d.type.replace(/_/g,' ')+')'+(d.status?' — '+d.status:''));
      node.on('click', (e,d)=>{
        if (docTypeMap[d.id]) showDoc(d.id);
      });
      simulation.on('tick', ()=>{link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);node.attr('transform',d=>'translate('+d.x+','+d.y+')');});
    }

    // ─── Init ───
    document.addEventListener('DOMContentLoaded', () => {
      renderGraph();
      routeFromHash();
      window.addEventListener('hashchange', routeFromHash);
    });
  </script>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// Validation Report Builder
// ──────────────────────────────────────────────
function buildValidationReport(validation) {
  const { errors, warnings } = validation;
  const total = errors.length + warnings.length;

  let itemsHTML = "";
  const allItems = [
    ...errors.map((e) => ({ ...e, severity: "error" })),
    ...warnings.map((w) => ({ ...w, severity: "warning" })),
  ];

  for (const item of allItems) {
    const sev = item.severity || "warning";
    itemsHTML += `<div class="validation-item severity-${sev}">
      <span class="sev-badge ${sev}">${sev}</span>
      <div>
        <strong>${item.doc}:</strong> ${item.message}
        ${item.file ? `<br><span style="color:#6b7280;font-size:0.75rem;">${item.file}</span>` : ""}
      </div>
    </div>`;
  }

  const passCount = total === 0 ? "100%" : `${Math.round((1 - errors.length / total) * 100)}%`;
  const passFailClass = errors.length === 0 ? "pass" : "fail";

  return `
    <div id="validation-panel">
      <h2>🔍 Validation Report</h2>
      <div class="validation-summary">
        <div class="validation-stat ${errors.length === 0 ? 'pass' : 'fail'}">
          <div class="count">${errors.length}</div>
          <div class="label">Errors</div>
        </div>
        <div class="validation-stat ${warnings.length === 0 ? 'pass' : 'warn'}">
          <div class="count">${warnings.length}</div>
          <div class="label">Warnings</div>
        </div>
        <div class="validation-stat ${passFailClass}">
          <div class="count">${passCount}</div>
          <div class="label">Pass Rate</div>
        </div>
      </div>
      ${itemsHTML ? `<div style="margin-top:1rem;">${itemsHTML}</div>` : '<p style="color:#34d399;font-size:0.9rem;">✅ All checks passed — no issues found.</p>'}
    </div>
  `;
}

// ──────────────────────────────────────────────
// Main Build
// ──────────────────────────────────────────────
function build() {
  console.log("🔨 Building documentation site...");

  // Discover files
  const files = discoverFiles();
  console.log(`  📄 Found ${files.length} markdown files`);

  // Parse documents
  const docs = files.map(parseDocument).filter(Boolean);
  console.log(`  📝 Parsed ${docs.length} documents`);

  // Build document map
  const docMap = buildDocumentMap(docs);

  // Build relationship graph
  const graph = buildGraph(docs, docMap);
  console.log(`  🔗 Built graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  // Validate
  const validation = validate(docs, docMap);
  console.log(`  ✅ Validation: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);

  // Generate single-page HTML
  const html = generateHTML(docs, graph, validation, docMap);
  const outputPath = path.join(OUTPUT_DIR, "index.html");
  writeFile(outputPath, html);
  console.log(`  💾 Written to ${relativePath(outputPath)}`);

  // Print summary
  if (validation.errors.length > 0) {
    console.log("\n❌ Errors:");
    for (const err of validation.errors) {
      console.log(`   • [${err.doc}] ${err.message}`);
    }
  }
  if (validation.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    for (const warn of validation.warnings) {
      console.log(`   • [${warn.doc}] ${warn.message}`);
    }
  }

  console.log("\n✨ Build complete!");
  return { docs, graph, validation };
}

// ──────────────────────────────────────────────
// Watch Mode
// ──────────────────────────────────────────────
function watch() {
  console.log("👀 Watching for changes...");
  build();

  const watcher = chokidar.watch(SOURCE_DIRS, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("change", (filePath) => {
    console.log(`\n📝 File changed: ${relativePath(filePath)}`);
    build();
  });

  watcher.on("add", (filePath) => {
    console.log(`\n📄 File added: ${relativePath(filePath)}`);
    build();
  });

  watcher.on("unlink", (filePath) => {
    console.log(`\n🗑️  File removed: ${relativePath(filePath)}`);
    build();
  });
}

// ──────────────────────────────────────────────
// Entry Point
// ──────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes("--validate-only")) {
  const files = discoverFiles();
  const docs = files.map(parseDocument).filter(Boolean);
  const docMap = buildDocumentMap(docs);
  const validation = validate(docs, docMap);
  console.log(JSON.stringify(validation, null, 2));
  process.exit(validation.errors.length > 0 ? 1 : 0);
} else if (args.includes("--watch")) {
  watch();
} else {
  build();
}
