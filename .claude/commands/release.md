---
description: developブランチからmainにPRを作成し、semantic-releaseによる自動リリースをトリガーします。
---

## ユーザー入力

```text
$ARGUMENTS
```

## 概要

トリガーメッセージで`/release`コマンドを実行すると、以下の処理が実行されます：

1. developブランチからmainにPRを作成
2. CIチェック成功後、mainに自動マージ
3. mainマージ後、semantic-releaseが自動実行されてリリース処理を完了

## 前提条件

- developブランチが存在し、最新の状態である
- GitHub CLIがインストールされ、認証済みである
- semantic-releaseの設定が完了している
- Conventional Commits形式でコミットされている

## 実行手順

### 1. create-release.sh スクリプトを実行

リポジトリルートから以下のコマンドを実行します：

```bash
.specify/scripts/bash/create-release.sh
```

### 2. 結果を確認して報告

スクリプトの出力を解析し、以下の情報をユーザーに報告します：

- 作成されたPRのURL
- 次のステップの説明

### 3. リリースフロー

スクリプト実行後、以下の流れで自動的にリリースが完了します：

```
developブランチからmainにPR作成
  ↓
CIチェック実行
  ↓
チェック成功後、mainに自動マージ
  ↓
mainマージ時、semantic-releaseが自動実行：
  - Conventional Commitsからバージョン決定
  - package.json更新
  - CHANGELOG.md更新
  - Gitタグ作成（例: v1.2.0）
  - GitHub Release作成
  - npm publish（設定で有効化可能）
  ↓
developへ自動バックマージ
```

### 4. エラーハンドリング

エラーが発生した場合は、エラーメッセージを表示し、以下を確認するようユーザーに伝えます：

- developブランチが存在するか
- developブランチに未コミットの変更がないか
- GitHub CLIが認証済みか
- Conventional Commits形式でコミットされているか

## 完了メッセージ

スクリプトが成功した場合、以下のようなメッセージを表示します：

```
✓ Release PR created!

PR URL: [PR URL]

次のステップ:
1. GitHub ActionsでCIチェックが実行されます
2. すべてのチェックが成功すると、自動的にmainへマージされます
3. mainへのマージ後、semantic-releaseが実行され：
   - バージョンがConventional Commitsから決定されます
   - package.jsonとCHANGELOG.mdが更新されます
   - Gitタグが作成されます（例: v1.2.0）
   - GitHub Releaseが作成されます
4. 変更はdevelopへ自動的にバックマージされます
```

## 注意事項

- このコマンドはdevelopブランチから実行する必要があります
- リリース対象のコミットはConventional Commits形式である必要があります
- PRの自動マージはGitHub Actionsで制御されます
- semantic-releaseはmainブランチでのみ実行されます
