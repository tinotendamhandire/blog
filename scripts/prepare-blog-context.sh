#!/bin/sh
# Regenerates .deploy-context/ as a clean export of git HEAD — no untracked
# files, no uncommitted edits. The `blog` service builds from this
# directory instead of the live repo checkout specifically so that a draft
# written through /admin (which writes straight into
# src/content/notes/ but deliberately never commits) can't reach the site
# just because *some* push triggered a rebuild. Only what's actually
# committed and pushed ever gets built.
set -e
cd "$(dirname "$0")/.."
rm -rf .deploy-context
mkdir -p .deploy-context
git archive HEAD | tar -x -C .deploy-context
