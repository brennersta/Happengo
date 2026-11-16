#!/usr/bin/env bash
# Rewrite api/openapi.json from the generated document. CI fails when they differ.
set -euo pipefail
cd "$(dirname "$0")/.."
export UPDATE_OPENAPI=1
dotnet test tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj \
  --filter FullyQualifiedName~OpenApiDriftTests
