// Text-to-Speech endpoint
// Note: DeepAI free TTS is limited, we use Web Speech API fallback on frontend
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { text } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'Text required!' });
        // Return text for client-side Web Speech API
        return res.status(200).json({
            success: true,
            text:    text.trim(),
            method:  'webspeech', // frontend handles this
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
