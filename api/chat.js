import { deepaiChat } from '../lib/deepai.js';
import { rateLimit }  from '../lib/rateLimit.js';
import { buildSystemPrompt } from '../lib/systemPrompt.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });
    if (!rateLimit(req, res))    return;

    try {
        const { message, chatHistory = [], userName = '' } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Message is required bestie!' });

        // Build full history with new message
        const history = [
            ...chatHistory,
            { role: 'user', content: message.trim() },
        ];

        const systemPrompt = buildSystemPrompt(userName);
        const reply = await deepaiChat(history, systemPrompt);

        return res.status(200).json({
            success: true,
            reply,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('Chat error:', err.message);
        return res.status(500).json({
            error: err.message || 'Aduh error nih bestie, coba lagi ya 😭',
        });
    }
}
