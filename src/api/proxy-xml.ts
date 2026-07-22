export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const url = String(req.query?.url || '');
    console.log('[proxy-xml] requested url', { url });

    if (!url) {
      return res.status(400).json({ ok: false, error: 'Missing url' });
    }

    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ ok: false, error: 'Invalid url' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    console.log('[proxy-xml] response status', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: `Failed to fetch remote XML (${response.status})`,
      });
    }

    const text = await response.text();
    console.log('[proxy-xml] response size', { bytes: text.length });

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(text);
  } catch (e: any) {
    console.error('[proxy-xml] error', { message: String(e?.message || e) });
    if (String(e?.name) === 'AbortError') {
      return res.status(408).json({ ok: false, error: 'Timeout fetching XML' });
    }
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
