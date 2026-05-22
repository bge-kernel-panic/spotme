#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/jsonc-parser/lib/umd/main.js
var require_main = __commonJS((exports, module) => {
  (function(factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
      var v = factory(__require, exports);
      if (v !== undefined)
        module.exports = v;
    } else if (typeof define === "function" && define.amd) {
      define(["require", "exports", "./impl/format", "./impl/edit", "./impl/scanner", "./impl/parser"], factory);
    }
  })(function(require2, exports2) {
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.applyEdits = exports2.modify = exports2.format = exports2.printParseErrorCode = exports2.ParseErrorCode = exports2.stripComments = exports2.visit = exports2.getNodeValue = exports2.getNodePath = exports2.findNodeAtOffset = exports2.findNodeAtLocation = exports2.parseTree = exports2.parse = exports2.getLocation = exports2.SyntaxKind = exports2.ScanError = exports2.createScanner = undefined;
    const formatter = require2("./impl/format");
    const edit = require2("./impl/edit");
    const scanner = require2("./impl/scanner");
    const parser = require2("./impl/parser");
    exports2.createScanner = scanner.createScanner;
    var ScanError;
    (function(ScanError2) {
      ScanError2[ScanError2["None"] = 0] = "None";
      ScanError2[ScanError2["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
      ScanError2[ScanError2["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
      ScanError2[ScanError2["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
      ScanError2[ScanError2["InvalidUnicode"] = 4] = "InvalidUnicode";
      ScanError2[ScanError2["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
      ScanError2[ScanError2["InvalidCharacter"] = 6] = "InvalidCharacter";
    })(ScanError || (exports2.ScanError = ScanError = {}));
    var SyntaxKind;
    (function(SyntaxKind2) {
      SyntaxKind2[SyntaxKind2["OpenBraceToken"] = 1] = "OpenBraceToken";
      SyntaxKind2[SyntaxKind2["CloseBraceToken"] = 2] = "CloseBraceToken";
      SyntaxKind2[SyntaxKind2["OpenBracketToken"] = 3] = "OpenBracketToken";
      SyntaxKind2[SyntaxKind2["CloseBracketToken"] = 4] = "CloseBracketToken";
      SyntaxKind2[SyntaxKind2["CommaToken"] = 5] = "CommaToken";
      SyntaxKind2[SyntaxKind2["ColonToken"] = 6] = "ColonToken";
      SyntaxKind2[SyntaxKind2["NullKeyword"] = 7] = "NullKeyword";
      SyntaxKind2[SyntaxKind2["TrueKeyword"] = 8] = "TrueKeyword";
      SyntaxKind2[SyntaxKind2["FalseKeyword"] = 9] = "FalseKeyword";
      SyntaxKind2[SyntaxKind2["StringLiteral"] = 10] = "StringLiteral";
      SyntaxKind2[SyntaxKind2["NumericLiteral"] = 11] = "NumericLiteral";
      SyntaxKind2[SyntaxKind2["LineCommentTrivia"] = 12] = "LineCommentTrivia";
      SyntaxKind2[SyntaxKind2["BlockCommentTrivia"] = 13] = "BlockCommentTrivia";
      SyntaxKind2[SyntaxKind2["LineBreakTrivia"] = 14] = "LineBreakTrivia";
      SyntaxKind2[SyntaxKind2["Trivia"] = 15] = "Trivia";
      SyntaxKind2[SyntaxKind2["Unknown"] = 16] = "Unknown";
      SyntaxKind2[SyntaxKind2["EOF"] = 17] = "EOF";
    })(SyntaxKind || (exports2.SyntaxKind = SyntaxKind = {}));
    exports2.getLocation = parser.getLocation;
    exports2.parse = parser.parse;
    exports2.parseTree = parser.parseTree;
    exports2.findNodeAtLocation = parser.findNodeAtLocation;
    exports2.findNodeAtOffset = parser.findNodeAtOffset;
    exports2.getNodePath = parser.getNodePath;
    exports2.getNodeValue = parser.getNodeValue;
    exports2.visit = parser.visit;
    exports2.stripComments = parser.stripComments;
    var ParseErrorCode;
    (function(ParseErrorCode2) {
      ParseErrorCode2[ParseErrorCode2["InvalidSymbol"] = 1] = "InvalidSymbol";
      ParseErrorCode2[ParseErrorCode2["InvalidNumberFormat"] = 2] = "InvalidNumberFormat";
      ParseErrorCode2[ParseErrorCode2["PropertyNameExpected"] = 3] = "PropertyNameExpected";
      ParseErrorCode2[ParseErrorCode2["ValueExpected"] = 4] = "ValueExpected";
      ParseErrorCode2[ParseErrorCode2["ColonExpected"] = 5] = "ColonExpected";
      ParseErrorCode2[ParseErrorCode2["CommaExpected"] = 6] = "CommaExpected";
      ParseErrorCode2[ParseErrorCode2["CloseBraceExpected"] = 7] = "CloseBraceExpected";
      ParseErrorCode2[ParseErrorCode2["CloseBracketExpected"] = 8] = "CloseBracketExpected";
      ParseErrorCode2[ParseErrorCode2["EndOfFileExpected"] = 9] = "EndOfFileExpected";
      ParseErrorCode2[ParseErrorCode2["InvalidCommentToken"] = 10] = "InvalidCommentToken";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfComment"] = 11] = "UnexpectedEndOfComment";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfString"] = 12] = "UnexpectedEndOfString";
      ParseErrorCode2[ParseErrorCode2["UnexpectedEndOfNumber"] = 13] = "UnexpectedEndOfNumber";
      ParseErrorCode2[ParseErrorCode2["InvalidUnicode"] = 14] = "InvalidUnicode";
      ParseErrorCode2[ParseErrorCode2["InvalidEscapeCharacter"] = 15] = "InvalidEscapeCharacter";
      ParseErrorCode2[ParseErrorCode2["InvalidCharacter"] = 16] = "InvalidCharacter";
    })(ParseErrorCode || (exports2.ParseErrorCode = ParseErrorCode = {}));
    function printParseErrorCode(code) {
      switch (code) {
        case 1:
          return "InvalidSymbol";
        case 2:
          return "InvalidNumberFormat";
        case 3:
          return "PropertyNameExpected";
        case 4:
          return "ValueExpected";
        case 5:
          return "ColonExpected";
        case 6:
          return "CommaExpected";
        case 7:
          return "CloseBraceExpected";
        case 8:
          return "CloseBracketExpected";
        case 9:
          return "EndOfFileExpected";
        case 10:
          return "InvalidCommentToken";
        case 11:
          return "UnexpectedEndOfComment";
        case 12:
          return "UnexpectedEndOfString";
        case 13:
          return "UnexpectedEndOfNumber";
        case 14:
          return "InvalidUnicode";
        case 15:
          return "InvalidEscapeCharacter";
        case 16:
          return "InvalidCharacter";
      }
      return "<unknown ParseErrorCode>";
    }
    exports2.printParseErrorCode = printParseErrorCode;
    function format(documentText, range, options) {
      return formatter.format(documentText, range, options);
    }
    exports2.format = format;
    function modify(text, path, value, options) {
      return edit.setProperty(text, path, value, options);
    }
    exports2.modify = modify;
    function applyEdits(text, edits) {
      let sortedEdits = edits.slice(0).sort((a, b) => {
        const diff = a.offset - b.offset;
        if (diff === 0) {
          return a.length - b.length;
        }
        return diff;
      });
      let lastModifiedOffset = text.length;
      for (let i = sortedEdits.length - 1;i >= 0; i--) {
        let e = sortedEdits[i];
        if (e.offset + e.length <= lastModifiedOffset) {
          text = edit.applyEdit(text, e);
        } else {
          throw new Error("Overlapping edit");
        }
        lastModifiedOffset = e.offset;
      }
      return text;
    }
    exports2.applyEdits = applyEdits;
  });
});

// src/cli.ts
import { readFile as readFile3 } from "node:fs/promises";
import { resolve as resolve3, dirname as dirname3 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// src/installer/claude.ts
import { createInterface } from "node:readline";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// src/prompts.ts
function difficultyLabel(d) {
  switch (d) {
    case "lite":
      return "signature + structure provided — implement the body";
    case "medium":
      return "signature provided — implement the logic";
    case "hard":
      return "spec only — design and implement from scratch";
  }
}
var EXT_COMMENT = {
  ts: { open: "//" },
  tsx: { open: "//" },
  js: { open: "//" },
  jsx: { open: "//" },
  java: { open: "//" },
  c: { open: "//" },
  cpp: { open: "//" },
  cs: { open: "//" },
  go: { open: "//" },
  swift: { open: "//" },
  kt: { open: "//" },
  rs: { open: "//" },
  php: { open: "//" },
  dart: { open: "//" },
  py: { open: "#" },
  rb: { open: "#" },
  sh: { open: "#" },
  bash: { open: "#" },
  zsh: { open: "#" },
  yaml: { open: "#" },
  yml: { open: "#" },
  toml: { open: "#" },
  r: { open: "#" },
  html: { open: "<!--", close: "-->" },
  xml: { open: "<!--", close: "-->" },
  svg: { open: "<!--", close: "-->" },
  css: { open: "/*", close: "*/" },
  scss: { open: "//" },
  sass: { open: "//" },
  less: { open: "//" },
  lua: { open: "--" },
  sql: { open: "--" },
  el: { open: ";;" },
  clj: { open: ";;" }
};
function commentForFile(filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const syntax = EXT_COMMENT[ext] ?? { open: "//" };
  return syntax.close ? `${syntax.open} SPOTME: <description> ${syntax.close}` : `${syntax.open} SPOTME: <description>`;
}
function statusMessage(state) {
  const lines = [
    `SpotMe: ${state.enabled ? "\uD83D\uDFE2 on" : "⚪ off"}`,
    `Difficulty: ${state.difficulty}`,
    `Trigger every: ${state.every} code write(s)`,
    `Counter: ${state.counter}/${state.every}`
  ];
  if (state.exercise?.active) {
    lines.push(`Active exercise: ${state.exercise.unit} (${state.exercise.filePath})`);
  }
  return lines.join(`
`);
}
function exerciseReadyMessage(unit, filePath, difficulty) {
  return [
    `\uD83C\uDFCB️ Exercise ready: **${unit}**`,
    `Difficulty: ${difficulty} — ${difficultyLabel(difficulty)}`,
    `File: \`${filePath}\``,
    ``,
    `Edit the file in your editor. Replace the \`# SPOTME:\` marker with your implementation.`,
    ``,
    `Your options:`,
    `  \`/spotme:hint\`  — get a targeted hint`,
    `  \`/spotme:solve\` — concede and let the agent finish`,
    `  \`/spotme:skip\`  — skip this exercise`,
    `  \`/spotme:done\`  — submit your implementation for review`
  ].join(`
`);
}
function blockedMessage(toolName, filePath, difficulty) {
  const marker = commentForFile(filePath);
  const scaffoldStep = toolName === "edit" && filePath ? `Edit \`${filePath}\` to add a \`${marker}\` comment at the location where the implementation should go.` : filePath ? `Write the scaffold to \`${filePath}\` using the Write tool. Include a \`${marker}\` comment where the implementation should go.` : `Write the scaffold file using the Write tool. Include a \`${marker}\` comment (use appropriate comment syntax for the language) where the implementation should go.`;
  return [
    `[SpotMe] Counter reached — time for an exercise!`,
    ``,
    `Follow these steps in order:`,
    `1. ${scaffoldStep}`,
    `2. Call \`spotme_exercise\` with the unit name, the file path, and difficulty "${difficulty}".`,
    `3. Display the full return value of \`spotme_exercise\` verbatim to the user (do not summarize).`
  ].join(`
`);
}
var PROMPTS = {
  ON: "SpotMe gym mode was just activated. Call `spotme_status` to get the current settings, then confirm them to the user in one sentence.",
  OFF: "Confirm that SpotMe gym mode is now off and you will resume writing code normally.",
  STATUS: "Call the `spotme_status` tool and display the result to the user.",
  DONE: "Call `spotme_status` to get the active exercise details. Read the exercise file. Evaluate the user's implementation: (1) what they got right — 1-2 sentences, specific; (2) what could be better — concrete, no vague feedback; (3) next steps only if incomplete. Do NOT show your own solution. Resume the original task and complete any remaining code. Call `spotme_end` as the LAST thing you do.",
  HINT: "Give one targeted hint for the current SpotMe exercise. Point toward the approach without revealing the implementation. One paragraph max.",
  SOLVE: "Call `spotme_status` to get the active exercise details. Read the exercise file. Write the solution (replace the SPOTME marker if still present, or improve what the user wrote). Briefly note the key pattern the user should remember. Resume the original task and complete any remaining code. Call `spotme_end` as the LAST thing you do.",
  SKIP: "The human is skipping this exercise. Resume the original task and complete the code normally. Call `spotme_end` as the LAST thing you do.",
  REP: "The human wants a coding exercise. Write the scaffold for the next logical unit using the Write tool (use a `# SPOTME: <description>` marker where the human should implement), then call `spotme_exercise` with the unit name, file path, and difficulty."
};
function buildPrompts(overrides) {
  const keys = Object.keys(PROMPTS);
  const result = {};
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    const base = overrides?.[lowerKey] ?? PROMPTS[key];
    result[key] = overrides?.all ? `${base}
${overrides.all}` : base;
  }
  return result;
}
var CLAUDE_PROMPTS = buildPrompts({
  on: "Call `mcp__spotme__spotme_on` with $ARGUMENTS. Call `mcp__spotme__spotme_status` and confirm the settings in one sentence.",
  off: "Call `mcp__spotme__spotme_off`. Confirm SpotMe is off and you will resume coding normally.",
  status: "Call `mcp__spotme__spotme_status` and display the result to the user.",
  rep: "Call `mcp__spotme__spotme_start_rep` with $ARGUMENTS as the hint. Follow the returned instructions exactly: write the scaffold file, then call `mcp__spotme__spotme_exercise`. Display the full return value verbatim. Stop.",
  done: "Call `mcp__spotme__spotme_status` to get the active exercise. Read the exercise file. Evaluate: (1) what they got right — 1–2 sentences, specific; (2) what could be better — concrete; (3) next steps only if incomplete. Do NOT show your own solution. Resume the original task. Call `mcp__spotme__spotme_end` as the LAST thing you do.",
  hint: "Call `mcp__spotme__spotme_status` to get the active exercise. Read the exercise file. Give one targeted hint — point toward the approach without solving it. One paragraph max.",
  solve: "Call `mcp__spotme__spotme_status` to get the active exercise. Read the exercise file. Write the solution (replace SPOTME marker or improve user's work). Note the key pattern to remember. Resume original task. Call `mcp__spotme__spotme_end` as the LAST thing you do.",
  skip: "Call `mcp__spotme__spotme_end` first. Then resume the original task and complete the code normally."
});

// src/installer/artifacts.ts
var SKILLS = {
  on: {
    description: "Enable SpotMe gym mode [lite|medium|hard] [--every N]",
    allowedTools: "mcp__spotme__spotme_on mcp__spotme__spotme_status",
    content: CLAUDE_PROMPTS.ON
  },
  off: {
    description: "Disable SpotMe gym mode",
    allowedTools: "mcp__spotme__spotme_off",
    content: CLAUDE_PROMPTS.OFF
  },
  status: {
    description: "Show current SpotMe status",
    allowedTools: "mcp__spotme__spotme_status",
    content: CLAUDE_PROMPTS.STATUS
  },
  rep: {
    description: "Request an on-demand SpotMe exercise [hint text]",
    allowedTools: "mcp__spotme__spotme_start_rep mcp__spotme__spotme_exercise Write Edit MultiEdit",
    content: CLAUDE_PROMPTS.REP
  },
  done: {
    description: "Submit your implementation for SpotMe review",
    allowedTools: "mcp__spotme__spotme_status mcp__spotme__spotme_end Read",
    content: CLAUDE_PROMPTS.DONE
  },
  hint: {
    description: "Get a targeted hint for the current exercise",
    allowedTools: "mcp__spotme__spotme_status Read",
    content: CLAUDE_PROMPTS.HINT
  },
  solve: {
    description: "Concede — let the agent complete the exercise",
    allowedTools: "mcp__spotme__spotme_status mcp__spotme__spotme_end Read Write Edit MultiEdit",
    content: CLAUDE_PROMPTS.SOLVE
  },
  skip: {
    description: "Skip this exercise",
    allowedTools: "mcp__spotme__spotme_end",
    content: CLAUDE_PROMPTS.SKIP
  }
};
function skillFile(name, def) {
  return [
    "---",
    `name: spotme:${name}`,
    `description: ${def.description}`,
    "user-invocable: true",
    "disable-model-invocation: true",
    `allowed-tools: ${def.allowedTools}`,
    "---",
    "",
    def.content,
    ""
  ].join(`
`);
}
function generateArtifacts(opts) {
  const { packageVersion, pluginRoot } = opts;
  const timestamp = Date.now();
  const marketplaceDir = pluginRoot;
  const pluginDir = `${pluginRoot}/plugins/spotme`;
  const files = {};
  files[".claude-plugin/marketplace.json"] = JSON.stringify({
    name: "SpotMe Local",
    plugins: [{ name: "spotme", path: "./plugins/spotme" }]
  }, null, 2);
  files["plugins/spotme/.claude-plugin/plugin.json"] = JSON.stringify({
    name: "spotme",
    version: `${packageVersion}-local.${timestamp}`,
    description: "SpotMe — gym mode for agentic coding. Works with Claude Code.",
    author: "wtfzambo"
  }, null, 2);
  files["plugins/spotme/.mcp.json"] = JSON.stringify({
    mcpServers: {
      spotme: {
        command: "node",
        args: ["${CLAUDE_PLUGIN_ROOT}/dist/claude-mcp.js"],
        env: { SPOTME_PROJECT_DIR: "${CLAUDE_PROJECT_DIR}" },
        alwaysLoad: true
      }
    }
  }, null, 2);
  files["plugins/spotme/hooks/hooks.json"] = JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: "Write|Edit|MultiEdit",
          hooks: [
            {
              type: "mcp_tool",
              server: "spotme",
              tool: "spotme_intercept_write"
            }
          ]
        }
      ]
    }
  }, null, 2);
  for (const [name, def] of Object.entries(SKILLS)) {
    files[`plugins/spotme/skills/${name}/SKILL.md`] = skillFile(name, def);
  }
  return { marketplaceDir, pluginDir, files };
}

// src/installer/claude.ts
async function confirm(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve2) => {
    rl.question(`${question} [y/N]: `, (answer) => {
      rl.close();
      resolve2(answer.trim().toLowerCase() === "y");
    });
  });
}
function commandExists(cmd) {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function runClaude(args) {
  try {
    return execFileSync("claude", args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });
  } catch (e) {
    const err = e;
    return err.stdout ?? err.stderr ?? "";
  }
}
async function writeArtifacts(marketplaceDir, files, mcpJsPath) {
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = join(marketplaceDir, relPath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf8");
  }
  const distDir = join(marketplaceDir, "plugins/spotme/dist");
  await mkdir(distDir, { recursive: true });
  if (existsSync(mcpJsPath)) {
    await copyFile(mcpJsPath, join(distDir, "claude-mcp.js"));
  } else {
    console.warn(`Warning: bundled MCP server not found at ${mcpJsPath}. Run \`bun run build\` first.`);
  }
}
async function installClaude(opts) {
  const marketplaceDir = join(homedir(), ".spotme", "claude-marketplace");
  const pluginDir = join(marketplaceDir, "plugins", "spotme");
  const selfDir = dirname(fileURLToPath(import.meta.url));
  const mcpJsPath = resolve(selfDir, "../claude-mcp.js");
  const pkgPath = resolve(selfDir, "../../package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  const packageVersion = pkg.version;
  const { files } = generateArtifacts({ packageVersion, pluginRoot: marketplaceDir, mcpJsPath });
  const manualCommands = [
    `claude plugin marketplace add ${marketplaceDir}`,
    `claude plugin install spotme`,
    `# Then run /reload-plugins in Claude Code`
  ].join(`
`);
  if (opts.manual) {
    console.log("Generated plugin files will be written to:");
    console.log(`  Marketplace: ${marketplaceDir}`);
    console.log(`  Plugin:      ${pluginDir}`);
    console.log("");
    console.log("Run these commands manually after writing:");
    console.log(manualCommands);
    await writeArtifacts(marketplaceDir, files, mcpJsPath);
    return;
  }
  if (!opts.yes) {
    console.log("SpotMe Claude install will:");
    console.log(`  - Write plugin artifacts to: ${marketplaceDir}`);
    console.log(`  - Register marketplace with Claude CLI`);
    console.log(`  - Install or update the spotme plugin`);
    console.log("");
    const ok = await confirm("Proceed?");
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }
  await writeArtifacts(marketplaceDir, files, mcpJsPath);
  console.log(`Plugin files written to ${marketplaceDir}`);
  if (!commandExists("claude")) {
    console.log("");
    console.log("`claude` binary not found. Run these commands manually:");
    console.log(manualCommands);
    return;
  }
  const marketplaceList = runClaude(["plugin", "marketplace", "list"]);
  const marketplaceRegistered = marketplaceList.includes(marketplaceDir);
  if (marketplaceRegistered) {
    runClaude(["plugin", "marketplace", "update", marketplaceDir]);
    console.log("Marketplace updated.");
  } else {
    runClaude(["plugin", "marketplace", "add", marketplaceDir]);
    console.log("Marketplace registered.");
  }
  const pluginList = runClaude(["plugin", "list"]);
  const pluginInstalled = pluginList.includes("spotme");
  if (pluginInstalled) {
    runClaude(["plugin", "update", "spotme"]);
    console.log("Plugin updated.");
  } else {
    runClaude(["plugin", "install", "spotme"]);
    console.log("Plugin installed.");
  }
  console.log("");
  console.log("Run /reload-plugins in Claude Code to activate, or restart Claude Code.");
}

// src/installer/opencode.ts
var import_jsonc_parser = __toESM(require_main(), 1);
import { createInterface as createInterface2 } from "node:readline";
import { mkdir as mkdir2, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2, resolve as resolve2 } from "node:path";
import { homedir as homedir2 } from "node:os";
async function confirm2(question) {
  const rl = createInterface2({ input: process.stdin, output: process.stdout });
  return new Promise((resolve3) => {
    rl.question(`${question} [y/N]: `, (answer) => {
      rl.close();
      resolve3(answer.trim().toLowerCase() === "y");
    });
  });
}
function addSpotmeToPlugins(source) {
  const tree = import_jsonc_parser.parseTree(source);
  if (tree) {
    const pluginsNode = import_jsonc_parser.findNodeAtLocation(tree, ["plugins"]);
    if (pluginsNode?.type === "array" && pluginsNode.children) {
      const alreadyPresent = pluginsNode.children.some((child) => child.type === "string" && child.value === "spotme");
      if (alreadyPresent)
        return source;
    }
  }
  const existing = source.trim() === "" ? "{}" : source;
  const edits = import_jsonc_parser.modify(existing, ["plugins", -1], "spotme", { formattingOptions: {} });
  return import_jsonc_parser.applyEdits(existing, edits);
}
function diffLines(before, after) {
  const beforeLines = before.split(`
`);
  const afterLines = after.split(`
`);
  const lines = [];
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0;i < maxLen; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === undefined) {
      lines.push(`+ ${a}`);
    } else if (a === undefined) {
      lines.push(`- ${b}`);
    } else if (b !== a) {
      lines.push(`- ${b}`);
      lines.push(`+ ${a}`);
    } else {
      lines.push(`  ${b}`);
    }
  }
  return lines.join(`
`);
}
async function installOpenCode(opts) {
  const targetPath = opts.configPath ? resolve2(opts.configPath) : opts.scope === "user" ? resolve2(homedir2(), ".config/opencode/opencode.json") : resolve2("./opencode.json");
  const configChange = `Add "spotme" to the plugins array in:
  ${targetPath}`;
  if (opts.manual) {
    console.log("OpenCode install (manual mode):");
    console.log(configChange);
    console.log("");
    console.log('Add "spotme" to the plugins array in your opencode.json:');
    console.log('  { "plugins": ["spotme"] }');
    return;
  }
  let existing = "{}";
  try {
    existing = await readFile2(targetPath, "utf8");
  } catch {}
  const updated = addSpotmeToPlugins(existing);
  if (updated === existing) {
    console.log("spotme is already present in the OpenCode config. Nothing to do.");
    return;
  }
  if (!opts.yes) {
    console.log(`Changes to ${targetPath}:`);
    console.log("");
    console.log(diffLines(existing, updated));
    console.log("");
    const ok = await confirm2("Apply?");
    if (!ok) {
      console.log("Aborted.");
      return;
    }
  }
  await mkdir2(dirname2(targetPath), { recursive: true });
  await writeFile2(targetPath, updated, "utf8");
  console.log(`OpenCode config updated: ${targetPath}`);
}

// src/cli.ts
var USAGE = `
SpotMe installer CLI

Usage:
  spotme version
  spotme install claude [--scope user|project|local] [--yes] [--manual]
  spotme install opencode [--scope user|project] [--config <path>] [--yes] [--manual]

Options:
  --scope   Installation scope (default: user)
  --yes     Skip confirmation prompts
  --manual  Print instructions without applying changes (Claude: also writes files)
  --config  Path to opencode config file (opencode install only)
  --help    Show this help
`.trim();
var argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(name);
}
function option(name) {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}
async function main() {
  const [cmd, sub] = argv;
  if (!cmd || flag("--help") || flag("-h")) {
    console.log(USAGE);
    return;
  }
  if (cmd === "version") {
    const selfDir = dirname3(fileURLToPath2(import.meta.url));
    const pkgPath = resolve3(selfDir, "../package.json");
    const pkg = JSON.parse(await readFile3(pkgPath, "utf8"));
    console.log(pkg.version);
    return;
  }
  if (cmd === "install") {
    const yes = flag("--yes");
    const manual = flag("--manual");
    const rawScope = option("--scope");
    if (sub === "claude") {
      const scope = rawScope ?? "user";
      if (!["user", "project", "local"].includes(scope)) {
        console.error(`Invalid scope "${scope}". Must be user, project, or local.`);
        process.exit(1);
      }
      await installClaude({ scope, yes, manual });
      return;
    }
    if (sub === "opencode") {
      const scope = rawScope ?? "user";
      if (!["user", "project"].includes(scope)) {
        console.error(`Invalid scope "${scope}". Must be user or project.`);
        process.exit(1);
      }
      const configPath = option("--config");
      await installOpenCode({ scope, yes, manual, configPath });
      return;
    }
    console.error(`Unknown install target: ${sub ?? "(none)"}`);
    console.log(USAGE);
    process.exit(1);
  }
  console.error(`Unknown command: ${cmd}`);
  console.log(USAGE);
  process.exit(1);
}
main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
