export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uri = typeof req.query?.uri === 'string' ? req.query.uri : '';
  if (!uri || uri.length > 2000) {
    return res.status(400).json({ error: 'A valid video URI is required.' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    return res.status(400).json({ error: 'Invalid video URI.' });
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'generativelanguage.googleapis.com') {
    return res.status(400).json({ error: 'Video URI host is not allowed.' });
  }

  try {
    const response = await fetch(parsed.toString(), {
      headers: { 'x-goog-api-key': key },
    });

    if (!response.ok || !response.body) {
      return res.status(response.status || 502).json({ error: 'Unable to download generated video.' });
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Disposition', 'inline; filename="nisar-ai-video.mp4"');

    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    return res.end();
  } catch (error) {
    console.error('Video download error:', error);
    return res.status(500).json({ error: 'Unable to stream generated video.' });
  }
}
