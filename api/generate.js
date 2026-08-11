export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, ratio = '1:1', style = 'Photorealistic', quality = 'Standard' } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) return res.status(400).json({ error: 'A prompt is required and must be under 2000 characters.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const aspect = ['1:1', '16:9', '9:16'].includes(ratio) ? ratio : '1:1';
  const size = quality === 'High' ? '2K' : '1K';
  const instruction = `Create a polished ${style.toLowerCase()} image. Aspect ratio ${aspect}. ${prompt}. Do not add watermarks, logos, borders, or captions unless explicitly requested.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: aspect, imageSize: size } }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'Image provider request failed.' });

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const image = parts.find(p => p?.inlineData?.data || p?.inline_data?.data);
  const inline = image?.inlineData || image?.inline_data;
  if (!inline?.data) return res.status(502).json({ error: 'The image provider returned no image. Try again or choose another configured model.' });

  const mime = inline.mimeType || inline.mime_type || 'image/png';
  return res.status(200).json({ url: `data:${mime};base64,${inline.data}`, model, ratio: aspect });
}
