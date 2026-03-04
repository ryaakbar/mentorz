import { deepaiImage } from '../lib/deepai.js';
import { rateLimit }   from '../lib/rateLimit.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });
    if (!rateLimit(req, res, 15)) return;

    try {
        const { prompt = '', style = '' } = req.body ?? {};
        if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt wajib diisi bro!' });

        const url = await deepaiImage({ prompt: prompt.trim(), style: style.trim() });

        return res.status(200).json({
            success  : true,
            url,
            prompt   : prompt.trim(),
            style    : style.trim(),
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('[image] Error:', err.message);
        return res.status(500).json({
            success: false,
            error  : 'Gagal generate gambar bro, coba lagi 🙏',
        });
    }
}
