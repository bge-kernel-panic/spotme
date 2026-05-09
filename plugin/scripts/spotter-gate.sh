#!/usr/bin/env bash
# spotter-gate.sh
# PreToolUse hook — counts code-writing tool calls, blocks at threshold.
# State is stored in a temp file; resets when Spotter is deactivated.
#
# Claude Code passes tool input as JSON on stdin.
# We output JSON on stdout.

set -euo pipefail

STATE_DIR="${TMPDIR:-/tmp}/spotter-$$"   # per-session dir using parent PID
ACTIVE_FILE="$STATE_DIR/active"
COUNT_FILE="$STATE_DIR/count"
CONFIG_FILE="$STATE_DIR/config"

# Defaults
DEFAULT_EVERY=2
DEFAULT_DIFFICULTY="medium"

# Read stdin (tool input JSON) — we don't need it for counting, just consume it
INPUT=$(cat)

# Not active → allow immediately
if [[ ! -f "$ACTIVE_FILE" ]]; then
  echo '{}'
  exit 0
fi

# Read config
EVERY=$(jq -r '.every // 2' "$CONFIG_FILE" 2>/dev/null || echo "$DEFAULT_EVERY")
DIFFICULTY=$(jq -r '.difficulty // "medium"' "$CONFIG_FILE" 2>/dev/null || echo "$DEFAULT_DIFFICULTY")

# Increment count
COUNT=$(cat "$COUNT_FILE" 2>/dev/null || echo "0")
COUNT=$((COUNT + 1))
echo "$COUNT" > "$COUNT_FILE"

if [[ "$COUNT" -ge "$EVERY" ]]; then
  # Reset counter; block the write
  echo "0" > "$COUNT_FILE"
  jq -n \
    --arg count "$COUNT" \
    --arg every "$EVERY" \
    --arg difficulty "$DIFFICULTY" \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("[Spotter] Code-write limit reached (" + $count + "/" + $every + "). Call mcp__spotter__spotter_exercise to scaffold the next unit (difficulty: " + $difficulty + "). Or run /spotter:rep for an on-demand exercise.")
      }
    }'
else
  # Allow; inject progress reminder
  jq -n \
    --arg count "$COUNT" \
    --arg every "$EVERY" \
    '{ systemMessage: ("[Spotter] Code write " + $count + "/" + $every + ".") }'
fi
