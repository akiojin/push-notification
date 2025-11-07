#!/usr/bin/env bash

# Create hotfix branch: Create hotfix/xxx from main for emergency fixes
#
# Usage: ./create-hotfix.sh <description> [OPTIONS]
#
# ARGUMENTS:
#   description     Brief description of the bug (e.g., "login-error", "api-crash")
#
# OPTIONS:
#   --help, -h      Show help message

set -e

show_help() {
    cat << 'EOF'
Usage: create-hotfix.sh <description> [OPTIONS]

Create a hotfix branch from main for emergency bug fixes.

ARGUMENTS:
  description     Brief description of the bug (e.g., "login-error", "api-crash")

OPTIONS:
  --help, -h      Show this help message

WORKFLOW:
  1. Verify current branch is main
  2. Check for uncommitted changes
  3. Pull latest main branch
  4. Create hotfix/xxx branch
  5. Guide user through fix process

REQUIREMENTS:
  - main branch must exist and be up to date
  - No uncommitted changes
  - Emergency bug fix is required

NEXT STEPS after running this script:
  1. Make your emergency fix in the hotfix branch
  2. Run tests to verify the fix
  3. Commit and push the fix
  4. Create PR to main: gh pr create --base main --head hotfix/xxx
  5. After auto-merge to main, changes will also be merged to develop

EOF
}

# Parse arguments
DESCRIPTION=""

for arg in "$@"; do
    case "$arg" in
        --help|-h)
            show_help
            exit 0
            ;;
        -*)
            echo "ERROR: Unknown option '$arg'. Use --help for usage information." >&2
            exit 1
            ;;
        *)
            if [ -z "$DESCRIPTION" ]; then
                DESCRIPTION="$arg"
            else
                echo "ERROR: Multiple descriptions provided. Use --help for usage information." >&2
                exit 1
            fi
            ;;
    esac
done

if [ -z "$DESCRIPTION" ]; then
    echo "ERROR: Description is required." >&2
    echo "Usage: create-hotfix.sh <description>" >&2
    echo "Example: create-hotfix.sh login-error" >&2
    exit 1
fi

# Validate description format (lowercase, alphanumeric, hyphens only)
if [[ ! "$DESCRIPTION" =~ ^[a-z0-9-]+$ ]]; then
    echo "ERROR: Description must contain only lowercase letters, numbers, and hyphens." >&2
    echo "Example: login-error, api-crash, auth-bug" >&2
    exit 1
fi

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
echo "Creating hotfix branch from main"
echo "========================================="

# Verify we're on main branch
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "ERROR: Not on main branch. Current branch: $CURRENT_BRANCH" >&2
    echo "Please switch to main branch first: git checkout main" >&2
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

HOTFIX_BRANCH="hotfix/$DESCRIPTION"

# Check if hotfix branch already exists
if git rev-parse --verify "$HOTFIX_BRANCH" >/dev/null 2>&1; then
    echo "ERROR: Hotfix branch $HOTFIX_BRANCH already exists." >&2
    echo "Please use a different description or delete the existing branch." >&2
    exit 1
fi

# Pull latest main
echo ""
echo "[1/2] Pulling latest main branch..."
git pull origin main

# Create hotfix branch
echo ""
echo "[2/2] Creating hotfix branch..."
git checkout -b "$HOTFIX_BRANCH"

echo ""
echo "========================================="
echo "✓ Hotfix branch created!"
echo "========================================="
echo ""
echo "Branch: $HOTFIX_BRANCH"
echo ""
echo "次のステップ:"
echo "1. このブランチで緊急修正を実施してください"
echo "2. テストを実行して修正を確認してください"
echo "3. 修正をコミット＆プッシュしてください:"
echo "   git add ."
echo "   git commit -m \"fix: <修正内容>\""
echo "   git push -u origin $HOTFIX_BRANCH"
echo ""
echo "4. mainへのPRを作成してください:"
echo "   gh pr create --base main --head $HOTFIX_BRANCH --title \"Hotfix: $DESCRIPTION\""
echo ""
echo "5. CIチェックが成功すると、自動的にmainへマージされます"
echo "6. mainへのマージ後、自動的にdevelopへもマージされます"
echo ""
