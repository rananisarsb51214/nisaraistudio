export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const operation = typeof req.query?.operation === 'string' ? req.query.operation : '';
  if (!operation || operation.length > 500) {
    return res.status(400).json({ error: 'A valid operation is required.' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  const prefix = 'models/';
  if (!operation.startsWith(prefix) || operation.includes('..') || operation.includes('://')) {
    return res.status(400).json({ error: 'Invalid operation.' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operation}`,
      { headers: { 'x-goog-api-key': key } },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Unable to read video operation status.',
      });
    }

    if (!data.done) {
      return res.status(200).json({ status: 'processing', done: false });
    }

    if (data.error) {
      return res.status(502).json({ error: data.error.message || 'Video generation failed.' });
    }

    const videoUri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!videoUri) {
      return res.status(502).json({ error: 'Generation completed but no video was returned.' });
    }

    return res.status(200).json({
      status: 'completed',
      done: true,
      downloadUrl: `/api/video/download?uri=${encodeURIComponent(videoUri)}`,
    });
  } catch (error) {
    console.error('Video status error:', error);
    return res.status(500).json({ error: 'Unable to check video generation status.' });
  }
}
