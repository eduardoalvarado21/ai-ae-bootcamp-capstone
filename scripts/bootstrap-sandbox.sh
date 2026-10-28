#!/usr/bin/env bash
# Creates a public sandbox repo with real CI and two genuinely-failing PRs:
#   PR 1 — lint nits  (lint job fails)
#   PR 2 — failing test (unit-tests job fails)
# Usage: scripts/bootstrap-sandbox.sh [repo-name]
set -euo pipefail

REPO="${1:-pr-dashboard-sandbox}"
OWNER="$(gh api user --jq .login)"
WORK="$(mktemp -d)"
echo "Creating $OWNER/$REPO in $WORK"
cd "$WORK"

# ---------------------------------------------------------------- base (main)
mkdir -p src/utils src/components .github/workflows

cat > package.json <<'JSON'
{
  "name": "pr-dashboard-sandbox",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "lint": "eslint .",
    "build": "node -e \"console.log('build ok')\"",
    "test": "vitest run"
  },
  "devDependencies": {
    "@eslint/js": "^9.18.0",
    "eslint": "^9.18.0",
    "globals": "^15.14.0",
    "vitest": "^2.1.8"
  }
}
JSON

cat > eslint.config.mjs <<'JS'
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      eqeqeq: "error",
      "no-unused-vars": "error",
    },
  },
  { ignores: ["node_modules/**"] },
];
JS

cat > src/utils/math.js <<'JS'
export function add(a, b) {
  return a + b;
}
JS

cat > src/utils/math.test.js <<'JS'
import { describe, expect, it } from "vitest";
import { add } from "./math.js";

describe("add", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
JS

cat > .github/workflows/ci.yml <<'YML'
name: ci
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run lint
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm test
YML

cat > .gitignore <<'GI'
node_modules/
GI

cat > README.md <<'MD'
# pr-dashboard-sandbox

Sandbox repo for the agentic **PR Dashboard — Reviewer & Pipeline Fixer** capstone.
Contains two intentionally-failing PRs: one with lint nits, one with a failing test.
MD

git init -b main -q
git add -A
git commit -qm "chore: bootstrap sandbox project with green CI"
gh repo create "$OWNER/$REPO" --public --source=. --remote=origin --push

# ---------------------------------------------------- PR 1: lint nits (red lint)
git checkout -q -b feat/profile-avatar
cat > src/components/ProfileHeader.js <<'JS'
export function ProfileHeader(user) {
  const unused = "this variable is never used";
  if (user.id == "0") {
    return "guest";
  }
  return user.name;
}
JS
git add -A
git commit -qm "feat: add profile header component"
git push -q -u origin feat/profile-avatar
gh pr create \
  --title "Add user avatar to profile header" \
  --body "Adds a ProfileHeader component. (Has lint nits: unused var + \`==\`.)" \
  --base main --head feat/profile-avatar

# ------------------------------------------ PR 2: failing test (red unit-tests)
git checkout -q main
git checkout -q -b feat/currency-format
cat > src/utils/currency.js <<'JS'
export function formatCurrency(amount) {
  return `$${amount}`;
}
JS
cat > src/utils/currency.test.js <<'JS'
import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency.js";

describe("formatCurrency", () => {
  it("formats USD with two decimals", () => {
    expect(formatCurrency(1250)).toBe("$1,250.00");
  });
});
JS
git add -A
git commit -qm "feat: introduce currency formatter util"
git push -q -u origin feat/currency-format
gh pr create \
  --title "Introduce currency formatter util" \
  --body "Adds a currency formatter. (Pipeline fails: missing Intl.NumberFormat.)" \
  --base main --head feat/currency-format

echo
echo "Done. Wire the dashboard with:"
echo "  GITHUB_OWNER=$OWNER"
echo "  GITHUB_REPO=$REPO"
echo "Open PRs:"
gh pr list --repo "$OWNER/$REPO"
