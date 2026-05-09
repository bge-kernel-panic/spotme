#!/usr/bin/env bash
# validate.sh — install deps and type-check the plugin
# Run this on a machine with Bun + OpenCode installed.

set -e

echo "Installing dependencies..."
bun install

echo "Type-checking..."
bun tsc --noEmit

echo "All good. To test locally:"
echo "  1. Link this plugin into a test project:"
echo "     ln -s \$(pwd) /your-test-project/.opencode/plugins/spotter"
echo "  2. Open the project in OpenCode"
echo "  3. Run: /spotter:on"
