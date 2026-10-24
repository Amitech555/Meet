#!/usr/bin/env bash
# Migrations + seed + tests pgTAP + test de concurrence, sur la base Supabase locale.
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase db reset
npx supabase test db
bash scripts/race-test.sh
