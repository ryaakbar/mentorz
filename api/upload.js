// api/upload.js — Handle image & file upload for MentorZ

import axios    from 'axios';
import FormData from 'form-data';
import crypto   from 'crypto';

// ── Vercel: increase body size limit for images ──
export const config = {
    api: {
        bodyParser: { sizeLimit: '10mb' },
    },
};

function getApiKey() {
    const prefix = 'tryit';
    const id     = Math.floor(1e10 + Math.random() * 9e10).toString();
    const hash   = crypto.randomBytes(16).toString('hex');
    return `${prefix}-${id}-${hash}`;
}

function getHeaders(extra = {}) {
    return {
        'api-key':    getApiKey(),
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
        'Accept':     '*/*',
        'Origin':     'https://deepai.org',
        'Referer':    'https://deepai.org/',
        ...extra,
    };
}

async function analyzeImage(base64Data, mimeType = 'image/jpeg') {
    // Strip data URL prefix if present (e.g. "data:image/png;base64,xxxx")
    const clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(clean, 'base64');

    // Try densecap — rich multi-caption descriptions
    try {
        const form = new FormData();
        form.append('image', buffer, { filename: 'img.jpg', contentType: mimeType });
        const res = await axios.post('https://api.deepai.org/api/densecap', form,
            { headers: { ...form.getHeaders(), ...getHeaders() }, timeout: 25000 });
        if (res.data?.output?.captions?.length) {
            return res.data.output.captions.slice(0, 5).map(c => c.caption).join('. ');
        }
    } catch (_) {}

    // Fallback: neuraltalk
    try {
        const form2 = new FormData();
        form2.append('image', buffer, { filename: 'img.jpg', contentType: mimeType });
        const res2 = await axios.post('https://api.deepai.org/api/neuraltalk', form2,
            { headers: { ...form2.getHeaders(), ...getHeaders() }, timeout: 25000 });
        if (res2.data?.output) return res2.data.output;
    } catch (_) {}

    return null;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { type, data, mimeType, fileName } = req.body || {};
        if (!type || !data) return res.status(400).json({ error: 'Missing type or data' });

        if (type === 'image') {
            const desc = await analyzeImage(data, mimeType);
            return res.status(200).json({
                success:        true,
                type:           'image',
                description:    desc || null,
                contextForChat: desc
                    ? `[USER MENGIRIM GAMBAR: "${fileName || 'gambar'}". Deskripsi AI: ${desc}. Bahas gambar ini dan tanya detail kalau perlu.]`
                    : `[USER MENGIRIM GAMBAR: "${fileName || 'gambar'}". Tidak bisa dianalisis otomatis. Minta user describe gambarnya.]`,
            });
        }

        if (type === 'file') {
            const content = String(data).slice(0, 10000);
            const ext     = (fileName?.split('.').pop() || 'txt').toLowerCase();
            const langMap = {
                js:'javascript', ts:'typescript', jsx:'jsx', tsx:'tsx',
                py:'python', java:'java', cpp:'cpp', c:'c', cs:'csharp',
                go:'go', rs:'rust', php:'php', rb:'ruby',
                html:'html', css:'css', json:'json', sql:'sql',
                sh:'bash', yaml:'yaml', yml:'yaml', md:'markdown',
            };
            const lang = langMap[ext] || 'text';
            return res.status(200).json({
                success:        true,
                type:           'file',
                preview:        content.slice(0, 250).replace(/\n/g, ' '),
                contextForChat: `[USER MENGIRIM FILE: "${fileName}" (${ext.toUpperCase()}). Konten:\n\`\`\`${lang}\n${content}\n\`\`\`\nBantu user berdasarkan file ini.]`,
            });
        }

        return res.status(400).json({ error: 'Unknown type: use "image" or "file"' });

    } catch (err) {
        console.error('[upload]', err.message);
        return res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
}
