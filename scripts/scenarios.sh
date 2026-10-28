#!/usr/bin/env bash
# Creates additional real PRs so the dashboard shows 6 varied scenarios.
# Idempotent: skips any branch whose PR already exists.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
git fetch -q origin

exists() { [ "$(gh pr list --head "$1" --state open --json number --jq 'length')" != "0" ]; }
from_main() { git checkout -q main && git reset -q --hard origin/main && git checkout -q -b "$1"; }

# 3) Safe to merge — docs only, CI passes
if ! exists docs/usage-guide; then
  from_main docs/usage-guide
  printf '# Usage\n\nRun `npm test` to execute the suite.\n' > sandbox/USAGE.md
  git add sandbox/USAGE.md
  git commit -qm "docs: add usage guide"
  git push -q -u origin docs/usage-guide
  gh pr create --base main --head docs/usage-guide \
    --title "Docs: add usage guide" --body "Docs only — safe to merge."
fi

# 4) Needs manual review — large change (14 files, >400 non-test lines)
if ! exists refactor/split-utils; then
  from_main refactor/split-utils
  mkdir -p sandbox/src/generated
  for i in $(seq 1 14); do
    for j in $(seq 1 30); do echo "export const gen_${i}_${j} = ${j};"; done > "sandbox/src/generated/mod_${i}.js"
  done
  git add sandbox/src/generated
  git commit -qm "refactor: split utils into generated modules"
  git push -q -u origin refactor/split-utils
  gh pr create --base main --head refactor/split-utils \
    --title "Refactor: split utils into modules" --body "Large change — needs manual review."
fi

# 5) Second nits PR (fixable) — unused var + ==
if ! exists feat/settings-page; then
  from_main feat/settings-page
  mkdir -p sandbox/src/pages
  cat > sandbox/src/pages/Settings.js <<'JS'
export function Settings(user) {
  const draft = "unsaved";
  if (user.role == "admin") {
    return "admin-settings";
  }
  return "settings";
}
JS
  git add sandbox/src/pages/Settings.js
  git commit -qm "feat: add settings page"
  git push -q -u origin feat/settings-page
  gh pr create --base main --head feat/settings-page \
    --title "Add settings page" --body "Has lint nits: unused var + ==."
fi

# 7) Second nits PR for practice (fixable) — unused var + !=
if ! exists feat/header-nav; then
  from_main feat/header-nav
  mkdir -p sandbox/src/components
  cat > sandbox/src/components/HeaderNav.js <<'JS'
export function HeaderNav(session) {
  const theme = "dark";
  if (session.state != "active") {
    return "guest-nav";
  }
  return "user-nav";
}
JS
  git add sandbox/src/components/HeaderNav.js
  git commit -qm "feat: add header nav"
  git push -q -u origin feat/header-nav
  gh pr create --base main --head feat/header-nav \
    --title "Add header nav" --body "Has lint nits: unused var + !=."
fi

# 8) Second pipeline PR for practice (fixable) — slugify bug
if ! exists feat/slugify; then
  from_main feat/slugify
  mkdir -p sandbox/src/utils
  cat > sandbox/src/utils/slugify.js <<'JS'
export function slugify(text) {
  return text.toLowerCase().replace(/ /g, "-");
}
JS
  cat > sandbox/src/utils/slugify.test.js <<'JS'
import { describe, expect, it } from "vitest";
import { slugify } from "./slugify.js";

describe("slugify", () => {
  it("creates a url-safe slug", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});
JS
  git add sandbox/src/utils/slugify.js sandbox/src/utils/slugify.test.js
  git commit -qm "feat: add slugify util"
  git push -q -u origin feat/slugify
  gh pr create --base main --head feat/slugify \
    --title "Add slugify util" --body "Pipeline fails: slug keeps punctuation + trailing dash."
fi

# 9) Merge conflict — branch and main edit the same line. Done LAST (moves main).
if ! exists chore/update-title; then
  from_main chore/update-title
  sed -i '1s|.*|# sandbox (updated by PR)|' sandbox/README.md
  git commit -qam "chore: update sandbox title"
  git push -q -u origin chore/update-title
  gh pr create --base main --head chore/update-title \
    --title "Update sandbox title" --body "Edits the same line as main — expect a conflict."
  git checkout -q main && git reset -q --hard origin/main
  sed -i '1s|.*|# sandbox (updated on main)|' sandbox/README.md
  git commit -qam "chore: update sandbox title on main"
  git push -q origin main
fi

git checkout -q main
echo "=== Open PRs ==="
gh pr list
