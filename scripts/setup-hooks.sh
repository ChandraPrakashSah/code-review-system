#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Setup Script — Claude AI Code Review Hooks
# Each team member runs this ONCE after cloning the repo.
# Usage: bash scripts/setup-hooks.sh
# ─────────────────────────────────────────────────────────────────────────────

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$REPO_ROOT" ]; then
  echo "❌  Not inside a git repository. Run this from the project root."
  exit 1
fi

echo ""
echo "Setting up Claude AI Code Review hooks..."
echo ""

# Point git at the committed .githooks directory
git config core.hooksPath .githooks

# Make the pre-push hook executable
chmod +x "$REPO_ROOT/.githooks/pre-push"

echo "✅  Git hooks configured."
echo ""

# Check if claude CLI is installed
if command -v claude &>/dev/null; then
  echo "✅  Claude CLI found: $(which claude)"
else
  echo "⚠️  Claude CLI not found."
  echo "   Install Claude Code from: https://claude.ai/code"
  echo "   Without it, reviews will be skipped but pushes will still work."
fi

echo ""
echo "Done. Claude AI review will run automatically before every git push."
echo ""
