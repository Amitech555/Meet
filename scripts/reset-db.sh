#!/usr/bin/env bash
# Réinitialise la base de dev : migrations + seed Montréal. Ne jamais lancer contre la prod.
set -euo pipefail
cd "$(dirname "$0")/.."
npx supabase db reset
echo "Base réinitialisée. Comptes de démo : demo+camille@partants.app … / mot de passe partants-demo"
