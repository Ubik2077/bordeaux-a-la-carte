#!/bin/sh
# Regénère les grandes affiches « quartiers gourmands » avec Chrome ou Brave sans fenêtre :
#   affiche-bordeaux-a-la-carte-a3.pdf  (A3, pour le comptoir : affiche-quartiers.html)
#   affiche-bordeaux-a-la-carte-a2.pdf  (A2, pour le mur : affiche-quartiers.html?a2)
# Le site doit tourner en local : python3 -m http.server 8642 --bind 127.0.0.1
# Le plan et le nombre d'adresses viennent de data/ : relancer ce script après une mise à jour des données.
set -e
cd "$(dirname "$0")/.."
for b in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
         "$(command -v chromium || true)" "$(command -v google-chrome || true)"; do
  [ -x "$b" ] && NAV="$b" && break
done
[ -n "$NAV" ] || { echo "Chrome ou Brave introuvable"; exit 1; }
TEMP_PROFIL="$(mktemp -d)"
PROFIL="${PROFIL:-$TEMP_PROFIL}"  # profil de navigateur jetable
for paire in "affiche-quartiers.html affiche-bordeaux-a-la-carte-a3.pdf" "affiche-quartiers.html?a2 affiche-bordeaux-a-la-carte-a2.pdf"; do
  set -- $paire
  "$NAV" --headless --no-first-run --disable-extensions --use-mock-keychain --password-store=basic --user-data-dir="$PROFIL" --no-pdf-header-footer \
    --virtual-time-budget=10000 --print-to-pdf="$PWD/$2" "http://127.0.0.1:8642/$1" 2>/dev/null
  echo "✓ $2"
done
rm -rf "$TEMP_PROFIL"
