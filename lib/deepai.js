import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';

const DEEPAI_BASE = 'https://api.deepai.org';
const DEEPAI_CHAT = 'https://api.deepai.org/hacking_is_a_serious_crime';

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
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'Accept': '*/*',
        'Origin': 'https://deepai.org',
        'Referer': 'https://deepai.org/',
        ...extra,
    };
}

function cleanResponse(text) {
    if (!text) return '';
    let c = text.replace(/[\/\\]/g, '');
    c = c.replace(/\n\s*\n/g, '\n\n');
    c = c.replace(/([^\n])\n([^\n])/g, '$1 $2');
    c = c.replace(/([^`])\s{2,}([^`])/g, '$1 $2');
    return c.trim();
}

function formatCodeBlocks(text) {
    return text.replace(/```(\w+)?\s*([^`]+)```/g, (_, lang, code) => {
        const clean = code.replace(/\s{2,}/g, ' ');
        return '```' + (lang || '') + '\n' + clean + '\n```';
    });
}

export async function deepaiChat(chatHistory, systemPrompt = '') {
    const form = new FormData();
    form.append('chat_style', 'chat');

    const history = systemPrompt
        ? [{ role: 'user', content: systemPrompt }, { role: 'assistant', content: 'Siap bestie! Gue MentorZ, ready to help lo fr fr 🔥' }, ...chatHistory]
        : chatHistory;

    form.append('chatHistory', JSON.stringify(history));
    form.append('model', 'standard');
    form.append('hacker_is_stinky', 'very_stinky');

    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(DEEPAI_CHAT, form, { headers, timeout: 45000 });

    let raw = '';
    if (res.data?.output)                raw = res.data.output;
    else if (res.data?.text)             raw = res.data.text;
    else if (typeof res.data === 'string') raw = res.data;

    if (!raw) throw new Error('No response from DeepAI chat');

    let cleaned = cleanResponse(raw);
    cleaned = formatCodeBlocks(cleaned);
    return cleaned;
}

export async function deepaiImage({ prompt, style = '', width = 512, height = 512, negativePrompt = '', gridSize = 1 }) {
    const form = new FormData();
    let fullPrompt = style ? `${style} style, ${prompt}` : prompt;
    form.append('text', fullPrompt);
    if (negativePrompt) form.append('negative_prompt', negativePrompt);
    if (width)  form.append('width',  width.toString());
    if (height) form.append('height', height.toString());
    if (gridSize === 2) form.append('grid_size', '2');

    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${DEEPAI_BASE}/api/text2img`, form, { headers, timeout: 60000 });
    if (!res.data?.output_url) throw new Error('No image URL from DeepAI');
    return res.data.output_url;
}

export async function deepaiSuperRes(imageUrl) {
    const form = new FormData();
    form.append('image', imageUrl);
    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${DEEPAI_BASE}/api/torch-srgan`, form, { headers, timeout: 60000 });
    if (!res.data?.output_url) throw new Error('Super resolution failed');
    return res.data.output_url;
}

export async function deepaiColorize(imageUrl) {
    const form = new FormData();
    form.append('image', imageUrl);
    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${DEEPAI_BASE}/api/colorizer`, form, { headers, timeout: 60000 });
    if (!res.data?.output_url) throw new Error('Colorization failed');
    return res.data.output_url;
}

export async function deepaiToonify(imageUrl) {
    const form = new FormData();
    form.append('image', imageUrl);
    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${DEEPAI_BASE}/api/toonify`, form, { headers, timeout: 60000 });
    if (!res.data?.output_url) throw new Error('Toonify failed');
    return res.data.output_url;
}

export async function deepaiSentiment(text) {
    const form = new FormData();
    form.append('text', text);
    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${DEEPAI_BASE}/api/sentiment-analysis`, form, { headers, timeout: 30000 });
    if (!res.data?.output) throw new Error('Sentiment analysis failed');
    return res.data.output;
}

export async function deepaiSummarize(text) {
    const history = [{ role: 'user', content: 'Ringkas teks berikut jadi poin-poin utama:\n\n' + text }];
    return deepaiChat(history);
}

export async function deepaiNER(text) {
    const form = new FormData();
    form.append('text', text);
    const headers = { ...form.getHeaders(), ...getHeaders() };
    const res = await axios.post(`${DEEPAI_BASE}/api/ner`, form, { headers, timeout: 30000 });
    if (!res.data?.output) throw new Error('NER failed');
    return res.data.output;
}
