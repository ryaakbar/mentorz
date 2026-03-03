export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
        status:    'ok',
        service:   'MentorZ API',
        version:   '1.0.0',
        author:    'ryakbar',
        timestamp: new Date().toISOString(),
        endpoints: ['/api/chat', '/api/image', '/api/sentiment', '/api/summarize', '/api/tts', '/api/health'],
    });
}
