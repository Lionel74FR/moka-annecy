// POST /api/newsletter — inscription à la newsletter MOKA.
// Ajoute l'adresse aux contacts Resend (https://resend.com), d'où partiront les envois (Broadcasts).
// Variables d'environnement Vercel :
//   RESEND_API_KEY      (obligatoire pour activer l'inscription — la même clé que les réservations)
//   RESEND_SEGMENT_ID   (facultatif : segment « Newsletter MOKA » auquel rattacher le contact)

const clean = (s, max = 200) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }

  // Anti-spam : champ piège
  if (b.website) return res.status(200).json({ ok: true });

  const email = clean(b.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: 'invalid' });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'not_configured' });

  const body = { email, unsubscribed: false };
  if (process.env.RESEND_SEGMENT_ID) body.segments = [{ id: process.env.RESEND_SEGMENT_ID }];

  try {
    const r = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (r.ok) return res.status(200).json({ ok: true });
    const txt = await r.text();
    // Adresse déjà inscrite : on répond comme une réussite
    if (r.status === 409 || /already exists/i.test(txt)) return res.status(200).json({ ok: true });
    console.error('newsletter resend', r.status, txt);
    return res.status(502).json({ ok: false, error: 'provider' });
  } catch (e) {
    console.error('newsletter', e);
    return res.status(502).json({ ok: false, error: 'provider' });
  }
};
