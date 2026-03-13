// api/upload.js — Handle file text extraction only (image removed)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin' , '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { type, data, fileName } = req.body ?? {};

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

        return res.status(400).json({ error: `Type "${type}" tidak didukung. Hanya file teks yang bisa diupload.` });

    } catch (err) {
        console.error('[upload] Error:', err);
        return res.status(500).json({ error: 'Upload processing failed: ' + (err.message ?? 'unknown') });
    }
}
