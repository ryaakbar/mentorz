// ════════════════════════════════════════
// MENTORZ — MAIN SCRIPT v2
// ════════════════════════════════════════

// ── STATE ──────────────────────────────
let chatHistory   = [];
let isTyping      = false;
let currentMode   = 'chat';
let selectedStyle = '';
let lastPrompt    = '';
let imgHistory    = JSON.parse(localStorage.getItem('mz_img_history') || '[]');
let toastTimer;

// ── INIT ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    restoreImgHistory();
    document.getElementById('chatInput').addEventListener('input', updateCharCount);
});

// ── MODE SWITCH ────────────────────────
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + mode).classList.add('active');
    document.getElementById('tab-' + mode).classList.add('active');
}

// ════════════════════════════════════════
// CHAT
// ════════════════════════════════════════

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

function updateCharCount() {
    const len = document.getElementById('chatInput').value.length;
    document.getElementById('charCount').textContent = `${len} / 2000`;
}

function sendQuick(text) {
    document.getElementById('chatInput').value = text;
    sendMessage();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text  = input.value.trim();
    if (!text || isTyping) return;
    if (text.length > 2000) { showToast('⚠️ Pesan terlalu panjang bro!'); return; }

    const hero = document.getElementById('chatHero');
    if (hero) hero.classList.add('compact');

    // Process attachment if any
    const att = attachments.chat;
    const attachCtx = att ? await processAttachment('chat') : null;

    // Build message with attachment context
    const fullMessage = attachCtx ? attachCtx + '

User berkata: ' + text : text;

    // Render user bubble (with attachment preview)
    appendMessageWithAttach('user', text, att);
    chatHistory.push({ role: 'user', content: fullMessage });

    // Clear attachment after sending
    if (att) removeAttachment('chat');

    input.value = '';
    input.style.height = 'auto';
    updateCharCount();

    setTyping(true);
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: fullMessage,
                chatHistory: chatHistory.slice(0, -1)
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        const reply = data.reply || 'Waduh MentorZ error nih bro 😤';
        chatHistory.push({ role: 'assistant', content: reply });
        appendMessage('ai', reply);

    } catch (err) {
        appendMessage('ai', `Bro ada error nih: ${err.message} 💀\n\nCoba lagi atau refresh page kalau masih error.`);
    } finally {
        setTyping(false);
        sendBtn.disabled = false;
        input.focus();
    }
}

function appendMessageWithAttach(role, content, att, context = 'chat') {
    const wrap  = context === 'coder' ? document.getElementById('coderMessages') : document.getElementById('chatMessages');
    const isAI  = role === 'ai';
    const time   = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = `msg-row ${role}`;
    const attachHtml = (!isAI && att) ? renderAttachBubble(att) : '';
    const parsedContent = parseMarkdown(content);
    row.innerHTML = `
        <div class="msg-avatar">${isAI ? 'Z' : '👤'}</div>
        <div class="msg-content">
            <div class="msg-name">${isAI ? 'MentorZ' : 'You'}</div>
            ${attachHtml}
            <div class="msg-bubble">${parsedContent}</div>
            <div class="msg-actions">
                ${isAI ? `
                    <button class="msg-action-btn" onclick="copyMsg(this)">📋 Copy</button>
                    <button class="msg-action-btn" onclick="regenerateMsg(this)">🔄 Regen</button>
                ` : ''}
            </div>
            <div class="msg-time">${time}</div>
        </div>
    `;
    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
}

function appendMessage(role, content) {
    const wrap  = document.getElementById('chatMessages');
    const isAI  = role === 'ai';
    const time   = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = `msg-row ${role}`;

    const parsedContent = parseMarkdown(content);

    row.innerHTML = `
        <div class="msg-avatar">${isAI ? 'Z' : '👤'}</div>
        <div class="msg-content">
            <div class="msg-name">${isAI ? 'MentorZ' : 'You'}</div>
            <div class="msg-bubble">${parsedContent}</div>
            <div class="msg-actions">
                ${isAI ? `
                    <button class="msg-action-btn" onclick="copyMsg(this)">📋 Copy</button>
                    <button class="msg-action-btn" onclick="regenerateMsg(this)">🔄 Regen</button>
                ` : ''}
            </div>
            <div class="msg-time">${time}</div>
        </div>
    `;

    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
}

function setTyping(show) {
    isTyping = show;
    document.getElementById('typingWrap').classList.toggle('hidden', !show);
    const wrap = document.getElementById('chatMessages');
    if (show) wrap.scrollTop = wrap.scrollHeight;
}

function clearChat() {
    chatHistory = [];
    document.getElementById('chatMessages').innerHTML = '';
    const hero = document.getElementById('chatHero');
    if (hero) hero.classList.remove('compact');
    showToast('🗑️ Chat cleared bro!');
}

function copyMsg(btn) {
    const bubble = btn.closest('.msg-content').querySelector('.msg-bubble');
    navigator.clipboard.writeText(bubble.innerText).then(() => showToast('📋 Copied!'));
}

async function regenerateMsg() {
    if (chatHistory.length < 2) return;
    chatHistory.pop();
    const lastUser = chatHistory[chatHistory.length - 1];
    if (!lastUser || lastUser.role !== 'user') return;

    const wrap = document.getElementById('chatMessages');
    const rows = wrap.querySelectorAll('.msg-row.ai');
    if (rows.length) rows[rows.length - 1].remove();

    setTyping(true);
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: lastUser.content,
                chatHistory: chatHistory.slice(0, -1)
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const reply = data.reply || '';
        chatHistory.push({ role: 'assistant', content: reply });
        appendMessage('ai', reply);
    } catch (err) {
        appendMessage('ai', `Error waktu regenerate bro 💀: ${err.message}`);
    } finally {
        setTyping(false);
    }
}

// ════════════════════════════════════════
// IMAGE GENERATION
// ════════════════════════════════════════

function selectStyle(btn, style) {
    document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedStyle = style;
}

function setPrompt(text) {
    document.getElementById('imagePrompt').value = text;
    document.getElementById('imagePrompt').focus();
}

async function generateImage() {
    const prompt = document.getElementById('imagePrompt').value.trim();
    if (!prompt) { showToast('⚠️ Tulis deskripsi dulu bro!'); return; }

    lastPrompt = prompt;

    const genBtn      = document.getElementById('generateBtn');
    const placeholder = document.getElementById('imgPlaceholder');
    const loading     = document.getElementById('imgLoading');
    const result      = document.getElementById('imgResult');

    genBtn.disabled = true;
    genBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Generating...</span>';
    placeholder.classList.add('hidden');
    result.classList.add('hidden');
    loading.classList.remove('hidden');

    try {
        const res = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, style: selectedStyle })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        const img = document.getElementById('generatedImg');
        img.src = data.url;
        document.getElementById('imgPromptUsed').textContent = `"${prompt}"${selectedStyle ? ` • Style: ${selectedStyle}` : ''}`;

        img.onload = () => {
            loading.classList.add('hidden');
            result.classList.remove('hidden');
        };

        addToImgHistory(data.url, prompt);
        showToast('⚡ Image generated! W bro!');

    } catch (err) {
        loading.classList.add('hidden');
        placeholder.classList.remove('hidden');
        showToast(`❌ Error: ${err.message}`);
    } finally {
        genBtn.disabled = false;
        genBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Generate Image</span>';
    }
}

function regenerateImage() {
    if (lastPrompt) {
        document.getElementById('imagePrompt').value = lastPrompt;
        generateImage();
    }
}

function downloadImage() {
    const src = document.getElementById('generatedImg').src;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src; a.download = `mentorz_${Date.now()}.jpg`; a.click();
    showToast('⬇️ Downloading...');
}

function shareToChat() {
    const url = document.getElementById('generatedImg').src;
    if (!url) return;
    switchMode('chat');
    const hero = document.getElementById('chatHero');
    if (hero) hero.classList.add('compact');
    appendMessage('user', `Cek gambar yang gue generate: ${url}`);
    chatHistory.push({ role: 'user', content: `I generated this image: ${url}\n\nPrompt: "${lastPrompt}"${selectedStyle ? `. Style: ${selectedStyle}` : ''}` });
    setTimeout(() => {
        setTyping(true);
        setTimeout(async () => {
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `I generated this image: ${url}`, chatHistory: chatHistory.slice(0,-1) })
                });
                const data = await res.json();
                const reply = data.reply || '';
                chatHistory.push({ role: 'assistant', content: reply });
                appendMessage('ai', reply);
            } catch(e) {}
            finally { setTyping(false); }
        }, 500);
    }, 300);
}

// ── IMG HISTORY ────────────────────────
function addToImgHistory(url, prompt) {
    imgHistory.unshift({ url, prompt, ts: Date.now() });
    if (imgHistory.length > 20) imgHistory = imgHistory.slice(0, 20);
    localStorage.setItem('mz_img_history', JSON.stringify(imgHistory));
    renderImgHistory();
}

function renderImgHistory() {
    if (!imgHistory.length) return;
    document.getElementById('imgHistoryWrap').style.display = 'block';
    const grid = document.getElementById('imgHistoryGrid');
    grid.innerHTML = imgHistory.map((item, i) => `
        <div class="img-hist-item" onclick="loadHistoryImg(${i})" title="${escHtml(item.prompt)}">
            <img src="${escHtml(item.url)}" alt="history ${i}" loading="lazy">
        </div>
    `).join('');
}

function loadHistoryImg(i) {
    const item = imgHistory[i];
    if (!item) return;
    document.getElementById('imagePrompt').value = item.prompt;
    lastPrompt = item.prompt;
    const img = document.getElementById('generatedImg');
    img.src = item.url;
    document.getElementById('imgPlaceholder').classList.add('hidden');
    document.getElementById('imgLoading').classList.add('hidden');
    document.getElementById('imgResult').classList.remove('hidden');
    document.getElementById('imgPromptUsed').textContent = `"${item.prompt}"`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function restoreImgHistory() { if (imgHistory.length) renderImgHistory(); }

function clearImgHistory() {
    imgHistory = [];
    localStorage.removeItem('mz_img_history');
    document.getElementById('imgHistoryWrap').style.display = 'none';
    document.getElementById('imgHistoryGrid').innerHTML = '';
    showToast('🗑️ History cleared!');
}

// ── MODAL ──────────────────────────────
function openFullscreen(img) {
    document.getElementById('modalImg').src = img.src;
    document.getElementById('imgModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    document.getElementById('imgModal').classList.add('hidden');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ════════════════════════════════════════
// CODER — AI Coding Assistant
// ════════════════════════════════════════

let coderHistory = [];
let isCoderTyping = false;

function handleCoderKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCoderMessage(); }
}

function setCoderPrompt(text) {
    document.getElementById('coderInput').value = text;
    document.getElementById('coderInput').focus();
}

async function sendCoderMessage() {
    const input = document.getElementById('coderInput');
    const text  = input.value.trim();
    if (!text || isCoderTyping) return;

    const attCoder = attachments.coder;
    const attachCtxCoder = attCoder ? await processAttachment('coder') : null;
    const fullMsgCoder = attachCtxCoder ? attachCtxCoder + '

User berkata: ' + text : text;

    appendMessageWithAttach('user', text, attCoder, 'coder');
    coderHistory.push({ role: 'user', content: fullMsgCoder });

    if (attCoder) removeAttachment('coder');

    input.value = '';

    const sendBtn = document.getElementById('coderSendBtn');
    sendBtn.disabled = true;
    isCoderTyping = true;

    // Show typing in coder
    document.getElementById('coderTyping').classList.remove('hidden');
    const wrap = document.getElementById('coderMessages');
    wrap.scrollTop = wrap.scrollHeight;

    try {
        const systemMsg = `Lo adalah MentorZ — senior dev Gen Z yang based. Expertise: JavaScript, Python, React, Node.js, CSS, SQL, dan semua bahasa populer.
Dibuat oleh ryaakbar.
Kalau ditanya siapa yang buat lo: "Gue dibuat sama ryaakbar bro 🔥"
Gaya: cowok, straight to the point, pake code examples yang bersih, jelasin dengan bahasa yang gampang.
Selalu format code dengan proper code blocks. Kasih penjelasan singkat sebelum dan sesudah code.`;

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: fullMsgCoder,
                chatHistory: coderHistory.slice(0, -1),
                userName: 'Coder Mode - ' + systemMsg
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        const reply = data.reply || 'Error bro, coba lagi';
        coderHistory.push({ role: 'assistant', content: reply });
        appendCoderMessage('ai', reply);

    } catch (err) {
        appendCoderMessage('ai', `Error bro: ${err.message} 💀`);
    } finally {
        isCoderTyping = false;
        sendBtn.disabled = false;
        document.getElementById('coderTyping').classList.add('hidden');
    }
}

function appendCoderMessage(role, content) {
    const wrap  = document.getElementById('coderMessages');
    const isAI  = role === 'ai';
    const time   = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = `msg-row ${role}`;

    row.innerHTML = `
        <div class="msg-avatar">${isAI ? '</> ' : '👤'}</div>
        <div class="msg-content">
            <div class="msg-name">${isAI ? 'MentorZ Dev' : 'You'}</div>
            <div class="msg-bubble">${parseMarkdown(content)}</div>
            <div class="msg-actions">
                ${isAI ? `<button class="msg-action-btn" onclick="copyMsg(this)">📋 Copy</button>` : ''}
            </div>
            <div class="msg-time">${time}</div>
        </div>
    `;

    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
}

function clearCoder() {
    coderHistory = [];
    document.getElementById('coderMessages').innerHTML = '';
    showToast('🗑️ Coder cleared bro!');
}

// Add syntax highlighting for code blocks
function highlightCode() {
    document.querySelectorAll('pre code').forEach(block => {
        // Simple line number + highlight
        const lines = block.textContent.split('\n');
        block.innerHTML = lines.map(l => `<span class="code-line">${escHtml(l)}</span>`).join('\n');
    });
}

// ════════════════════════════════════════
// MARKDOWN PARSER
// ════════════════════════════════════════
function parseMarkdown(text) {
    if (!text) return '';
    let html = escHtml(text);

    // Code blocks with copy button
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<div class="code-block-wrap">
            <div class="code-block-header">
                <span class="code-lang">${lang || 'code'}</span>
                <button class="code-copy-btn" onclick="copyCode(this)">📋 Copy</button>
            </div>
            <pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>
        </div>`
    );

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Blockquote
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered list
    html = html.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);

    // Ordered list
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = `<p>${html}</p>`;

    // Fix p wrapping
    html = html.replace(/<p>(<(?:h[1-6]|ul|ol|pre|blockquote|div)[^>]*>)/g, '$1');
    html = html.replace(/(<\/(?:h[1-6]|ul|ol|pre|blockquote|div)>)<\/p>/g, '$1');
    html = html.replace(/<p><\/p>/g, '');

    return html;
}

function copyCode(btn) {
    const code = btn.closest('.code-block-wrap').querySelector('code');
    navigator.clipboard.writeText(code.innerText).then(() => showToast('📋 Code copied bro!'));
}

// ── UTILS ──────────────────────────────
function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showToast(msg, duration = 2800) {
    clearTimeout(toastTimer);
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    toastTimer = setTimeout(() => t.classList.add('hidden'), duration);
}

// ════════════════════════════════════════
// FILE / IMAGE ATTACHMENT SYSTEM
// ════════════════════════════════════════

// State: pending attachment per mode
const attachments = { chat: null, coder: null };

// Supported image MIME types
const IMAGE_TYPES = ['image/jpeg','image/jpg','image/png','image/gif','image/webp','image/bmp','image/svg+xml'];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Text-based file extensions
const TEXT_EXTS = ['txt','js','py','ts','jsx','tsx','html','css','json','md','csv','xml','yaml','yml','java','cpp','c','cs','php','rb','go','rs','swift','sh','sql','graphql','vue','svelte'];

async function handleFileSelect(event, mode) {
    const file = event.target.files[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    event.target.value = '';

    if (file.size > MAX_FILE_SIZE) {
        showToast(`❌ File terlalu besar bro! Max 5MB.`);
        return;
    }

    const isImage = IMAGE_TYPES.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isText = TEXT_EXTS.includes(ext) || file.type.startsWith('text/');

    if (!isImage && !isText) {
        showToast(`❌ Format tidak didukung bro. Pakai gambar atau file teks/code.`);
        return;
    }

    showToast(`⏳ Memproses ${isImage ? 'gambar' : 'file'}...`);

    try {
        let attachment = null;

        if (isImage) {
            // Read as base64 for preview + upload
            const base64 = await readFileAsBase64(file);
            attachment = {
                type: 'image',
                file,
                base64: base64.split(',')[1], // strip data:...;base64,
                mimeType: file.type || 'image/jpeg',
                fileName: file.name,
                previewUrl: base64,
                status: 'ready',
                contextForChat: null,
            };
        } else {
            // Read as text
            const text = await readFileAsText(file);
            attachment = {
                type: 'file',
                file,
                text,
                ext,
                fileName: file.name,
                status: 'ready',
                contextForChat: null,
            };
        }

        attachments[mode] = attachment;
        renderAttachPreview(mode);
        showToast(`✅ ${isImage ? 'Gambar' : 'File'} siap dikirim bro!`);

    } catch (err) {
        showToast(`❌ Gagal baca file: ${err.message}`);
    }
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Gagal baca file'));
        reader.readAsDataURL(file);
    });
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Gagal baca file'));
        reader.readAsText(file, 'UTF-8');
    });
}

function renderAttachPreview(mode) {
    const att = attachments[mode];
    const previewEl = document.getElementById(`${mode}AttachPreview`);
    const innerEl   = document.getElementById(`${mode}AttachInner`);
    if (!previewEl || !innerEl || !att) return;

    if (att.type === 'image') {
        innerEl.innerHTML = `
            <img class="attach-thumb" src="${att.previewUrl}" alt="${escHtml(att.fileName)}">
            <div class="attach-info">
                <span class="attach-name">${escHtml(att.fileName)}</span>
                <span class="attach-size">${formatFileSize(att.file.size)}</span>
                <span class="attach-tag image-tag">🖼️ Gambar</span>
            </div>`;
    } else {
        const preview = att.text.slice(0, 120).replace(/\n/g, ' ');
        innerEl.innerHTML = `
            <div class="attach-file-icon">${getFileIcon(att.ext)}</div>
            <div class="attach-info">
                <span class="attach-name">${escHtml(att.fileName)}</span>
                <span class="attach-size">${formatFileSize(att.file.size)} • ${att.text.split('\n').length} baris</span>
                <span class="attach-preview-text">${escHtml(preview)}...</span>
            </div>`;
    }

    previewEl.classList.remove('hidden');
}

function removeAttachment(mode) {
    attachments[mode] = null;
    const previewEl = document.getElementById(`${mode}AttachPreview`);
    if (previewEl) previewEl.classList.add('hidden');
    showToast('🗑️ Lampiran dihapus');
}

// Called before sending — upload attachment and get context string
async function processAttachment(mode) {
    const att = attachments[mode];
    if (!att) return null;

    // Already processed
    if (att.contextForChat) return att.contextForChat;

    try {
        showToast(`⏳ ${att.type === 'image' ? 'Menganalisis gambar' : 'Memproses file'}...`);

        const payload = att.type === 'image'
            ? { type: 'image', data: att.base64, mimeType: att.mimeType, fileName: att.fileName }
            : { type: 'file', data: att.text, fileName: att.fileName };

        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        att.contextForChat = data.contextForChat;
        return data.contextForChat;

    } catch (err) {
        // Fallback: build context locally without AI analysis
        if (att.type === 'image') {
            return `[USER MENGIRIM GAMBAR: "${att.fileName}". Gambar tidak bisa dianalisis otomatis. User ingin mendiskusikannya.]`;
        } else {
            const truncated = att.text.slice(0, 6000);
            return `[USER MENGIRIM FILE: "${att.fileName}".\nIsi file:\n\`\`\`${att.ext}\n${truncated}\n\`\`\`]`;
        }
    }
}

// Render attachment in chat bubble
function renderAttachBubble(att) {
    if (!att) return '';
    if (att.type === 'image') {
        return `<div class="msg-attach-image">
            <img src="${att.previewUrl}" alt="${escHtml(att.fileName)}" class="msg-img-thumb" onclick="openFullscreen(this)">
            <span class="msg-img-caption">📎 ${escHtml(att.fileName)}</span>
        </div>`;
    } else {
        return `<div class="msg-attach-file">
            <span>${getFileIcon(att.ext)}</span>
            <span class="msg-file-name">${escHtml(att.fileName)}</span>
            <span class="msg-file-size">${formatFileSize(att.file.size)}</span>
        </div>`;
    }
}

// ── UTILS ──────────────────────────────
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
}

function getFileIcon(ext) {
    const map = {
        js:'🟨', ts:'🔷', py:'🐍', html:'🌐', css:'🎨',
        json:'📋', md:'📝', txt:'📄', csv:'📊', sql:'🗄️',
        java:'☕', cpp:'⚙️', c:'⚙️', php:'🐘', rb:'💎',
        go:'🐹', rs:'🦀', swift:'🍎', sh:'💻', vue:'💚',
    };
    return map[ext] || '📄';
}

// ── DRAG & DROP ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    ['chat','coder'].forEach(mode => {
        // Find the input box for this mode
        const inputId = mode === 'chat' ? 'chatInput' : 'coderInput';
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        const box = inputEl.closest('.chat-input-box') || inputEl.parentElement;

        box.addEventListener('dragover', e => {
            e.preventDefault();
            box.classList.add('drag-over');
        });
        box.addEventListener('dragleave', () => box.classList.remove('drag-over'));
        box.addEventListener('drop', e => {
            e.preventDefault();
            box.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) {
                // Simulate file select
                handleFileSelect({ target: { files: [file], value: '' }, preventDefault: ()=>{} }, mode);
            }
        });
    });
});

// ════════════════════════════════════════
// ATTACH MENU — Photo vs File picker
// ════════════════════════════════════════

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    // Close all menus first
    document.querySelectorAll('.attach-menu').forEach(m => m.classList.add('hidden'));
    if (isHidden) {
        menu.classList.remove('hidden');
        // Close when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function handler(e) {
                if (!e.target.closest('.attach-wrap')) {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', handler);
                }
            });
        }, 10);
    }
}
function toggleAttachMenu(mode) { toggleMenu(mode + 'Menu'); }

function openPhotoPicker(mode) {
    closeAllMenus();
    const inputId = mode === 'chat' ? 'chatPhotoInput' : 'coderPhotoInput';
    document.getElementById(inputId)?.click();
}

function openFilePicker(mode) {
    closeAllMenus();
    const inputId = mode === 'chat' ? 'chatFileInput' : 'coderFileInput';
    document.getElementById(inputId)?.click();
}

function pickPhoto(mode) { openPhotoPicker(mode); }
function pickFile(mode)  { openFilePicker(mode); }

function closeAllMenus() {
    document.querySelectorAll('.attach-menu').forEach(m => m.classList.add('hidden'));
}

// ═══════════════════════════════════════════
// MDP-STYLE: Reveal animation + Navbar scroll
// FIX: Force-visible immediately, no observer lag
// ═══════════════════════════════════════════

function runReveal() {
  // Mark all reveal elements as visible immediately
  // (no waiting for IntersectionObserver which can miss on mobile)
  document.querySelectorAll('.reveal').forEach((el, i) => {
    const delay = i * 60; // stagger each element by 60ms
    setTimeout(() => el.classList.add('visible'), delay);
  });
}

// Navbar scroll effect
const navEl = document.getElementById('navbar');
document.querySelectorAll('.view-scroll').forEach(scroll => {
  scroll.addEventListener('scroll', () => {
    if (navEl) navEl.classList.toggle('scrolled', scroll.scrollTop > 20);
  }, { passive: true });
});

// Run on load — multiple attempts to ensure it fires
document.addEventListener('DOMContentLoaded', () => { setTimeout(runReveal, 80); });
window.addEventListener('load', () => { setTimeout(runReveal, 100); });
setTimeout(runReveal, 150);
setTimeout(runReveal, 400); // fallback

// Re-run when switching tabs
const _navTabs = document.querySelectorAll('.nav-tab');
_navTabs.forEach(tab => {
  tab.addEventListener('click', () => setTimeout(runReveal, 80));
});
