---
description: developブランチからreleaseブランチを作成し、mainへのPRを自動作成します。
---

## ユーザー入力

```text
$ARGUMENTS
```

## 概要

トリガーメッセージで`/release`コマンドを実行すると、以下の処理が実行されます：

1. developブランチの最新状態を確認
2. semantic-release dry-runでバージョン番号を予測
3. release/x.y.z ブランチを作成
4. mainへのPull Requestを自動作成

## 前提条件

- developブランチが存在し、最新の状態である
- GitHub CLIがインストールされ、認証済みである
- semantic-releaseの設定が完了している

## 実行手順

### 1. create-release.sh スクリプトを実行

リポジトリルートから以下のコマンドを実行します：

```bash
.specify/scripts/bash/create-release.sh
```

### 2. 結果を確認して報告

スクリプトの出力を解析し、以下の情報をユーザーに報告します：

- 作成されたreleaseブランチ名（例: `release/1.2.0`）
- 予測されたバージョン番号
- 作成されたPRのURL
- 次のステップの説明

### 3. エラーハンドリング

エラーが発生した場合は、エラーメッセージを表示し、以下を確認するようユーザーに伝えます：

- developブランチが存在するか
- developブランチに未コミットの変更がないか
- GitHub CLIが認証済みか
- semantic-releaseの設定が正しいか

## 完了メッセージ

スクリプトが成功した場合、以下のようなメッセージを表示します：

```
✓ リリースブランチ release/x.y.z を作成しました
✓ mainへのPRを作成しました: [PR URL]

次のステップ:
1. GitHub ActionsでCIチェックが実行されます
2. すべてのチェックが成功すると、自動的にmainへマージされます
3. mainへのマージ後、semantic-releaseが実行され、バージョンタグが作成されます
```

## 注意事項

- このコマンドはdevelopブランチから実行する必要があります
- 既存のreleaseブランチが存在する場合はエラーになります
- PRの自動マージはGitHub Actionsで制御されます
