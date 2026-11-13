#!/bin/sh
# Prépare un dossier « publication » ne contenant que les fichiers de l'app,
# prêt à être glissé-déposé sur Netlify (ou envoyé ailleurs), ainsi qu'une archive .zip.
# Usage : sh scripts/preparer-publication.sh
set -e
cd "$(dirname "$0")/.."
OUT=publication
mkdir -p "$OUT"
# Recopie à l'identique (et retire du dossier publication ce qui n'existe plus dans l'app)
rsync -a --delete \
  --include='index.html' --include='sw.js' --include='manifest.webmanifest' --include='netlify.toml' \
  --include='css/***' --include='js/***' --include='data/***' --include='fonts/***' --include='img/***' --include='vendor/***' \
  --exclude='*' ./ "$OUT/"
rm -f bordeaux-a-la-carte.zip
(cd "$OUT" && zip -qr ../bordeaux-a-la-carte.zip . -x '.DS_Store')
echo "✔ Dossier « $OUT » et archive « bordeaux-a-la-carte.zip » prêts."
du -sh "$OUT" bordeaux-a-la-carte.zip
