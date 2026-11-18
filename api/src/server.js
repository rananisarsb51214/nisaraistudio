import express from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import { generateWithProvider, PROVIDERS } from "./ai-providers.js";
import { verifyFirebaseUser, enforceFirestoreRateLimit } from "./firebase-security.js";

const aiSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini"]).default("openai"),
  prompt: z.string().trim().min(1).max(10000),
  system: z.string().trim().max(2000).optional(),
  maxOutputTokens: z.number().int().min(64).max(2048).default(1024)
}).strict();

export function createApp({
  verifyToken = verifyFirebaseUser,
  rateLimit = enforceFirestoreRateLimit,
  fetchImpl = fetch
} = {}) {
  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",").map(value => value.trim()).filter(Boolean);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600
  }));
  app.use(express.json({ limit: "64kb", strict: true }));

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok", service: "nisar-ai-studio-api" }));

  app.post("/v1/ai/generate", async (req, res) => {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: "Authentication required." });

    let user;
    try {
      user = await verifyToken(match[1]);
    } catch {
      return res.status(401).json({ error: "Invalid or expired authentication token." });
    }
    if (!user?.uid) return res.status(401).json({ error: "Authentication required." });

    const parsed = aiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
      error: "Invalid request.",
      details: parsed.error.issues.map(issue => ({ path: issue.path, code: issue.code }))
    });

    const input = parsed.data;
    if (!PROVIDERS.has(input.provider)) return res.status(400).json({ error: "Unsupported provider." });

    try {
      await rateLimit(user.uid, {
        limit: Number.parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || "20", 10),
        windowSeconds: 60
      });
      const result = await generateWithProvider({ ...input, fetchImpl });
      return res.status(200).json(result);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 502;
      if (status >= 500) {
        console.error("AI gateway failure", { provider: input.provider, status });
      }
      return res.status(status).json({ error: status >= 500 ? "AI service temporarily unavailable." : error.message });
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "Invalid JSON body." });
    if (error.message === "Origin not allowed") return res.status(403).json({ error: "Origin not allowed." });
    console.error("Unhandled API error", { name: error.name });
    return res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

const port = Number(process.env.PORT || 8080);
if (process.env.NODE_ENV !== "test") {
  createApp().listen(port, () => console.log(`NISAR AI STUDIO API listening on ${port}`));
}
