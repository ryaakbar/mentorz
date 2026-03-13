// ============================================================
// MentorZ — AI Backend (DeepAI API — Free, No API Key needed)
// ============================================================

import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';

function getApiKey() {
    const prefix = 'tryit';
    const id = Math.floor(1e10 + Math.random() * 9e10).toString();
    const hash = crypto.randomBytes(16).toString('hex');
    return `${prefix}-${id}-${hash}`;
}

function cleanResponse(text) {
    if (!text) return '';
    let cleaned = text.replace(/[\/\\]/g, '');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    cleaned = cleaned.replace(/([^\n])\n([^\n])/g, '$1 $2');
    cleaned = cleaned.replace(/([^`])\s{2,}([^`])/g, '$1 $2');
    return cleaned.trim();
}

function formatCodeBlocks(text) {
    return text.replace(/```(\w+)?\s*([^`]+)```/g, (match, lang, code) => {
        const cleanedCode = code.replace(/\s{2,}/g, ' ');
        return `\`\`\`${lang || ''}\n${cleanedCode}\n\`\`\``;
    });
}

async function deepaiRaw(input) {
    const form = new FormData();
    form.append('chat_style', 'chat');
    form.append('chatHistory', JSON.stringify([{ role: 'user', content: input }]));
    form.append('model', 'standard');
    form.append('hacker_is_stinky', 'very_stinky');

    const headers = {
        ...form.getHeaders(),
        'api-key': getApiKey(),
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-platform': '"Android"',
        'Accept': '*/*',
        'Origin': 'https://deepai.org',
        'Referer': 'https://deepai.org/'
    };

    const res = await axios.post('https://api.deepai.org/hacking_is_a_serious_crime', form, {
        headers,
        timeout: 30000
    });

    let rawResponse = '';
    if (res.data?.output) rawResponse = res.data.output;
    else if (res.data?.text) rawResponse = res.data.text;
    else if (typeof res.data === 'string') rawResponse = res.data;

    if (!rawResponse) throw new Error('No response from DeepAI');

    let cleaned = cleanResponse(rawResponse);
    cleaned = formatCodeBlocks(cleaned);
    return cleaned;
}

// ── CHAT (multi-turn + system prompt support) ─────────────────────────────────
export async function deepaiChat(chatHistory, systemPrompt = '') {
    let inputParts = [];

    if (systemPrompt) {
        inputParts.push(`[SYSTEM INSTRUCTIONS]\n${systemPrompt}\n[END SYSTEM]\n`);
    }

    for (const msg of chatHistory.slice(0, -1)) {
        if (!msg?.role || !msg?.content) continue;
        const label = msg.role === 'user' ? 'User' : 'Assistant';
        inputParts.push(`${label}: ${msg.content}`);
    }

    const lastMsg = chatHistory[chatHistory.length - 1];
    const userInput = lastMsg?.content || '';

    if (inputParts.length > 0) {
        inputParts.push(`User: ${userInput}`);
        inputParts.push('Assistant:');
    }

    const fullInput = inputParts.length > 1
        ? inputParts.join('\n')
        : userInput;

    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const reply = await deepaiRaw(fullInput);
            if (reply && reply.length > 2) return reply;
            throw new Error('Empty response from AI');
        } catch (err) {
            lastError = err;
            console.warn(`[chat] attempt ${attempt} failed:`, err.message);
            if (attempt < 3) await sleep(1000 * attempt);
        }
    }

    throw new Error(`DeepAI tidak merespons setelah 3x percobaan. Coba lagi bro 🙏`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deepaiSentiment(text) {
    return deepaiChat([{ role: 'user', content: `Analisis sentimen dari teks ini (positif/negatif/netral) dan jelasin singkat:\n\n${text}` }]);
}

export async function deepaiSummarize(text) {
    return deepaiChat([{ role: 'user', content: `Ringkas teks ini jadi poin-poin utama:\n\n${text}` }]);
}
