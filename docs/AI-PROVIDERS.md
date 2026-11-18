# NISAR AI STUDIO — Multi-provider AI Gateway

## Architecture

The existing Express API exposes `POST /v1/ai/generate`. It accepts Firebase Authentication ID tokens, validates request bodies, applies a Firestore-backed per-user fixed-window rate limit, and routes requests to OpenAI Responses, Anthropic Messages, or Gemini generateContent APIs. Provider keys are read only from server environment variables.

## Environment

Set these server-side variables in the deployment environment or Secret Manager:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- Optional model overrides: `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `GEMINI_TEXT_MODEL`
- `CORS_ORIGIN`: comma-separated exact frontend origins; never use `*` in production.
- `AI_RATE_LIMIT_PER_MINUTE`: defaults to 20.
- `PORT`: defaults to 8080.

Firebase Admin uses Application Default Credentials. On Google Cloud Run, attach a dedicated runtime service account with only the Firestore permissions required by this service. Locally, use ADC via `gcloud auth application-default login`; do not commit service-account JSON.

## Request

```http
POST /v1/ai/generate
Authorization: Bearer <Firebase ID token>
Content-Type: application/json

{
  "provider": "openai",
  "prompt": "Explain vector databases in simple terms.",
  "system": "You are a concise technical assistant.",
  "maxOutputTokens": 800
}
```

`provider` must be `openai`, `anthropic`, or `gemini`. The default is OpenAI. Prompt length is capped at 10,000 characters, system instructions at 2,000, and output tokens at 2,048. The response shape is `{ provider, model, text }`.

## Local verification

```bash
cd api
npm ci
npm test
npm start
```

Unauthenticated requests must return 401. Health check: `GET /health`.

## Deployment

1. Configure the three provider secrets in the deployment platform's secret manager.
2. Set `CORS_ORIGIN` to the exact production frontend origin(s).
3. Configure Firebase Admin Application Default Credentials and Firestore access.
4. Deploy the API service.
5. Verify `GET /health`, then call `POST /v1/ai/generate` with a real Firebase ID token and a low-cost prompt for each provider.
6. Configure Firestore TTL policy on `_ai_rate_limits.expiresAt` to clean up rate-limit documents.

Do not enable public unauthenticated AI generation.

## Rollback

- Revert the feature branch or redeploy the last known-good deployment.
- Remove the new AI route and provider files if reverting manually.
- Keep provider secrets in Secret Manager; revoke/rotate any key that was exposed.
- Do not delete the Firestore rate-limit collection until no old instances are serving requests.
- Verify health, authentication, and existing Gemini image/video endpoints after rollback.
