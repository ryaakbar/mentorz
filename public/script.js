// ════════════════════════════════════════
// MENTORZ — MAIN SCRIPT v3 — ALL BUGS FIXED
// ════════════════════════════════════════

// ── STATE ──────────────────────────────
let chatHistory   = [];
let coderHistory  = [];
let isTyping      = false;
let isCoderTyping = false;
let currentMode   = 'chat';
let selectedStyle = '';
let lastPrompt    = '';
let imgHistory    = JSON.parse(localStorage.getItem('mz_img_history') || '[]');
let toastTimer;
let pendingUpload = null; // { contextForChat, displayText, previewSrc, type }

// ── INIT ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    restoreImgHistory();
    document.getElementById('chatInput').addEventListener('input', updateCharCount);
});

// ── MODE SWITCH ────────────────────────
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`view-${mode}`).classList.add('active');
    document.getElementById(`tab-${mode}`).classList.add('active');
}

// ════════════════════════════════════════
// UPLOAD SYSTEM (FIX #3)
// ════════════════════════════════════════

function triggerFileUpload() {
    document.getElementById('fileInput').click();
}

async function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;
    input.value = ''; // reset so same file can be re-picked

    const MAX_MB = 8;
    if (file.size > MAX_MB * 1024 * 1024) {
        showToast(`❌ File terlalu besar. Max ${MAX_MB}MB ya bro!`);
        return;
    }

    const isImage   = file.type.startsWith('image/');
    const textExts  = ['txt','md','js','ts','jsx','tsx','py','java','cpp','c','cs','go','rs',
                       'php','rb','html','css','json','sql','sh','yaml','yml','pdf'];
    const ext       = file.name.split('.').pop().toLowerCase();
    const isText    = !isImage && (textExts.includes(ext) || file.type.startsWith('text/'));

    if (!isImage && !isText) {
        showToast(`❌ Format .${ext} belum didukung. Coba gambar atau file code/text.`);
        return;
    }

    showUploadPreview(file.name, isImage, '⏳ Memproses...');

    try {
        if (isImage) {
            await processImage(file);
        } else {
            await processTextFile(file);
        }
    } catch (err) {
        clearUploadPreview();
        showToast('❌ Gagal proses: ' + err.message);
    }
}

async function processImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64 = e.target.result;
                const res = await fetch('/api/upload', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ type: 'image', data: base64, mimeType: file.type, fileName: file.name }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');

                pendingUpload = {
                    contextForChat: data.contextForChat,
                    displayText:    `📸 ${file.name}`,
                    previewSrc:     base64,
                    type:           'image',
                };
                updateUploadStatus('✅ Siap dikirim — ketik pesan atau langsung send!');
                showToast('✅ Gambar siap!');
                resolve();
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Gagal baca file'));
        reader.readAsDataURL(file);
    });
}

async function processTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const res = await fetch('/api/upload', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ type: 'file', data: content, mimeType: file.type, fileName: file.name }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');

                pendingUpload = {
                    contextForChat: data.contextForChat,
                    displayText:    `📄 ${file.name}`,
                    type:           'file',
                };
                updateUploadStatus('✅ Siap — tanya apapun tentang file ini!');
                showToast(`✅ File "${file.name}" siap!`);
                resolve();
            } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Gagal baca file'));
        reader.readAsText(file, 'UTF-8');
    });
}

function showUploadPreview(fileName, isImage, status) {
    const el = document.getElementById('uploadPreview');
    if (!el) return;
    el.classList.remove('hidden');
    document.getElementById('upIcon').textContent   = isImage ? '🖼️' : '📄';
    document.getElementById('upName').textContent   = fileName;
    document.getElementById('upStatus').textContent = status;
}

function updateUploadStatus(text) {
    const el = document.getElementById('upStatus');
    if (el) el.textContent = text;
}

function clearUploadPreview() {
    const el = document.getElementById('uploadPreview');
    if (el) el.classList.add('hidden');
}

function cancelUpload() {
    pendingUpload = null;
    clearUploadPreview();
    showToast('Upload dibatalkan.');
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
    const input     = document.getElementById('chatInput');
    const text      = input.value.trim();
    const hasUpload = !!pendingUpload;

    if (!text && !hasUpload) return;
    if (isTyping) return;
    if (text.length > 2000) { showToast('⚠️ Pesan terlalu panjang bro!'); return; }

    const hero = document.getElementById('chatHero');
    if (hero) hero.classList.add('compact');

    // ── Display user message (FIX #3 — show image preview in bubble) ──
    if (hasUpload && pendingUpload.type === 'image' && pendingUpload.previewSrc) {
        appendMessageWithImage(text, pendingUpload.previewSrc, pendingUpload.displayText);
    } else if (hasUpload) {
        appendMessage('user', pendingUpload.displayText + (text ? '\n\n' + text : ''));
    } else {
        appendMessage('user', text);
    }

    // Build API message (inject file/image context)
    const apiMessage = hasUpload
        ? (pendingUpload.contextForChat + (text ? `\n\nUser bertanya: ${text}` : '\n\nUser mengirim file/gambar ini.'))
        : text;

    chatHistory.push({ role: 'user', content: apiMessage });

    input.value = '';
    input.style.height = 'auto';
    updateCharCount();

    if (hasUpload) {
        pendingUpload = null;
        clearUploadPreview();
    }

    setTyping(true);
    document.getElementById('sendBtn').disabled = true;

    try {
        const res = await fetch('/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: apiMessage, chatHistory: chatHistory.slice(0, -1) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        const reply = data.reply || 'Waduh MentorZ error nih bro 😤';
        chatHistory.push({ role: 'assistant', content: reply });
        appendMessage('ai', reply);

    } catch (err) {
        appendMessage('ai', `Bro ada error nih: ${err.message} 💀\n\nCoba lagi atau refresh page.`);
    } finally {
        setTyping(false);
        document.getElementById('sendBtn').disabled = false;
        input.focus();
    }
}

// FIX #3 — Append user message WITH image preview visible in bubble
function appendMessageWithImage(text, imgSrc, fileName) {
    const wrap = document.getElementById('chatMessages');
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = 'msg-row user';

    row.innerHTML = `
        <div class="msg-avatar">👤</div>
        <div class="msg-content">
            <div class="msg-name">You</div>
            <div class="msg-bubble">
                <div class="upload-img-preview">
                    <img src="${escHtml(imgSrc)}" alt="${escHtml(fileName)}" onclick="openImgPreviewModal(this.src)">
                    <span class="upload-img-label">${escHtml(fileName)}</span>
                </div>
                ${text ? `<div class="upload-img-text">${escHtml(text)}</div>` : ''}
            </div>
            <div class="msg-time">${time}</div>
        </div>
    `;

    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
}

function appendMessage(role, content) {
    const wrap = document.getElementById('chatMessages');
    const isAI = role === 'ai';
    const time  = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = `msg-row ${role}`;
    row.innerHTML = `
        <div class="msg-avatar">${isAI ? 'Z' : '👤'}</div>
        <div class="msg-content">
            <div class="msg-name">${isAI ? 'MentorZ' : 'You'}</div>
            <div class="msg-bubble">${parseMarkdown(content)}</div>
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
    chatHistory  = [];
    pendingUpload = null;
    clearUploadPreview();
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
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: lastUser.content, chatHistory: chatHistory.slice(0, -1) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        const reply = data.reply || '';
        chatHistory.push({ role: 'assistant', content: reply });
        appendMessage('ai', reply);
    } catch (err) {
        appendMessage('ai', `Error waktu regenerate bro: ${err.message} 💀`);
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
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prompt, style: selectedStyle }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        // ── FIX #2: api returns 'imageUrl', not 'url' ──
        const imgUrl = data.imageUrl || data.url;
        if (!imgUrl) throw new Error('No image URL in response');

        const img = document.getElementById('generatedImg');
        img.src = imgUrl;
        document.getElementById('imgPromptUsed').textContent =
            `"${prompt}"${selectedStyle ? ` • Style: ${selectedStyle}` : ''}`;

        img.onload = () => {
            loading.classList.add('hidden');
            result.classList.remove('hidden');
        };
        img.onerror = () => {
            loading.classList.add('hidden');
            placeholder.classList.remove('hidden');
            showToast('❌ Gambar gagal load bro, regenerate aja!');
        };

        addToImgHistory(imgUrl, prompt);
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
    if (lastPrompt) { document.getElementById('imagePrompt').value = lastPrompt; generateImage(); }
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
    appendMessage('user', `Gue generate gambar ini:\n${url}`);
    chatHistory.push({ role: 'user', content: `I generated this image: ${url}\n\nPrompt: "${lastPrompt}"${selectedStyle ? `. Style: ${selectedStyle}` : ''}` });
    setTimeout(() => {
        setTyping(true);
        setTimeout(async () => {
            try {
                const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `I generated this image: ${url}`, chatHistory: chatHistory.slice(0,-1) }) });
                const data = await res.json();
                const reply = data.reply || '';
                chatHistory.push({ role: 'assistant', content: reply });
                appendMessage('ai', reply);
            } catch(e) {} finally { setTyping(false); }
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
        </div>`).join('');
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
function openImgPreviewModal(src) {
    document.getElementById('modalImg').src = src;
    document.getElementById('imgModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    document.getElementById('imgModal').classList.add('hidden');
    document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ════════════════════════════════════════
// CODER MODE
// ════════════════════════════════════════

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

    appendCoderMessage('user', text);
    coderHistory.push({ role: 'user', content: text });
    input.value = '';
    autoResize(input);

    const sendBtn = document.getElementById('coderSendBtn');
    sendBtn.disabled = true;
    isCoderTyping    = true;
    document.getElementById('coderTyping').classList.remove('hidden');
    document.getElementById('coderMessages').scrollTop = 99999;

    try {
        const devCtx = `Lo adalah MentorZ Dev — senior developer Gen Z yang expert. Stack: JS, TS, Python, React, Node.js, CSS, SQL. Dibuat oleh ryaakbar. Style: straight to the point, code examples clean, explain simpel. Always format code dengan proper code blocks.`;
        const res = await fetch('/api/chat', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ message: text, chatHistory: coderHistory.slice(0,-1), userName: devCtx }),
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
    const wrap = document.getElementById('coderMessages');
    const isAI = role === 'ai';
    const time  = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const row = document.createElement('div');
    row.className = `msg-row ${role}`;
    row.innerHTML = `
        <div class="msg-avatar">${isAI ? '</>' : '👤'}</div>
        <div class="msg-content">
            <div class="msg-name">${isAI ? 'MentorZ Dev' : 'You'}</div>
            <div class="msg-bubble">${parseMarkdown(content)}</div>
            <div class="msg-actions">
                ${isAI ? `<button class="msg-action-btn" onclick="copyMsg(this)">📋 Copy</button>` : ''}
            </div>
            <div class="msg-time">${time}</div>
        </div>`;
    wrap.appendChild(row);
    wrap.scrollTop = wrap.scrollHeight;
}

function clearCoder() {
    coderHistory = [];
    document.getElementById('coderMessages').innerHTML = '';
    showToast('🗑️ Coder cleared bro!');
}

// ════════════════════════════════════════
// MARKDOWN PARSER  (FIX #4 — code blocks wrap properly)
// ════════════════════════════════════════
function parseMarkdown(text) {
    if (!text) return '';
    let html = escHtml(text);

    // Code blocks — FIX #4: word-break on long lines, no horizontal overflow
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
        `<div class="code-block-wrap">
            <div class="code-block-header">
                <span class="code-lang">${lang || 'code'}</span>
                <button class="code-copy-btn" onclick="copyCode(this)">📋 Copy</button>
            </div>
            <pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>
        </div>`
    );

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^[*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = `<p>${html}</p>`;
    html = html.replace(/<p>(<(?:h[1-6]|ul|ol|pre|blockquote|div)[^>]*>)/g, '$1');
    html = html.replace(/(<\/(?:h[1-6]|ul|ol|pre|blockquote|div)>)<\/p>/g, '$1');
    html = html.replace(/<p><\/p>/g, '');
    return html;
}

function copyCode(btn) {
    const code = btn.closest('.code-block-wrap').querySelector('code');
    navigator.clipboard.writeText(code.innerText).then(() => showToast('📋 Code copied!'));
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
