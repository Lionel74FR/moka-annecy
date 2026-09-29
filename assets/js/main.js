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
