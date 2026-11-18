const PROVIDERS = new Set(["openai", "anthropic", "gemini"]);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error("AI provider is not configured.");
    error.status = 503;
    throw error;
  }
  return value;
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export async function generateWithProvider({ provider, prompt, system, maxOutputTokens, fetchImpl = fetch }) {
  if (!PROVIDERS.has(provider)) {
    const error = new Error("Unsupported AI provider.");
    error.status = 400;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    let response;
    let data;
    let model;

    if (provider === "openai") {
      const apiKey = requiredEnv("OPENAI_API_KEY");
      model = process.env.OPENAI_MODEL || "gpt-6-astra";
      response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          instructions: system || undefined,
          input: prompt,
          max_output_tokens: maxOutputTokens
        })
      });
      data = await readJson(response);
      const text = data.output_text || (data.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("");
      if (!response.ok) throw providerError(response.status);
      if (!text) throw providerError(502);
      return { provider, model, text };
    }

    if (provider === "anthropic") {
      const apiKey = requiredEnv("ANTHROPIC_API_KEY");
      model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
      response = await fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: maxOutputTokens,
          system: system || undefined,
          messages: [{ role: "user", content: prompt }]
        })
      });
      data = await readJson(response);
      const text = (data.content || []).filter(item => item.type === "text").map(item => item.text).join("");
      if (!response.ok) throw providerError(response.status);
      if (!text) throw providerError(502);
      return { provider, model, text };
    }

    const apiKey = requiredEnv("GEMINI_API_KEY");
    model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    response = await fetchImpl(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens }
      })
    });
    data = await readJson(response);
    const text = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("");
    if (!response.ok) throw providerError(response.status);
    if (!text) throw providerError(502);
    return { provider, model, text };
  } catch (error) {
    if (error.status) throw error;
    const safe = new Error(error.name === "AbortError" ? "AI provider timed out." : "AI provider request failed.");
    safe.status = error.name === "AbortError" ? 504 : 502;
    throw safe;
  } finally {
    clearTimeout(timeout);
  }
}

function providerError(status) {
  const error = new Error(status === 429 ? "AI provider is rate limited. Try again shortly." : "AI provider request failed.");
  error.status = status === 401 || status === 403 ? 502 : status === 429 ? 503 : 502;
  return error;
}

export { PROVIDERS };
