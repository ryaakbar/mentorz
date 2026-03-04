// In-memory rate limiter — 30 requests per IP per minute
const store = new Map();

export function rateLimit(req, res, limit = 30, windowMs = 60000) {
    const ip  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}`;

    if (!store.has(key)) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    const entry = store.get(key);

    if (now > entry.resetAt) {
        entry.count   = 1;
        entry.resetAt = now + windowMs;
        return true;
    }

    entry.count++;
    if (entry.count > limit) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        res.status(429).json({
            error: 'Too many requests bestie 😭 Chill dulu ya, tunggu bentar!',
            retryAfter,
        });
        return false;
    }

    return true;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store.entries()) {
        if (now > val.resetAt) store.delete(key);
    }
}, 300000);
