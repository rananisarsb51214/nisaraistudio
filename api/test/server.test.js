import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
const { createApp } = await import("../src/server.js");

async function withServer(app, run) {
  const server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("AI endpoint rejects requests without Firebase bearer token", async () => {
  const app = createApp({
    verifyToken: async () => { throw new Error("should not be called"); },
    rateLimit: async () => {}
  });
  await withServer(app, async base => {
    const response = await fetch(`${base}/v1/ai/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "hello" })
    });
    assert.equal(response.status, 401);
  });
});

test("AI endpoint validates body before provider execution", async () => {
  const app = createApp({
    verifyToken: async () => ({ uid: "test-user" }),
    rateLimit: async () => {},
    fetchImpl: async () => { throw new Error("provider must not be called"); }
  });
  await withServer(app, async base => {
    const response = await fetch(`${base}/v1/ai/generate`, {
      method: "POST",
      headers: { authorization: "Bearer test-token", "content-type": "application/json" },
      body: JSON.stringify({ provider: "unknown", prompt: "hello" })
    });
    assert.equal(response.status, 400);
  });
});

test("authenticated request routes to selected provider", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "unit-test-key";
  const app = createApp({
    verifyToken: async token => token === "test-token" ? ({ uid: "test-user" }) : null,
    rateLimit: async () => {},
    fetchImpl: async () => new Response(JSON.stringify({ output_text: "Gateway response" }), { status: 200 })
  });
  try {
    await withServer(app, async base => {
      const response = await fetch(`${base}/v1/ai/generate`, {
        method: "POST",
        headers: { authorization: "Bearer test-token", "content-type": "application/json" },
        body: JSON.stringify({ provider: "openai", prompt: "hello", maxOutputTokens: 128 })
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.provider, "openai");
      assert.equal(body.text, "Gateway response");
    });
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});
