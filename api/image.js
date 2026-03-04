import { deepaiImage } from '../lib/deepai.js';
import { rateLimit }   from '../lib/rateLimit.js';

const ALLOWED_STYLES = [
    'Realistic', 'Anime', 'Cyberpunk', 'Oil Painting', 'Watercolor',
    'Sketch', '3D Render', 'Fantasy', 'Minimalist', 'Retro', 'Neon', 'Dark Fantasy',
];

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });
    if (!rateLimit(req, res, 15)) return; // stricter limit for image

    try {
        const {
            prompt        = '',
            style         = '',
            width         = 512,
            height        = 512,
            negativePrompt = '',
            gridSize      = 1,
        } = req.body;

        if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt required bestie!' });

        // Validate style
        const safeStyle = ALLOWED_STYLES.includes(style) ? style : '';

        // Clamp dimensions
        const safeW = Math.max(128, Math.min(1024, parseInt(width)  || 512));
        const safeH = Math.max(128, Math.min(1024, parseInt(height) || 512));
        const safeGrid = [1, 2].includes(parseInt(gridSize)) ? parseInt(gridSize) : 1;

        const imageUrl = await deepaiImage({
            prompt:         prompt.trim(),
            style:          safeStyle,
            width:          safeW,
            height:         safeH,
            negativePrompt: negativePrompt?.trim() || '',
            gridSize:       safeGrid,
        });

        return res.status(200).json({
            success:   true,
            imageUrl,
            prompt:    prompt.trim(),
            style:     safeStyle,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        console.error('Image error:', err.message);
        return res.status(500).json({
            error: err.message || 'Gagal generate gambar bestie 😭',
        });
    }
}
