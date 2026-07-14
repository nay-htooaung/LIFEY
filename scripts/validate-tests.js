#!/usr/bin/env node

/**
 * validate-tests.js
 *
 * Validates test coverage against story acceptance criteria.
 * Uses file naming and function naming conventions to trace
 * tests back to stories and epics.
 *
 * Conventions verified:
 *   - Test files: EP<EP>_ST<ST>_<description>.test.* / .spec.*
 *   - Test functions: test_ac_<NNN>_<description> (language-agnostic regex)
 *   - File header: Story: EP<EP>-ST<ST> — <title>
 *
 * Usage:
 *   node scripts/validate-tests.js --story EP0004-ST0001   # one story
 *   node scripts/validate-tests.js --epic EP0004            # whole epic
 *   node scripts/validate-tests.js --all                    # everything
 *   node scripts/validate-tests.js --story EP0004-ST0001 --run   # also execute tests
 *   node scripts/validate-tests.js --all --json                  # JSON output
 *
 * Exit codes:
 *   0 — all checks pass (or no tests exist yet)
 *   1 — missing tests or uncovered ACs
 *   2 — test runner failed (with --run)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Configuration ───────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const STORY_DIR = path.join(ROOT, "docs/project-management/04-story");
const EPIC_DIR = path.join(ROOT, "docs/project-management/03-epic");
const TEST_SEARCH_DIRS = [
  path.join(ROOT, "backend/tests"),
  path.join(ROOT, "frontend/src"),
];

// Supported test file patterns (glob-friendly)
const TEST_FILE_PATTERN = /^EP(\d{4})_ST(\d{4})_.+\.(test|spec)\.\w+$/i;
const AC_FUNC_PATTERN = /(?:def|function|it\(|test)\s+test_ac_(\d{3})(?:_|\)|\b)/gi;
const STORY_HEADER_PATTERN = /Story:\s*(EP\d{4}-ST\d{4})\s*—\s*(.+)/i;
const AC_TAG_PATTERN = /@AC-(\d{3})/g;
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) return {};
  const yaml = match[1].replace(/\r/g, "");
  const fields = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [, key, val] = trimmed.match(/^(\w+):\s*(.+)/) || [];
    if (key) fields[key] = val.replace(/^["']|["']$/g, "").trim();
  }
  return fields;
}

function extractACTags(content) {
  const tags = new Set();
  let match;
  while ((match = AC_TAG_PATTERN.exec(content)) !== null) {
    tags.add(match[1]); // "001", "002", etc.
  }
  return [...tags].sort();
}

function extractTestFunctions(content) {
  const funcs = [];
  let match;
  while ((match = AC_FUNC_PATTERN.exec(content)) !== null) {
    funcs.push(match[1]); // "001", "002", etc.
  }
  return [...new Set(funcs)].sort();
}

function parseStoryRef(filename) {
  // Filenames: EP0004-ST0001-create-and-manage-task-lists.md
  // or:        EP0004_ST0001_create_and_manage_task_lists.test.py
  const match = filename.match(/(EP\d{4})[-_]?(ST\d{4})/i);
  if (!match) return null;
  return { epic: match[1].toUpperCase(), story: match[2].toUpperCase() };
}

function globRecursive(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...globRecursive(fullPath, pattern));
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Data Loaders ────────────────────────────────────────────────────────────

function loadAllStories() {
  if (!fs.existsSync(STORY_DIR)) return [];
  const stories = [];
  for (const file of fs.readdirSync(STORY_DIR)) {
    const filePath = path.join(STORY_DIR, file);
    if (!file.endsWith(".md") || !fs.statSync(filePath).isFile()) continue;
    const ref = parseStoryRef(file);
    if (!ref) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    const acTags = extractACTags(content);
    stories.push({
      ref: `${ref.epic}-${ref.story}`,
      epic: ref.epic,
      story: ref.story,
      title: fm.title || file,
      file: filePath,
      acTags,
      status: fm.status || "Unknown",
    });
  }
  return stories;
}

function loadAllEpics() {
  if (!fs.existsSync(EPIC_DIR)) return [];
  const epics = [];
  for (const file of fs.readdirSync(EPIC_DIR)) {
    const filePath = path.join(EPIC_DIR, file);
    if (!file.endsWith(".md") || !fs.statSync(filePath).isFile()) continue;
    const match = file.match(/^(EP\d{4})/i);
    if (!match) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    const fm = parseFrontmatter(content);
    epics.push({
      epic: match[1].toUpperCase(),
      title: fm.title || file,
      file: filePath,
    });
  }
  return epics;
}

function findTestFiles(storyRef) {
  // storyRef = "EP0004-ST0001"
  const [epic, story] = storyRef.split("-");
  // Match EP0004_ST0001_* or EP0004-ST0001-* (with various extensions)
  const patterns = [
    new RegExp(`${epic}_${story}_.*\\.(test|spec)\\.\\w+$`, "i"),
    new RegExp(`${epic}-${story}-.*\\.(test|spec)\\.\\w+$`, "i"),
  ];
  const results = [];
  for (const dir of TEST_SEARCH_DIRS) {
    for (const pattern of patterns) {
      results.push(...globRecursive(dir, pattern));
    }
  }
  return [...new Set(results)];
}

function parseTestFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const funcs = extractTestFunctions(content);
  const headerMatch = content.match(STORY_HEADER_PATTERN);
  return {
    file: filePath,
    storyRef: headerMatch ? headerMatch[1] : null,
    storyTitle: headerMatch ? headerMatch[2] : null,
    functions: funcs,
  };
}

// ─── Reporters ───────────────────────────────────────────────────────────────

function indent(text, level = 1) {
  return text
    .split("\n")
    .map((l) => "  ".repeat(level) + l)
    .join("\n");
}

function acStatusIcon(covered, found) {
  if (covered && found) return "✅";
  if (covered && !found) return "❌";
  if (!covered && found) return "⚠️"; // extra test, no AC
  return "⬜"; // no AC, no test
}

function reportStory(story, testData) {
  const lines = [];
  lines.push(`${story.ref} — ${story.title}`);
  lines.push(`  📄 ${path.relative(ROOT, story.file)}`);
  lines.push(`  Status: ${story.status}`);
  lines.push(`  Expected ACs: ${story.acTags.length ? story.acTags.map((a) => `AC-${a}`).join(", ") : "(none)"}`);

  if (testData) {
    lines.push(`  Tests found: ${path.relative(ROOT, testData.file)}`);
    const allAcs = new Set(story.acTags);
    const testedAcs = new Set(testData.functions);
    const covered = story.acTags.filter((a) => testedAcs.has(a));
    const missing = story.acTags.filter((a) => !testedAcs.has(a));
    const extra = testData.functions.filter((a) => !allAcs.has(a));

    for (const ac of story.acTags) {
      const found = testedAcs.has(ac);
      lines.push(`  ${acStatusIcon(true, found)} AC-${ac} → test_ac_${ac}${found ? "_..." : ""}`);
    }
    if (extra.length) {
      for (const ac of extra) {
        lines.push(`  ${acStatusIcon(false, true)} AC-${ac} (extra test — no matching AC in story)`);
      }
    }
    lines.push(`  Coverage: ${covered.length}/${story.acTags.length} ACs`);
  } else {
    lines.push(`  Tests: ❌ No test file found`);
    for (const ac of story.acTags) {
      lines.push(`  ❌ AC-${ac} → (no test)`);
    }
    lines.push(`  Coverage: 0/${story.acTags.length} ACs`);
  }

  return { lines: lines.join("\n"), covered: testData ? story.acTags.length : 0, total: story.acTags.length, title: story.title };
}

function reportEpic(epic, stories, passed, total) {
  const lines = [];
  lines.push(`${epic.epic} — ${epic.title}`);
  lines.push(`  📄 ${path.relative(ROOT, epic.file)}`);
  lines.push("");
  lines.push("  Stories:");
  for (const s of stories) {
    const pct = s.total > 0 ? Math.round((s.passed / s.total) * 100) : 0;
    const icon = s.passed === s.total && s.total > 0 ? "✅" : s.total === 0 ? "⬜" : "❌";
    lines.push(`    ${icon} ${s.ref}: ${s.title}  ${s.passed}/${s.total} ACs  (${pct}%)`);
  }
  lines.push("");
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  const icon = passed === total && total > 0 ? "✅" : total === 0 ? "⬜" : "❌";
  lines.push(`  Epic coverage: ${icon} ${passed}/${total} ACs across ${stories.length} stories (${pct}%)`);
  return lines.join("\n");
}

function reportAll(epicReports, totalPassed, totalACs, totalStories, totalWithTests) {
  const lines = [];
  lines.push("All Epics — Test Coverage Validation");
  lines.push("=".repeat(50));
  lines.push("");
  for (const r of epicReports) {
    const pct = r.totalACs > 0 ? Math.round((r.totalPassed / r.totalACs) * 100) : 0;
    const icon = r.totalPassed === r.totalACs && r.totalACs > 0 ? "✅" : r.totalACs === 0 ? "⬜" : "❌";
    lines.push(`  ${icon} ${r.epic}: ${r.title}  ${r.storiesWithTests}/${r.storyCount} stories tested  ${r.totalPassed}/${r.totalACs} ACs (${pct}%)`);
  }
  lines.push("");
  const overallPct = totalACs > 0 ? Math.round((totalPassed / totalACs) * 100) : 0;
  lines.push(`  Overall: ${totalWithTests}/${totalStories} stories have tests  ${totalPassed}/${totalACs} ACs covered (${overallPct}%)`);
  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const flags = {
    story: null,
    epic: null,
    all: false,
    run: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--story":
        flags.story = args[++i]?.toUpperCase();
        break;
      case "--epic":
        flags.epic = args[++i]?.toUpperCase();
        break;
      case "--all":
        flags.all = true;
        break;
      case "--run":
        flags.run = true;
        break;
      case "--json":
        flags.json = true;
        break;
      default:
        console.error(`Unknown flag: ${args[i]}`);
        console.error("Usage: node scripts/validate-tests.js [--story EP0004-ST0001] [--epic EP0004] [--all] [--run] [--json]");
        process.exit(1);
    }
  }

  if (!flags.story && !flags.epic && !flags.all) {
    console.error("Specify one of: --story, --epic, --all");
    process.exit(1);
  }

  // Load project data
  const stories = loadAllStories();
  const epics = loadAllEpics();

  if (stories.length === 0) {
    console.log("No stories found. Nothing to validate.\n");
    process.exit(0);
  }

  if (flags.story) {
    // ─── Validate single story ───────────────────────────────────────────
    const story = stories.find((s) => s.ref === flags.story);
    if (!story) {
      console.error(`Story not found: ${flags.story}`);
      console.error(`Available stories: ${stories.map((s) => s.ref).join(", ")}`);
      process.exit(1);
    }
    const testFiles = findTestFiles(story.ref);
    const testData = testFiles.length > 0 ? parseTestFile(testFiles[0]) : null;
    const report = reportStory(story, testData);

    if (flags.json) {
      console.log(JSON.stringify({
        type: "story",
        ref: story.ref,
        title: story.title,
        status: story.status,
        expectedACs: story.acTags,
        testFile: testData ? testData.file : null,
        coveredACs: testData ? story.acTags.filter((a) => testData.functions.includes(a)) : [],
        missingACs: testData ? story.acTags.filter((a) => !testData.functions.includes(a)) : story.acTags,
        coverage: `${report.covered}/${report.total}`,
      }, null, 2));
    } else {
      console.log(report.lines);
      console.log("");
    }

    // With --run, execute tests if test file exists
    if (flags.run && testData) {
      try {
        const ext = path.extname(testData.file);
        let cmd;
        if (ext === ".py") {
          cmd = `cd "${ROOT}" && python -m pytest "${testData.file}" -v 2>&1`;
        } else if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") {
          cmd = `cd "${ROOT}" && npx vitest run "${testData.file}" 2>&1`;
        } else {
          console.log(`  ⚠️  Unknown test file type: ${ext}. Skipping --run.`);
          cmd = null;
        }
        if (cmd) {
          console.log(`  Running: ${testData.file}`);
          try {
            const output = execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
            console.log(indent(output, 2));
          } catch (e) {
            console.log(indent(e.stdout || "Test run failed", 2));
            process.exit(2);
          }
        }
      } catch (e) {
        console.error("  Error running tests:", e.message);
        process.exit(2);
      }
    }

    const allCovered = testData && story.acTags.every((a) => testData.functions.includes(a));
    process.exit(allCovered ? 0 : 1);
  }

  if (flags.epic) {
    // ─── Validate single epic ─────────────────────────────────────────────
    const epic = epics.find((e) => e.epic === flags.epic);
    if (!epic) {
      console.error(`Epic not found: ${flags.epic}`);
      process.exit(1);
    }
    const epicStories = stories.filter((s) => s.epic === flags.epic);
    if (epicStories.length === 0) {
      console.log(`Epic ${flags.epic} has no stories.`);
      process.exit(0);
    }
    const storyReports = [];
    let totalPassed = 0;
    let totalACs = 0;
    let storiesWithTests = 0;

    for (const story of epicStories) {
      const testFiles = findTestFiles(story.ref);
      const testData = testFiles.length > 0 ? parseTestFile(testFiles[0]) : null;
      const report = reportStory(story, testData);
      const covered = testData ? story.acTags.filter((a) => testData.functions.includes(a)).length : 0;
      storyReports.push({ ...report, ref: story.ref, passed: covered, total: story.acTags.length });
      totalPassed += covered;
      totalACs += story.acTags.length;
      if (testData) storiesWithTests++;
    }

    if (flags.json) {
      console.log(JSON.stringify({
        type: "epic",
        epic: epic.epic,
        title: epic.title,
        stories: storyReports.map((s) => ({
          ref: s.ref,
          title: s.title || s.ref,
          expectedACs: s.total,
          coveredACs: s.passed,
          missingACs: s.total - s.passed,
        })),
        totalStories: epicStories.length,
        storiesWithTests,
        totalPassed,
        totalACs,
      }, null, 2));
    } else {
      console.log(reportEpic(epic, storyReports, totalPassed, totalACs));
      console.log("");
    }

    const allPassed = totalPassed === totalACs && totalACs > 0;
    process.exit(allPassed ? 0 : 1);
  }

  if (flags.all) {
    // ─── Validate all epics ───────────────────────────────────────────────
    const epicReports = [];
    let grandTotalPassed = 0;
    let grandTotalACs = 0;
    let grandTotalStories = 0;
    let grandTotalWithTests = 0;

    for (const epic of epics) {
      const epicStories = stories.filter((s) => s.epic === epic.epic);
      if (epicStories.length === 0) continue;
      let totalPassed = 0;
      let totalACs = 0;
      let storiesWithTests = 0;

      for (const story of epicStories) {
        const testFiles = findTestFiles(story.ref);
        const testData = testFiles.length > 0 ? parseTestFile(testFiles[0]) : null;
        const covered = testData ? story.acTags.filter((a) => testData.functions.includes(a)).length : 0;
        totalPassed += covered;
        totalACs += story.acTags.length;
        if (testData) storiesWithTests++;
      }

      epicReports.push({
        epic: epic.epic,
        title: epic.title,
        storyCount: epicStories.length,
        storiesWithTests,
        totalPassed,
        totalACs,
      });
      grandTotalPassed += totalPassed;
      grandTotalACs += totalACs;
      grandTotalStories += epicStories.length;
      grandTotalWithTests += storiesWithTests;
    }

    if (flags.json) {
      console.log(JSON.stringify({
        type: "all",
        epics: epicReports,
        totalStories: grandTotalStories,
        storiesWithTests: grandTotalWithTests,
        totalACs: grandTotalACs,
        coveredACs: grandTotalPassed,
      }, null, 2));
    } else {
      console.log(reportAll(epicReports, grandTotalPassed, grandTotalACs, grandTotalStories, grandTotalWithTests));
      console.log("");
    }

    const allPassed = grandTotalPassed === grandTotalACs && grandTotalACs > 0;
    process.exit(allPassed ? 0 : 1);
  }
}

main();
