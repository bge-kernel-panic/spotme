#!/usr/bin/env node
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
  on: 'Call `mcp__plugin_spotme_spotme__spotme_on` with "$ARGUMENTS" (may be empty — defaults will be used). Then call `mcp__plugin_spotme_spotme__spotme_status` and confirm the settings in one sentence.',
  off: "Call `mcp__plugin_spotme_spotme__spotme_off`. Confirm SpotMe is off and you will resume coding normally.",
  status: "Call `mcp__plugin_spotme_spotme__spotme_status` and display the result to the user.",
  rep: 'Call `mcp__plugin_spotme_spotme__spotme_start_rep` with "$ARGUMENTS" as the hint (may be empty). Follow the returned instructions exactly: write the scaffold file, then call `mcp__plugin_spotme_spotme__spotme_exercise`. Display the full return value verbatim. Stop.',
  done: "Call `mcp__plugin_spotme_spotme__spotme_status` to get the active exercise. Read the exercise file. Evaluate: (1) what they got right — 1–2 sentences, specific; (2) what could be better — concrete; (3) next steps only if incomplete. Do NOT show your own solution. Resume the original task. Call `mcp__plugin_spotme_spotme__spotme_end` as the LAST thing you do.",
  hint: "Call `mcp__plugin_spotme_spotme__spotme_status` to get the active exercise. Read the exercise file. Give one targeted hint — point toward the approach without solving it. One paragraph max.",
  solve: "Call `mcp__plugin_spotme_spotme__spotme_status` to get the active exercise. Read the exercise file. Write the solution (replace SPOTME marker or improve user's work). Note the key pattern to remember. Resume original task. Call `mcp__plugin_spotme_spotme__spotme_end` as the LAST thing you do.",
  skip: "Call `mcp__plugin_spotme_spotme__spotme_end` first. Then resume the original task and complete the code normally."
});

// src/installer/artifacts.ts
var SKILLS = {
  on: {
    description: "Enable SpotMe gym mode [lite|medium|hard] [--every N]",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_on mcp__plugin_spotme_spotme__spotme_status",
    content: CLAUDE_PROMPTS.ON
  },
  off: {
    description: "Disable SpotMe gym mode",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_off",
    content: CLAUDE_PROMPTS.OFF
  },
  status: {
    description: "Show current SpotMe status",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_status",
    content: CLAUDE_PROMPTS.STATUS
  },
  rep: {
    description: "Request an on-demand SpotMe exercise [hint text]",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_start_rep mcp__plugin_spotme_spotme__spotme_exercise Write Edit MultiEdit",
    content: CLAUDE_PROMPTS.REP
  },
  done: {
    description: "Submit your implementation for SpotMe review",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_status mcp__plugin_spotme_spotme__spotme_end Read",
    content: CLAUDE_PROMPTS.DONE
  },
  hint: {
    description: "Get a targeted hint for the current exercise",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_status Read",
    content: CLAUDE_PROMPTS.HINT
  },
  solve: {
    description: "Concede — let the agent complete the exercise",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_status mcp__plugin_spotme_spotme__spotme_end Read Write Edit MultiEdit",
    content: CLAUDE_PROMPTS.SOLVE
  },
  skip: {
    description: "Skip this exercise",
    allowedTools: "mcp__plugin_spotme_spotme__spotme_end",
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
    name: "spotme-local",
    description: "Local SpotMe marketplace generated by the spotme CLI.",
    owner: { name: "bge-kernel-panic" },
    plugins: [{ name: "spotme", source: "./plugins/spotme" }]
  }, null, 2);
  files["plugins/spotme/.claude-plugin/plugin.json"] = JSON.stringify({
    name: "spotme",
    version: `${packageVersion}-local.${timestamp}`,
    description: "SpotMe — gym mode for agentic coding. Works with Claude Code.",
    author: { name: "bge-kernel-panic" }
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
              server: "plugin:spotme:spotme",
              tool: "spotme_intercept_write",
              input: {
                tool_name: "${tool_name}",
                file_path: "${tool_input.file_path}"
              }
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
  const mcpJsPath = resolve(selfDir, "claude-mcp.js");
  const pkgPath = resolve(selfDir, "..", "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  const packageVersion = pkg.version;
  const { files } = generateArtifacts({ packageVersion, pluginRoot: marketplaceDir, mcpJsPath });
  const manualCommands = [
    `claude plugin marketplace add ${marketplaceDir}`,
    `claude plugin install spotme`,
    `# Then fully restart Claude Code. SpotMe's PreToolUse hook won't load without it.`
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
  console.log("⚠ Fully restart Claude Code. SpotMe's PreToolUse hook won't load without it.");
}

// src/installer/opencode.ts
import { createInterface as createInterface2 } from "node:readline";
import { mkdir as mkdir2, readFile as readFile2, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname2, resolve as resolve2 } from "node:path";
import { homedir as homedir2 } from "node:os";

// node_modules/jsonc-parser/lib/esm/impl/scanner.js
function createScanner(text, ignoreTrivia = false) {
  const len = text.length;
  let pos = 0, value = "", tokenOffset = 0, token = 16, lineNumber = 0, lineStartOffset = 0, tokenLineStartOffset = 0, prevTokenLineStartOffset = 0, scanError = 0;
  function scanHexDigits(count, exact) {
    let digits = 0;
    let value2 = 0;
    while (digits < count || !exact) {
      let ch = text.charCodeAt(pos);
      if (ch >= 48 && ch <= 57) {
        value2 = value2 * 16 + ch - 48;
      } else if (ch >= 65 && ch <= 70) {
        value2 = value2 * 16 + ch - 65 + 10;
      } else if (ch >= 97 && ch <= 102) {
        value2 = value2 * 16 + ch - 97 + 10;
      } else {
        break;
      }
      pos++;
      digits++;
    }
    if (digits < count) {
      value2 = -1;
    }
    return value2;
  }
  function setPosition(newPosition) {
    pos = newPosition;
    value = "";
    tokenOffset = 0;
    token = 16;
    scanError = 0;
  }
  function scanNumber() {
    let start = pos;
    if (text.charCodeAt(pos) === 48) {
      pos++;
    } else {
      pos++;
      while (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
      }
    }
    if (pos < text.length && text.charCodeAt(pos) === 46) {
      pos++;
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) {
          pos++;
        }
      } else {
        scanError = 3;
        return text.substring(start, pos);
      }
    }
    let end = pos;
    if (pos < text.length && (text.charCodeAt(pos) === 69 || text.charCodeAt(pos) === 101)) {
      pos++;
      if (pos < text.length && text.charCodeAt(pos) === 43 || text.charCodeAt(pos) === 45) {
        pos++;
      }
      if (pos < text.length && isDigit(text.charCodeAt(pos))) {
        pos++;
        while (pos < text.length && isDigit(text.charCodeAt(pos))) {
          pos++;
        }
        end = pos;
      } else {
        scanError = 3;
      }
    }
    return text.substring(start, end);
  }
  function scanString() {
    let result = "", start = pos;
    while (true) {
      if (pos >= len) {
        result += text.substring(start, pos);
        scanError = 2;
        break;
      }
      const ch = text.charCodeAt(pos);
      if (ch === 34) {
        result += text.substring(start, pos);
        pos++;
        break;
      }
      if (ch === 92) {
        result += text.substring(start, pos);
        pos++;
        if (pos >= len) {
          scanError = 2;
          break;
        }
        const ch2 = text.charCodeAt(pos++);
        switch (ch2) {
          case 34:
            result += '"';
            break;
          case 92:
            result += "\\";
            break;
          case 47:
            result += "/";
            break;
          case 98:
            result += "\b";
            break;
          case 102:
            result += "\f";
            break;
          case 110:
            result += `
`;
            break;
          case 114:
            result += "\r";
            break;
          case 116:
            result += "\t";
            break;
          case 117:
            const ch3 = scanHexDigits(4, true);
            if (ch3 >= 0) {
              result += String.fromCharCode(ch3);
            } else {
              scanError = 4;
            }
            break;
          default:
            scanError = 5;
        }
        start = pos;
        continue;
      }
      if (ch >= 0 && ch <= 31) {
        if (isLineBreak(ch)) {
          result += text.substring(start, pos);
          scanError = 2;
          break;
        } else {
          scanError = 6;
        }
      }
      pos++;
    }
    return result;
  }
  function scanNext() {
    value = "";
    scanError = 0;
    tokenOffset = pos;
    lineStartOffset = lineNumber;
    prevTokenLineStartOffset = tokenLineStartOffset;
    if (pos >= len) {
      tokenOffset = len;
      return token = 17;
    }
    let code = text.charCodeAt(pos);
    if (isWhiteSpace(code)) {
      do {
        pos++;
        value += String.fromCharCode(code);
        code = text.charCodeAt(pos);
      } while (isWhiteSpace(code));
      return token = 15;
    }
    if (isLineBreak(code)) {
      pos++;
      value += String.fromCharCode(code);
      if (code === 13 && text.charCodeAt(pos) === 10) {
        pos++;
        value += `
`;
      }
      lineNumber++;
      tokenLineStartOffset = pos;
      return token = 14;
    }
    switch (code) {
      case 123:
        pos++;
        return token = 1;
      case 125:
        pos++;
        return token = 2;
      case 91:
        pos++;
        return token = 3;
      case 93:
        pos++;
        return token = 4;
      case 58:
        pos++;
        return token = 6;
      case 44:
        pos++;
        return token = 5;
      case 34:
        pos++;
        value = scanString();
        return token = 10;
      case 47:
        const start = pos - 1;
        if (text.charCodeAt(pos + 1) === 47) {
          pos += 2;
          while (pos < len) {
            if (isLineBreak(text.charCodeAt(pos))) {
              break;
            }
            pos++;
          }
          value = text.substring(start, pos);
          return token = 12;
        }
        if (text.charCodeAt(pos + 1) === 42) {
          pos += 2;
          const safeLength = len - 1;
          let commentClosed = false;
          while (pos < safeLength) {
            const ch = text.charCodeAt(pos);
            if (ch === 42 && text.charCodeAt(pos + 1) === 47) {
              pos += 2;
              commentClosed = true;
              break;
            }
            pos++;
            if (isLineBreak(ch)) {
              if (ch === 13 && text.charCodeAt(pos) === 10) {
                pos++;
              }
              lineNumber++;
              tokenLineStartOffset = pos;
            }
          }
          if (!commentClosed) {
            pos++;
            scanError = 1;
          }
          value = text.substring(start, pos);
          return token = 13;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16;
      case 45:
        value += String.fromCharCode(code);
        pos++;
        if (pos === len || !isDigit(text.charCodeAt(pos))) {
          return token = 16;
        }
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        value += scanNumber();
        return token = 11;
      default:
        while (pos < len && isUnknownContentCharacter(code)) {
          pos++;
          code = text.charCodeAt(pos);
        }
        if (tokenOffset !== pos) {
          value = text.substring(tokenOffset, pos);
          switch (value) {
            case "true":
              return token = 8;
            case "false":
              return token = 9;
            case "null":
              return token = 7;
          }
          return token = 16;
        }
        value += String.fromCharCode(code);
        pos++;
        return token = 16;
    }
  }
  function isUnknownContentCharacter(code) {
    if (isWhiteSpace(code) || isLineBreak(code)) {
      return false;
    }
    switch (code) {
      case 125:
      case 93:
      case 123:
      case 91:
      case 34:
      case 58:
      case 44:
      case 47:
        return false;
    }
    return true;
  }
  function scanNextNonTrivia() {
    let result;
    do {
      result = scanNext();
    } while (result >= 12 && result <= 15);
    return result;
  }
  return {
    setPosition,
    getPosition: () => pos,
    scan: ignoreTrivia ? scanNextNonTrivia : scanNext,
    getToken: () => token,
    getTokenValue: () => value,
    getTokenOffset: () => tokenOffset,
    getTokenLength: () => pos - tokenOffset,
    getTokenStartLine: () => lineStartOffset,
    getTokenStartCharacter: () => tokenOffset - prevTokenLineStartOffset,
    getTokenError: () => scanError
  };
}
function isWhiteSpace(ch) {
  return ch === 32 || ch === 9;
}
function isLineBreak(ch) {
  return ch === 10 || ch === 13;
}
function isDigit(ch) {
  return ch >= 48 && ch <= 57;
}
var CharacterCodes;
(function(CharacterCodes2) {
  CharacterCodes2[CharacterCodes2["lineFeed"] = 10] = "lineFeed";
  CharacterCodes2[CharacterCodes2["carriageReturn"] = 13] = "carriageReturn";
  CharacterCodes2[CharacterCodes2["space"] = 32] = "space";
  CharacterCodes2[CharacterCodes2["_0"] = 48] = "_0";
  CharacterCodes2[CharacterCodes2["_1"] = 49] = "_1";
  CharacterCodes2[CharacterCodes2["_2"] = 50] = "_2";
  CharacterCodes2[CharacterCodes2["_3"] = 51] = "_3";
  CharacterCodes2[CharacterCodes2["_4"] = 52] = "_4";
  CharacterCodes2[CharacterCodes2["_5"] = 53] = "_5";
  CharacterCodes2[CharacterCodes2["_6"] = 54] = "_6";
  CharacterCodes2[CharacterCodes2["_7"] = 55] = "_7";
  CharacterCodes2[CharacterCodes2["_8"] = 56] = "_8";
  CharacterCodes2[CharacterCodes2["_9"] = 57] = "_9";
  CharacterCodes2[CharacterCodes2["a"] = 97] = "a";
  CharacterCodes2[CharacterCodes2["b"] = 98] = "b";
  CharacterCodes2[CharacterCodes2["c"] = 99] = "c";
  CharacterCodes2[CharacterCodes2["d"] = 100] = "d";
  CharacterCodes2[CharacterCodes2["e"] = 101] = "e";
  CharacterCodes2[CharacterCodes2["f"] = 102] = "f";
  CharacterCodes2[CharacterCodes2["g"] = 103] = "g";
  CharacterCodes2[CharacterCodes2["h"] = 104] = "h";
  CharacterCodes2[CharacterCodes2["i"] = 105] = "i";
  CharacterCodes2[CharacterCodes2["j"] = 106] = "j";
  CharacterCodes2[CharacterCodes2["k"] = 107] = "k";
  CharacterCodes2[CharacterCodes2["l"] = 108] = "l";
  CharacterCodes2[CharacterCodes2["m"] = 109] = "m";
  CharacterCodes2[CharacterCodes2["n"] = 110] = "n";
  CharacterCodes2[CharacterCodes2["o"] = 111] = "o";
  CharacterCodes2[CharacterCodes2["p"] = 112] = "p";
  CharacterCodes2[CharacterCodes2["q"] = 113] = "q";
  CharacterCodes2[CharacterCodes2["r"] = 114] = "r";
  CharacterCodes2[CharacterCodes2["s"] = 115] = "s";
  CharacterCodes2[CharacterCodes2["t"] = 116] = "t";
  CharacterCodes2[CharacterCodes2["u"] = 117] = "u";
  CharacterCodes2[CharacterCodes2["v"] = 118] = "v";
  CharacterCodes2[CharacterCodes2["w"] = 119] = "w";
  CharacterCodes2[CharacterCodes2["x"] = 120] = "x";
  CharacterCodes2[CharacterCodes2["y"] = 121] = "y";
  CharacterCodes2[CharacterCodes2["z"] = 122] = "z";
  CharacterCodes2[CharacterCodes2["A"] = 65] = "A";
  CharacterCodes2[CharacterCodes2["B"] = 66] = "B";
  CharacterCodes2[CharacterCodes2["C"] = 67] = "C";
  CharacterCodes2[CharacterCodes2["D"] = 68] = "D";
  CharacterCodes2[CharacterCodes2["E"] = 69] = "E";
  CharacterCodes2[CharacterCodes2["F"] = 70] = "F";
  CharacterCodes2[CharacterCodes2["G"] = 71] = "G";
  CharacterCodes2[CharacterCodes2["H"] = 72] = "H";
  CharacterCodes2[CharacterCodes2["I"] = 73] = "I";
  CharacterCodes2[CharacterCodes2["J"] = 74] = "J";
  CharacterCodes2[CharacterCodes2["K"] = 75] = "K";
  CharacterCodes2[CharacterCodes2["L"] = 76] = "L";
  CharacterCodes2[CharacterCodes2["M"] = 77] = "M";
  CharacterCodes2[CharacterCodes2["N"] = 78] = "N";
  CharacterCodes2[CharacterCodes2["O"] = 79] = "O";
  CharacterCodes2[CharacterCodes2["P"] = 80] = "P";
  CharacterCodes2[CharacterCodes2["Q"] = 81] = "Q";
  CharacterCodes2[CharacterCodes2["R"] = 82] = "R";
  CharacterCodes2[CharacterCodes2["S"] = 83] = "S";
  CharacterCodes2[CharacterCodes2["T"] = 84] = "T";
  CharacterCodes2[CharacterCodes2["U"] = 85] = "U";
  CharacterCodes2[CharacterCodes2["V"] = 86] = "V";
  CharacterCodes2[CharacterCodes2["W"] = 87] = "W";
  CharacterCodes2[CharacterCodes2["X"] = 88] = "X";
  CharacterCodes2[CharacterCodes2["Y"] = 89] = "Y";
  CharacterCodes2[CharacterCodes2["Z"] = 90] = "Z";
  CharacterCodes2[CharacterCodes2["asterisk"] = 42] = "asterisk";
  CharacterCodes2[CharacterCodes2["backslash"] = 92] = "backslash";
  CharacterCodes2[CharacterCodes2["closeBrace"] = 125] = "closeBrace";
  CharacterCodes2[CharacterCodes2["closeBracket"] = 93] = "closeBracket";
  CharacterCodes2[CharacterCodes2["colon"] = 58] = "colon";
  CharacterCodes2[CharacterCodes2["comma"] = 44] = "comma";
  CharacterCodes2[CharacterCodes2["dot"] = 46] = "dot";
  CharacterCodes2[CharacterCodes2["doubleQuote"] = 34] = "doubleQuote";
  CharacterCodes2[CharacterCodes2["minus"] = 45] = "minus";
  CharacterCodes2[CharacterCodes2["openBrace"] = 123] = "openBrace";
  CharacterCodes2[CharacterCodes2["openBracket"] = 91] = "openBracket";
  CharacterCodes2[CharacterCodes2["plus"] = 43] = "plus";
  CharacterCodes2[CharacterCodes2["slash"] = 47] = "slash";
  CharacterCodes2[CharacterCodes2["formFeed"] = 12] = "formFeed";
  CharacterCodes2[CharacterCodes2["tab"] = 9] = "tab";
})(CharacterCodes || (CharacterCodes = {}));

// node_modules/jsonc-parser/lib/esm/impl/string-intern.js
var cachedSpaces = new Array(20).fill(0).map((_, index) => {
  return " ".repeat(index);
});
var maxCachedValues = 200;
var cachedBreakLinesWithSpaces = {
  " ": {
    "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `
` + " ".repeat(index);
    }),
    "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r" + " ".repeat(index);
    }),
    "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `\r
` + " ".repeat(index);
    })
  },
  "\t": {
    "\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `
` + "\t".repeat(index);
    }),
    "\r": new Array(maxCachedValues).fill(0).map((_, index) => {
      return "\r" + "\t".repeat(index);
    }),
    "\r\n": new Array(maxCachedValues).fill(0).map((_, index) => {
      return `\r
` + "\t".repeat(index);
    })
  }
};
var supportedEols = [`
`, "\r", `\r
`];

// node_modules/jsonc-parser/lib/esm/impl/format.js
function format(documentText, range, options) {
  let initialIndentLevel;
  let formatText;
  let formatTextStart;
  let rangeStart;
  let rangeEnd;
  if (range) {
    rangeStart = range.offset;
    rangeEnd = rangeStart + range.length;
    formatTextStart = rangeStart;
    while (formatTextStart > 0 && !isEOL(documentText, formatTextStart - 1)) {
      formatTextStart--;
    }
    let endOffset = rangeEnd;
    while (endOffset < documentText.length && !isEOL(documentText, endOffset)) {
      endOffset++;
    }
    formatText = documentText.substring(formatTextStart, endOffset);
    initialIndentLevel = computeIndentLevel(formatText, options);
  } else {
    formatText = documentText;
    initialIndentLevel = 0;
    formatTextStart = 0;
    rangeStart = 0;
    rangeEnd = documentText.length;
  }
  const eol = getEOL(options, documentText);
  const eolFastPathSupported = supportedEols.includes(eol);
  let numberLineBreaks = 0;
  let indentLevel = 0;
  let indentValue;
  if (options.insertSpaces) {
    indentValue = cachedSpaces[options.tabSize || 4] ?? repeat(cachedSpaces[1], options.tabSize || 4);
  } else {
    indentValue = "\t";
  }
  const indentType = indentValue === "\t" ? "\t" : " ";
  let scanner = createScanner(formatText, false);
  let hasError = false;
  function newLinesAndIndent() {
    if (numberLineBreaks > 1) {
      return repeat(eol, numberLineBreaks) + repeat(indentValue, initialIndentLevel + indentLevel);
    }
    const amountOfSpaces = indentValue.length * (initialIndentLevel + indentLevel);
    if (!eolFastPathSupported || amountOfSpaces > cachedBreakLinesWithSpaces[indentType][eol].length) {
      return eol + repeat(indentValue, initialIndentLevel + indentLevel);
    }
    if (amountOfSpaces <= 0) {
      return eol;
    }
    return cachedBreakLinesWithSpaces[indentType][eol][amountOfSpaces];
  }
  function scanNext() {
    let token = scanner.scan();
    numberLineBreaks = 0;
    while (token === 15 || token === 14) {
      if (token === 14 && options.keepLines) {
        numberLineBreaks += 1;
      } else if (token === 14) {
        numberLineBreaks = 1;
      }
      token = scanner.scan();
    }
    hasError = token === 16 || scanner.getTokenError() !== 0;
    return token;
  }
  const editOperations = [];
  function addEdit(text, startOffset, endOffset) {
    if (!hasError && (!range || startOffset < rangeEnd && endOffset > rangeStart) && documentText.substring(startOffset, endOffset) !== text) {
      editOperations.push({ offset: startOffset, length: endOffset - startOffset, content: text });
    }
  }
  let firstToken = scanNext();
  if (options.keepLines && numberLineBreaks > 0) {
    addEdit(repeat(eol, numberLineBreaks), 0, 0);
  }
  if (firstToken !== 17) {
    let firstTokenStart = scanner.getTokenOffset() + formatTextStart;
    let initialIndent = indentValue.length * initialIndentLevel < 20 && options.insertSpaces ? cachedSpaces[indentValue.length * initialIndentLevel] : repeat(indentValue, initialIndentLevel);
    addEdit(initialIndent, formatTextStart, firstTokenStart);
  }
  while (firstToken !== 17) {
    let firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
    let secondToken = scanNext();
    let replaceContent = "";
    let needsLineBreak = false;
    while (numberLineBreaks === 0 && (secondToken === 12 || secondToken === 13)) {
      let commentTokenStart = scanner.getTokenOffset() + formatTextStart;
      addEdit(cachedSpaces[1], firstTokenEnd, commentTokenStart);
      firstTokenEnd = scanner.getTokenOffset() + scanner.getTokenLength() + formatTextStart;
      needsLineBreak = secondToken === 12;
      replaceContent = needsLineBreak ? newLinesAndIndent() : "";
      secondToken = scanNext();
    }
    if (secondToken === 2) {
      if (firstToken !== 1) {
        indentLevel--;
      }
      if (options.keepLines && numberLineBreaks > 0 || !options.keepLines && firstToken !== 1) {
        replaceContent = newLinesAndIndent();
      } else if (options.keepLines) {
        replaceContent = cachedSpaces[1];
      }
    } else if (secondToken === 4) {
      if (firstToken !== 3) {
        indentLevel--;
      }
      if (options.keepLines && numberLineBreaks > 0 || !options.keepLines && firstToken !== 3) {
        replaceContent = newLinesAndIndent();
      } else if (options.keepLines) {
        replaceContent = cachedSpaces[1];
      }
    } else {
      switch (firstToken) {
        case 3:
        case 1:
          indentLevel++;
          if (options.keepLines && numberLineBreaks > 0 || !options.keepLines) {
            replaceContent = newLinesAndIndent();
          } else {
            replaceContent = cachedSpaces[1];
          }
          break;
        case 5:
          if (options.keepLines && numberLineBreaks > 0 || !options.keepLines) {
            replaceContent = newLinesAndIndent();
          } else {
            replaceContent = cachedSpaces[1];
          }
          break;
        case 12:
          replaceContent = newLinesAndIndent();
          break;
        case 13:
          if (numberLineBreaks > 0) {
            replaceContent = newLinesAndIndent();
          } else if (!needsLineBreak) {
            replaceContent = cachedSpaces[1];
          }
          break;
        case 6:
          if (options.keepLines && numberLineBreaks > 0) {
            replaceContent = newLinesAndIndent();
          } else if (!needsLineBreak) {
            replaceContent = cachedSpaces[1];
          }
          break;
        case 10:
          if (options.keepLines && numberLineBreaks > 0) {
            replaceContent = newLinesAndIndent();
          } else if (secondToken === 6 && !needsLineBreak) {
            replaceContent = "";
          }
          break;
        case 7:
        case 8:
        case 9:
        case 11:
        case 2:
        case 4:
          if (options.keepLines && numberLineBreaks > 0) {
            replaceContent = newLinesAndIndent();
          } else {
            if ((secondToken === 12 || secondToken === 13) && !needsLineBreak) {
              replaceContent = cachedSpaces[1];
            } else if (secondToken !== 5 && secondToken !== 17) {
              hasError = true;
            }
          }
          break;
        case 16:
          hasError = true;
          break;
      }
      if (numberLineBreaks > 0 && (secondToken === 12 || secondToken === 13)) {
        replaceContent = newLinesAndIndent();
      }
    }
    if (secondToken === 17) {
      if (options.keepLines && numberLineBreaks > 0) {
        replaceContent = newLinesAndIndent();
      } else {
        replaceContent = options.insertFinalNewline ? eol : "";
      }
    }
    const secondTokenStart = scanner.getTokenOffset() + formatTextStart;
    addEdit(replaceContent, firstTokenEnd, secondTokenStart);
    firstToken = secondToken;
  }
  return editOperations;
}
function repeat(s, count) {
  let result = "";
  for (let i = 0;i < count; i++) {
    result += s;
  }
  return result;
}
function computeIndentLevel(content, options) {
  let i = 0;
  let nChars = 0;
  const tabSize = options.tabSize || 4;
  while (i < content.length) {
    let ch = content.charAt(i);
    if (ch === cachedSpaces[1]) {
      nChars++;
    } else if (ch === "\t") {
      nChars += tabSize;
    } else {
      break;
    }
    i++;
  }
  return Math.floor(nChars / tabSize);
}
function getEOL(options, text) {
  for (let i = 0;i < text.length; i++) {
    const ch = text.charAt(i);
    if (ch === "\r") {
      if (i + 1 < text.length && text.charAt(i + 1) === `
`) {
        return `\r
`;
      }
      return "\r";
    } else if (ch === `
`) {
      return `
`;
    }
  }
  return options && options.eol || `
`;
}
function isEOL(text, offset) {
  return `\r
`.indexOf(text.charAt(offset)) !== -1;
}

// node_modules/jsonc-parser/lib/esm/impl/parser.js
var ParseOptions;
(function(ParseOptions2) {
  ParseOptions2.DEFAULT = {
    allowTrailingComma: false
  };
})(ParseOptions || (ParseOptions = {}));
function parseTree(text, errors = [], options = ParseOptions.DEFAULT) {
  let currentParent = { type: "array", offset: -1, length: -1, children: [], parent: undefined };
  function ensurePropertyComplete(endOffset) {
    if (currentParent.type === "property") {
      currentParent.length = endOffset - currentParent.offset;
      currentParent = currentParent.parent;
    }
  }
  function onValue(valueNode) {
    currentParent.children.push(valueNode);
    return valueNode;
  }
  const visitor = {
    onObjectBegin: (offset) => {
      currentParent = onValue({ type: "object", offset, length: -1, parent: currentParent, children: [] });
    },
    onObjectProperty: (name, offset, length) => {
      currentParent = onValue({ type: "property", offset, length: -1, parent: currentParent, children: [] });
      currentParent.children.push({ type: "string", value: name, offset, length, parent: currentParent });
    },
    onObjectEnd: (offset, length) => {
      ensurePropertyComplete(offset + length);
      currentParent.length = offset + length - currentParent.offset;
      currentParent = currentParent.parent;
      ensurePropertyComplete(offset + length);
    },
    onArrayBegin: (offset, length) => {
      currentParent = onValue({ type: "array", offset, length: -1, parent: currentParent, children: [] });
    },
    onArrayEnd: (offset, length) => {
      currentParent.length = offset + length - currentParent.offset;
      currentParent = currentParent.parent;
      ensurePropertyComplete(offset + length);
    },
    onLiteralValue: (value, offset, length) => {
      onValue({ type: getNodeType(value), offset, length, parent: currentParent, value });
      ensurePropertyComplete(offset + length);
    },
    onSeparator: (sep, offset, length) => {
      if (currentParent.type === "property") {
        if (sep === ":") {
          currentParent.colonOffset = offset;
        } else if (sep === ",") {
          ensurePropertyComplete(offset);
        }
      }
    },
    onError: (error, offset, length) => {
      errors.push({ error, offset, length });
    }
  };
  visit(text, visitor, options);
  const result = currentParent.children[0];
  if (result) {
    delete result.parent;
  }
  return result;
}
function findNodeAtLocation(root, path) {
  if (!root) {
    return;
  }
  let node = root;
  for (let segment of path) {
    if (typeof segment === "string") {
      if (node.type !== "object" || !Array.isArray(node.children)) {
        return;
      }
      let found = false;
      for (const propertyNode of node.children) {
        if (Array.isArray(propertyNode.children) && propertyNode.children[0].value === segment && propertyNode.children.length === 2) {
          node = propertyNode.children[1];
          found = true;
          break;
        }
      }
      if (!found) {
        return;
      }
    } else {
      const index = segment;
      if (node.type !== "array" || index < 0 || !Array.isArray(node.children) || index >= node.children.length) {
        return;
      }
      node = node.children[index];
    }
  }
  return node;
}
function visit(text, visitor, options = ParseOptions.DEFAULT) {
  const _scanner = createScanner(text, false);
  const _jsonPath = [];
  let suppressedCallbacks = 0;
  function toNoArgVisit(visitFunction) {
    return visitFunction ? () => suppressedCallbacks === 0 && visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
  }
  function toOneArgVisit(visitFunction) {
    return visitFunction ? (arg) => suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter()) : () => true;
  }
  function toOneArgVisitWithPath(visitFunction) {
    return visitFunction ? (arg) => suppressedCallbacks === 0 && visitFunction(arg, _scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice()) : () => true;
  }
  function toBeginVisit(visitFunction) {
    return visitFunction ? () => {
      if (suppressedCallbacks > 0) {
        suppressedCallbacks++;
      } else {
        let cbReturn = visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter(), () => _jsonPath.slice());
        if (cbReturn === false) {
          suppressedCallbacks = 1;
        }
      }
    } : () => true;
  }
  function toEndVisit(visitFunction) {
    return visitFunction ? () => {
      if (suppressedCallbacks > 0) {
        suppressedCallbacks--;
      }
      if (suppressedCallbacks === 0) {
        visitFunction(_scanner.getTokenOffset(), _scanner.getTokenLength(), _scanner.getTokenStartLine(), _scanner.getTokenStartCharacter());
      }
    } : () => true;
  }
  const onObjectBegin = toBeginVisit(visitor.onObjectBegin), onObjectProperty = toOneArgVisitWithPath(visitor.onObjectProperty), onObjectEnd = toEndVisit(visitor.onObjectEnd), onArrayBegin = toBeginVisit(visitor.onArrayBegin), onArrayEnd = toEndVisit(visitor.onArrayEnd), onLiteralValue = toOneArgVisitWithPath(visitor.onLiteralValue), onSeparator = toOneArgVisit(visitor.onSeparator), onComment = toNoArgVisit(visitor.onComment), onError = toOneArgVisit(visitor.onError);
  const disallowComments = options && options.disallowComments;
  const allowTrailingComma = options && options.allowTrailingComma;
  function scanNext() {
    while (true) {
      const token = _scanner.scan();
      switch (_scanner.getTokenError()) {
        case 4:
          handleError(14);
          break;
        case 5:
          handleError(15);
          break;
        case 3:
          handleError(13);
          break;
        case 1:
          if (!disallowComments) {
            handleError(11);
          }
          break;
        case 2:
          handleError(12);
          break;
        case 6:
          handleError(16);
          break;
      }
      switch (token) {
        case 12:
        case 13:
          if (disallowComments) {
            handleError(10);
          } else {
            onComment();
          }
          break;
        case 16:
          handleError(1);
          break;
        case 15:
        case 14:
          break;
        default:
          return token;
      }
    }
  }
  function handleError(error, skipUntilAfter = [], skipUntil = []) {
    onError(error);
    if (skipUntilAfter.length + skipUntil.length > 0) {
      let token = _scanner.getToken();
      while (token !== 17) {
        if (skipUntilAfter.indexOf(token) !== -1) {
          scanNext();
          break;
        } else if (skipUntil.indexOf(token) !== -1) {
          break;
        }
        token = scanNext();
      }
    }
  }
  function parseString(isValue) {
    const value = _scanner.getTokenValue();
    if (isValue) {
      onLiteralValue(value);
    } else {
      onObjectProperty(value);
      _jsonPath.push(value);
    }
    scanNext();
    return true;
  }
  function parseLiteral() {
    switch (_scanner.getToken()) {
      case 11:
        const tokenValue = _scanner.getTokenValue();
        let value = Number(tokenValue);
        if (isNaN(value)) {
          handleError(2);
          value = 0;
        }
        onLiteralValue(value);
        break;
      case 7:
        onLiteralValue(null);
        break;
      case 8:
        onLiteralValue(true);
        break;
      case 9:
        onLiteralValue(false);
        break;
      default:
        return false;
    }
    scanNext();
    return true;
  }
  function parseProperty() {
    if (_scanner.getToken() !== 10) {
      handleError(3, [], [2, 5]);
      return false;
    }
    parseString(false);
    if (_scanner.getToken() === 6) {
      onSeparator(":");
      scanNext();
      if (!parseValue()) {
        handleError(4, [], [2, 5]);
      }
    } else {
      handleError(5, [], [2, 5]);
    }
    _jsonPath.pop();
    return true;
  }
  function parseObject() {
    onObjectBegin();
    scanNext();
    let needsComma = false;
    while (_scanner.getToken() !== 2 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) {
          handleError(4, [], []);
        }
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 2 && allowTrailingComma) {
          break;
        }
      } else if (needsComma) {
        handleError(6, [], []);
      }
      if (!parseProperty()) {
        handleError(4, [], [2, 5]);
      }
      needsComma = true;
    }
    onObjectEnd();
    if (_scanner.getToken() !== 2) {
      handleError(7, [2], []);
    } else {
      scanNext();
    }
    return true;
  }
  function parseArray() {
    onArrayBegin();
    scanNext();
    let isFirstElement = true;
    let needsComma = false;
    while (_scanner.getToken() !== 4 && _scanner.getToken() !== 17) {
      if (_scanner.getToken() === 5) {
        if (!needsComma) {
          handleError(4, [], []);
        }
        onSeparator(",");
        scanNext();
        if (_scanner.getToken() === 4 && allowTrailingComma) {
          break;
        }
      } else if (needsComma) {
        handleError(6, [], []);
      }
      if (isFirstElement) {
        _jsonPath.push(0);
        isFirstElement = false;
      } else {
        _jsonPath[_jsonPath.length - 1]++;
      }
      if (!parseValue()) {
        handleError(4, [], [4, 5]);
      }
      needsComma = true;
    }
    onArrayEnd();
    if (!isFirstElement) {
      _jsonPath.pop();
    }
    if (_scanner.getToken() !== 4) {
      handleError(8, [4], []);
    } else {
      scanNext();
    }
    return true;
  }
  function parseValue() {
    switch (_scanner.getToken()) {
      case 3:
        return parseArray();
      case 1:
        return parseObject();
      case 10:
        return parseString(true);
      default:
        return parseLiteral();
    }
  }
  scanNext();
  if (_scanner.getToken() === 17) {
    if (options.allowEmptyContent) {
      return true;
    }
    handleError(4, [], []);
    return false;
  }
  if (!parseValue()) {
    handleError(4, [], []);
    return false;
  }
  if (_scanner.getToken() !== 17) {
    handleError(9, [], []);
  }
  return true;
}
function getNodeType(value) {
  switch (typeof value) {
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "object": {
      if (!value) {
        return "null";
      } else if (Array.isArray(value)) {
        return "array";
      }
      return "object";
    }
    default:
      return "null";
  }
}

// node_modules/jsonc-parser/lib/esm/impl/edit.js
function setProperty(text, originalPath, value, options) {
  const path = originalPath.slice();
  const errors = [];
  const root = parseTree(text, errors);
  let parent = undefined;
  let lastSegment = undefined;
  while (path.length > 0) {
    lastSegment = path.pop();
    parent = findNodeAtLocation(root, path);
    if (parent === undefined && value !== undefined) {
      if (typeof lastSegment === "string") {
        value = { [lastSegment]: value };
      } else {
        value = [value];
      }
    } else {
      break;
    }
  }
  if (!parent) {
    if (value === undefined) {
      throw new Error("Can not delete in empty document");
    }
    return withFormatting(text, { offset: root ? root.offset : 0, length: root ? root.length : 0, content: JSON.stringify(value) }, options);
  } else if (parent.type === "object" && typeof lastSegment === "string" && Array.isArray(parent.children)) {
    const existing = findNodeAtLocation(parent, [lastSegment]);
    if (existing !== undefined) {
      if (value === undefined) {
        if (!existing.parent) {
          throw new Error("Malformed AST");
        }
        const propertyIndex = parent.children.indexOf(existing.parent);
        let removeBegin;
        let removeEnd = existing.parent.offset + existing.parent.length;
        if (propertyIndex > 0) {
          let previous = parent.children[propertyIndex - 1];
          removeBegin = previous.offset + previous.length;
        } else {
          removeBegin = parent.offset + 1;
          if (parent.children.length > 1) {
            let next = parent.children[1];
            removeEnd = next.offset;
          }
        }
        return withFormatting(text, { offset: removeBegin, length: removeEnd - removeBegin, content: "" }, options);
      } else {
        return withFormatting(text, { offset: existing.offset, length: existing.length, content: JSON.stringify(value) }, options);
      }
    } else {
      if (value === undefined) {
        return [];
      }
      const newProperty = `${JSON.stringify(lastSegment)}: ${JSON.stringify(value)}`;
      const index = options.getInsertionIndex ? options.getInsertionIndex(parent.children.map((p) => p.children[0].value)) : parent.children.length;
      let edit;
      if (index > 0) {
        let previous = parent.children[index - 1];
        edit = { offset: previous.offset + previous.length, length: 0, content: "," + newProperty };
      } else if (parent.children.length === 0) {
        edit = { offset: parent.offset + 1, length: 0, content: newProperty };
      } else {
        edit = { offset: parent.offset + 1, length: 0, content: newProperty + "," };
      }
      return withFormatting(text, edit, options);
    }
  } else if (parent.type === "array" && typeof lastSegment === "number" && Array.isArray(parent.children)) {
    const insertIndex = lastSegment;
    if (insertIndex === -1) {
      const newProperty = `${JSON.stringify(value)}`;
      let edit;
      if (parent.children.length === 0) {
        edit = { offset: parent.offset + 1, length: 0, content: newProperty };
      } else {
        const previous = parent.children[parent.children.length - 1];
        edit = { offset: previous.offset + previous.length, length: 0, content: "," + newProperty };
      }
      return withFormatting(text, edit, options);
    } else if (value === undefined && parent.children.length >= 0) {
      const removalIndex = lastSegment;
      const toRemove = parent.children[removalIndex];
      let edit;
      if (parent.children.length === 1) {
        edit = { offset: parent.offset + 1, length: parent.length - 2, content: "" };
      } else if (parent.children.length - 1 === removalIndex) {
        let previous = parent.children[removalIndex - 1];
        let offset = previous.offset + previous.length;
        let parentEndOffset = parent.offset + parent.length;
        edit = { offset, length: parentEndOffset - 2 - offset, content: "" };
      } else {
        edit = { offset: toRemove.offset, length: parent.children[removalIndex + 1].offset - toRemove.offset, content: "" };
      }
      return withFormatting(text, edit, options);
    } else if (value !== undefined) {
      let edit;
      const newProperty = `${JSON.stringify(value)}`;
      if (!options.isArrayInsertion && parent.children.length > lastSegment) {
        const toModify = parent.children[lastSegment];
        edit = { offset: toModify.offset, length: toModify.length, content: newProperty };
      } else if (parent.children.length === 0 || lastSegment === 0) {
        edit = { offset: parent.offset + 1, length: 0, content: parent.children.length === 0 ? newProperty : newProperty + "," };
      } else {
        const index = lastSegment > parent.children.length ? parent.children.length : lastSegment;
        const previous = parent.children[index - 1];
        edit = { offset: previous.offset + previous.length, length: 0, content: "," + newProperty };
      }
      return withFormatting(text, edit, options);
    } else {
      throw new Error(`Can not ${value === undefined ? "remove" : options.isArrayInsertion ? "insert" : "modify"} Array index ${insertIndex} as length is not sufficient`);
    }
  } else {
    throw new Error(`Can not add ${typeof lastSegment !== "number" ? "index" : "property"} to parent of type ${parent.type}`);
  }
}
function withFormatting(text, edit, options) {
  if (!options.formattingOptions) {
    return [edit];
  }
  let newText = applyEdit(text, edit);
  let begin = edit.offset;
  let end = edit.offset + edit.content.length;
  if (edit.length === 0 || edit.content.length === 0) {
    while (begin > 0 && !isEOL(newText, begin - 1)) {
      begin--;
    }
    while (end < newText.length && !isEOL(newText, end)) {
      end++;
    }
  }
  const edits = format(newText, { offset: begin, length: end - begin }, { ...options.formattingOptions, keepLines: false });
  for (let i = edits.length - 1;i >= 0; i--) {
    const edit2 = edits[i];
    newText = applyEdit(newText, edit2);
    begin = Math.min(begin, edit2.offset);
    end = Math.max(end, edit2.offset + edit2.length);
    end += edit2.content.length - edit2.length;
  }
  const editLength = text.length - (newText.length - end) - begin;
  return [{ offset: begin, length: editLength, content: newText.substring(begin, end) }];
}
function applyEdit(text, edit) {
  return text.substring(0, edit.offset) + edit.content + text.substring(edit.offset + edit.length);
}

// node_modules/jsonc-parser/lib/esm/main.js
var ScanError;
(function(ScanError2) {
  ScanError2[ScanError2["None"] = 0] = "None";
  ScanError2[ScanError2["UnexpectedEndOfComment"] = 1] = "UnexpectedEndOfComment";
  ScanError2[ScanError2["UnexpectedEndOfString"] = 2] = "UnexpectedEndOfString";
  ScanError2[ScanError2["UnexpectedEndOfNumber"] = 3] = "UnexpectedEndOfNumber";
  ScanError2[ScanError2["InvalidUnicode"] = 4] = "InvalidUnicode";
  ScanError2[ScanError2["InvalidEscapeCharacter"] = 5] = "InvalidEscapeCharacter";
  ScanError2[ScanError2["InvalidCharacter"] = 6] = "InvalidCharacter";
})(ScanError || (ScanError = {}));
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
})(SyntaxKind || (SyntaxKind = {}));
var parseTree2 = parseTree;
var findNodeAtLocation2 = findNodeAtLocation;
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
})(ParseErrorCode || (ParseErrorCode = {}));
function modify(text, path, value, options) {
  return setProperty(text, path, value, options);
}
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
      text = applyEdit(text, e);
    } else {
      throw new Error("Overlapping edit");
    }
    lastModifiedOffset = e.offset;
  }
  return text;
}

// src/installer/opencode.ts
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
  const tree = parseTree2(source);
  if (tree) {
    const pluginsNode = findNodeAtLocation2(tree, ["plugins"]);
    if (pluginsNode?.type === "array" && pluginsNode.children) {
      const alreadyPresent = pluginsNode.children.some((child) => child.type === "string" && child.value === "spotme");
      if (alreadyPresent)
        return source;
    }
  }
  const existing = source.trim() === "" ? "{}" : source;
  const edits = modify(existing, ["plugins", -1], "spotme", { formattingOptions: {} });
  return applyEdits(existing, edits);
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
