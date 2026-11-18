import test from "node:test";
import assert from "node:assert/strict";
import { generateWithProvider } from "../src/ai-providers.js";

test("OpenAI adapter uses Responses API and returns normalized text", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  let request;
  const result = await generateWithProvider({
    provider: "openai",
    prompt: "Hello",
    maxOutputTokens: 128,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ output_text: "Hello from GPT" }), { status: 200 });
    }
  });
  assert.equal(request.url, "https://api.openai.com/v1/responses");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  assert.equal(result.text, "Hello from GPT");
  if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousKey;
});

test("Anthropic adapter normalizes message text", async () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key";
  const result = await generateWithProvider({
    provider: "anthropic",
    prompt: "Hello",
    maxOutputTokens: 128,
    fetchImpl: async () => new Response(JSON.stringify({ content: [{ type: "text", text: "Hello from Claude" }] }), { status: 200 })
  });
  assert.equal(result.text, "Hello from Claude");
  if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = previousKey;
});

test("Gemini adapter normalizes candidate text", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key";
  const result = await generateWithProvider({
    provider: "gemini",
    prompt: "Hello",
    maxOutputTokens: 128,
    fetchImpl: async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Hello from Gemini" }] } }] }), { status: 200 })
  });
  assert.equal(result.text, "Hello from Gemini");
  if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousKey;
});

test("unknown provider is rejected", async () => {
  await assert.rejects(
    generateWithProvider({ provider: "unknown", prompt: "x", maxOutputTokens: 10 }),
    error => error.status === 400
  );
});

test("missing provider key fails closed", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  await assert.rejects(
    generateWithProvider({ provider: "openai", prompt: "x", maxOutputTokens: 10 }),
    error => error.status === 503
  );
  if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
});
