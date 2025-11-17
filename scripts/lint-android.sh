#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/android-sdk"

if [ ! -x ./gradlew ]; then
  echo "Gradle Wrapper (./gradlew) が見つかりません。" >&2
  exit 1
fi

./gradlew :android-sdk:lint --console=plain
