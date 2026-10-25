#!/usr/bin/env bash
# Aperçu web autonome : export web en mode démo puis un seul fichier HTML (JS, CSS et polices embarqués).
# Aucune dépendance réseau : la « base » vit en mémoire dans le navigateur (src/lib/demo).
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf dist-demo
EXPO_PUBLIC_DEMO=1 CI=1 npx expo export --platform web --output-dir dist-demo
python3 scripts/inline-demo.py dist-demo dist-demo/partants-demo.html
