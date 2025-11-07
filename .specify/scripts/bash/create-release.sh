#!/usr/bin/env bash

# Create release branch: Create release/x.y.z from develop and PR to main
#
# Usage: ./create-release.sh [OPTIONS]
#
# OPTIONS:
#   --help, -h      Show help message

set -e

show_help() {
    cat << 'EOF'
Usage: create-release.sh [OPTIONS]

Create a release branch from develop and create a PR to main.

OPTIONS:
  --help, -h      Show this help message

WORKFLOW:
  1. Verify current branch is develop
  2. Check for uncommitted changes
  3. Run semantic-release dry-run to predict version
  4. Create release/x.y.z branch
  5. Push release branch to remote
  6. Create GitHub Pull Request to main

REQUIREMENTS:
  - develop branch must exist and be up to date
  - GitHub CLI must be installed and authenticated
  - semantic-release must be configured
  - No uncommitted changes

EOF
}

# Parse arguments
for arg in "$@"; do
    case "$arg" in
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo "ERROR: Unknown option '$arg'. Use --help for usage information." >&2
            exit 1
            ;;
    esac
done

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get repository root
REPO_ROOT=$(get_repo_root)
cd "$REPO_ROOT"

# Check if git is available
if ! has_git; then
    echo "ERROR: Git repository not detected. This script requires git." >&2
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "========================================="
echo "Creating release branch from develop"
echo "========================================="

# Verify we're on develop branch
if [[ "$CURRENT_BRANCH" != "develop" ]]; then
    echo "ERROR: Not on develop branch. Current branch: $CURRENT_BRANCH" >&2
    echo "Please switch to develop branch first: git checkout develop" >&2
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo "You have uncommitted changes. Please commit or stash them first."
    echo ""
    git status --short
    exit 1
fi

# Check if gh CLI is installed and authenticated
echo ""
echo "[1/6] Checking GitHub CLI..."
if ! command -v gh &> /dev/null; then
    echo "ERROR: GitHub CLI (gh) is not installed." >&2
    echo "Please install it from: https://cli.github.com/" >&2
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "ERROR: GitHub CLI is not authenticated." >&2
    echo "Please run: gh auth login" >&2
    exit 1
fi

echo "✓ GitHub CLI is ready"

# Pull latest develop
echo ""
echo "[2/6] Pulling latest develop branch..."
git pull origin develop

# Check if semantic-release is configured
echo ""
echo "[3/6] Predicting next version with semantic-release..."

# Change to server directory for semantic-release
cd "$REPO_ROOT/server"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci
fi

# Run semantic-release dry-run to get next version
NEXT_VERSION=$(npx semantic-release --dry-run --no-ci 2>&1 | grep "The next release version is" | sed 's/.*The next release version is //' || echo "")

if [ -z "$NEXT_VERSION" ]; then
    echo "WARNING: Could not predict next version with semantic-release."
    echo "No new commits eligible for release found."
    echo ""
    read -p "Enter version manually (e.g., 1.0.0): " NEXT_VERSION

    if [ -z "$NEXT_VERSION" ]; then
        echo "ERROR: No version provided. Aborting." >&2
        exit 1
    fi
fi

# Return to repo root
cd "$REPO_ROOT"

RELEASE_BRANCH="release/$NEXT_VERSION"

echo "✓ Next version: $NEXT_VERSION"
echo "✓ Release branch: $RELEASE_BRANCH"

# Check if release branch already exists
if git rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
    echo "ERROR: Release branch $RELEASE_BRANCH already exists." >&2
    exit 1
fi

# Create release branch
echo ""
echo "[4/6] Creating release branch..."
git checkout -b "$RELEASE_BRANCH"

# Push release branch to remote
echo ""
echo "[5/6] Pushing release branch to remote..."
git push -u origin "$RELEASE_BRANCH"

# Create PR to main
echo ""
echo "[6/6] Creating Pull Request to main..."

PR_BODY=$(cat <<EOF
## Release Information

**Version**: \`$NEXT_VERSION\`
**Branch**: \`$RELEASE_BRANCH\`

---

## 変更サマリー

$(git log origin/main..HEAD --oneline --no-merges | head -20)

---

## リリースフロー

1. ✓ developブランチから$RELEASE_BRANCHを作成
2. ⏳ CIチェック実行中...
3. ⏳ 自動的にmainへマージ（CIチェック成功後）
4. ⏳ semantic-releaseでバージョンタグ作成
5. ⏳ CHANGELOG.md更新
6. ⏳ GitHub Release作成

---

🤖 このPRは自動マージワークフローの対象です。すべてのCI/CDチェックが成功すると自動的にmainブランチへマージされます。
EOF
)

gh pr create --base main --head "$RELEASE_BRANCH" --title "Release v$NEXT_VERSION" --body "$PR_BODY"

# Get PR URL
PR_URL=$(gh pr view "$RELEASE_BRANCH" --json url --jq .url 2>/dev/null || echo "")

echo ""
echo "========================================="
echo "✓ Release branch created!"
echo "========================================="
echo ""
echo "Version: $NEXT_VERSION"
echo "Branch: $RELEASE_BRANCH"
if [ -n "$PR_URL" ]; then
    echo "PR URL: $PR_URL"
fi
echo ""
echo "GitHub Actions will now run quality checks."
echo "If all checks pass, the PR will be automatically merged to main."
echo "After merge, semantic-release will create the version tag and GitHub Release."
echo ""
