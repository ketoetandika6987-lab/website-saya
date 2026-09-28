// ========================================================================
// EcoTrace — Landing Page Interactivity
// ========================================================================

function on(el, event, handler) {
    if (el) el.addEventListener(event, handler);
}

const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Tombol-tombol yang membuka modal Login
const loginTriggers = [
    document.getElementById('nav-btn-login')
];

// Tombol-tombol yang membuka modal Register / "Mulai Sekarang"
const registerTriggers = [
    document.getElementById('nav-btn-daftar'),
    document.getElementById('hero-btn-mulai'),
    document.getElementById('cta-btn-mulai')
];

// Tab tujuan di dashboard setelah login berhasil (default: emisi)
let halamanTujuan = 'emisi';

function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function closeAllModals() {
    closeModal(loginModal);
    closeModal(registerModal);
}

// Buka modal Login dari navbar
loginTriggers.forEach(btn => on(btn, 'click', () => openModal(loginModal)));

// Buka modal Register dari navbar / hero / CTA
registerTriggers.forEach(btn => on(btn, 'click', () => openModal(registerModal)));

// Klik salah satu dari 3 kartu fitur: buka Login, ingat halaman tujuan
const fiturCards = document.querySelectorAll('.feature-card');
fiturCards.forEach(card => {
    on(card, 'click', () => {
        const target = card.dataset.target;
        if (target) halamanTujuan = target;
        openModal(loginModal);
    });
});

// Tutup modal lewat tombol X atau klik backdrop
document.querySelectorAll('[data-close-modal]').forEach(el => {
    on(el, 'click', closeAllModals);
});

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
});

// Pindah dari modal Register ke modal Login
on(document.getElementById('go-to-login'), 'click', () => {
    closeModal(registerModal);
    openModal(loginModal);
});

// Pindah dari modal Login ke modal Register
on(document.getElementById('go-to-register'), 'click', () => {
    closeModal(loginModal);
    openModal(registerModal);
});

// Submit form Login → redirect ke dashboard, langsung buka tab yang sesuai
on(loginForm, 'submit', (e) => {
    e.preventDefault();
    window.location.href = `dashboard.html#${halamanTujuan}`;
});

// Submit form Register → simulasi berhasil daftar, lanjut ke Login
on(registerForm, 'submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    closeModal(registerModal);
    openModal(loginModal);
    alert(`Akun untuk "${name}" berhasil didaftarkan (simulasi). Silakan masuk.`);
});