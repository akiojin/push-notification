#!/usr/bin/env bash

# Create release PR: Create PR from develop to main for release
#
# Usage: ./create-release.sh [OPTIONS]
#
# OPTIONS:
#   --help, -h      Show help message

set -e

show_help() {
    cat << 'EOF'
Usage: create-release.sh [OPTIONS]

Create a release PR from develop to main.

OPTIONS:
  --help, -h      Show this help message

WORKFLOW:
  1. Verify current branch is develop
  2. Check for uncommitted changes
  3. Pull latest develop branch
  4. Create GitHub Pull Request from develop to main

AFTER MERGE TO MAIN:
  - semantic-release will automatically run
  - Version will be determined from Conventional Commits
  - package.json and CHANGELOG.md will be updated
  - Git tag will be created
  - GitHub Release will be created
  - Changes will be synced back to develop

REQUIREMENTS:
  - develop branch must exist and be up to date
  - GitHub CLI must be installed and authenticated
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
echo "Creating release PR: develop → main"
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
echo "[1/3] Checking GitHub CLI..."
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
echo "[2/3] Pulling latest develop branch..."
git pull origin develop

# Create PR to main
echo ""
echo "[3/3] Creating Pull Request to main..."

PR_BODY=$(cat <<EOF
## Release PR: develop → main

このPRがmainにマージされると、semantic-releaseが自動実行されます。

---

## 変更サマリー

$(git log origin/main..HEAD --oneline --no-merges | head -20)

---

## リリースフロー

1. ✓ developブランチからmainへPR作成
2. ⏳ CIチェック実行中...
3. ⏳ 自動的にmainへマージ（CIチェック成功後）
4. ⏳ mainマージ後、semantic-releaseが実行されて：
   - Conventional Commitsからバージョン決定
   - package.json更新
   - CHANGELOG.md更新
   - Gitタグ作成
   - GitHub Release作成
5. ⏳ developへ自動バックマージ

---

🤖 このPRは自動マージワークフローの対象です。すべてのCI/CDチェックが成功すると自動的にmainブランチへマージされます。
EOF
)

gh pr create --base main --head develop --title "Release: $(date +%Y-%m-%d)" --body "$PR_BODY"

# Get PR URL
PR_URL=$(gh pr view develop --json url --jq .url 2>/dev/null || echo "")

echo ""
echo "========================================="
echo "✓ Release PR created!"
echo "========================================="
echo ""
if [ -n "$PR_URL" ]; then
    echo "PR URL: $PR_URL"
    echo ""
fi
echo "GitHub Actions will now run quality checks."
echo "If all checks pass, the PR will be automatically merged to main."
echo ""
echo "After merge to main, semantic-release will:"
echo "  - Determine version from Conventional Commits"
echo "  - Update package.json and CHANGELOG.md"
echo "  - Create Git tag (e.g., v1.2.0)"
echo "  - Create GitHub Release"
echo "  - Sync changes back to develop"
echo ""
