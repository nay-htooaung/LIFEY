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
    requiredFields: ["title", "status", "type", "theme", "epic_number"],
    parentField: null,  // themes are embedded in roadmap docs, not separate artifacts
    description: "Feature-bounded initiative",
  },
  user_story: {
    label: "User Story",
    icon: "●",
    color: "#10b981",
    requiredFields: ["title", "status", "type", "epic", "story_number"],
    parentField: "epic",
    description: "Single user action or goal",
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
  return path.relative(ROOT, absPath).replace(/\\/g, "/");
}

function detectType(frontmatter, filePath) {
  if (frontmatter.type) return frontmatter.type;
  // Detect type from parent directory name
  const dir = path.basename(path.dirname(filePath));
  if (dir === "vision") return "vision";
  if (dir === "roadmap") return "roadmap";
  if (dir === "epic") return "epic";
  if (dir === "story" || dir === "stories") return "user_story";
  // Fallback for root-level files (e.g. templates)
  const basename = path.basename(filePath).toLowerCase();
  if (basename.includes("vision")) return "vision";
  if (basename.includes("roadmap")) return "roadmap";
  if (basename.includes("epic")) return "epic";
  if (basename.includes("story") || basename.includes("userstory")) return "user_story";
  if (basename.includes("granularity") || basename.includes("matrix")) return "reference";
  return "reference";
}

// ──────────────────────────────────────────────
// Phase 1: Document Discovery & Parsing
// ──────────────────────────────────────────────
function discoverFiles() {
  const files = [];
  function walk(dir) {
    // Skip templates directory
    if (path.basename(dir) === "templates") return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }
  for (const dir of SOURCE_DIRS) {
    if (fs.existsSync(dir)) walk(dir);
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
    // Map by relative path for resolving [text](path) links
    map.set(doc.relativePath, doc);
    // Also map by just the filename portion of the relative path
    const filenameOnly = path.basename(doc.relativePath).replace(/\.md$/, "");
    map.set(filenameOnly, doc);
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

  // Acceptance Criteria validation for user stories
  const acSummary = []; // { doc, storyId, total, exempt, missingExemptReason, gaps }
  for (const doc of docs) {
    if (doc.type !== "user_story") continue;

    // Extract ACs from Gherkin blocks
    const body = doc.body || "";
    const criteria = extractAcceptanceCriteria(body);
    doc._acCriteria = criteria;

    if (criteria.length === 0) {
      warnings.push({
        doc: doc.id,
        file: doc.relativePath,
        message: `No @AC-NNN acceptance criteria found in Gherkin blocks`,
        severity: "warning",
      });
      continue;
    }

    const entry = {
      doc: doc.id,
      storyId: doc.frontmatter.story_number || doc.id,
      total: criteria.length,
      exempt: criteria.filter((c) => c.isExempt).length,
      missingExemptReason: [],
      gaps: null,
      duplicates: [],
    };

    // Check for duplicate AC IDs
    const ids = criteria.map((c) => c.id);
    const seen = new Set();
    const duplicates = ids.filter((id) => {
      if (seen.has(id)) return true;
      seen.add(id);
      return false;
    });
    if (duplicates.length > 0) {
      entry.duplicates = [...new Set(duplicates)];
      for (const dup of entry.duplicates) {
        errors.push({
          doc: doc.id,
          file: doc.relativePath,
          message: `Duplicate acceptance criteria ID: ${dup}`,
          severity: "error",
        });
      }
    }

    // Check AC IDs are sequential (no gaps)
    const numbers = criteria.map((c) => c.number).sort((a, b) => a - b);
    if (numbers.length > 0) {
      for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] !== i + 1) {
          entry.gaps = `Expected AC-${String(i + 1).padStart(3, "0")}, found ${criteria.find((c) => c.number === numbers[i])?.id || "gap"}`;
          errors.push({
            doc: doc.id,
            file: doc.relativePath,
            message: `Non-sequential AC IDs: ${entry.gaps}`,
            severity: "error",
          });
          break;
        }
      }
    }

    // Check @TestExempt has an # ExemptReason: comment
    for (const crit of criteria) {
      if (crit.isExempt && !crit.exemptReason) {
        entry.missingExemptReason.push(crit.id);
        errors.push({
          doc: doc.id,
          file: doc.relativePath,
          message: `@TestExempt on ${crit.id} is missing an # ExemptReason: comment`,
          severity: "error",
        });
      }
    }

    acSummary.push(entry);
  }

  // Store AC summary for rendering
  if (typeof globalThis !== "undefined") globalThis.__acSummary = acSummary;
  // Also attach to validation result for --validate-only output
  const result = { errors, warnings };
  if (acSummary.length > 0) result.acSummary = acSummary;

  return result;
}

// ──────────────────────────────────────────────
// Phase 4: Auto-Linking (wiki-style [[links]] and [markdown links](path))
// ──────────────────────────────────────────────
// wiki-style [[Document Title]] → hash-based anchor links

// ──────────────────────────────────────────────
// Phase 3b: Acceptance Criteria Extraction & Validation
// ──────────────────────────────────────────────

/**
 * Extract numbered acceptance criteria from a document body.
 * Scans inside ```gherkin blocks for @AC-NNN tags.
 * Returns an array of { id, number, isExempt, exemptReason }.
 */
function extractAcceptanceCriteria(body) {
  const criteria = [];
  const gherkinBlockRegex = /```gherkin\r?\n([\s\S]*?)```/g;
  let match;
  while ((match = gherkinBlockRegex.exec(body)) !== null) {
    const gherkinContent = match[1];
    const lines = gherkinContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const acMatch = line.match(/^@AC-(\d{3})(\s+@TestExempt)?\s*$/);
      if (acMatch) {
        const number = parseInt(acMatch[1], 10);
        const isExempt = !!acMatch[2];
        let exemptReason = null;
        // Check next line for ExemptReason comment
        if (i + 1 < lines.length) {
          const reasonMatch = lines[i + 1].match(/^#\s*ExemptReason:\s*(.+)$/);
          if (reasonMatch) {
            exemptReason = reasonMatch[1].trim();
          }
        }
        criteria.push({ id: `AC-${acMatch[1]}`, number, isExempt, exemptReason });
      }
    }
  }
  return criteria;
}

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

/**
 * Preprocess epic document bodies to auto-link story names in Key Stories tables.
 * Scans the first table under a "Key Stories" heading and wraps matching story
 * names in [[wiki-link]] syntax so autoLink can resolve them.
 */
function preprocessEpicKeyStories(body, doc, docMap) {
  // Only process epic documents
  if (doc.type !== "epic") return body;

  // Split into sections by level-2 headings
  const sections = body.split(/(?=^##\s)/m);
  let found = false;

  const processed = sections.map((section) => {
    // Only process the first "User Stories" or "Key Stories" section
    if (found) return section;
    if (!/^##\s*(?:User|Key)\s+Stories\b/i.test(section)) return section;
    found = true;

    // Find the first markdown table in this section
    const tableMatch = section.match(
      /((?:\|[^\n]*\|\s*\n)+?)(?=\n\n|\n##|$)/
    );
    if (!tableMatch) return section;

    const tableBlock = tableMatch[1];
    const lines = tableBlock
      .split("\n")
      .filter((l) => l.trim().startsWith("|"));

    if (lines.length < 3) return section; // header + separator + at least 1 data row

    const headerRow = lines[0];
    const headerParts = headerRow.split("|").filter(Boolean);
    // Determine which column contains the story name by looking at headers
    const hasHashCol = headerParts.length >= 1 && headerParts[0].trim() === "#";
    const storyColIdx = hasHashCol ? 2 : 1;

    const updatedLines = lines.map((line, idx) => {
      // Skip header row and separator row
      if (idx === 0) return line;
      if (idx === 1) return line;

      // Data row — extract story name cell
      const parts = line.split("|");
      const minParts = hasHashCol ? 4 : 3;
      if (parts.length < minParts) return line; // malformed row

      const rawCell = parts[storyColIdx];
      const cellText = rawCell.trim();
      if (!cellText) return line;
      if (cellText.startsWith("[[")) return line; // already linked

      // Check if this matches a user_story document (exact title match only)
      const matchedDoc =
        docMap.get(cellText.toLowerCase()) ||
        docMap.get(cellText) ||
        docMap.get(slugify(cellText));

      if (matchedDoc && matchedDoc.type === "user_story") {
        parts[storyColIdx] = ` [[${cellText}]] `;
        return parts.join("|");
      }
      return line;
    });

    return section.replace(tableBlock, updatedLines.join("\n") + "\n");
  });

  return processed.join("");
}

/**
 * Resolve relative markdown links [text](path/to/file.md) to hash anchors.
 * Converts them to [text](#doc-slug) so they work in the single-page site
 * while the raw markdown links work on GitHub.
 */
function resolveRelativeLinks(body, doc, docMap) {
  // Match markdown links: [text](path) — but skip http://, https://, #, and data: URIs
  return body.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    (match, text, href) => {
      // Skip absolute URLs and hash-only references
      if (/^(https?:\/\/|#|data:|mailto:)/i.test(href)) return match;

      // Resolve relative path against the current doc's directory
      const docDir = path.dirname(doc.filePath);
      const resolved = path.resolve(docDir, href);
      const relative = path.relative(ROOT, resolved).replace(/\\/g, "/");

      // Look up the resolved path in the docMap
      const linkedDoc = docMap.get(relative) || docMap.get(relative.replace(/\.md$/, ""));
      if (linkedDoc) {
        return `[${text}](#doc-${linkedDoc.id})`;
      }
      return match; // leave as-is if not found
    }
  );
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

  // Preprocess epic bodies: auto-link story names in Key Stories tables
  let body = preprocessEpicKeyStories(doc.body, doc, docMap);

  // Resolve relative [text](path.md) links to hash anchors
  body = resolveRelativeLinks(body, doc, docMap);

  let rendered;
  try {
    rendered = marked.parse(body);
  } catch {
    rendered = `<pre>${body}</pre>`;
  }
  rendered = autoLink(rendered, docMap);

  const skipFields = ["title", "type", "body"];
  const labelMap = {
    status: "Status", version: "Version", last_updated: "Last Updated", author: "Author",
    created: "Created", quarter: "Quarter", theme: "Theme", epic: "Epic", story: "Story",
    size: "Size", feature_area: "Feature Area", scope_boundary: "Scope Boundary",
    story_points: "Story Points", category: "Category", assignee: "Assignee",
    dependencies: "Dependencies", epic_number: "Epic #", story_number: "Story #",
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
  const epics = docs.filter((d) => d.type === "epic");
  const epicMap = {};
  for (const ep of epics) epicMap[ep.title] = ep;

  for (const cat of CATEGORIES) {
    const items = docs.filter((d) => d.type === cat.type);
    let rows = "";

    if (cat.type === "user_story") {
      // Group stories under their parent epics
      const storyGroups = {};
      for (const story of items) {
        const epicRef = story.frontmatter.epic || "Unlinked";
        if (!storyGroups[epicRef]) storyGroups[epicRef] = [];
        storyGroups[epicRef].push(story);
      }

      const sortedGroups = Object.entries(storyGroups).sort((a, b) => a[0].localeCompare(b[0]));
      for (const [epicTitle, groupStories] of sortedGroups) {
        const ep = epicMap[epicTitle];
        const epId = ep ? ep.id : "";
        const epicColor = HIERARCHY_RULES.epic.color;
        rows += `<div class="list-group-header" onclick="${epId ? "showDoc('" + epId + "')" : ""}" style="border-bottom-color:${epicColor}40;">
          <span style="font-size:0.75rem;color:${epicColor};">▲</span>
          <span class="list-group-title">${epicTitle}</span>
          <span class="nav-badge">${groupStories.length}</span>
        </div>`;

        for (const story of groupStories) {
          const gram = HIERARCHY_RULES.user_story;
          rows += `<div class="list-item" onclick="showDoc('${story.id}')" style="padding-left:2rem;">
            <span style="font-size:0.7rem;color:${gram.color};">●</span>
            <div class="list-item-info">
              <div class="list-item-title">${story.title}</div>
              <div class="list-item-meta">${story.frontmatter.status || ""}</div>
            </div>
            <span class="nav-badge">${story.status}</span>
          </div>`;
        }
      }
    } else {
      // Flat list for other types
      for (const doc of items) {
        const typeDef = HIERARCHY_RULES[doc.type] || {};
        const color = typeDef.color || "#6b7280";
        const icon = typeDef.icon || "■";
        rows += `<div class="list-item" onclick="showDoc('${doc.id}')">
          <span style="font-size:0.7rem;color:${color};">${icon}</span>
          <div class="list-item-info">
            <div class="list-item-title">${doc.title}</div>
            <div class="list-item-meta">${doc.frontmatter.status || ""}${doc.frontmatter.theme ? " · " + doc.frontmatter.theme : ""}${doc.frontmatter.epic ? " · " + doc.frontmatter.epic : ""}${doc.frontmatter.story ? " · " + doc.frontmatter.story : ""}</div>
          </div>
          <span class="nav-badge">${doc.status}</span>
        </div>`;
      }
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

  // AC Summary section
  let acHTML = "";
  if (validation.acSummary && validation.acSummary.length > 0) {
    const totalACs = validation.acSummary.reduce((s, e) => s + e.total, 0);
    const exemptACs = validation.acSummary.reduce((s, e) => s + e.exempt, 0);
    const testableACs = totalACs - exemptACs;
    let acRows = "";
    for (const entry of validation.acSummary) {
      const hasIssues = entry.gaps || entry.duplicates.length > 0 || entry.missingExemptReason.length > 0;
      acRows += `<tr class="${hasIssues ? "ac-issue" : ""}">
        <td><a href="#doc-${entry.doc}">${entry.storyId}</a></td>
        <td>${entry.total}</td>
        <td>${entry.exempt > 0 ? entry.exempt : "—"}</td>
        <td>${entry.total - entry.exempt}</td>
        <td>${entry.gaps ? `<span class="sev-badge error">gap</span> ${entry.gaps}` : "✅"}</td>
        <td>${entry.duplicates.length > 0 ? `<span class="sev-badge error">dup</span> ${entry.duplicates.join(", ")}` : "✅"}</td>
        <td>${entry.missingExemptReason.length > 0 ? `<span class="sev-badge error">missing</span> ${entry.missingExemptReason.join(", ")}` : "✅"}</td>
      </tr>`;
    }
    acHTML = `<div style="margin-top:1.5rem; border-top:1px solid #334155; padding-top:1rem;">
      <h3>📋 Acceptance Criteria Coverage</h3>
      <div class="validation-summary">
        <div class="validation-stat pass">
          <div class="count">${totalACs}</div><div class="label">Total ACs</div>
        </div>
        <div class="validation-stat warn">
          <div class="count">${exemptACs}</div><div class="label">Test-Exempt</div>
        </div>
        <div class="validation-stat pass">
          <div class="count">${testableACs}</div><div class="label">Testable</div>
        </div>
      </div>
      <table class="ac-summary-table">
        <thead>
          <tr>
            <th>Story</th>
            <th>Total</th>
            <th>Exempt</th>
            <th>Testable</th>
            <th>Sequential</th>
            <th>Duplicates</th>
            <th>ExemptReason</th>
          </tr>
        </thead>
        <tbody>${acRows}</tbody>
      </table>
    </div>`;
  }

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
    ${acHTML}
    ${itemsHTML ? `<div style="margin-top:1rem;">${itemsHTML}</div>` : '<p style="color:#34d399;font-size:0.9rem;">✅ All checks passed.</p>'}
  </div>`;
}

function renderEpicTree(docs) {
  const epics = docs.filter((d) => d.type === "epic");
  const stories = docs.filter((d) => d.type === "user_story");

  // Group stories by their epic frontmatter reference
  const storyMap = {};
  for (const story of stories) {
    const epicRef = story.frontmatter.epic;
    if (epicRef) {
      if (!storyMap[epicRef]) storyMap[epicRef] = [];
      storyMap[epicRef].push(story);
    }
  }

  let html = `<div class="epic-tree">`;
  for (const epic of epics) {
    const childStories = storyMap[epic.title] || [];
    const epigram = HIERARCHY_RULES.epic;
    const storygram = HIERARCHY_RULES.user_story;

    html += `<div class="epic-tree-node">
      <div class="epic-tree-header" onclick="toggleEpicTree(this)">
        <span class="epic-tree-arrow">▶</span>
        <span style="font-size:0.8rem;color:${epigram.color};">${epigram.icon}</span>
        <span class="epic-tree-title" onclick="event.stopPropagation();showDoc('${epic.id}')">${epic.title}</span>
        <span class="epic-tree-spacer"></span>
        <span class="nav-badge">${epic.status}</span>
        <span class="epic-tree-count">${childStories.length} ${childStories.length === 1 ? "story" : "stories"}</span>
      </div>
      <div class="epic-tree-children" style="display:none;">`;

    for (const story of childStories) {
      html += `<div class="epic-tree-story">
        <span style="font-size:0.7rem;color:${storygram.color};">${storygram.icon}</span>
        <span class="epic-tree-story-title" onclick="event.stopPropagation();showDoc('${story.id}')">${story.title}</span>
        <span class="epic-tree-spacer"></span>
        <span class="nav-badge">${story.status}</span>
      </div>`;
    }

    if (childStories.length === 0) {
      html += `<div class="epic-tree-empty">No stories linked yet</div>`;
    }

    html += `</div></div>`;
  }
  html += `</div>`;
  return html;
}

function parseRoadmapPhases(docs) {
  const roadmapDoc = docs.find((d) => d.type === "roadmap");
  if (!roadmapDoc) return [];

  const phases = roadmapDoc.frontmatter?.phases;
  if (!Array.isArray(phases)) return [];

  // Cross-reference epic names with actual epic docs for status
  for (const p of phases) {
    if (!p.themes) continue;
    for (const t of p.themes) {
      if (!t.epics) continue;
      t.epics = t.epics.map((name) => {
        const epicDoc = docs.find(
          (d) => d.type === "epic" && d.title.toLowerCase() === name.toLowerCase()
        );
        return {
          name: typeof name === "string" ? name : name.name,
          doc: epicDoc,
          status: epicDoc ? epicDoc.status : null,
        };
      });
    }
  }

  return phases;
}

function renderRoadmapTimeline(docs) {
  const phases = parseRoadmapPhases(docs);
  if (phases.length === 0) return "";

  const nowColor = "#3b82f6";
  const nextColor = "#8b5cf6";
  const laterColor = "#4a4d57";

  let phasesHtml = "";
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const color = p.label === "NOW" ? nowColor : p.label === "NEXT" ? nextColor : laterColor;
    const borderOpacity = p.label === "NOW" ? "60" : p.label === "NEXT" ? "50" : "40";

    let themesHtml = "";
    for (const t of p.themes) {
      let epicsHtml = "";
      for (const e of t.epics) {
        const isTbd = e.name === "TBD" || !e.status;
        const statusColor = e.status && e.status !== "unknown"
          ? (STATUS_COLORS[e.status] || "#6b7280")
          : "#4a4d57";
        const nameClass = isTbd ? 'rm-epic-name tbd' : 'rm-epic-name';
        const nameStyle = isTbd ? ' style="color:#4a4d57;font-style:italic;"' : '';
        epicsHtml += `<div class="rm-epic" style="background:${color}15;">
          <span class="rm-epic-dot" style="background:${isTbd ? '#2a2d37' : statusColor};"></span>
          <span class="${nameClass}"${nameStyle}>${e.name}</span>
        </div>`;
      }
      themesHtml += `<div class="rm-theme">
        <div class="rm-theme-name" style="color:${color};">${t.name}</div>
        <div class="rm-theme-epics">${epicsHtml}</div>
      </div>`;
    }

    phasesHtml += `<div class="rm-phase" style="border-color:${color}${borderOpacity};">
      <div class="rm-phase-header" style="background:${color}10;">
        <span class="rm-phase-label" style="color:${color};">${p.label}</span>
        <span class="rm-phase-quarter">${p.quarter}</span>
      </div>
      <div class="rm-phase-title">${p.title}</div>
      <div class="rm-phase-themes">${themesHtml}</div>
    </div>`;

    if (i < phases.length - 1) {
      phasesHtml += `<div class="rm-arrow">→</div>`;
    }
  }

  return `<div class="roadmap-scroll"><div class="roadmap-container">${phasesHtml}</div></div>`;
}

function renderOverviewContent(docs) {
  return `
    <div id="view-overview" class="view-panel">
      <div class="list-header" style="margin-top:0;">
        <span class="list-icon">📋</span>
        <span class="list-title">Overview</span>
        <span class="list-count">${docs.length} documents</span>
      </div>
      <h2 style="font-size:0.8rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 0.75rem;padding:0 0.75rem;">Roadmap</h2>
      ${renderRoadmapTimeline(docs)}
    </div>
  `;
}

function generateHTML(docs, graph, validation, docMap) {
  const graphJSON = JSON.stringify(graph);
  const navHTML = renderSidebar(docs);
  const overviewHTML = renderOverviewContent(docs);
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
    .list-header { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #2a2d37; }
    .list-icon { font-size: 1.25rem; }
    .list-title { font-size: 1.25rem; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .list-count { font-size: 0.75rem; color: #4a4d57; margin-left: auto; font-feature-settings: "tnum"; }
    .list-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid #1e2030;
      cursor: pointer; transition: background 0.1s, color 0.1s;
    }
    .list-item:last-child { border-bottom: none; }
    .list-item:hover { background: #161822; }
    .list-item-info { flex: 1; min-width: 0; }
    .list-item-title { font-size: 0.875rem; font-weight: 500; color: #c4c9d4; transition: color 0.1s; }
    .list-item:hover .list-item-title { color: #e1e4eb; }
    .list-item-meta { font-size: 0.7rem; color: #4a4d57; margin-top: 0.1rem; }
    .list-group-header {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.65rem 0.75rem 0.35rem; margin-top: 1.25rem;
      border-bottom: 1px solid #2a2d37; cursor: pointer;
      transition: opacity 0.1s;
    }
    .list-group-header:first-of-type { margin-top: 0; }
    .list-group-header:hover { opacity: 0.85; }
    .list-group-title { font-size: 0.75rem; font-weight: 600; color: #6b7280; flex: 1; text-transform: uppercase; letter-spacing: 0.04em; }

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

    /* Epic Tree */
    .epic-tree { margin: 1.5rem 0 2.5rem; }
    .epic-tree-node { margin-bottom: 0.25rem; }
    .epic-tree-header {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid #2a2d37;
      cursor: pointer; user-select: none;
      transition: background 0.1s;
    }
    .epic-tree-header:hover { background: #161822; }
    .epic-tree-arrow { font-size: 0.65rem; color: #4a4d57; width: 1rem; text-align: center; flex-shrink: 0; transition: transform 0.15s; }
    .epic-tree-header.open .epic-tree-arrow { transform: rotate(90deg); }
    .epic-tree-icon { font-size: 0.8rem; flex-shrink: 0; }
    .epic-tree-title { font-size: 0.9rem; font-weight: 600; color: #e1e4eb; cursor: pointer; flex-shrink: 0; }
    .epic-tree-title:hover { color: #60a5fa; }
    .epic-tree-spacer { flex: 1; min-width: 0.5rem; }
    .epic-tree-count { font-size: 0.7rem; color: #4a4d57; margin-left: 0.5rem; font-feature-settings: "tnum"; }
    .epic-tree-children { }
    .epic-tree-story {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.45rem 0.75rem 0.45rem 2rem;
      border-bottom: 1px solid #1e2030;
      cursor: pointer; transition: background 0.1s;
      font-size: 0.85rem;
    }
    .epic-tree-story:last-child { border-bottom: none; }
    .epic-tree-story:hover { background: #161822; }
    .epic-tree-story-title { color: #c4c9d4; cursor: pointer; flex-shrink: 0; }
    .epic-tree-story-title:hover { color: #60a5fa; }
    .epic-tree-empty { padding: 0.5rem 0.75rem 0.5rem 2rem; font-size: 0.8rem; color: #4a4d57; font-style: italic; }

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
    .ac-summary-table { font-size: 0.8rem; margin-top: 0.75rem; }
    .ac-summary-table th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; color: #6b7280; }
    .ac-summary-table td, .ac-summary-table th { padding: 0.4rem 0.6rem; }
    .ac-summary-table tr.ac-issue { background: #ef444408; }
    .ac-summary-table .sev-badge { font-size: 0.6rem; font-weight: 600; text-transform: uppercase; padding: 0.05rem 0.35rem; border-radius: 4px; }
    .ac-summary-table .sev-badge.error { background: #ef444420; color: #ef4444; }
    .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin: 1rem 0 2rem; }
    .overview-card { background: #1a1d27; border: 1px solid #2a2d37; border-radius: 12px; padding: 1.25rem; text-align: center; cursor: pointer; transition: background 0.15s; display: block; text-decoration: none; }
    .overview-card:hover { background: #1e2130; }
    .overview-card .icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .overview-card .count { font-size: 2.5rem; font-weight: 700; color: #fff; }
    .overview-card .label { font-size: 0.8rem; color: #6b7280; }

    /* Roadmap Timeline */
    .roadmap-scroll { overflow-x: auto; overflow-y: visible; margin: 0 0 2rem; padding-bottom: 0.75rem; scrollbar-width: thin; scrollbar-color: #2a2d37 transparent; }
    .roadmap-scroll::-webkit-scrollbar { height: 6px; }
    .roadmap-scroll::-webkit-scrollbar-track { background: transparent; }
    .roadmap-scroll::-webkit-scrollbar-thumb { background: #2a2d37; border-radius: 3px; }
    .roadmap-scroll::-webkit-scrollbar-thumb:hover { background: #3a3d47; }
    .roadmap-container { display: flex; gap: 0.5rem; align-items: stretch; min-width: min-content; padding: 0 0.75rem; }
    .rm-phase { flex: 1; min-width: 280px; max-width: 380px; border: 1px solid; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
    .rm-phase-header { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.85rem; border-radius: 7px 7px 0 0; }
    .rm-phase-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .rm-phase-quarter { font-size: 0.65rem; color: #6b7280; }
    .rm-phase-title { font-size: 0.8rem; color: #9ca3af; padding: 0 0.85rem 0.6rem; }
    .rm-phase-themes { padding: 0 0.85rem 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .rm-theme { }
    .rm-theme-name { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.35rem; }
    .rm-theme-epics { display: flex; flex-direction: column; gap: 0.2rem; }
    .rm-epic { display: flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.78rem; color: #d1d5db; }
    .rm-epic-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .rm-epic-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rm-epic-name.tbd { color: #4a4d57; font-style: italic; }
    .rm-arrow { display: flex; align-items: center; color: #4a4d57; font-size: 1.25rem; flex-shrink: 0; user-select: none; opacity: 0.5; }

    @media (max-width: 768px) {
      body { flex-direction: column; }
      #sidebar { width: 100%; min-width: auto; height: auto; position: static; }
      #content-area { padding: 1.5rem; }
      .roadmap-container { flex-direction: column; align-items: stretch; }
      .rm-phase { max-width: none; min-width: auto; }
      .rm-arrow { transform: rotate(90deg); padding: 0.25rem 0; justify-content: center; }
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
      ${renderValidationPanel(validation)}
      ${listViews}
      ${detailViews}
    </div>
  </div>

  <script>
    const graphData = ${graphJSON};
    const docTypeMap = ${JSON.stringify(docTypeMap)};

    // ─── Epic Tree ───
    function toggleEpicTree(header) {
      const children = header.nextElementSibling;
      if (!children) return;
      const isOpen = children.style.display !== 'none';
      children.style.display = isOpen ? 'none' : 'block';
      header.classList.toggle('open', !isOpen);
    }

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
      const cats = ['vision','roadmap','epic','user_story'];
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
      const typeColors = { vision:'#e6b800', roadmap:'#3b82f6', epic:'#8b5cf6', user_story:'#10b981', reference:'#6b7280', unknown:'#ef4444' };
      const typeIcons = { vision:'★', roadmap:'◆', epic:'▲', user_story:'●', reference:'■', unknown:'?' };
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
  if (validation.acSummary && validation.acSummary.length > 0) {
    const totalACs = validation.acSummary.reduce((s, e) => s + e.total, 0);
    const exemptACs = validation.acSummary.reduce((s, e) => s + e.exempt, 0);
    console.log(`  📋 Acceptance Criteria: ${totalACs} total, ${exemptACs} exempt`);
    for (const entry of validation.acSummary) {
      console.log(`     ${entry.storyId} (${entry.doc}): ${entry.total} ACs${entry.exempt > 0 ? `, ${entry.exempt} exempt` : ""}`);
    }
  }

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
