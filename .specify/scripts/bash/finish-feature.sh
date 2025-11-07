#!/usr/bin/env bash

# Finish feature: Create Pull Request for auto-merge workflow
#
# Usage: ./finish-feature.sh [OPTIONS]
#
# OPTIONS:
#   --draft         Create as draft PR (will not auto-merge)
#   --help, -h      Show help message

set -e

REQUIRED_STATUS_CHECKS=(
    "CI / Quality Checks"
    "Server CI / server-test"
    "Android SDK CI / android-test"
    "iOS SDK CI / ios-test"
    "Unity SDK CI / unity-editmode-test"
)

contains_element() {
    local needle="$1"
    shift || true
    for element in "$@"; do
        if [[ "$element" == "$needle" ]]; then
            return 0
        fi
    done
    return 1
}

DRAFT=false

for arg in "$@"; do
    case "$arg" in
        --draft)
            DRAFT=true
            ;;
        --help|-h)
            cat << 'EOF'
Usage: finish-feature.sh [OPTIONS]

Finish feature development by creating a Pull Request.

OPTIONS:
  --draft         Create as draft PR (will not auto-merge)
  --help, -h      Show this help message

WORKFLOW:
  1. Verify current branch is a feature branch (feature/SPEC-xxx)
  2. Check for uncommitted changes
  3. Push feature branch to remote
  4. Create GitHub Pull Request
  5. Auto-merge will be triggered by GitHub Actions

EOF
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

# Verify we're on a feature branch
if [[ ! "$CURRENT_BRANCH" =~ ^feature/SPEC-[a-z0-9]{8}$ ]]; then
    echo "ERROR: Not on a feature branch. Current branch: $CURRENT_BRANCH" >&2
    echo "Feature branches should be named like: feature/SPEC-a1b2c3d4" >&2
    exit 1
fi

# Extract SPEC-ID
SPEC_ID=$(echo "$CURRENT_BRANCH" | sed 's/^feature\///')
WORKTREE_DIR="$REPO_ROOT/.worktrees/$SPEC_ID"

echo "========================================="
echo "Finishing feature: $CURRENT_BRANCH"
echo "========================================="

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo "You have uncommitted changes. Please commit or stash them first."
    echo ""
    git status --short
    exit 1
fi

ensure_required_status_checks() {
    if ! command -v gh &> /dev/null; then
        echo "⚠️  Skipped (GitHub CLI not available)."
        return
    fi

    if ! command -v jq &> /dev/null; then
        echo "⚠️  Skipped (jq not installed)."
        return
    fi

    local repo owner name
    if ! repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner 2>/dev/null); then
        echo "⚠️  Skipped (failed to resolve repository)."
        return
    fi
    owner="${repo%/*}"
    name="${repo#*/}"

    read -r -d '' BRANCH_RULE_QUERY <<'GRAPHQL'
query ($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
    branchProtectionRules(first: 100) {
      nodes {
        id
        pattern
        requiredStatusCheckContexts
      }
    }
  }
}
GRAPHQL

    local response repo_id rule_node
    if ! response=$(gh api graphql -f query="$BRANCH_RULE_QUERY" -f owner="$owner" -f name="$name" 2>/dev/null); then
        echo "⚠️  Skipped (failed to fetch branch protection rules)."
        return
    fi

    repo_id=$(echo "$response" | jq -r '.data.repository.id')
    rule_node=$(echo "$response" | jq -c '.data.repository.branchProtectionRules.nodes[] | select(.pattern == "develop")')

    if [[ -z "$rule_node" || "$rule_node" == "null" ]]; then
        read -r -d '' CREATE_BRANCH_RULE <<'GRAPHQL'
mutation ($repositoryId: ID!, $pattern: String!) {
  createBranchProtectionRule(input: {
    repositoryId: $repositoryId,
    pattern: $pattern,
    requiresStatusChecks: true,
    requiredStatusCheckContexts: []
  }) {
    branchProtectionRule {
      id
      requiredStatusCheckContexts
    }
  }
}
GRAPHQL

        local create_output
        if ! create_output=$(gh api graphql -f query="$CREATE_BRANCH_RULE" -F repositoryId="$repo_id" -F pattern="develop" 2>/dev/null); then
            echo "⚠️  Skipped (failed to create branch protection rule for develop)."
            return
        fi
        rule_node=$(echo "$create_output" | jq -c '.data.createBranchProtectionRule.branchProtectionRule')
    fi

    local rule_id
    rule_id=$(echo "$rule_node" | jq -r '.id')

    local current_contexts=()
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            current_contexts+=("$line")
        fi
    done < <(echo "$rule_node" | jq -r '.requiredStatusCheckContexts[]?' 2>/dev/null)

    local merged_contexts=()

    for context in "${REQUIRED_STATUS_CHECKS[@]}"; do
        if ! contains_element "$context" "${merged_contexts[@]}"; then
            merged_contexts+=("$context")
        fi
    done

    for context in "${current_contexts[@]}"; do
        if [[ -n "$context" ]] && ! contains_element "$context" "${merged_contexts[@]}"; then
            merged_contexts+=("$context")
        fi
    done

    local needs_update=false
    if ((${#merged_contexts[@]} != ${#current_contexts[@]})); then
        needs_update=true
    else
        for i in "${!merged_contexts[@]}"; do
            if [[ "${merged_contexts[$i]}" != "${current_contexts[$i]}" ]]; then
                needs_update=true
                break
            fi
        done
    fi

    if [ "$needs_update" = false ]; then
        echo "✓ Required status checks already configured."
        return
    fi

    read -r -d '' UPDATE_BRANCH_RULE <<'GRAPHQL'
mutation ($ruleId: ID!, $contexts: [String!]!) {
  updateBranchProtectionRule(input: {
    branchProtectionRuleId: $ruleId,
    requiresStatusChecks: true,
    requiredStatusCheckContexts: $contexts
  }) {
    branchProtectionRule {
      requiredStatusCheckContexts
    }
  }
}
GRAPHQL

    local field_args=()
    for context in "${merged_contexts[@]}"; do
        field_args+=("-F" "contexts[]=$context")
    done

    if gh api graphql -f query="$UPDATE_BRANCH_RULE" -F ruleId="$rule_id" "${field_args[@]}" >/dev/null 2>&1; then
        echo "✓ Required status checks updated: ${merged_contexts[*]}"
    else
        echo "⚠️  Failed to update required status checks (insufficient permissions?)."
    fi
}

# Check if gh CLI is installed and authenticated
echo ""
echo "[1/5] Checking GitHub CLI..."
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

echo ""
echo "[2/5] Ensuring required status checks on develop..."
ensure_required_status_checks

# Push feature branch to remote
echo ""
echo "[3/5] Pushing feature branch to remote..."
git push -u origin "$CURRENT_BRANCH"

# Get PR title from spec.md
echo ""
echo "[4/5] Creating Pull Request..."
SPEC_FILE="$REPO_ROOT/specs/$SPEC_ID/spec.md"
PR_TITLE="Feature implementation"

if [ -f "$SPEC_FILE" ]; then
    # Extract title from spec.md (first line after removing markdown header)
    PR_TITLE=$(head -1 "$SPEC_FILE" | sed 's/^# 機能仕様書: //' | sed 's/^# //')
fi

# Create PR body
PR_BODY=$(cat <<EOF
## SPEC Information

**機能ID**: \`$SPEC_ID\`
**ブランチ**: \`$CURRENT_BRANCH\`

---

## 変更サマリー

$(git log origin/develop..HEAD --oneline --no-merges | head -10)

---

## チェックリスト

- [ ] tasks.md の全タスクが完了している
- [ ] 全テストが合格している
- [ ] コンパイルエラーがない
- [ ] コミットメッセージが規約に準拠している

---

📝 **詳細**: \`specs/$SPEC_ID/spec.md\` を参照してください。

🤖 このPRは自動マージワークフローの対象です。すべてのCI/CDチェックが成功すると自動的にdevelopブランチへマージされます。
EOF
)

# Create PR (draft or normal)
if [ "$DRAFT" = true ]; then
    gh pr create --base develop --head "$CURRENT_BRANCH" --title "$PR_TITLE" --body "$PR_BODY" --draft
    echo "✓ Draft PR created successfully"
else
    gh pr create --base develop --head "$CURRENT_BRANCH" --title "$PR_TITLE" --body "$PR_BODY"
    echo "✓ PR created successfully"
fi

# Get PR URL
PR_URL=$(gh pr view "$CURRENT_BRANCH" --json url --jq .url 2>/dev/null || echo "")

echo ""
echo "[5/5] Cleaning up..."
rm -f "$REPO_ROOT/.specify/.current-feature"

echo ""
echo "========================================="
echo "✓ Feature $SPEC_ID PR created!"
echo "========================================="
echo ""
if [ -n "$PR_URL" ]; then
    echo "PR URL: $PR_URL"
    echo ""
fi
echo "GitHub Actions will now run quality checks."
echo "If all checks pass, the PR will be automatically merged to develop."
echo ""
if [ "$DRAFT" = true ]; then
    echo "Note: This is a draft PR and will NOT be auto-merged."
    echo "Mark it as ready for review to enable auto-merge."
fi
