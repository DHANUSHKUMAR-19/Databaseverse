/**
 * js/nav.js
 * Mobile nav toggle, active page highlight, toast, clipboard, newsletter
 */
'use strict';

export function initNav() {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.innerHTML = open ? '&#10005;' : '&#9776;';
  });
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.innerHTML = '&#9776;';
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Mark active link based on current filename
  const page = location.pathname.split('/').pop() || 'index.html';
  links.querySelectorAll('a').forEach(a => {
    const href = (a.getAttribute('href') || '');
    if (href === page || (page === '' && href === 'index.html')) a.classList.add('active');
  });
}

/* ── Toast ── */
let _toastTimer = null;
export function showToast(msg, ms = 2200) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.innerHTML = '<span class="toast-icon">&#10003;</span><span class="toast-msg"></span>';
    document.body.appendChild(el);
  }
  el.querySelector('.toast-msg').textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

/* ── Clipboard ── */
export async function copyText(text, btn = null) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied!');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'copied!';
      setTimeout(() => { btn.textContent = orig; }, 1600);
    }
    return true;
  } catch {
    showToast('Copy failed — select manually');
    return false;
  }
}

/* ── Newsletter ── */
export function initNewsletter() {
  const btn = document.querySelector('.newsletter-form button');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const input = document.querySelector('.newsletter-form input');
    if (input && input.value.includes('@')) {
      input.value = '';
      input.placeholder = "You're in. Check your inbox.";
      showToast('Subscribed!');
      setTimeout(() => { input.placeholder = 'you@company.com'; }, 4500);
    } else {
      showToast('Enter a valid email');
    }
  });
}
