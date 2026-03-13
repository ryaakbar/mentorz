// ════════════════════════════════════════
// MENTORZ — MAIN SCRIPT v2
// ════════════════════════════════════════

// ── STATE ──────────────────────────────
let chatHistory   = [];
let isTyping      = false;
let currentMode   = 'chat';
let selectedStyle = '';
let lastPrompt    = '';
// Image feature removed
let toastTimer;

// ── INIT ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
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

    appendMessage('user', text);

    // ✅ FIX: kirim 'message' dan 'chatHistory' sesuai yang backend expect
    chatHistory.push({ role: 'user', content: text });

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
            // ✅ FIX UTAMA: field name harus 'message' + 'chatHistory'
            body: JSON.stringify({
                message: text,
                chatHistory: chatHistory.slice(0, -1) // semua kecuali yg baru
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

    appendCoderMessage('user', text);
    coderHistory.push({ role: 'user', content: text });

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
                message: text,
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
// UPLOAD / ATTACH FEATURE
// ════════════════════════════════════════

let pendingUpload = null; // { type: 'image'|'file', data, mimeType, fileName, previewUrl? }

const ALLOWED_TEXT_EXTS = new Set([
    'txt','md','js','ts','jsx','tsx','py','html','css','json','csv',
    'java','c','cpp','cs','php','rb','go','rs','swift','kt','sh','yaml','yml','xml','sql'
]);
const MAX_FILE_BYTES  = 5 * 1024 * 1024; // 5 MB

// ── File selected from <input type="file"> ─────────────────────────────────────
function handleFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
        showToast('⚠️ File terlalu besar bro! Maks 5 MB ya.');
        return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (ALLOWED_TEXT_EXTS.has(ext)) {
        _prepareTextFile(file);
    } else {
        showToast(`⚠️ Tipe file .${ext} belum didukung bro. Hanya file teks/kode ya!`);
    }
}


function _prepareTextFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        pendingUpload = {
            type    : 'file',
            data    : e.target.result,
            fileName: file.name,
        };
        _showUploadBadge(`📄 ${file.name}`);
        showToast('📎 File siap dikirim bro!');
    };
    reader.readAsText(file);
}

function _showUploadBadge(label) {
    const preview = document.getElementById('uploadPreview');
    document.getElementById('uploadPreviewLabel').textContent = label;
    preview.classList.remove('hidden');
    document.querySelector('.attach-btn')?.classList.add('has-file');
}

function removeUpload() {
    pendingUpload = null;
    document.getElementById('uploadPreview').classList.add('hidden');
    document.querySelector('.attach-btn')?.classList.remove('has-file');
    showToast('🗑️ Attachment dihapus.');
}

// ── Override sendMessage to inject upload context ──────────────────────────────
const _originalSendMessage = sendMessage;

// Re-define sendMessage to handle upload flow
window.sendMessage = async function () {
    if (!pendingUpload) {
        // No attachment — normal flow
        return _originalSendMessage();
    }

    const input = document.getElementById('chatInput');
    const text  = input.value.trim();
    if (isTyping) return;

    const hero = document.getElementById('chatHero');
    if (hero) hero.classList.add('compact');

    appendMessage('user', text || `📎 (file: ${pendingUpload.fileName})`);

    input.value = '';
    input.style.height = 'auto';
    updateCharCount();

    setTyping(true);
    document.getElementById('sendBtn').disabled = true;

    // Clear badge immediately for UX
    const uploadSnapshot = { ...pendingUpload };
    removeUpload();

    try {
        // Step 1: Call /api/upload
        showToast('⏳ Memproses attachment...', 8000);
        const upRes = await fetch('/api/upload', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
                type    : uploadSnapshot.type,
                data    : uploadSnapshot.data,
                mimeType: uploadSnapshot.mimeType,
                fileName: uploadSnapshot.fileName,
            }),
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Upload failed');

        const contextForChat = upData.contextForChat || '';
        const userMessage    = text
            ? `${text}\n\n${contextForChat}`
            : contextForChat;

        chatHistory.push({ role: 'user', content: userMessage });

        // Step 2: Send to /api/chat with upload context
        const chatRes = await fetch('/api/chat', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
                message    : userMessage,
                chatHistory: chatHistory.slice(0, -1),
            }),
        });
        const chatData = await chatRes.json();
        if (!chatRes.ok) throw new Error(chatData.error || 'Chat failed');

        const reply = chatData.reply || 'Hmm MentorZ bingung nih bro 😅';
        chatHistory.push({ role: 'assistant', content: reply });
        appendMessage('ai', reply);

    } catch (err) {
        appendMessage('ai', `Bro ada error waktu proses attachment: ${err.message} 💀\n\nCoba lagi atau kirim ulang.`);
    } finally {
        setTyping(false);
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('chatInput').focus();
    }
};


// ── NAVBAR SCROLL & REVEAL (MDP Style) ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    const scrollBtns = document.getElementById('scrollBtns');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar?.classList.add('scrolled');
            scrollBtns?.classList.add('visible');
        } else {
            navbar?.classList.remove('scrolled');
            scrollBtns?.classList.remove('visible');
        }
    });

    // Reveal on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(el => {
            if (el.isIntersecting) el.target.classList.add('visible');
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Also trigger reveal for mode view page headers
    const modeHeaders = document.querySelectorAll('#view-image .page-header, #view-coder .page-header');
    modeHeaders.forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
});
