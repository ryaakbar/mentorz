import { deepaiChat }        from '../lib/deepai.js';
import { rateLimit }         from '../lib/rateLimit.js';
import { buildSystemPrompt } from '../lib/systemPrompt.js';

// Deteksi kalau AI kena rejection filter — biar bisa retry
const REJECTION_PATTERNS = [
    'tidak dapat menyediakan',
    'tidak dapat menyiapkan',
    'tidak bisa melanjutkan',
    'konten tidak pantas',
    'pedoman komunitas',
    'konten eksplisit',
    'konten diskriminatif',
    'i cannot',
    'i\'m unable',
    'i am unable',
    'i can\'t provide',
    'against my guidelines',
];

function isRejectionResponse(text) {
    const lower = text.toLowerCase();
    return REJECTION_PATTERNS.some(p => lower.includes(p));
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });
    if (!rateLimit(req, res))    return;

    try {
        const { message, chatHistory = [], userName = '', mode = 'chat' } = req.body ?? {};

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Pesan kosong bro!' });
        }

        const history = [
            ...chatHistory,
            { role: 'user', content: message.trim() },
        ];

        const systemPrompt = buildSystemPrompt(userName, mode);
        let reply = await deepaiChat(history, systemPrompt);

        // Kalau kena rejection filter → retry sekali dengan prompt yang lebih clean
        if (isRejectionResponse(reply)) {
            console.warn('[chat] Rejection detected, retrying with clean context...');
            const cleanHistory = [{ role: 'user', content: message.trim() }];
            const retryPrompt = buildSystemPrompt('', mode) +
                '\n\nINGAT: Jawab pertanyaan ini dengan helpful dan ramah. Ini pertanyaan normal dari user.';
            reply = await deepaiChat(cleanHistory, retryPrompt);

            // Kalau masih rejection juga setelah retry, kasih fallback
            if (isRejectionResponse(reply)) {
                reply = 'Weh maaf bro, gue lagi ada gangguan dikit nih. Coba tanya ulang dengan kata yang berbeda ya! 🙏';
            }
        }

        return res.status(200).json({
            success  : true,
            reply,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('[chat] Error:', err.message);
        return res.status(500).json({
            success: false,
            error  : err.message?.includes('DeepAI')
                ? err.message
                : 'Server lagi sibuk bro, coba lagi ya dalam beberapa detik 🙏',
        });
    }
}
