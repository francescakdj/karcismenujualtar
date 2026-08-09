const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzTSo5eR_Ey1Nvka9pnsWzk5CsceMqQUabt8meoED4YoxNj85fgfZPeJFPHpBv0Oph_fQ/exec';

document.addEventListener('DOMContentLoaded', () => {
  const opening = document.getElementById('opening');
  const site = document.getElementById('mainSite');
  const openButton = document.getElementById('openInvitation');
  const music = document.getElementById('weddingMusic');
  const musicToggle = document.getElementById('musicToggle');

  const params = new URLSearchParams(window.location.search);
  const guestId = (params.get('guest') || '').trim();
  const source = guestId ? 'Personal Link' : 'General QR';

  const guestIdInput = document.getElementById('guestId');
  const sourceInput = document.getElementById('source');

  if (guestIdInput) guestIdInput.value = guestId;
  if (sourceInput) sourceInput.value = source;

  function endpointReady() {
    return Boolean(APPS_SCRIPT_URL) &&
      !APPS_SCRIPT_URL.includes('PASTE_APPS_SCRIPT');
  }

  async function sendEvent(payload) {
    if (!endpointReady()) return;

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function loadCoverRecipient() {
    const recipient = document.getElementById('coverRecipient');
    const salutationElement = document.getElementById('coverSalutation');
    const guestNameElement = document.getElementById('coverGuestName');

    if (!recipient) return;

    if (!guestId || !endpointReady()) {
      // General QR tetap menggunakan placeholder Bapak/Ibu
      recipient.hidden = false;
      return;
    }

    try {
      const url =
        `${APPS_SCRIPT_URL}?action=guest&guestId=${encodeURIComponent(guestId)}&t=${Date.now()}`;

      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const salutation = String(result.salutation || '').trim();
      const guestName = String(result.guestName || '').trim();

      if (!result.ok || (!salutation && !guestName)) return;

      salutationElement.textContent = salutation || 'Bapak/Ibu';
      guestNameElement.textContent = guestName;
      recipient.hidden = false;
    } catch (error) {
      console.error('Gagal memuat tujuan undangan:', error);
    }
  }

  async function loadWishes() {
    const wishList = document.getElementById('wishList');
    const wishStatus = document.getElementById('wishStatus');

    if (!wishList || !endpointReady()) return;

    try {
      const url =
        `${APPS_SCRIPT_URL}?action=wishes&limit=30&t=${Date.now()}`;

      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const wishes = Array.isArray(result.wishes) ? result.wishes : [];

      if (!wishes.length) {
        wishList.innerHTML =
          '<p class="wish-empty">Belum ada ucapan. Jadilah yang pertama mengirimkan doa untuk Kale &amp; Ancis.</p>';

        if (wishStatus) wishStatus.textContent = '';
        return;
      }

      wishList.innerHTML = wishes.map(item => `
        <article>
          <h3>${escapeHtml(item.name || 'Tamu')}</h3>
          <p>${escapeHtml(item.wish || '')}</p>
        </article>
      `).join('');

      if (wishStatus) wishStatus.textContent = '';
    } catch (error) {
      console.error('Gagal memuat ucapan:', error);

      wishList.innerHTML =
        '<p class="wish-empty">Ucapan belum dapat dimuat. Silakan coba kembali beberapa saat lagi.</p>';

      if (wishStatus) wishStatus.textContent = '';
    }
  }

  async function checkRsvpStatus() {
    // Hanya Personal Link yang punya status RSVP individual.
    if (!guestId || source !== 'Personal Link' || !endpointReady()) {
      return false;
    }

    try {
      const url =
        `${APPS_SCRIPT_URL}?action=checkRsvp&guestId=${encodeURIComponent(guestId)}&t=${Date.now()}`;

      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.ok && result.hasRsvp) {
        lockRsvpForm();
        return true;
      }
    } catch (error) {
      console.error('Gagal mengecek status RSVP:', error);
    }

    return false;
  }

  function lockRsvpForm() {
    const rsvpForm = document.getElementById('rsvpForm');
    const rsvpStatus = document.getElementById('rsvpStatus');
    const rsvpSubmit = document.getElementById('rsvpSubmit');

    if (!rsvpForm) return;

    // Field tetap terlihat, tetapi tidak dapat diedit.
    rsvpForm
      .querySelectorAll('input:not([type="hidden"]), select, textarea')
      .forEach(field => {
        field.disabled = true;
      });

    if (rsvpSubmit) {
      rsvpSubmit.disabled = true;
      rsvpSubmit.textContent = 'RSVP SUDAH TERCATAT';
    }

    if (rsvpStatus) {
      rsvpStatus.textContent = 'RSVP Anda sudah tercatat.';
    }
  }

  // First Open TIDAK lagi dicatat saat page-load.
  // Hanya dicatat ketika tombol OPEN THE INVITATION diklik.
  if (openButton && opening && site) {
    openButton.addEventListener('click', async () => {
      openButton.disabled = true;

      if (guestId && source === 'Personal Link') {
        sendEvent({
          action: 'open',
          guestId,
          source,
          userAgent: navigator.userAgent
        }).catch(() => {});
      }

      opening.classList.add('opening-out');

      setTimeout(() => {
        site.classList.add('visible');
        site.setAttribute('aria-hidden', 'false');
      }, 80);

      if (music) {
        try {
          await music.play();
          musicToggle?.classList.add('playing');
        } catch (_) {
          // Browser dapat memblokir playback; user tetap bisa memakai tombol musik.
        }
      }

      setTimeout(() => {
        opening.classList.add('hidden');
      }, 420);

      setTimeout(() => {
        document.querySelector('.verse-section')?.scrollIntoView({
          behavior: 'smooth'
        });
      }, 540);
    });
  }

  loadCoverRecipient();
  loadWishes();
  checkRsvpStatus();

  if (musicToggle && music) {
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
  }

  const target = new Date('2026-10-10T12:00:00+07:00').getTime();

  function tick() {
    let remaining = Math.max(0, target - Date.now());

    const days = Math.floor(remaining / 86400000);
    remaining %= 86400000;

    const hours = Math.floor(remaining / 3600000);
    remaining %= 3600000;

    const minutes = Math.floor(remaining / 60000);
    remaining %= 60000;

    const seconds = Math.floor(remaining / 1000);

    for (const [id, value] of Object.entries({
      days,
      hours,
      minutes,
      seconds
    })) {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = String(value).padStart(2, '0');
      }
    }
  }

  tick();
  setInterval(tick, 1000);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12
    });

    document
      .querySelectorAll('.reveal')
      .forEach(el => observer.observe(el));
  } else {
    document
      .querySelectorAll('.reveal')
      .forEach(el => el.classList.add('in'));
  }

  const dialog = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');

  document.querySelectorAll('.gallery-item').forEach(button => {
    button.addEventListener('click', () => {
      const image = button.querySelector('img');

      if (!dialog || !lightboxImage || !image) return;

      lightboxImage.src = image.src;

      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    });
  });

  document
    .getElementById('closeLightbox')
    ?.addEventListener('click', () => dialog?.close());

  document
    .getElementById('copyAccount')
    ?.addEventListener('click', async event => {
      try {
        await navigator.clipboard.writeText('8705655312');
        event.currentTarget.textContent = 'Nomor Tersalin';
      } catch (_) {
        alert('8705655312');
      }
    });

  const rsvpForm = document.getElementById('rsvpForm');
  const rsvpStatus = document.getElementById('rsvpStatus');
  const rsvpSubmit = document.getElementById('rsvpSubmit');

  if (rsvpForm && rsvpStatus && rsvpSubmit) {
    rsvpForm.addEventListener('submit', async event => {
      event.preventDefault();

      if (!endpointReady()) {
        rsvpStatus.textContent = 'RSVP belum aktif.';
        return;
      }

      // Personal Link dicek lagi tepat sebelum submit.
      // Ini mencegah submit kedua jika status sudah berubah.
      if (guestId && source === 'Personal Link') {
        const alreadySubmitted = await checkRsvpStatus();

        if (alreadySubmitted) {
          return;
        }
      }

      const churchValue =
        document.getElementById('churchAttendance')?.value || '';

      const receptionValue =
        document.getElementById('receptionAttendance')?.value || '';

      const payload = {
        action: 'rsvp',
        guestId,
        source,
        rsvpName:
          document.getElementById('rsvpName')?.value.trim() || '',
        churchAttendance: churchValue,
        churchPax:
          churchValue === 'Tidak Hadir'
            ? 0
            : Number(churchValue),
        receptionAttendance: receptionValue,
        receptionPax:
          receptionValue === 'Tidak Hadir'
            ? 0
            : Number(receptionValue),
        wish:
          document.getElementById('wish')?.value.trim() || '',
        userAgent: navigator.userAgent
      };

      rsvpSubmit.disabled = true;
      rsvpSubmit.textContent = 'Mengirim...';
      rsvpStatus.textContent = '';

      try {
        await sendEvent(payload);

        // Karena POST memakai no-cors, response tidak dapat dibaca.
        // Setelah request dikirim, Personal Link langsung dikunci.
        if (guestId && source === 'Personal Link') {
          rsvpStatus.textContent = 'RSVP Anda sudah tercatat.';
          lockRsvpForm();
        } else {
          rsvpStatus.textContent =
            'Terima kasih. RSVP Anda sudah tercatat.';

          rsvpForm.reset();

          if (guestIdInput) guestIdInput.value = guestId;
          if (sourceInput) sourceInput.value = source;

          setTimeout(loadWishes, 1800);
        }
      } catch (_) {
        rsvpStatus.textContent =
          'RSVP belum berhasil dikirim. Silakan coba kembali.';

        rsvpSubmit.disabled = false;
        rsvpSubmit.textContent = 'Kirim RSVP';
      }
    });
  }
});
