#!/usr/bin/env bash
set -euo pipefail

mkdir -p data/source

curl --fail --location --silent --show-error \
  --output data/source/wpp2024-tbirths-2026.json \
  'https://population.un.org/dataportalapi/uiapi/v1/data/indicators/57/locations/ALL/selind/57/selloc/ALL/selyears/2026/time/2026:2026/route/table/subRoute/pivotbyvariant'

curl --fail --location --silent --show-error \
  --output data/source/wpp2024-locations.json \
  'https://population.un.org/dataportalapi/uiapi/v1/locations/tvAlphabetical'

echo "Downloaded WPP 2024 indicator 57 / 2026 Median source files into data/source/."

