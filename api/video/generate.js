export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, ratio = '9:16', duration = 8, style = 'Cinematic' } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3 || prompt.length > 2000) {
    return res.status(400).json({ error: 'A prompt is required and must be between 3 and 2000 characters.' });
  }

  const allowedRatios = ['9:16', '16:9'];
  const allowedDurations = [4, 6, 8];
  const aspectRatio = allowedRatios.includes(ratio) ? ratio : '9:16';
  const durationSeconds = Number(duration);

  if (!allowedDurations.includes(durationSeconds)) {
    return res.status(400).json({ error: 'Duration must be 4, 6, or 8 seconds.' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  const model = process.env.GEMINI_VIDEO_MODEL || 'veo-3.1-generate-preview';
  const negativePrompt = 'low quality, blurry, distorted, malformed, watermark, logo, captions';
  const finalPrompt = `Create a polished ${String(style).slice(0, 80)} video. ${prompt.trim()}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify({
          instances: [{ prompt: finalPrompt }],
          parameters: {
            aspectRatio,
            durationSeconds,
            numberOfVideos: 1,
            negativePrompt,
          },
        }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Video provider request failed.',
      });
    }

    if (!data?.name) {
      return res.status(502).json({ error: 'Video provider returned no operation.' });
    }

    return res.status(202).json({
      operation: data.name,
      model,
      ratio: aspectRatio,
      duration: durationSeconds,
      status: 'processing',
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return res.status(500).json({ error: 'Unable to start video generation.' });
  }
}
