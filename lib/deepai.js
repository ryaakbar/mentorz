import crypto   from 'crypto';
import axios    from 'axios';
import FormData from 'form-data';

const BASE = 'https://api.deepai.org';

// ── Random "tryit" key — mimics browser usage ─────────────────────────────────
function getApiKey() {
    const id   = Math.floor(1e10 + Math.random() * 9e10).toString();
    const hash = crypto.randomBytes(16).toString('hex');
    return `tryit-${id}-${hash}`;
}

function getHeaders(extraHeaders = {}) {
    return {
        'api-key'           : getApiKey(),
        'User-Agent'        : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
        'sec-ch-ua'         : '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile'  : '?1',
        'sec-ch-ua-platform': '"Android"',
        'Accept'            : '*/*',
        'Origin'            : 'https://deepai.org',
        'Referer'           : 'https://deepai.org/',
        ...extraHeaders,
    };
}

// ── Response cleaners ─────────────────────────────────────────────────────────
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/[\/\\]/g, '')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/([^\n])\n([^\n])/g, '$1 $2')
        .replace(/([^`])\s{2,}([^`])/g, '$1 $2')
        .trim();
}

function fixCodeBlocks(text) {
    return text.replace(/```(\w+)?\s*([^`]+)```/g, (_, lang, code) =>
        '```' + (lang || '') + '\n' + code.replace(/\s{2,}/g, ' ') + '\n```'
    );
}

// ── CHAT ─────────────────────────────────────────────────────────────────────
// DeepAI's chat endpoint (used by deepai.org's own chatbot UI)
const CHAT_URL = `${BASE}/chat_response`;

export async function deepaiChat(chatHistory, systemPrompt = '') {
    // Build history with system prompt injected as first user/assistant pair
    const history = systemPrompt
        ? [
            { role: 'user',      content: systemPrompt },
            { role: 'assistant', content: 'Siap bro! Gue MentorZ, ready to help. 🔥' },
            ...chatHistory,
          ]
        : chatHistory;

    // ── Primary: /chat_response ───────────────────────────────────────────────
    try {
        const form = new FormData();
        form.append('chat_style', 'chat');
        form.append('chatHistory', JSON.stringify(history));

        const headers = { ...form.getHeaders(), ...getHeaders() };
        const res = await axios.post(CHAT_URL, form, { headers, timeout: 45000 });

        const raw = res.data?.output || res.data?.text
            || (typeof res.data === 'string' && res.data.length > 3 ? res.data : '');

        if (raw && raw.length > 3) {
            return fixCodeBlocks(cleanText(raw));
        }
    } catch (e) {
        console.warn('[deepaiChat] primary failed:', e.message);
    }

    // ── Fallback: /api/text-generator with last user message ─────────────────
    try {
        const lastMsg = [...history].reverse().find(m => m.role === 'user')?.content || '';
        const form2   = new FormData();
        form2.append('text', lastMsg);

        const headers2 = { ...form2.getHeaders(), ...getHeaders() };
        const res2 = await axios.post(`${BASE}/api/text-generator`, form2, { headers: headers2, timeout: 40000 });

        const raw2 = res2.data?.output || '';
        if (raw2 && raw2.length > 3) return fixCodeBlocks(cleanText(raw2));
    } catch (e) {
        console.warn('[deepaiChat] fallback text-generator failed:', e.message);
    }

    throw new Error('DeepAI tidak merespons bro, coba lagi dalam beberapa detik 🙏');
}

// ── IMAGE ─────────────────────────────────────────────────────────────────────
export async function deepaiImage({ prompt, style = '', width = 512, height = 512, negativePrompt = '', gridSize = 1 }) {
    const form = new FormData();
    form.append('text', style ? `${style} style, ${prompt}` : prompt);
    if (negativePrompt) form.append('negative_prompt', negativePrompt);
    if (width)          form.append('width',  width.toString());
    if (height)         form.append('height', height.toString());
    if (gridSize === 2) form.append('grid_size', '2');

    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${BASE}/api/text2img`, form, { headers, timeout: 60000 });

    if (!res.data?.output_url) throw new Error('Gagal generate gambar bro, coba lagi ya');
    return res.data.output_url;
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
export async function deepaiSentiment(text) {
    const form = new FormData();
    form.append('text', text);
    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${BASE}/api/sentiment-analysis`, form, { headers, timeout: 30000 });
    if (!res.data?.output) throw new Error('Sentiment analysis failed');
    return res.data.output;
}

export async function deepaiSummarize(text) {
    return deepaiChat([{ role: 'user', content: `Ringkas teks ini jadi poin utama bro:\n\n${text}` }]);
}
