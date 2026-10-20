const root = document.documentElement;
root.classList.add('js', 'is-locked');

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COLORS = ['#f7f3ea', '#fffdf8', '#e9dfd0', '#6b1a2e', '#55161b', '#8fa08b'];
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const cover = document.querySelector('.cover');

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

// ---------- Konvolutten: må åpnes for å komme videre ----------
const env = document.getElementById('envelope');
let opened = false;
const kEnv = document.querySelector('.k-env');

// Konvoluttens åpning i kollasjen, i Canva-enheter (kollasjen er 620 enheter bred)
const APNING = { x: 115 + 167, y: 136 + 57 };

env.addEventListener('click', () => {
  if (opened) return;
  opened = true;
  window.scrollTo(0, 0);
  env.classList.add('is-open');

  // Flytt forsidekonvolutten nøyaktig over den identiske konvolutten i kollasjen
  const fra = env.getBoundingClientRect();
  const til = kEnv.getBoundingClientRect();
  const dx = til.left + til.width / 2 - (fra.left + fra.width / 2);
  const dy = til.top + til.height / 2 - (fra.top + fra.height / 2);
  env.style.translate = `${dx}px ${dy}px`;
  env.style.scale = til.width / fra.width;

  // Hvert kort starter i konvoluttens åpning og flyr til plassen sin
  const ku = kEnv.parentElement.offsetWidth / 620;
  document.querySelectorAll('.kollasje .k:not(.k-env)').forEach((k) => {
    k.style.setProperty('--dx', `${APNING.x * ku - (k.offsetLeft + k.offsetWidth / 2)}px`);
    k.style.setProperty('--dy', `${APNING.y * ku - (k.offsetTop + k.offsetHeight / 2)}px`);
  });

  cover.classList.add('is-opening');
  root.classList.add('is-open');

  const t = reduce ? 0 : 1;
  setTimeout(() => {
    root.classList.remove('is-locked');
    cover.classList.add('is-gone');
  }, 2000 * t);
});

// ---------- Inn-toning når seksjonene kommer til syne ----------
document.querySelectorAll('.collage .reveal, .intro.reveal').forEach((el) => el.classList.remove('reveal'));

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

// Sjekk på nytt når forsiden er borte (elementer som allerede er synlige)
const recheck = new MutationObserver(() => {
  if (!root.classList.contains('is-open') || !io) return;
  document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => { io.unobserve(el); io.observe(el); });
  recheck.disconnect();
});
recheck.observe(root, { attributes: true, attributeFilter: ['class'] });

// ---------- Personlig invitasjon: ?navn=Kari%20og%20Ola i lenken ----------
// «&» i lenken deler den opp i flere innstillinger, så alt etter «navn=» settes sammen igjen
const navnRaa = (() => {
  const m = location.search.match(/[?&]navn=(.*)$/);
  if (!m) return '';
  try { return decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch { return m[1]; }
})();
const gjest = navnRaa.replace(/\s+/g, ' ').trim().slice(0, 80);
// «Kari, Ola og Per» / «Kari & Ola» → ['Kari', 'Ola', 'Per']
const gjester = gjest ? gjest.split(/\s*,\s*|\s*&\s*|\s+og\s+/i).map((n) => n.trim()).filter(Boolean) : [];
const flere = gjester.length > 1;
// «Kari, Ola og Per»
const listeTekst = (navn) => navn.length < 2 ? navn.join('') : `${navn.slice(0, -1).join(', ')} og ${navn[navn.length - 1]}`;

if (gjest) {
  const hilsen = document.getElementById('hilsen');
  hilsen.textContent = `Kjære ${gjest}`;
  hilsen.hidden = false;
  // Lagres med RSVP-svaret, så det synes i Netlify hvilken lenke som ble brukt
  document.getElementById('invitert').value = gjest;
}
// «du/deg» blir «dere» når lenken gjelder flere personer
if (flere) {
  document.getElementById('gjest').textContent = 'dere';
  document.querySelectorAll('[data-dere]').forEach((el) => { el.innerHTML = el.dataset.dere; });
  document.querySelectorAll('[data-dere-ph]').forEach((el) => { el.placeholder = el.dataset.derePh; });
}

// ---------- Nedtelling: dager, timer og minutter ----------
const wedding = new Date('2027-08-21T14:00:00+02:00');
const cdFelt = {
  dager: document.getElementById('cd-dager'),
  timer: document.getElementById('cd-timer'),
  minutter: document.getElementById('cd-minutter'),
};
function updateCountdown() {
  const ms = Math.max(wedding - new Date(), 0);
  cdFelt.dager.textContent = Math.floor(ms / 86400000);
  cdFelt.timer.textContent = String(Math.floor(ms / 3600000) % 24).padStart(2, '0');
  cdFelt.minutter.textContent = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
}
updateCountdown();
setInterval(updateCountdown, 20000);

// ---------- RSVP-skjema (Netlify Forms) ----------
const form = document.getElementById('rsvp-form');
const ifYes = document.getElementById('if-yes');
const thanks = document.getElementById('thanks');
const formError = document.getElementById('form-error');
const feltNavn = document.getElementById('felt-navn');
const feltKommer = document.getElementById('felt-kommer');
const feltHvem = document.getElementById('felt-hvem');
const ingen = document.getElementById('ingen-kommer');
let bokser = [];

if (gjester.length) {
  // Navnet kommer fra lenken, så navnefeltet og antall trengs ikke
  feltNavn.hidden = true;
  form.navn.value = gjest;
  document.getElementById('felt-antall').hidden = true;
}
if (gjester.length === 1) {
  const navnEl = document.getElementById('rsvp-navn');
  navnEl.textContent = gjest;
  navnEl.hidden = false;
}
if (flere) {
  // Én avkrysningsboks per navn, «Vi kan dessverre ikke komme» nederst
  feltKommer.hidden = true;
  feltHvem.hidden = false;
  const liste = document.getElementById('hvem-liste');
  bokser = gjester.map((n) => {
    const opt = document.createElement('label');
    opt.className = 'sjekk__opt';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = n;
    const tekst = document.createElement('span');
    tekst.textContent = n;
    opt.append(box, tekst);
    liste.append(opt);
    return box;
  });
}

const valgte = () => bokser.filter((b) => b.checked).map((b) => b.value);
const visHvisJa = () => {
  const nei = flere ? ingen.checked : form.kommer.value === 'Nei';
  ifYes.classList.toggle('is-hidden', nei);
};
form.querySelectorAll('input[name="kommer"]').forEach((r) => r.addEventListener('change', visHvisJa));
bokser.forEach((b) => b.addEventListener('change', () => {
  if (b.checked) ingen.checked = false;
  setError(ingen, false);
  visHvisJa();
}));
ingen.addEventListener('change', () => {
  if (ingen.checked) bokser.forEach((b) => { b.checked = false; });
  setError(ingen, false);
  visHvisJa();
});

function setError(input, show) {
  const field = input.closest('.field');
  const err = field.querySelector('.error');
  if (input.type !== 'radio' && input.type !== 'checkbox') input.setAttribute('aria-invalid', show ? 'true' : 'false');
  if (err) err.hidden = !show;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;
  const name = form.navn;

  if (flere) {
    // Fyll ut de vanlige feltene ut fra avkrysningen, så svaret ser likt ut i Netlify
    const kommer = valgte();
    if (!kommer.length && !ingen.checked) { setError(ingen, true); bokser[0].focus(); return; }
    form.querySelector(`input[name="kommer"][value="${kommer.length ? 'Ja' : 'Nei'}"]`).checked = true;
  } else {
    const nameBad = !name.value.trim();
    const answerBad = !form.kommer.value;
    setError(name, nameBad);
    setError(form.querySelector('input[name="kommer"]'), answerBad);
    if (nameBad) { name.focus(); return; }
    if (answerBad) { form.querySelector('input[name="kommer"]').focus(); return; }
  }

  const yes = form.kommer.value === 'Ja';
  const deltakere = flere ? valgte() : (yes ? [gjest || name.value.trim()] : []);
  document.getElementById('deltakere').value = listeTekst(deltakere);
  if (gjester.length) {
    const sel = form.antall;
    const n = String(deltakere.length);
    if (![...sel.options].some((o) => o.value === n)) sel.add(new Option(n));
    sel.value = n;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Sender …';
  try {
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    });
    if (!res.ok) throw new Error(res.status);
    const hvem = gjester.length ? listeTekst(deltakere) : name.value.trim().split(' ')[0];
    document.getElementById('thanks-text').textContent = yes
      ? `Vi gleder oss til å se ${deltakere.length > 1 ? 'dere' : 'deg'}, ${hvem}!`
      : flere
        ? 'Så synd at dere ikke kan komme – takk for at dere ga beskjed.'
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
