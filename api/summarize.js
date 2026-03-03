import { deepaiChat } from '../lib/deepai.js';
import { rateLimit }  from '../lib/rateLimit.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });
    if (!rateLimit(req, res))    return;

    try {
        const { text, style = 'bullets' } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'Text required!' });

        const styleMap = {
            bullets:    'pake bullet points yang jelas dan ringkas',
            paragraph:  'dalam 1-2 paragraf singkat',
            tldr:       'dalam format TL;DR super singkat (1-3 kalimat)',
            executive:  'dalam format executive summary yang profesional',
        };
        const fmt = styleMap[style] || styleMap.bullets;

        const prompt = `Ringkas teks berikut ${fmt}. Bahasa Indonesia yang jelas dan mudah dipahami:\n\n${text.trim()}`;
        const history = [{ role: 'user', content: prompt }];
        const summary = await deepaiChat(history);

        return res.status(200).json({ success: true, summary, style });

    } catch (err) {
        return res.status(500).json({ error: err.message || 'Summarize gagal' });
    }
}
