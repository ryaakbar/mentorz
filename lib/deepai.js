// ============================================================
// MentorZ — AI Backend (Pollinations.ai — Free, No API Key)
// Chat: https://text.pollinations.ai/openai  (OpenAI-compatible)
// Image: https://image.pollinations.ai/prompt/{text}
// ============================================================

import axios from 'axios';

const CHAT_URL  = 'https://text.pollinations.ai/openai';
const IMAGE_URL = 'https://image.pollinations.ai/prompt';

// ── CHAT ─────────────────────────────────────────────────────────────────────
export async function deepaiChat(chatHistory, systemPrompt = '') {
    const messages = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    // Add chat history
    for (const msg of chatHistory) {
        if (msg.role && msg.content) {
            messages.push({ role: msg.role, content: msg.content });
        }
    }

    // Retry up to 3x
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await axios.post(
                CHAT_URL,
                {
                    model      : 'openai',     // uses GPT-4o-mini via Pollinations
                    messages,
                    temperature: 0.85,
                    max_tokens : 1500,
                    stream     : false,
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 45000,
                }
            );

            const reply = res.data?.choices?.[0]?.message?.content?.trim();
            if (reply && reply.length > 2) return reply;

            throw new Error('Empty response from AI');

        } catch (err) {
            lastError = err;
            console.warn(`[chat] attempt ${attempt} failed:`, err.message);
            if (attempt < 3) await sleep(1000 * attempt);
        }
    }

    throw new Error(`AI tidak merespons setelah 3x percobaan. Coba lagi bro 🙏`);
}

// ── IMAGE ─────────────────────────────────────────────────────────────────────
export async function deepaiImage({ prompt, style = '' }) {
    const fullPrompt = style
        ? `${prompt}, ${style} style, highly detailed, 4k`
        : `${prompt}, highly detailed, 4k`;

    // Pollinations image: GET request, returns image directly
    // We return the URL — browser loads it directly, no download needed
    const encoded = encodeURIComponent(fullPrompt);
    const seed    = Math.floor(Math.random() * 999999);
    const url     = `${IMAGE_URL}/${encoded}?width=768&height=768&seed=${seed}&nologo=true`;

    // Verify URL is reachable (HEAD request)
    try {
        await axios.head(url, { timeout: 10000 });
    } catch {
        // HEAD might be blocked, just return URL anyway — browser will handle it
    }

    return url;
}

// ── Util ──────────────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Keep these exports for backward compatibility
export async function deepaiSentiment(text) {
    const result = await deepaiChat(
        [{ role: 'user', content: `Analisis sentimen dari teks ini (positif/negatif/netral) dan jelasin singkat:\n\n${text}` }]
    );
    return result;
}

export async function deepaiSummarize(text) {
    return deepaiChat([{ role: 'user', content: `Ringkas teks ini jadi poin-poin utama:\n\n${text}` }]);
}
