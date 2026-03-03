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
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'Text required!' });

        const prompt = `Analisis sentimen dari teks berikut secara detail. 
Return dalam format:
- Sentimen Overall: [Positif/Negatif/Netral/Mixed]
- Confidence: [persentase]
- Emosi Dominan: [list emosi]
- Penjelasan singkat kenapa

Teks: "${text.trim()}"`;

        const history = [{ role: 'user', content: prompt }];
        const result = await deepaiChat(history);

        return res.status(200).json({ success: true, result, text: text.trim() });

    } catch (err) {
        return res.status(500).json({ error: err.message || 'Sentiment analysis gagal' });
    }
}
