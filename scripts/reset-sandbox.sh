#!/usr/bin/env bash
# Re-arms the demo scenarios by pushing the "broken" versions back to the PR branches:
#   PR #1 (feat/profile-avatar)  -> lint nits  -> enables "Fix nits"
#   PR #2 (feat/currency-format) -> failing test -> enables "Fix pipeline"
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
git fetch -q origin

# --- PR #1: re-introduce lint nits -------------------------------------------
git checkout -q feat/profile-avatar
git reset -q --hard origin/feat/profile-avatar
cat > sandbox/src/components/ProfileHeader.js <<'JS'
export function ProfileHeader(user) {
  const unused = "this variable is never used";
  if (user.id == "0") {
    return "guest";
  }
  return user.name;
}
JS
git commit -qam "chore: re-arm lint nits for demo"
git push -q origin feat/profile-avatar

# --- PR #2: re-introduce failing test ----------------------------------------
git checkout -q feat/currency-format
git reset -q --hard origin/feat/currency-format
cat > sandbox/src/utils/currency.js <<'JS'
export function formatCurrency(amount) {
  return `$${amount}`;
}
JS
git commit -qam "chore: re-arm failing pipeline for demo"
git push -q origin feat/currency-format

git checkout -q main
echo "Re-armed. CI will go red shortly — then Fix nits (#1) and Fix pipeline (#2) are actionable."
