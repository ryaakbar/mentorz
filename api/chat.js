import { deepaiChat }       from '../lib/deepai.js';
import { rateLimit }        from '../lib/rateLimit.js';
import { buildSystemPrompt } from '../lib/systemPrompt.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });
    if (!rateLimit(req, res))    return;

    try {
        const { message, chatHistory = [], userName = '' } = req.body ?? {};

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Pesan kosong bro!' });
        }

        const history = [
            ...chatHistory,
            { role: 'user', content: message.trim() },
        ];

        const systemPrompt = buildSystemPrompt(userName);
        const reply        = await deepaiChat(history, systemPrompt);

        return res.status(200).json({
            success  : true,
            reply,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('[chat] Error:', err.message);

        // Return proper JSON error always — NEVER plain text
        return res.status(500).json({
            success: false,
            error  : err.message?.includes('DeepAI')
                ? err.message
                : 'Server lagi sibuk bro, coba lagi ya dalam beberapa detik 🙏',
        });
    }
}
