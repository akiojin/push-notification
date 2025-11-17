#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TARGETS=(
  "$ROOT_DIR/unity-sdk/UnityPushNotification/Packages/com.akiojin.unity-push-notification"
  "$ROOT_DIR/unreal-plugin"
)

if ! command -v dotnet >/dev/null 2>&1; then
  echo "dotnet CLI が見つかりません。インストールしてから再実行してください。" >&2
  exit 1
fi

if ! dotnet format --help | grep -q -- '--folder'; then
  echo "dotnet-format が --folder オプションに対応していません。.NET 8+ を利用してください。" >&2
  exit 1
fi

for target in "${TARGETS[@]}"; do
  if find "$target" -name '*.cs' -print -quit >/dev/null; then
    dotnet format --verify-no-changes --folder "$target" --severity error
  else
    echo "C# ファイルが見つからないためスキップ: $target"
  fi
done
