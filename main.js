const root = document.documentElement;
root.classList.add('js', 'is-locked');

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const T = reduce ? 0 : 1; // alle tider ganges med denne
const COLORS = ['#f7f3ea', '#fffdf8', '#e9dfd0', '#6b1a2e', '#55161b', '#8fa08b'];
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms * T));

const cover = document.querySelector('.cover');
const env = document.getElementById('envelope');
const slot = document.getElementById('env-slot');
const stage = document.getElementById('stage');

// Utbrudd av kronblader fra et punkt på skjermen
function burst(x, y, amount = 36) {
  if (reduce) return;
  for (let i = 0; i < amount; i++) {
    const b = document.createElement('span');
    const angle = rand(0, Math.PI * 2);
    const dist = rand(120, Math.max(window.innerWidth, window.innerHeight) * 0.55);
    b.className = 'burst';
    b.style.setProperty('--ox', `${x}px`);
    b.style.setProperty('--oy', `${y}px`);
    b.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    b.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
    b.style.setProperty('--r', `${rand(-540, 540)}deg`);
    b.style.setProperty('--s', `${rand(8, 18)}px`);
    b.style.setProperty('--c', pick(COLORS));
    b.style.setProperty('--d', `${rand(1100, 1900)}ms`);
    document.body.appendChild(b);
    b.addEventListener('animationend', () => b.remove());
  }
}

const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

// ---------- Konvolutten åpnes, flytter seg, og kortene glir ut ----------
let opened = false;
env.addEventListener('click', async () => {
  if (opened) return;
  opened = true;
  window.scrollTo(0, 0);

  // 1. Navn, buketter og hint toner ut – konvolutten åpner seg
  const start = env.getBoundingClientRect();
  cover.classList.add('is-opening');
  env.classList.add('is-open');
  env.style.transform = 'none';
  await wait(1700);

  // 2. Konvolutten flyr opp til plassen sin i kollasjen
  const a = env.getBoundingClientRect();
  const b = slot.getBoundingClientRect();
  const s = b.width / a.width;
  env.style.transformOrigin = '0 0';
  env.classList.add('is-flying');
  env.style.transform = `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${s})`;
  await wait(1000);

  // 3. Flytt konvolutten inn i kollasjen, så den skalerer med skjermen
  env.classList.remove('is-flying');
  env.style.transform = '';
  env.style.transformOrigin = '';
  env.classList.add('in-slot');
  env.tabIndex = -1;
  env.setAttribute('aria-hidden', 'true');
  slot.appendChild(env);

  // 4. Kortene glir ut fra konvolutten
  const from = center(slot.getBoundingClientRect());
  document.querySelectorAll('.kollasje .k').forEach((k) => {
    const c = center(k.getBoundingClientRect());
    k.style.setProperty('--fx', `${from.x - c.x}px`);
    k.style.setProperty('--fy', `${from.y - c.y}px`);
  });
  cover.classList.add('is-collage');
  burst(from.x, from.y - b.height * 0.4, window.innerWidth < 560 ? 26 : 40);
  await wait(2000);

  // 5. Ferdig: siden kan blas videre
  cover.classList.add('is-done');
  stage.removeAttribute('aria-hidden');
  root.classList.remove('is-locked');
  root.classList.add('is-open');
  showCountdown();
});

// ---------- Inn-toning når seksjonene kommer til syne ----------
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || !root.classList.contains('is-open')) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' })
  : null;

document.querySelectorAll('.reveal').forEach((el) => {
  if (!io) { el.classList.add('is-visible'); return; }
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 5) * 90}ms`;
  io.observe(el);
});

// Sjekk på nytt når siden låses opp (elementer som allerede er synlige)
const recheck = new MutationObserver(() => {
  if (!root.classList.contains('is-open') || !io) return;
  document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => { io.unobserve(el); io.observe(el); });
  recheck.disconnect();
});
recheck.observe(root, { attributes: true, attributeFilter: ['class'] });

// ---------- Nedtelling som teller opp ----------
const wedding = new Date('2027-08-21T14:00:00+02:00');
const cd = document.getElementById('countdown');
const days = Math.ceil((wedding - new Date()) / 86400000);
function showCountdown() {
  if (days < 0) return;
  if (days === 0) { cd.textContent = 'I dag!'; return; }
  if (days === 1) { cd.textContent = 'I morgen!'; return; }
  if (reduce) { cd.textContent = `Om ${days} dager`; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min((now - t0) / 1600, 1);
    cd.textContent = `Om ${Math.round(days * (1 - Math.pow(1 - k, 3)))} dager`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- RSVP-skjema (Netlify Forms) ----------
const form = document.getElementById('rsvp-form');
const ifYes = document.getElementById('if-yes');
const thanks = document.getElementById('thanks');
const formError = document.getElementById('form-error');

form.querySelectorAll('input[name="kommer"]').forEach((r) =>
  r.addEventListener('change', () => ifYes.classList.toggle('is-hidden', form.kommer.value === 'Nei'))
);

function setError(input, show) {
  const field = input.closest('.field');
  const err = field.querySelector('.error');
  if (input.type !== 'radio') input.setAttribute('aria-invalid', show ? 'true' : 'false');
  if (err) err.hidden = !show;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  const name = form.navn;
  const nameBad = !name.value.trim();
  const answerBad = !form.kommer.value;
  setError(name, nameBad);
  setError(form.querySelector('input[name="kommer"]'), answerBad);
  if (nameBad) { name.focus(); return; }
  if (answerBad) { form.querySelector('input[name="kommer"]').focus(); return; }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sender …';
  try {
    const res = form.dataset.preview ? { ok: true } : await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    if (!res.ok) throw new Error(res.status);
    const yes = form.kommer.value === 'Ja';
    document.getElementById('thanks-text').textContent = yes
      ? `Vi gleder oss til å se deg, ${name.value.trim().split(' ')[0]}!`
      : 'Så synd at du ikke kan komme – takk for at du ga beskjed.';
    const r = btn.getBoundingClientRect();
    form.hidden = true;
    thanks.hidden = false;
    thanks.focus();
    if (yes) burst(r.left + r.width / 2, r.top, 50);
  } catch {
    formError.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Svar på invitasjon';
  }
});
