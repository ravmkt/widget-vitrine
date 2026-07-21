export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const url = String(req.query?.url || '');

    if (!url) {
      return res.status(400).json({ ok: false, error: 'Missing url' });
    }

    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ ok: false, error: 'Invalid url' });
    }

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `Failed to fetch remote XML (${response.status})`,
      });
    }

    const text = await response.text();

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(text);
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
