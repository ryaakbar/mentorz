# MentorZ — AI Mentor Gen Z 🔥

> AI assistant dengan persona Gen Z yang gaul, berbobot, dan relatable. Powered by DeepAI.

## 🚀 Features

- 💬 **AI Chat** — Multi-turn conversation dengan memori, markdown support, regenerate
- 🎨 **Image Generator** — Text-to-image dengan 12+ style (Anime, Cyberpunk, Realistic, dll)
- 🔊 **Text-to-Speech** — Ubah teks jadi suara
- 🧠 **Sentiment Analysis** — Analisis sentimen teks
- 📝 **Summarizer** — Ringkas teks panjang
- 🤖 **MentorZ Persona** — Mentor Gen Z gaul, slang-heavy, tapi tetap informatif

## 📁 Project Structure

```
mentorz/
├── package.json          # Dependencies & metadata
├── vercel.json           # Vercel routing & headers config
├── .gitignore            # Git ignore rules
├── README.md             # This file
│
├── api/                  # Serverless API endpoints
│   ├── chat.js           # POST /api/chat — AI chat with MentorZ persona
│   ├── image.js          # POST /api/image — Text-to-image generation
│   ├── tts.js            # POST /api/tts — Text-to-speech
│   ├── sentiment.js      # POST /api/sentiment — Sentiment analysis
│   ├── summarize.js      # POST /api/summarize — Text summarization
│   └── health.js         # GET /api/health — Health check
│
├── lib/                  # Shared utilities
│   ├── deepai.js         # DeepAI API wrapper (chat + image + NLP)
│   ├── rateLimit.js      # In-memory rate limiter (30 req/IP/min)
│   └── systemPrompt.js   # MentorZ persona system prompt builder
│
└── public/               # Frontend static files
    ├── index.html        # App shell, meta tags, font imports
    ├── style.css         # Full styling — dark gradient, glassmorphism, animations
    └── script.js         # Frontend logic — chat, image gen, state, localStorage
```

## 🛠️ Deploy ke Vercel

1. Push semua file ke GitHub repo baru
2. Buka [vercel.com](https://vercel.com) → Import repo
3. Settings:
   - Framework: **Other**
   - Root Directory: `./`
   - Build Command: *(kosongkan)*
   - Output Directory: `public`
   - Install Command: `npm install`
4. Deploy!
5. Settings → Functions → Max Duration → set ke **60**

## 🔑 API Info

Menggunakan DeepAI free API dengan dynamic key generation (no paid key needed).

## 📦 Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no framework, ultra-fast)
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI**: DeepAI API
- **Hosting**: Vercel (free tier)

---
Made with 🔥 by ryakbar
