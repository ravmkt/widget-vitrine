// src/pages/api/vidlytics/save-rules.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { saveRulesAndLocations } from '@/lib/server/saveRules';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await saveRulesAndLocations(body);
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
