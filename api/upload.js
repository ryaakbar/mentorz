// api/upload.js — Handle image analysis & file text extraction
// Strategy:
//   Images → DeepAI densecap → neuraltalk → image2text → graceful fallback
//   Files  → client sends plain text, we wrap it for chat context

import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';

function getApiKey() {
    const id   = Math.floor(1e10 + Math.random() * 9e10).toString();
    const hash = crypto.randomBytes(16).toString('hex');
    return `tryit-${id}-${hash}`;
}

function getHeaders(extra = {}) {
    return {
        'api-key'   : getApiKey(),
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
        'Accept'    : '*/*',
        'Origin'    : 'https://deepai.org',
        'Referer'   : 'https://deepai.org/',
        ...extra,
    };
}

async function tryDeepAIEndpoint(endpoint, buffer, mimeType) {
    const form = new FormData();
    form.append('image', buffer, {
        filename   : 'upload.jpg',
        contentType: mimeType || 'image/jpeg',
    });
    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(
        `https://api.deepai.org/api/${endpoint}`,
        form,
        { headers, timeout: 25000 }
    );
    return res.data;
}

async function analyzeImage(base64Data, mimeType) {
    const buffer = Buffer.from(base64Data, 'base64');

    try {
        const data = await tryDeepAIEndpoint('densecap', buffer, mimeType);
        const captions = data?.output?.captions;
        if (captions?.length) return captions.slice(0, 5).map(c => c.caption).join('. ');
    } catch (e) { console.warn('[upload] densecap failed:', e.message); }

    try {
        const data = await tryDeepAIEndpoint('neuraltalk', buffer, mimeType);
        if (data?.output) return data.output;
    } catch (e) { console.warn('[upload] neuraltalk failed:', e.message); }

    try {
        const data = await tryDeepAIEndpoint('image2text', buffer, mimeType);
        if (data?.output) return data.output;
    } catch (e) { console.warn('[upload] image2text failed:', e.message); }

    return null;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin' , '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { type, data, mimeType, fileName } = req.body ?? {};

        if (type === 'image') {
            if (!data) return res.status(400).json({ error: 'No image data provided' });
            if (data.length > 7_000_000)
                return res.status(413).json({ error: 'Image terlalu besar. Maksimal ~5 MB ya bro!' });

            const description = await analyzeImage(data, mimeType);
            const safeName    = fileName || 'gambar';

            return res.status(200).json({
                success       : true,
                type          : 'image',
                description   : description ?? null,
                contextForChat: description
                    ? `[USER MENGIRIM GAMBAR: "${safeName}". Deskripsi AI: ${description}. Jawab/bahas gambar ini sesuai pertanyaan user.]`
                    : `[USER MENGIRIM GAMBAR: "${safeName}". Gambar tidak bisa dianalisis otomatis. User ingin diskusi tentang gambar ini.]`,
            });
        }

        if (type === 'file') {
            if (!data) return res.status(400).json({ error: 'No file content provided' });
            const ext       = fileName?.split('.').pop()?.toLowerCase() ?? 'txt';
            const truncated = data.slice(0, 8000);
            return res.status(200).json({
                success       : true,
                type          : 'file',
                preview       : truncated.slice(0, 200),
                contextForChat: `[USER MENGIRIM FILE: "${fileName ?? 'file'}". Tipe: ${ext}.\n\nIsi file:\n\`\`\`${ext}\n${truncated}\n\`\`\`\nJawab pertanyaan user berdasarkan isi file ini.]`,
            });
        }

        return res.status(400).json({ error: `Unknown upload type: "${type}"` });

    } catch (err) {
        console.error('[upload] Error:', err);
        return res.status(500).json({ error: 'Upload processing failed: ' + (err.message ?? 'unknown') });
    }
}
