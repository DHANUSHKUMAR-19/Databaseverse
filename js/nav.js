/**
 * nav.js - Site navigation: mobile toggle, active states, toast helper
 */
'use strict';

/* ── Mobile nav toggle ── */
export function initNav() {
  const toggle = document.getElementById('navToggle');
  const links  = document.querySelector('.nav-pages');
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

  // Mark active page
  const path = location.pathname.split('/').pop() || 'index.html';
  links.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || (path === 'index.html' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

/* ── Toast notification ── */
let toastTimer = null;

export function showToast(msg, duration = 2000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.innerHTML = '<span class="toast-icon">✓</span><span class="toast-msg"></span>';
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ── Copy to clipboard helper ── */
export async function copyText(text, feedbackEl = null) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
    if (feedbackEl) {
      const original = feedbackEl.textContent;
      feedbackEl.textContent = 'copied!';
      setTimeout(() => { feedbackEl.textContent = original; }, 1600);
    }
    return true;
  } catch {
    showToast('Copy failed — please copy manually');
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
      input.placeholder = "You're in. Talk soon.";
      showToast('Subscribed!');
      setTimeout(() => { input.placeholder = 'you@company.com'; }, 4000);
    } else {
      showToast('Please enter a valid email');
    }
  });
}
