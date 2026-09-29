// POST /api/reservation — réservation de table, demande d'atelier ou de privatisation.
// Envoie un email au restaurant + un accusé de réception au client via Resend (https://resend.com).
// Variables d'environnement Vercel :
//   RESEND_API_KEY     (obligatoire pour activer l'envoi)
//   RESERVATION_TO     (défaut : bonjour@moka-annecy.com)
//   RESERVATION_FROM   (défaut : "MOKA <onboarding@resend.dev>" ; à remplacer par une adresse du domaine vérifié)

const TYPES = { table: 'Réservation de table', atelier: 'Demande d\'atelier cocktails', privatisation: 'Demande de privatisation' };

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s, max = 200) => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, max);

function frDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function validate(b) {
  const errors = [];
  const type = TYPES[b.type] ? b.type : null;
  if (!type) errors.push('type');
  if (!clean(b.name)) errors.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(b.email))) errors.push('email');
  if (clean(b.phone).replace(/\D/g, '').length < 9) errors.push('phone');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) errors.push('date');
  else {
    const [y, m, d] = b.date.split('-').map(Number);
    const day = new Date(Date.UTC(y, m - 1, d));
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (day < new Date(today.getTime() - 86400000)) errors.push('date');
    if (type === 'table') {
      const wd = day.getUTCDay();
      if (wd === 0 || wd === 1) errors.push('closed');
      if (!/^\d{2}:\d{2}$/.test(b.time || '')) errors.push('time');
      const g = parseInt(b.guests, 10);
      if (!(g >= 1 && g <= 10)) errors.push('guests');
    }
  }
  return { type, errors };
}

async function sendMail(key, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
  return r.json();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }

  // Anti-spam : champ piège
  if (b.website) return res.status(200).json({ ok: true });

  const { type, errors } = validate(b);
  if (errors.length) return res.status(400).json({ ok: false, error: 'invalid', fields: errors });

  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'not_configured' });

  const to = process.env.RESERVATION_TO || 'bonjour@moka-annecy.com';
  const from = process.env.RESERVATION_FROM || 'MOKA <onboarding@resend.dev>';

  const f = {
    name: clean(b.name, 120), email: clean(b.email, 160), phone: clean(b.phone, 40),
    date: frDate(b.date), time: clean(b.time, 5).replace(':', 'h'), guests: clean(b.guests, 4),
    event: clean(b.event, 80), message: String(b.message || '').trim().slice(0, 1500)
  };

  const rows = [
    ['Nom', f.name], ['Téléphone', f.phone], ['Email', f.email], ['Date', f.date],
    type === 'table' ? ['Heure', f.time] : null,
    ['Personnes', f.guests], f.event ? ['Événement', f.event] : null, f.message ? ['Message', f.message] : null
  ].filter(Boolean);
  const table = `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="color:#6B5D52;vertical-align:top">${esc(k)}</td><td><strong>${esc(v).replace(/\n/g, '<br>')}</strong></td></tr>`).join('')}</table>`;

  const summary = type === 'table' ? `${f.guests} pers. · ${f.date} · ${f.time}` : `${f.guests} pers. · ${f.date}`;

  try {
    await sendMail(key, {
      from, to: [to], reply_to: f.email,
      subject: `${TYPES[type]} — ${f.name} — ${summary}`,
      html: `<h2 style="font-family:Georgia,serif;color:#C97B5E">${esc(TYPES[type])}</h2>${table}
             <p style="font-family:Arial,sans-serif;font-size:13px;color:#6B5D52">Répondez directement à cet email pour confirmer au client.</p>`
    });
    await sendMail(key, {
      from, to: [f.email], reply_to: to,
      subject: type === 'table' ? `MOKA — votre demande de réservation (${summary})` : `MOKA — ${TYPES[type].toLowerCase()} bien reçue`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2A2520;line-height:1.6">
        <p>Bonjour ${esc(f.name)},</p>
        <p>${type === 'table'
          ? `Merci, votre demande de réservation pour <strong>${esc(summary)}</strong> est bien reçue. On revient vers vous rapidement pour confirmer la table.`
          : `Merci pour votre ${esc(TYPES[type].toLowerCase())}. On revient vers vous sous 48 h avec une proposition.`}</p>
        ${table}
        <p>Un changement ? Répondez simplement à cet email ou appelez-nous au 04 56 19 02 68.</p>
        <p>À très vite,<br>L'équipe MOKA · 6 rue Vaugelas, Annecy</p></div>`
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
