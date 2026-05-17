import crypto from 'crypto';

// Protects the public Google Forms ingestion endpoint.
// Apps Script sends header X-Forms-Secret; must match env FORMS_INGEST_SECRET.
// Constant-time compare to avoid timing attacks. No JWT (endpoint is public).
async function formsSecretMiddleware(req, res, next) {

    const provided = req.headers['x-forms-secret'];
    const expected = process.env.FORMS_INGEST_SECRET;

    if (!expected) {
        console.error('FORMS_INGEST_SECRET not set');
        return res.status(500).json({ message: 'Server misconfigured' });
    }

    if (!provided) {
        return res.status(401).json({ message: 'Missing secret' });
    }

    const a = Buffer.from(String(provided));
    const b = Buffer.from(expected);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ message: 'Invalid secret' });
    }

    next();
}

export default formsSecretMiddleware;
