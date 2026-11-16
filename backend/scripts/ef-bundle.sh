#!/usr/bin/env bash
# Build a self-contained EF migration bundle for deploy.
# The API does not apply migrations on startup. Run the bundle as its own step:
#   ./dist/efbundle --connection "$ConnectionStrings__Happengo"
set -euo pipefail
cd "$(dirname "$0")/.."
dotnet tool restore
dotnet ef migrations bundle \
  --project src/Happengo.Api \
  --startup-project src/Happengo.Api \
  --configuration Release \
  --self-contained \
  --target-runtime linux-x64 \
  --output dist/efbundle \
  --force
