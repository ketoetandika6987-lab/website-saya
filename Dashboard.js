document.addEventListener('DOMContentLoaded', () => {
    function on(el, event, handler) {
        if (el) el.addEventListener(event, handler);
    }

    /* ---------------------------------------------------------------------
       1. TAB SWITCHING
       --------------------------------------------------------------------- */
    const tabButtons = document.querySelectorAll('.dash-tab');
    const panels = {
        emisi: document.getElementById('panel-emisi'),
        misi: document.getElementById('panel-misi'),
        poin: document.getElementById('panel-poin')
    };

    function switchTab(tabName) {
        if (!panels[tabName]) tabName = 'emisi';

        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        Object.entries(panels).forEach(([name, panel]) => {
            if (!panel) return;
            const isActive = name === tabName;
            panel.classList.toggle('active', isActive);
            panel.classList.remove('animate-fade-in');
            if (isActive) {
                void panel.offsetWidth;
                panel.classList.add('animate-fade-in');
            }
        });

        if (tabName === 'poin') renderPoinDanBadge();
        if (tabName === 'misi') renderMisi();

        window.location.hash = tabName;
    }

    tabButtons.forEach(btn => {
        on(btn, 'click', () => switchTab(btn.dataset.tab));
    });

    /* ---------------------------------------------------------------------
       2. HITUNG EMISI
       --------------------------------------------------------------------- */
    const emisiForm = document.getElementById('emisi-form');
    const hasilEmisi = document.getElementById('hasil-emisi');
    const hasilAngka = document.getElementById('hasil-angka');
    const hasilTips = document.getElementById('hasil-tips');

    const FAKTOR = {
        transportasi: 0.21,
        listrik: 0.85,
        makanan: 3.3,
        sampah: 0.5
    };

    on(emisiForm, 'submit', (e) => {
        e.preventDefault();

        const transportasi = parseFloat(document.getElementById('transportasi')?.value.replace(',', '.')) || 0;
        const listrik = parseFloat(document.getElementById('listrik')?.value.replace(',', '.')) || 0;
        const makanan = parseFloat(document.getElementById('makanan')?.value.replace(',', '.')) || 0;
        const sampah = parseFloat(document.getElementById('sampah')?.value.replace(',', '.')) || 0;

        const total =
            (transportasi * FAKTOR.transportasi) +
            (listrik * FAKTOR.listrik) +
            (makanan * FAKTOR.makanan) +
            (sampah * FAKTOR.sampah);

        const totalDibulatkan = Math.round(total * 100) / 100;
        if (hasilAngka) hasilAngka.textContent = totalDibulatkan;

        let tips = 'Pertahankan gaya hidup ramah lingkunganmu.';
        if (totalDibulatkan > 10) {
            tips = 'Emisimu cukup tinggi. Coba kurangi jarak berkendara atau beralih ke transportasi umum.';
        } else if (totalDibulatkan > 5) {
            tips = 'Lumayan baik. Coba kurangi konsumsi daging atau hemat listrik untuk hasil lebih optimal.';
        }
        if (hasilTips) hasilTips.textContent = tips;

        if (hasilEmisi) {
            hasilEmisi.classList.remove('hidden');
            hasilEmisi.classList.remove('animate-fade-in');
            void hasilEmisi.offsetWidth;
            hasilEmisi.classList.add('animate-fade-in');
        }

        localStorage.setItem('tg_last_emisi', totalDibulatkan);
        saveRiwayatEmisi(totalDibulatkan);

        // Update 7-day series and redraw chart
        try {
            const updatedSeries = ensureTodayInSeriesAndSave(totalDibulatkan);
            renderEmisiChart(updatedSeries);
        } catch (err) {
            // fail silently if chart not initialized
            console.warn('Emisi chart update failed', err);
        }
    });

    /* ---------------------------------------------------------------------
       3. MISI HARIAN
       --------------------------------------------------------------------- */
    const DAFTAR_MISI = [
        { id: 'm1', icon: '🚲', nama: 'Naik sepeda atau jalan kaki hari ini', poin: 10 },
        { id: 'm2', icon: '🧴', nama: 'Bawa tumbler / botol minum sendiri', poin: 5 },
        { id: 'm3', icon: '🛍️', nama: 'Gunakan tas belanja kain, bukan plastik', poin: 5 },
        { id: 'm4', icon: '🌱', nama: 'Matikan lampu yang tidak dipakai', poin: 5 }
    ];

    function getMisiSelesai() {
        const data = localStorage.getItem('tg_misi_selesai');
        return data ? JSON.parse(data) : [];
    }
    function saveMisiSelesai(list) {
        localStorage.setItem('tg_misi_selesai', JSON.stringify(list));
    }
    function getTotalPoin() {
        const poin = localStorage.getItem('tg_total_poin');
        return poin ? parseInt(poin) : 0;
    }
    function saveTotalPoin(poin) {
        localStorage.setItem('tg_total_poin', poin);
    }

    function renderMisi() {
        const misiList = document.getElementById('misi-list');
        if (!misiList) return;
        const selesai = getMisiSelesai();
        misiList.innerHTML = '';

        DAFTAR_MISI.forEach(misi => {
            const isSelesai = selesai.includes(misi.id);

            const card = document.createElement('div');
            card.className = 'bg-white/80 backdrop-blur-sm rounded-2xl border border-black/5 p-4 flex items-center justify-between shadow-sm';

            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${misi.icon}</span>
                    <div>
                        <p class="text-sm font-semibold ${isSelesai ? 'text-[#9AA39C] line-through' : 'text-[#1B211D]'}">${misi.nama}</p>
                        <p class="text-xs text-[#3F7D4E] font-bold">+${misi.poin} poin</p>
                    </div>
                </div>
                <button data-id="${misi.id}" class="btn-selesai ${isSelesai ? 'bg-[#E6F1E1] text-[#3F7D4E]' : 'bg-[#5B9A5F] text-white hover:bg-[#3F7D4E]'} font-semibold text-xs py-2 px-3 rounded-xl transition duration-200" ${isSelesai ? 'disabled' : ''}>
                    ${isSelesai ? '✓ Selesai' : 'Selesaikan'}
                </button>
            `;

            misiList.appendChild(card);
        });

        document.querySelectorAll('.btn-selesai').forEach(btn => {
            on(btn, 'click', () => selesaikanMisi(btn.dataset.id));
        });

        updateProgress();
    }

    function selesaikanMisi(id) {
        const selesai = getMisiSelesai();
        if (selesai.includes(id)) return;

        const misi = DAFTAR_MISI.find(m => m.id === id);
        selesai.push(id);
        saveMisiSelesai(selesai);
        saveTotalPoin(getTotalPoin() + misi.poin);
        logAktivitas(misi.nama, misi.poin);

        renderMisi();
    }

    function updateProgress() {
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        if (!progressText || !progressFill) return;
        const selesai = getMisiSelesai();
        const total = DAFTAR_MISI.length;
        const jumlahSelesai = selesai.length;
        const persen = (jumlahSelesai / total) * 100;

        progressText.textContent = `${jumlahSelesai}/${total} selesai`;
        progressFill.style.width = `${persen}%`;
    }

    /* ---------------------------------------------------------------------
       4. POIN & BADGE
       --------------------------------------------------------------------- */
    const DAFTAR_BADGE = [
        { nama: 'Pemula', icon: '🌱', syarat: 0 },
        { nama: 'Hijau', icon: '🍃', syarat: 20 },
        { nama: 'Eco Hero', icon: '🌍', syarat: 50 },
        { nama: 'Juara Hijau', icon: '🏅', syarat: 100 },
        { nama: 'Legenda Eco', icon: '👑', syarat: 200 },
        { nama: 'Penjaga Bumi', icon: '🌳', syarat: 350 }
    ];

    function renderPoinDanBadge() {
        const totalPoinEl = document.getElementById('total-poin');
        const badgeGrid = document.getElementById('badge-grid');
        if (!totalPoinEl || !badgeGrid) return;
        const totalPoin = getTotalPoin();
        totalPoinEl.textContent = totalPoin;

        badgeGrid.innerHTML = '';

        DAFTAR_BADGE.forEach(badge => {
            const terbuka = totalPoin >= badge.syarat;

            const item = document.createElement('div');
            item.className = `flex flex-col items-center p-3 rounded-2xl border text-center ${
                terbuka ? 'bg-[#F8F6EF] border-[#B9E36D]' : 'bg-black/[0.02] border-black/5 opacity-50'
            }`;

            item.innerHTML = `
                <span class="text-3xl mb-1">${terbuka ? badge.icon : '🔒'}</span>
                <span class="text-xs font-semibold ${terbuka ? 'text-[#0B1F16]' : 'text-[#9AA39C]'}">${badge.nama}</span>
                <span class="text-[10px] text-[#9AA39C] mt-1">${badge.syarat} poin</span>
            `;

            badgeGrid.appendChild(item);
        });
    }

    /* ---------------------------------------------------------------------
       5. EMISI 7-HARI (grafik)
       --------------------------------------------------------------------- */
    let emisiChart = null;

    function get7DaySeries() {
        const raw = localStorage.getItem('tg_emisi_7days');
        return raw ? JSON.parse(raw) : [];
    }
    function save7DaySeries(series) {
        localStorage.setItem('tg_emisi_7days', JSON.stringify(series));
    }

    function seed7DaysWithZerosOrLast(lastValue) {
        const out = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            out.push({ date: d.toISOString().slice(0, 10), value: i === 0 ? lastValue : 0 });
        }
        save7DaySeries(out);
        return out;
    }

    function ensureTodayInSeriesAndSave(value) {
        const today = new Date().toISOString().slice(0, 10);
        const series = get7DaySeries();
        if (series.length > 0 && series[series.length - 1].date === today) {
            series[series.length - 1].value = value;
        } else {
            series.push({ date: today, value });
            // keep last 7
            if (series.length > 7) series.splice(0, series.length - 7);
        }
        save7DaySeries(series);
        return series;
    }

    function renderEmisiChart(series) {
        const rawSeries = series || get7DaySeries();
        const labels = rawSeries.map(s => {
            try { return new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short' }); } catch (_) { return s.date; }
        });
        const data = rawSeries.map(s => s.value);

        const canvas = document.getElementById('emisi-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (emisiChart) emisiChart.destroy();

        emisiChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'kg CO₂',
                    data,
                    backgroundColor: '#B9E36D',
                    borderRadius: 6,
                    barPercentage: 0.7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    function initEmisiChart() {
        const last = parseFloat(localStorage.getItem('tg_last_emisi')) || 0;
        let series = get7DaySeries();
        if (!series || series.length === 0) {
            series = seed7DaysWithZerosOrLast(last);
        } else {
            series = ensureTodayInSeriesAndSave(last);
        }
        renderEmisiChart(series);
    }

    // Jalankan tab awal dan render data
    const initialTab = window.location.hash.replace('#', '') || 'emisi';
    switchTab(initialTab);
    renderMisi();
    renderPoinDanBadge();
    initEmisiChart();

    /* ---------------------------------------------------------------------
   6. GRAFIK RIWAYAT EMISI
   --------------------------------------------------------------------- */
function getRiwayatEmisi() {
    const data = localStorage.getItem('tg_riwayat_emisi');
    return data ? JSON.parse(data) : [];
}

function saveRiwayatEmisi(value) {
    const riwayat = getRiwayatEmisi();
    // Use ISO date for consistent ordering and comparisons
    const hariIniIso = new Date().toISOString().slice(0, 10);

    // Cek apakah hari ini sudah dihitung; update atau tambah
    const indexHariIni = riwayat.findIndex(item => item.date === hariIniIso);
    if (indexHariIni !== -1) {
        riwayat[indexHariIni].value = value;
    } else {
        riwayat.push({ date: hariIniIso, value: value });
    }

    // Sort and keep last 7 by date
    riwayat.sort((a, b) => a.date.localeCompare(b.date));
    while (riwayat.length > 7) riwayat.shift();

    localStorage.setItem('tg_riwayat_emisi', JSON.stringify(riwayat));
    renderGrafikEmisi(); // Render ulang grafik
}

function renderGrafikEmisi() {
    const container = document.getElementById('emisi-chart-container');
    const labels = document.getElementById('emisi-chart-labels');
    const rataEl = document.getElementById('rata-emisi');
    
    if (!container || !labels) return;

    const riwayat = getRiwayatEmisi();
    container.innerHTML = '';
    labels.innerHTML = '';

    if (riwayat.length === 0) {
        container.innerHTML = '<div class="w-full text-center text-sm text-[#9AA39C] pb-4">Belum ada data. Hitung emisimu hari ini!</div>';
        return;
    }

    // Sort by date to ensure left-to-right timeline
    const sorted = [...riwayat].sort((a, b) => a.date.localeCompare(b.date));
    // Kalkulasi rata-rata & nilai tertinggi untuk skala bar
    const maxEmisi = sorted.length ? Math.max(...sorted.map(item => item.value)) : 0;
    const totalEmisi = sorted.reduce((sum, item) => sum + item.value, 0);
    rataEl.textContent = (sorted.length ? (totalEmisi / sorted.length).toFixed(1) : '0');

    // Padding array agar selalu ada 7 kolom, sambil menjaga urutan kronologis dari kiri ke kanan
    const displayData = [...sorted];
    while (displayData.length < 7) {
        displayData.push({ date: '-', value: 0 });
    }

    // Force left-to-right rendering regardless of any global direction styles
    try {
        container.style.flexDirection = 'row';
        labels.style.flexDirection = 'row';
    } catch (e) {
        // ignore if elements missing
    }

    // elemen Bar Chart
    displayData.forEach(item => {
        // Skala persentase tinggi bar (minimal 4% agar tetap terlihat jika nilainya kecil)
        let heightPercent = maxEmisi > 0 ? (item.value / maxEmisi) * 100 : 0;
        if (item.value > 0 && heightPercent < 4) heightPercent = 4;
        
        // Buat Bar
        const barWrapper = document.createElement('div');
        barWrapper.className = 'w-full flex flex-col justify-end items-center group relative h-full';
        
        barWrapper.innerHTML = item.value === 0 && item.date === '-' 
            ? `<div class="w-full max-w-[2.5rem] bg-black/5 rounded-t-md h-2"></div>` 
            : `
            <!-- Tooltip Hover -->
            <div class="opacity-0 group-hover:opacity-100 absolute -top-8 bg-[#0B1F16] text-white text-[10px] py-1 px-2 rounded-md transition-opacity whitespace-nowrap z-10 pointer-events-none shadow-lg">
                ${item.value} kg
            </div>
            <!-- Gradient Bar -->
            <div class="w-full max-w-[2.5rem] bg-gradient-to-t from-[#5B9A5F] to-[#B9E36D] rounded-t-md transition-all duration-700 ease-out hover:opacity-80" style="height: 0%;" data-height="${heightPercent}%"></div>
            `;
            
        container.appendChild(barWrapper);

        // Label Hari
        const label = document.createElement('div');
        label.className = 'w-full text-center truncate';
        label.textContent = item.date;
        labels.appendChild(label);
    });

    // Efek animasi tumbuh (grow animation)
    setTimeout(() => {
        container.querySelectorAll('[data-height]').forEach(bar => {
            bar.style.height = bar.getAttribute('data-height');
        });
    }, 100);
}

renderGrafikEmisi();

    // -----------------------------------------
    // Export & Reset Data (UI buttons wired)
    // -----------------------------------------
    const exportBtn = document.getElementById('export-data-btn');
    const resetBtn = document.getElementById('reset-data-btn');

    function exportAllData() {
        const payload = {
            last_emisi: localStorage.getItem('tg_last_emisi') || null,
            emisi_7days: get7DaySeries(),
            riwayat_emisi: getRiwayatEmisi(),
            misi_selesai: getMisiSelesai(),
            total_poin: getTotalPoin(),
            riwayat_aktivitas: getRiwayatAktivitas()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terragreenia-data-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function resetAllData() {
        if (!confirm('Reset semua data lokal? Tindakan ini tidak dapat dibatalkan.')) return;
        localStorage.removeItem('tg_last_emisi');
        localStorage.removeItem('tg_emisi_7days');
        localStorage.removeItem('tg_riwayat_emisi');
        localStorage.removeItem('tg_misi_selesai');
        localStorage.removeItem('tg_total_poin');
        localStorage.removeItem('tg_riwayat_aktivitas');
        // re-render views
        renderMisi();
        renderPoinDanBadge();
        renderAktivitas();
        renderGrafikEmisi();
        // hide result panel
        if (hasilEmisi) hasilEmisi.classList.add('hidden');
        alert('Data telah di-reset.');
    }

    if (exportBtn) on(exportBtn, 'click', exportAllData);
    if (resetBtn) on(resetBtn, 'click', resetAllData);

/* ---------------------------------------------------------------------
   6. RIWAYAT AKTIVITAS (ACTIVITY FEED)
   --------------------------------------------------------------------- */
function getRiwayatAktivitas() {
    const data = localStorage.getItem('tg_riwayat_aktivitas');
    return data ? JSON.parse(data) : [];
}

function logAktivitas(namaMisi, poin) {
    const riwayat = getRiwayatAktivitas();
    
    // Ambil tanggal dan jam saat ini
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const hari = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    // Tambahkan aktivitas baru ke urutan paling atas (unshift)
    riwayat.unshift({ 
        teks: `Menyelesaikan misi: ${namaMisi}`, 
        poin: poin, 
        waktu: `${hari} • ${waktu}` 
    });

    // Batasi memori maksimal simpan 10 aktivitas terakhir agar tidak berat
    if (riwayat.length > 10) riwayat.pop();

    localStorage.setItem('tg_riwayat_aktivitas', JSON.stringify(riwayat));
    renderAktivitas(); // Update tampilan
}

function renderAktivitas() {
    const feedContainer = document.getElementById('activity-feed');
    if (!feedContainer) return;

    const riwayat = getRiwayatAktivitas();
    feedContainer.innerHTML = '';

    if (riwayat.length === 0) {
        feedContainer.innerHTML = '<li class="text-sm text-[#9AA39C] text-center py-4">Belum ada aktivitas. Yuk selesaikan misi pertamamu!</li>';
        return;
    }

    riwayat.forEach(item => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-3 border-b border-black/5 pb-4 last:border-0 last:pb-0 animate-fade-in';
        
        li.innerHTML = `
            <div class="mt-0.5 w-8 h-8 rounded-full bg-[#E6F1E1] flex items-center justify-center text-[#3F7D4E] flex-shrink-0">
                <span aria-hidden="true" class="text-sm">✓</span>
            </div>
            <div class="flex-1">
                <p class="text-sm text-[#1B211D] font-medium leading-snug">${item.teks}</p>
                <p class="text-[10px] text-[#9AA39C] mt-1">${item.waktu}</p>
            </div>
            <div class="text-xs font-bold text-[#3F7D4E] whitespace-nowrap bg-[#E6F1E1] px-2 py-1 rounded-md">
                +${item.poin} poin
            </div>
        `;
        feedContainer.appendChild(li);
    });
}

renderAktivitas();
    
    // -----------------------------------------
    // Auto-reset daily missions at midnight
    // -----------------------------------------
    (function scheduleDailyReset() {
        try {
            const lastReset = localStorage.getItem('tg_last_misi_reset') || '';
            const today = new Date().toISOString().slice(0,10);
            if (lastReset !== today) {
                // clear misi selesai each day
                localStorage.removeItem('tg_misi_selesai');
                localStorage.setItem('tg_last_misi_reset', today);
                renderMisi();
            }

            // schedule next reset at next midnight
            const now = new Date();
            const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0,0,5);
            const ms = nextMidnight - now;
            setTimeout(() => {
                localStorage.removeItem('tg_misi_selesai');
                localStorage.setItem('tg_last_misi_reset', new Date().toISOString().slice(0,10));
                renderMisi();
                // re-schedule
                scheduleDailyReset();
            }, ms);
        } catch (err) {
            console.warn('Daily reset scheduling failed', err);
        }
    })();

    /* ---------------------------------------------------------------------
   LOGIKA SOFT NUDGE EMISI HARI INI
   --------------------------------------------------------------------- */
function updateEmisiNudgeUI() {
    const lastEmisi = localStorage.getItem('tg_last_emisi');
    const nudgeKosong = document.getElementById('nudge-emisi-kosong');
    const ringkasanTerisi = document.getElementById('ringkasan-emisi-terisi');
    const textAngka = document.getElementById('text-nudge-angka');

    if (lastEmisi !== null && lastEmisi !== '') {
        // Jika sudah ada data: Sembunyikan nudge, tampilkan angka emisi
        if (nudgeKosong) nudgeKosong.classList.add('hidden');
        if (ringkasanTerisi) ringkasanTerisi.classList.remove('hidden');
        if (textAngka) textAngka.textContent = lastEmisi;
    } else {
        // Jika belum ada data: Tampilkan soft nudge pengingat
        if (nudgeKosong) nudgeKosong.classList.remove('hidden');
        if (ringkasanTerisi) ringkasanTerisi.classList.add('hidden');
    }
}

// Panggil fungsi ini saat pertama kali halaman dibuka
document.addEventListener('DOMContentLoaded', updateEmisiNudgeUI);

});