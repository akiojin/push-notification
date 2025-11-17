# CI Configuration Guide

The repository runs GitHub Actions workflows for each package. This document focuses on the Server CI workflow and the environment secrets required to execute backend tests successfully.

## Secrets Overview

Add the following secrets under your repository settings (Settings → Secrets and variables → Actions). Values that are optional can be omitted; the build step will fall back to defaults from `server/.env.example`.

| Secret | Required | Purpose | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string used by Prisma during CI | `postgresql://postgres:postgres@localhost:5432/push` |
| `API_KEY` | ✅ | API authentication key injected into the generated `.env` | `ci-test-key` |
| `RATE_LIMIT_MAX` | ⭕ | Override rate limit per minute | `200` |
| `RATE_LIMIT_TIME_WINDOW` | ⭕ | Override rate limit window | `30 seconds` |
| `DELIVERY_RETRY_INTERVAL_MS` | ⭕ | Retry worker polling interval (ms) | `500` |
| `DELIVERY_RETRY_BATCH_SIZE` | ⭕ | Delivery batch size processed per tick | `50` |
| `APNS_KEY_ID` | ⭕ | APNs token auth key ID | `AAAAAA1111` |
| `APNS_TEAM_ID` | ⭕ | Apple Developer team ID | `BBBBBB2222` |
| `APNS_BUNDLE_ID` | ⭕ | Bundle identifier registered for push | `com.example.game` |
| `APNS_PRIVATE_KEY` | ⭕ | Contents of the `.p8` file (paste raw text or base64) | `-----BEGIN PRIVATE KEY-----...` |
| `FCM_CREDENTIALS` | ⭕ | Path or base64-encoded JSON for Firebase credentials | `./secrets/firebase.json` or base64 string |

✅ = required, ⭕ = optional.

> For multiline values such as `APNS_PRIVATE_KEY`, store them in GitHub Secrets with literal newlines (copy & paste the full `.p8` file). The workflow writes the value verbatim into `.env`.

## Workflow Behaviour

`.github/workflows/server.yml` copies `server/.env.example` and appends the secrets to generate a runtime `.env`. Ensure secrets are defined before enabling the workflow; missing required values will cause Prisma migrations or API tests to fail.

```yaml
- name: Prepare environment file
  working-directory: server
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    API_KEY: ${{ secrets.API_KEY }}
    # ...
  run: |
    cp .env.example .env
    echo "DATABASE_URL=${DATABASE_URL}" >> .env
    echo "API_KEY=${API_KEY}" >> .env
    # ...

- name: Validate environment configuration
  run: npm run env:check
```

## Local Validation

1. Duplicate `.env.example` to `.env` and fill in required values.
2. Run `npm run env:check`, `npm run prisma:generate` and `npm test` within `server/` to mimic the CI pipeline。`DATABASE_URL` を指定していない場合、テスト実行時に Testcontainers が自動で PostgreSQL コンテナを起動します。
3. Optionally replicate the CI database by running `docker compose up -d db` in `server/` and pointing `DATABASE_URL` to the container.

## Updating Secrets

- When new environment variables are introduced, update `server/.env.example`, `README.md`, and this document.
- For Secrets rotation, update the GitHub Actions secrets first, then merge the code change. The workflow does not persist secrets in the repository.

## Related Resources

- `server/.env.example` — authoritative list of environment variables.
- `README.md` — quick setup instructions for contributors.
- `.github/workflows/server.yml` — CI pipeline definition.
