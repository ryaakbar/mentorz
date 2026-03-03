// api/upload.js — Handle image analysis via DeepAI
// Images → DeepAI image captioning / description
// Files (txt, pdf, code) → extract text and return as context

import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';

function getApiKey() {
    const prefix = 'tryit';
    const id     = Math.floor(1e10 + Math.random() * 9e10).toString();
    const hash   = crypto.randomBytes(16).toString('hex');
    return `${prefix}-${id}-${hash}`;
}

function getHeaders(extra = {}) {
    return {
        'api-key': getApiKey(),
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
        'Accept': '*/*',
        'Origin': 'https://deepai.org',
        'Referer': 'https://deepai.org/',
        ...extra,
    };
}

// Use DeepAI image recognition / content moderation / caption API
async function analyzeImageWithDeepAI(base64Data, mimeType) {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    const form = new FormData();
    form.append('image', buffer, {
        filename: 'image.jpg',
        contentType: mimeType || 'image/jpeg',
    });

    const headers = { ...form.getHeaders(), ...getHeaders() };

    // Try image recognition first
    try {
        const res = await axios.post(
            'https://api.deepai.org/api/densecap',
            form,
            { headers, timeout: 30000 }
        );
        if (res.data?.output?.captions?.length) {
            return res.data.output.captions.map(c => c.caption).join('. ');
        }
    } catch (e) {
        console.log('densecap failed, trying image2text');
    }

    // Fallback: image-to-text
    const form2 = new FormData();
    form2.append('image', buffer, {
        filename: 'image.jpg',
        contentType: mimeType || 'image/jpeg',
    });
    const headers2 = { ...form2.getHeaders(), ...getHeaders() };

    try {
        const res2 = await axios.post(
            'https://api.deepai.org/api/neuraltalk',
            form2,
            { headers: headers2, timeout: 30000 }
        );
        if (res2.data?.output) return res2.data.output;
    } catch (e) {
        console.log('neuraltalk failed');
    }

    return null;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { type, data, mimeType, fileName } = req.body;

        // ── IMAGE ──────────────────────────────
        if (type === 'image') {
            if (!data) return res.status(400).json({ error: 'No image data' });

            const description = await analyzeImageWithDeepAI(data, mimeType);

            if (description) {
                return res.status(200).json({
                    success: true,
                    type: 'image',
                    description,
                    contextForChat: `[USER MENGIRIM GAMBAR: "${fileName || 'image'}". Deskripsi otomatis dari AI: ${description}. Jawab berdasarkan gambar ini.]`,
                });
            } else {
                // If DeepAI can't analyze, still pass the image info
                return res.status(200).json({
                    success: true,
                    type: 'image',
                    description: null,
                    contextForChat: `[USER MENGIRIM GAMBAR: "${fileName || 'image'}". Gambar tidak bisa dianalisis otomatis, tapi user ingin mendiskusikannya.]`,
                });
            }
        }

        // ── FILE / TEXT ──────────────────────────
        if (type === 'file') {
            if (!data) return res.status(400).json({ error: 'No file data' });

            // data is the text content of the file (extracted client-side)
            const truncated = data.slice(0, 8000); // max 8k chars to avoid token overflow
            const ext = fileName?.split('.').pop()?.toLowerCase() || 'txt';

            return res.status(200).json({
                success: true,
                type: 'file',
                contextForChat: `[USER MENGIRIM FILE: "${fileName}". Isi file (${ext}):\n\`\`\`${ext}\n${truncated}\n\`\`\`\nJawab pertanyaan user berdasarkan file ini.]`,
                preview: truncated.slice(0, 200),
            });
        }

        return res.status(400).json({ error: 'Unknown type' });

    } catch (err) {
        console.error('[upload] Error:', err.message);
        return res.status(500).json({ error: 'Upload processing failed: ' + err.message });
    }
}
