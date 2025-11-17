#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v swiftlint >/dev/null 2>&1; then
  echo "swiftlint が見つかりません。Homebrew 等でインストールしてください。" >&2
  exit 1
fi

cd "$ROOT_DIR/ios-sdk"
swiftlint --config .swiftlint.yml --strict
