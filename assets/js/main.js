// ============ TIME-OF-DAY ============
function autoDetectTime() {
  const h = new Date().getHours();
  if (h >= 9 && h < 14) return 'morning';
  if (h >= 14 && h < 18) return 'afternoon';
  return 'night';
}
function setTime(t) {
  document.documentElement.setAttribute('data-time', t);
  document.querySelectorAll('[data-set-time]').forEach(b => {
    b.classList.toggle('active', b.dataset.setTime === t);
  });
  // Switch logos (night = version crème sur fond sombre)
  document.querySelectorAll('.logo-day, .logo-night').forEach(el => {
    if (t === 'night') {
      el.style.display = el.classList.contains('logo-night') ? 'block' : 'none';
    } else {
      el.style.display = el.classList.contains('logo-night') ? 'none' : 'block';
    }
  });
  // CTA final : phrase selon le moment
  const ctaTitle = document.getElementById('ctaTitle');
  if (ctaTitle) {
    const phrases = {
      morning: "À tout à l'heure.",
      afternoon: "À ce soir.",
      night: "À demain."
    };
    ctaTitle.textContent = phrases[t];
    // Re-split en chars et re-anim
    ctaTitle.classList.remove('visible', 'ready');
    if (typeof splitByChars === 'function') {
      splitByChars(ctaTitle);
      // Si déjà visible dans le viewport, re-trigger l'anim
      const rect = ctaTitle.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        requestAnimationFrame(() => ctaTitle.classList.add('visible'));
      }
    }
  }
}
// Auto au chargement
setTime(autoDetectTime());
// Boutons demo
document.querySelectorAll('[data-set-time]').forEach(b => {
  b.addEventListener('click', () => setTime(b.dataset.setTime));
});

// ============ HEADER SCROLL ============
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 50);
});

// ============ TEXT SPLIT (word / char) ============
function splitByWords(el) {
  const text = el.textContent;
  el.innerHTML = text.split(/(\s+)/).map(chunk => {
    if (chunk.trim() === '') return chunk;
    return `<span class="word">${chunk}</span>`;
  }).join('');
  el.querySelectorAll('.word').forEach((w, i) => {
    w.style.setProperty('--i', i);
  });
  el.classList.add('ready');
}
function splitByChars(el) {
  const text = el.textContent;
  const chars = [...text];
  el.innerHTML = chars.map(c => {
    if (c === ' ') return '<span class="char space">&nbsp;</span>';
    return `<span class="char">${c}</span>`;
  }).join('');
  el.querySelectorAll('.char').forEach((c, i) => {
    c.style.setProperty('--i', i);
  });
  el.classList.add('ready');
}
// Wait for fonts before splitting (avoid FOUC)
document.fonts.ready.then(() => {
  document.querySelectorAll('.reveal-text').forEach(splitByWords);
  document.querySelectorAll('.reveal-chars').forEach(splitByChars);
});

// ============ REVEAL ON SCROLL ============
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.reveal, .reveal-text, .reveal-chars').forEach(el => observer.observe(el));

// ============ LIEU SLIDER (crossfade + flash facettes) ============
(function initLieuSlider() {
  const slider = document.getElementById('lieuSlider');
  const shimmer = document.getElementById('lieuShimmer');
  const dotsContainer = document.getElementById('lieuDots');
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll('.lieu-slide'));
  if (slides.length < 2) return;

  // Construire les tiles shimmer (grille responsive)
  if (shimmer) {
    const isMobile = window.innerWidth < 900;
    const COLS = isMobile ? 6 : 10;
    const ROWS = isMobile ? 8 : 6;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = document.createElement('div');
        t.className = 'lieu-shimmer-tile';
        // Wave diagonale + jitter aléatoire = effet boule à facettes qui accroche la lumière
        const delay = (r + c) * 30 + Math.random() * 200;
        t.style.setProperty('--tile-delay', `${delay}ms`);
        shimmer.appendChild(t);
      }
    }
  }

  // Dots
  if (dotsContainer) {
    slides.forEach((s, i) => {
      const dot = document.createElement('button');
      dot.className = 'lieu-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', s.alt || `Vue ${i + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(i);
        resetAutoplay();
      });
      dotsContainer.appendChild(dot);
    });
  }

  let currentSlide = 0;

  function goToSlide(idx) {
    if (idx === currentSlide) return;
    // Flash facettes
    if (shimmer) {
      shimmer.classList.add('flash');
      setTimeout(() => {
        shimmer.classList.remove('flash');
        shimmer.classList.add('flash-out');
        setTimeout(() => shimmer.classList.remove('flash-out'), 600);
      }, 400);
    }
    // Crossfade
    slides[currentSlide].classList.remove('active');
    slides[idx].classList.add('active');
    currentSlide = idx;
    // Dots
    document.querySelectorAll('.lieu-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
  }

  let autoTimer;
  function autoplay() {
    autoTimer = setInterval(() => {
      goToSlide((currentSlide + 1) % slides.length);
    }, 5500);
  }
  function resetAutoplay() {
    clearInterval(autoTimer);
    autoplay();
  }
  autoplay();
})();

// Hero reveal-chars : trigger immédiatement au chargement (pas au scroll)
document.fonts.ready.then(() => {
  setTimeout(() => {
    document.querySelectorAll('.hero .reveal-line, .hero .hero-sub, .hero .hero-cta').forEach(el => el.classList.add('visible'));
  }, 300);
});

// ============ MENU MOBILE ============
const burgerBtn = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.getElementById('mobileMenu');
function toggleMenu(force) {
  const willOpen = force !== undefined ? force : !document.body.classList.contains('menu-open');
  document.body.classList.toggle('menu-open', willOpen);
  if (mobileMenu) mobileMenu.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
}
if (burgerBtn) burgerBtn.addEventListener('click', () => toggleMenu());
if (mobileMenu) {
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
}
// Escape ferme le menu
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-open')) toggleMenu(false);
});

// ============ HERO SUN PARALLAX (par-dessus l'animation CSS drift) ============
const sun = document.getElementById('heroSunWrap');
let mouseX = 0, mouseY = 0;
let sunX = 0, sunY = 0;
document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 40;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 40;
});
function animateSun() {
  sunX += (mouseX - sunX) * 0.08;
  sunY += (mouseY - sunY) * 0.08;
  if (sun) sun.style.transform = `translate(${sunX}px, ${sunY}px)`;
  requestAnimationFrame(animateSun);
}
animateSun();

// ============ CUSTOM CURSOR ============
const cursorOuter = document.getElementById('cursorOuter');
const cursorInner = document.getElementById('cursorInner');
let cx = 0, cy = 0, cxOut = 0, cyOut = 0;
document.addEventListener('mousemove', (e) => {
  cx = e.clientX;
  cy = e.clientY;
  cursorInner.style.left = cx + 'px';
  cursorInner.style.top = cy + 'px';
});
function animateCursor() {
  cxOut += (cx - cxOut) * 0.18;
  cyOut += (cy - cyOut) * 0.18;
  cursorOuter.style.left = cxOut + 'px';
  cursorOuter.style.top = cyOut + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();
document.querySelectorAll('[data-cursor-hover]').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

// ============ LA CARTE : onglets ============
(function initCarte() {
  const tabs = Array.from(document.querySelectorAll('.carte-tabs [role="tab"]'));
  if (!tabs.length) return;
  function select(name, focus) {
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
      if (on && focus) t.focus();
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.tab));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(next.dataset.tab, true);
    });
  });
  // Liens "Voir la carte" des 3 moments
  document.querySelectorAll('[data-carte-tab]').forEach(a => {
    a.addEventListener('click', () => select(a.dataset.carteTab));
  });
  // Onglet par défaut = moment de la journée
  const now = document.documentElement.getAttribute('data-time');
  select(['morning', 'afternoon', 'night'].includes(now) ? now : 'morning');
})();

// ============ RÉSERVATION & DEMANDES ============
(function initForms() {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date();
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 90);

  document.querySelectorAll('input[type="date"][data-min-today]').forEach(inp => {
    inp.min = iso(today);
    inp.max = iso(maxDate);
  });

  // Horaires : mar-jeu 9h-20h30, ven-sam 9h-1h. Dernière arrivée : 20h / 00h30.
  function slotsFor(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    const day = new Date(y, m - 1, d).getDay(); // 0 dim .. 6 sam
    if (day === 0 || day === 1) return [];
    const last = (day === 5 || day === 6) ? 24 * 60 + 30 : 20 * 60;
    const out = [];
    const isToday = dateStr === iso(new Date());
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes() + 30;
    for (let t = 9 * 60; t <= last; t += 30) {
      if (isToday && t < nowMin) continue;
      const h = Math.floor(t / 60) % 24;
      out.push(`${pad(h)}:${pad(t % 60)}`);
    }
    return out;
  }

  const tableForm = document.querySelector('.booking-form[data-type="table"]');
  if (tableForm) {
    const dateInp = tableForm.querySelector('[name="date"]');
    const timeSel = tableForm.querySelector('[name="time"]');
    const status = tableForm.querySelector('.form-status');
    dateInp.addEventListener('change', () => {
      const slots = slotsFor(dateInp.value);
      timeSel.innerHTML = '';
      status.textContent = ''; status.className = 'form-status';
      if (slots === null) {
        timeSel.disabled = true;
        timeSel.innerHTML = '<option value="">Choisir une date</option>';
      } else if (!slots.length) {
        timeSel.disabled = true;
        timeSel.innerHTML = '<option value="">Fermé ce jour</option>';
        status.textContent = 'MOKA est fermé le dimanche et le lundi. Choisissez un jour du mardi au samedi.';
        status.className = 'form-status err';
      } else {
        timeSel.disabled = false;
        timeSel.innerHTML = '<option value="">Choisir…</option>' +
          slots.map(s => `<option value="${s}">${s.replace(':', 'h')}</option>`).join('');
      }
    });
  }

  function validate(form) {
    let ok = true;
    form.querySelectorAll('[required]').forEach(el => {
      let valid = el.value.trim() !== '' && el.checkValidity();
      if (el.name === 'phone') valid = valid && el.value.replace(/\D/g, '').length >= 9;
      el.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    return ok;
  }

  const labels = { table: 'réservation', atelier: "demande d'atelier", privatisation: 'demande de privatisation' };
  const fmtDate = s => {
    if (!s) return '';
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  document.querySelectorAll('.booking-form').forEach(form => {
    form.querySelectorAll('input, select, textarea').forEach(el =>
      el.addEventListener('input', () => el.classList.remove('invalid')));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const status = form.querySelector('.form-status');
      const btn = form.querySelector('button[type="submit"]');
      status.className = 'form-status';
      if (!validate(form)) {
        status.textContent = 'Merci de compléter les champs en rouge.';
        status.className = 'form-status err';
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      data.type = form.dataset.type;
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = 'Envoi…';
      try {
        const res = await fetch('/api/reservation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const out = await res.json().catch(() => ({}));
        if (res.ok && out.ok) {
          status.innerHTML = data.type === 'table'
            ? `Merci ${escapeHtml(data.name)} ! Votre demande pour ${data.guests} pers. le ${fmtDate(data.date)} à ${(data.time || '').replace(':', 'h')} est bien reçue. Un email récapitulatif vient de vous être envoyé ; on vous confirme la table rapidement.`
            : `Merci ${escapeHtml(data.name)} ! Votre ${labels[data.type]} est bien reçue. On revient vers vous sous 48 h.`;
          status.className = 'form-status ok';
          form.reset();
          const t = form.querySelector('[name="time"]');
          if (t) { t.disabled = true; t.innerHTML = '<option value="">Choisir une date</option>'; }
        } else {
          throw new Error(out.error || 'unavailable');
        }
      } catch (err) {
        status.innerHTML = `La demande n'a pas pu être envoyée en ligne. Appelez-nous au <a href="tel:+33456190268">04 56 19 02 68</a> ou écrivez à <a href="${mailtoFor(data)}">bonjour@moka-annecy.com</a>.`;
        status.className = 'form-status err';
      } finally {
        btn.disabled = false;
        btn.textContent = label;
      }
    });
  });

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function mailtoFor(d) {
    const subj = `MOKA — ${labels[d.type] || 'demande'} ${d.date || ''}`;
    const body = [
      `Nom : ${d.name || ''}`, `Téléphone : ${d.phone || ''}`, `Email : ${d.email || ''}`,
      `Date : ${d.date || ''}`, d.time ? `Heure : ${d.time}` : '', `Personnes : ${d.guests || ''}`,
      d.event ? `Événement : ${d.event}` : '', d.message ? `Message : ${d.message}` : ''
    ].filter(Boolean).join('\n');
    return `mailto:bonjour@moka-annecy.com?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  }
})();

// ============ HERO : libellé d'ouverture → horaires une fois ouvert ============
(function () {
  const el = document.querySelector('[data-opening]');
  if (!el) return;
  const opening = new Date(el.dataset.opening + 'T00:00:00+02:00');
  if (Date.now() >= opening.getTime()) el.textContent = 'Du mardi au samedi · dès 9h';
})();
