const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTSo5eR_Ey1Nvka9pnsWzk5CsceMqQUabt8meoED4YoxNj85fgfZPeJFPHpBv0Oph_fQ/exec';

const opening = document.getElementById('opening');
const site = document.getElementById('mainSite');
const openButton = document.getElementById('openInvitation');
const music = document.getElementById('weddingMusic');
const musicToggle = document.getElementById('musicToggle');

const params = new URLSearchParams(window.location.search);
const guestId = (params.get('guest') || '').trim();
const source = guestId ? 'Personal Link' : 'General QR';
document.getElementById('guestId').value = guestId;
document.getElementById('source').value = source;

function endpointReady() {
  return APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('PASTE_APPS_SCRIPT');
}

async function sendEvent(payload) {
  if (!endpointReady()) return;
  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify(payload)
  });
}

if (guestId) {
  sendEvent({action: 'open', guestId, source, userAgent: navigator.userAgent});
}

openButton.addEventListener('click', async () => {
  opening.classList.add('hidden');
  site.classList.add('visible');
  site.setAttribute('aria-hidden', 'false');
  try {
    await music.play();
    musicToggle.classList.add('playing');
  } catch (_) {
    // Browser may block autoplay; user can use the music button.
  }
  setTimeout(() => document.querySelector('.verse-section').scrollIntoView({behavior: 'smooth'}), 300);
});

musicToggle.addEventListener('click', async () => {
  if (music.paused) {
    try {
      await music.play();
      musicToggle.classList.add('playing');
    } catch (_) {}
  } else {
    music.pause();
    musicToggle.classList.remove('playing');
  }
});

const target = new Date('2026-10-10T12:00:00+07:00').getTime();
function tick() {
  let d = Math.max(0, target - Date.now());
  const days = Math.floor(d / 86400000); d %= 86400000;
  const hours = Math.floor(d / 3600000); d %= 3600000;
  const minutes = Math.floor(d / 60000); d %= 60000;
  const seconds = Math.floor(d / 1000);
  for (const [id, value] of Object.entries({days, hours, minutes, seconds})) {
    document.getElementById(id).textContent = String(value).padStart(2, '0');
  }
}
tick();
setInterval(tick, 1000);

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('in');
    observer.unobserve(entry.target);
  }
}), {threshold: .12});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const dialog = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
document.querySelectorAll('.gallery-item').forEach(button => {
  button.addEventListener('click', () => {
    lightboxImage.src = button.querySelector('img').src;
    dialog.showModal();
  });
});
document.getElementById('closeLightbox').addEventListener('click', () => dialog.close());

document.getElementById('copyAccount').addEventListener('click', async event => {
  try {
    await navigator.clipboard.writeText('8705655312');
    event.target.textContent = 'Nomor Tersalin';
  } catch (_) {
    alert('8705655312');
  }
});

const rsvpForm = document.getElementById('rsvpForm');
const rsvpStatus = document.getElementById('rsvpStatus');
const rsvpSubmit = document.getElementById('rsvpSubmit');
rsvpForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!endpointReady()) {
    rsvpStatus.textContent = 'RSVP belum aktif. Masukkan URL Web App Apps Script pada script.js.';
    return;
  }

  const churchValue = document.getElementById('churchAttendance').value;
  const receptionValue = document.getElementById('receptionAttendance').value;
  const payload = {
    action: 'rsvp',
    guestId,
    source,
    rsvpName: document.getElementById('rsvpName').value.trim(),
    churchAttendance: churchValue,
    churchPax: churchValue === 'Tidak Hadir' ? 0 : Number(churchValue),
    receptionAttendance: receptionValue,
    receptionPax: receptionValue === 'Tidak Hadir' ? 0 : Number(receptionValue),
    wish: document.getElementById('wish').value.trim(),
    userAgent: navigator.userAgent
  };

  rsvpSubmit.disabled = true;
  rsvpSubmit.textContent = 'Mengirim...';
  rsvpStatus.textContent = '';
  try {
    await sendEvent(payload);
    rsvpStatus.textContent = 'Terima kasih. RSVP Anda sudah tercatat.';
    rsvpForm.reset();
    document.getElementById('guestId').value = guestId;
    document.getElementById('source').value = source;
  } catch (_) {
    rsvpStatus.textContent = 'RSVP belum berhasil dikirim. Silakan coba kembali.';
  } finally {
    rsvpSubmit.disabled = false;
    rsvpSubmit.textContent = 'Kirim RSVP';
  }
});
