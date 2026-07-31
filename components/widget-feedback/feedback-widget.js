// ZeaYou mockup feedback widget — vanilla JS, no build step.
// Loaded as <script type="module"> from index.html.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Skip rendering when loaded inside the admin preview iframe.
const isPreviewMode =
  window !== window.top ||
  new URLSearchParams(location.search).get('preview') === '1';

if (isPreviewMode) {
  console.info('[feedback-widget] preview mode — widget disabled');
} else {
  initFeedbackWidget();
}

function initFeedbackWidget() {

const SUPABASE_URL  = 'https://lpptlfuhnyhciqhimoxa.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwcHRsZnVobnloY2lxaGltb3hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NjMwODgsImV4cCI6MjA5MzIzOTA4OH0.rlpHJRb_n6AXyTsF_ri6w0w7P4UJkjag1VLh3yYrRFM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  db:   { schema: 'dev_portal' },
  auth: { persistSession: false }
});

const SEEN_KEY      = 'zy_feedback_welcome_seen_v1';
const LAST_NAME_KEY = 'zy_feedback_last_name_v1';
const MIN_SIZE_PX   = 12; // minimum selection size to count as a valid drag

const root = document.createElement('div');
root.setAttribute('data-zy-feedback', '');
root.innerHTML = `
  <button id="zy-fb-button" type="button" aria-label="Feedback geven">
    <span aria-hidden="true">💬</span>
    <span class="zy-fb-button-label">Feedback geven</span>
  </button>

  <div id="zy-fb-welcome" role="dialog" aria-live="polite" hidden>
    <div class="zy-fb-welcome-inner">
      <strong>Welkom 👋</strong>
      <p>Klik rechtsonder op <em>Feedback geven</em>, sleep over een gebied en laat een opmerking achter. Geen account nodig.</p>
      <button type="button" class="zy-fb-welcome-close">Begrepen</button>
    </div>
  </div>

  <div id="zy-fb-overlay" hidden>
    <div class="zy-fb-instruction">Sleep over het gebied waar je feedback op wilt geven · <kbd>Esc</kbd> om te annuleren</div>
    <div id="zy-fb-selection" hidden></div>
  </div>

  <div id="zy-fb-modal" role="dialog" aria-modal="true" aria-labelledby="zy-fb-modal-title" hidden>
    <div class="zy-fb-modal-backdrop"></div>
    <form class="zy-fb-modal-card" id="zy-fb-form">
      <h3 id="zy-fb-modal-title">Wat valt je hier op?</h3>
      <label class="zy-fb-field">
        <span>Je opmerking</span>
        <textarea name="comment" rows="5" maxlength="4000" required placeholder="Bijvoorbeeld: deze kaart is te groot, de kleur klopt niet met de huisstijl, etc."></textarea>
      </label>
      <label class="zy-fb-field">
        <span>Naam (optioneel)</span>
        <input name="author" type="text" maxlength="80" placeholder="Bijvoorbeeld: Jur" autocomplete="name">
      </label>
      <div class="zy-fb-modal-actions">
        <button type="button" class="zy-fb-secondary" id="zy-fb-cancel">Annuleren</button>
        <button type="submit" class="zy-fb-primary" id="zy-fb-submit">Versturen</button>
      </div>
      <p class="zy-fb-error" id="zy-fb-error" hidden></p>
    </form>
  </div>

  <div id="zy-fb-toast" role="status" aria-live="polite" hidden></div>
`;
document.body.appendChild(root);

const btn         = root.querySelector('#zy-fb-button');
const welcome     = root.querySelector('#zy-fb-welcome');
const welcomeBtn  = root.querySelector('.zy-fb-welcome-close');
const overlay     = root.querySelector('#zy-fb-overlay');
const selBox      = root.querySelector('#zy-fb-selection');
const modal       = root.querySelector('#zy-fb-modal');
const modalCard   = root.querySelector('.zy-fb-modal-card');
const form        = root.querySelector('#zy-fb-form');
const cancelBtn   = root.querySelector('#zy-fb-cancel');
const submitBtn   = root.querySelector('#zy-fb-submit');
const errorEl     = root.querySelector('#zy-fb-error');
const toast       = root.querySelector('#zy-fb-toast');
const txtComment  = form.elements.comment;
const txtAuthor   = form.elements.author;

// Restore last-used name for convenience
try {
  const last = localStorage.getItem(LAST_NAME_KEY);
  if (last) txtAuthor.value = last;
} catch {}

// Welcome toast — show once per browser
try {
  if (!localStorage.getItem(SEEN_KEY)) {
    welcome.hidden = false;
  }
} catch {}
welcomeBtn.addEventListener('click', () => {
  welcome.hidden = true;
  try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
});

let mode = 'idle'; // idle | selecting | commenting | submitting
let dragStart = null;
let currentSelection = null; // {x, y, w, h} in document coords

btn.addEventListener('click', startSelecting);

function startSelecting() {
  if (mode !== 'idle') return;
  mode = 'selecting';
  welcome.hidden = true;
  overlay.hidden = false;
  selBox.hidden = true;
  resizeOverlay();
  document.body.classList.add('zy-fb-selecting');
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resizeOverlay);
  overlay.addEventListener('pointerdown', onPointerDown);
}

function resizeOverlay() {
  const docHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    window.innerHeight
  );
  overlay.style.height = docHeight + 'px';
}

function cancelSelecting() {
  mode = 'idle';
  overlay.hidden = true;
  selBox.hidden = true;
  document.body.classList.remove('zy-fb-selecting');
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', resizeOverlay);
  overlay.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
  dragStart = null;
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    if (mode === 'selecting') cancelSelecting();
    else if (mode === 'commenting') closeModal();
  }
}

function onPointerDown(e) {
  // Ignore clicks on the instruction bar itself
  if (e.target.closest('.zy-fb-instruction')) return;
  e.preventDefault();
  dragStart = {
    x: e.pageX,
    y: e.pageY
  };
  selBox.hidden = false;
  positionSelection(dragStart.x, dragStart.y, 0, 0);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  try { overlay.setPointerCapture(e.pointerId); } catch {}
}

function onPointerMove(e) {
  if (!dragStart) return;
  const x = Math.min(dragStart.x, e.pageX);
  const y = Math.min(dragStart.y, e.pageY);
  const w = Math.abs(e.pageX - dragStart.x);
  const h = Math.abs(e.pageY - dragStart.y);
  positionSelection(x, y, w, h);
}

function onPointerUp(e) {
  if (!dragStart) return;
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);

  const x = Math.min(dragStart.x, e.pageX);
  const y = Math.min(dragStart.y, e.pageY);
  const w = Math.abs(e.pageX - dragStart.x);
  const h = Math.abs(e.pageY - dragStart.y);
  dragStart = null;

  if (w < MIN_SIZE_PX || h < MIN_SIZE_PX) {
    // Treat as accidental click — stay in selecting mode, hide box
    selBox.hidden = true;
    return;
  }

  currentSelection = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  openModal();
}

function positionSelection(x, y, w, h) {
  // Selection box is positioned in document coordinates inside the overlay.
  selBox.style.transform = `translate(${x}px, ${y}px)`;
  selBox.style.width  = w + 'px';
  selBox.style.height = h + 'px';
}

function openModal() {
  mode = 'commenting';
  errorEl.hidden = true;
  errorEl.textContent = '';
  submitBtn.disabled = false;
  modal.hidden = false;
  // Move overlay to behind modal but keep selection visible
  overlay.classList.add('zy-fb-overlay-static');
  setTimeout(() => txtComment.focus(), 30);
}

function closeModal() {
  modal.hidden = true;
  overlay.classList.remove('zy-fb-overlay-static');
  cancelSelecting();
  currentSelection = null;
  txtComment.value = '';
  // Note: we do NOT clear author name; keep for next iteration
}

cancelBtn.addEventListener('click', closeModal);
modal.querySelector('.zy-fb-modal-backdrop').addEventListener('click', closeModal);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (mode === 'submitting') return;
  if (!currentSelection) { closeModal(); return; }

  const comment = txtComment.value.trim();
  const author  = txtAuthor.value.trim() || null;
  if (!comment) {
    showError('Schrijf even kort waar het over gaat.');
    txtComment.focus();
    return;
  }

  mode = 'submitting';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Bezig met versturen…';
  errorEl.hidden = true;

  const payload = {
    mockup_url: location.origin + location.pathname,
    page_hash: location.hash || null,
    selection_x: currentSelection.x,
    selection_y: currentSelection.y,
    selection_w: currentSelection.w,
    selection_h: currentSelection.h,
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    device_pixel_ratio: Number((window.devicePixelRatio || 1).toFixed(2)),
    user_agent: navigator.userAgent.slice(0, 500),
    comment,
    author_name: author
  };

  try {
    const { error } = await supabase.from('mockup_feedback').insert(payload);
    if (error) throw error;

    if (author) {
      try { localStorage.setItem(LAST_NAME_KEY, author); } catch {}
    }

    closeModal();
    showToast('Bedankt — je feedback is verstuurd ✓', 'success');
  } catch (err) {
    console.error('[feedback] insert failed', err);
    showError('Versturen lukte niet. Controleer je internetverbinding en probeer opnieuw.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Versturen';
    mode = 'commenting';
  }
});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}

let toastTimer = null;
function showToast(msg, kind = 'success') {
  toast.textContent = msg;
  toast.dataset.kind = kind;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

} // end initFeedbackWidget
