// ===== app.js — 台灣手機市占排行工具 (全功能版) =====
(function () {
  'use strict';

  // ── DOM ──
  const $ = id => document.getElementById(id);
  const monthSelect = $('monthSelect');
  const btnExport = $('btnExport');
  const btnSource = $('btnSource');

  const tbodyAll = $('tbodyAll');
  const tbodyAndroid = $('tbodyAndroid');
  const brandBars = $('brandBars');
  const titleAll = $('titleAll');
  const titleAndroid = $('titleAndroid');
  const titleShare = $('titleShare');
  const titleDonut = $('titleDonut');
  const latestMonth = $('latestMonth');
  const searchInput = $('searchInput');
  const themeToggle = $('themeToggle');
  const btnExpandAll = $('btnExpandAll');
  const btnExpandAndroid = $('btnExpandAndroid');
  const modelModal = $('modelModal');
  const modalClose = $('modalClose');
  const modalTitle = $('modalTitle');
  const modalBody = $('modalBody');

  // ── State ──
  let expandedAll = false;
  let expandedAndroid = false;
  let searchTerm = '';
  let trendChart = null;
  let donutChart = null;

  // ── Brand config ──
  const BRAND_META = {
    'apple':    { color: '#3b82f6', label: 'A', css: 'apple' },
    'samsung':  { color: '#8b5cf6', label: 'S', css: 'samsung' },
    'oppo':     { color: '#10b981', label: 'O', css: 'oppo' },
    'vivo':     { color: '#f59e0b', label: 'v', css: 'vivo' },
    '紅米':     { color: '#ef4444', label: 'R', css: 'redmi' },
    'google':   { color: '#22c55e', label: 'G', css: 'google' },
    '小米':     { color: '#fb923c', label: 'Mi', css: 'xiaomi' },
    'realme':   { color: '#facc15', label: 're', css: 'realme' },
    'poco':     { color: '#eab308', label: 'P', css: 'poco' },
    'sharp':    { color: '#dc2626', label: 'SH', css: 'sharp' },
    'motorola': { color: '#5c92fa', label: 'M', css: 'motorola' },
  };

  function getBrandMeta(brand) {
    return BRAND_META[brand.toLowerCase()] || { color: '#64748b', label: brand.charAt(0), css: 'other' };
  }

  // ── Sorted data helper ──
  function sortedAsc() { return [...MARKET_DATA].sort((a, b) => a.month.localeCompare(b.month)); }
  function sortedDesc() { return [...MARKET_DATA].sort((a, b) => b.month.localeCompare(a.month)); }

  // ── Populate month selector ──
  function populateMonthSelect(sel) {
    const sorted = sortedDesc();
    monthSelect.innerHTML = '';
    sorted.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = d.month;
      opt.textContent = d.month.replace('/', '年') + '月';
      if (sel ? d.month === sel : i === 0) opt.selected = true;
      monthSelect.appendChild(opt);
    });
    if (sorted.length) latestMonth.textContent = sorted[0].month.replace('/', '年') + '月';
  }

  // ── Get previous month data ──
  function getPrev(month) {
    const asc = sortedAsc();
    const idx = asc.findIndex(d => d.month === month);
    return idx > 0 ? asc[idx - 1] : null;
  }

  // ── Stats cards ──
  function updateStats(month) {
    const data = MARKET_DATA.find(d => d.month === month);
    if (!data) return;

    // Brand count
    const brands = new Set(data.salesTop20.map(i => i.brand));
    $('statBrands').textContent = brands.size;

    // Streak
    const desc = sortedDesc();
    const topBrand = data.brandShare?.[0]?.brand || '—';
    let streak = 0;
    for (const d of desc) {
      if (d.brandShare?.[0]?.brand === topBrand) streak++; else break;
    }
    $('statStreak').textContent = `${topBrand} ${streak}月`;

    // Gainer / Loser
    let gainer = { brand: '—', v: -Infinity };
    let loser = { brand: '—', v: Infinity };
    (data.brandShare || []).forEach(b => {
      const v = parseFloat((b.change || '').replace('%', ''));
      if (isNaN(v)) return;
      if (v > gainer.v) gainer = { brand: b.brand, v };
      if (v < loser.v) loser = { brand: b.brand, v };
    });
    $('statGainer').textContent = gainer.v > -Infinity ? `${gainer.brand} ${gainer.v > 0 ? '+' : ''}${gainer.v}%` : '—';
    $('statLoser').textContent = loser.v < Infinity ? `${loser.brand} ${loser.v > 0 ? '+' : ''}${loser.v}%` : '—';
  }

  // ── Trend chart (Chart.js) ──
  function renderTrendChart() {
    const asc = sortedAsc();
    const labels = asc.map(d => d.month);
    const latest = asc[asc.length - 1];
    const topBrands = (latest.brandShare || []).sort((a, b) => b.share - a.share).slice(0, 5).map(b => b.brand);

    const datasets = topBrands.map(brand => {
      const meta = getBrandMeta(brand);
      return {
        label: brand,
        data: asc.map(d => { const f = (d.brandShare || []).find(b => b.brand === brand); return f ? f.share : null; }),
        borderColor: meta.color,
        backgroundColor: meta.color + '18',
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: false,
        spanGaps: true,
      };
    });

    const ctx = $('trendChart').getContext('2d');
    if (trendChart) trendChart.destroy();

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    trendChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: isDark ? '#94a3b8' : '#475569', padding: 14, usePointStyle: true, pointStyle: 'circle', font: { size: 11.5 } },
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.96)',
            titleColor: isDark ? '#f0f4ff' : '#1e293b',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1, padding: 12,
            callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y}%` },
          },
        },
        scales: {
          x: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 45 } },
          y: { grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b', callback: v => v + '%', font: { size: 11 } }, beginAtZero: true },
        },
      },
    });
  }

  // ── Donut chart ──
  function renderDonutChart(month) {
    const data = MARKET_DATA.find(d => d.month === month);
    if (!data?.brandShare) return;
    const shares = data.brandShare;
    const labels = shares.map(s => s.brand);
    const values = shares.map(s => s.share);
    const rest = Math.max(0, 100 - values.reduce((a, b) => a + b, 0));
    if (rest > 0.5) { labels.push('其他'); values.push(Math.round(rest * 10) / 10); }
    const colors = labels.map(b => b === '其他' ? '#475569' : getBrandMeta(b).color);

    const ctx = $('donutChart').getContext('2d');
    if (donutChart) donutChart.destroy();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 2, hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '58%',
        plugins: {
          legend: { position: 'bottom', labels: { color: isDark ? '#94a3b8' : '#475569', padding: 14, usePointStyle: true, pointStyle: 'circle', font: { size: 11.5 } } },
          tooltip: {
            backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.96)',
            titleColor: isDark ? '#f0f4ff' : '#1e293b',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1, padding: 12,
            callbacks: { label: c => `${c.label}: ${c.parsed}%` },
          },
        },
      },
    });
  }

  // ── Render main ──
  function render(month) {
    const data = MARKET_DATA.find(d => d.month === month);
    if (!data) return;
    const prev = getPrev(month);
    const [y, m] = month.split('/');
    const ml = `${y}/${m}`;

    // Source link
    btnSource.href = data.sourceUrl || 'https://www.jyes.com.tw/news.php?act=list&cid=22';

    // Titles
    titleAll.textContent = `${ml} 銷售排行 Top ${expandedAll ? 20 : 10}`;
    titleShare.textContent = `${ml} 品牌市占率`;
    titleDonut.textContent = `${ml} 品牌市占分布`;

    // Filter
    let items = data.salesTop20;
    if (searchTerm) {
      items = items.filter(i => i.model.toLowerCase().includes(searchTerm) || i.brand.toLowerCase().includes(searchTerm));
    }

    // All Top 10/20
    renderTable(tbodyAll, items.slice(0, expandedAll ? 20 : 10), prev, false);

    // Android
    const androidAll = items.filter(i => i.brand.toLowerCase() !== 'apple');
    const androidShow = expandedAndroid ? androidAll : androidAll.slice(0, 10);
    renderTable(tbodyAndroid, androidShow.map((it, i) => ({ ...it, _dispRank: i + 1 })), prev, true);
    titleAndroid.textContent = `${ml} Android 排行 Top ${expandedAndroid ? androidAll.length : Math.min(10, androidAll.length)}`;

    // Brand bars
    renderBrandBars(data.brandShare || []);

    // Charts
    renderDonutChart(month);
    updateStats(month);

    // Expand buttons
    btnExpandAll.textContent = expandedAll ? '▲ 收合為 Top 10' : '▼ 展開完整 Top 20';
    btnExpandAndroid.textContent = expandedAndroid ? '▲ 收合為 Top 10' : '▼ 展開完整排行';
  }

  // ── Table rows ──
  function renderTable(tbody, items, prev, isAndroid) {
    tbody.innerHTML = '';
    items.forEach((item, i) => {
      const tr = document.createElement('tr');
      const rank = item._dispRank || item.rank;
      let rowCls = '', rankCls = 'rank-other';
      if (rank === 1) { rowCls = 'row-gold'; rankCls = 'rank-1'; }
      else if (rank === 2) { rowCls = 'row-silver'; rankCls = 'rank-2'; }
      else if (rank === 3) { rowCls = 'row-bronze'; rankCls = 'rank-3'; }
      tr.className = rowCls;

      // Rank change
      let changeHtml = '<span class="rank-same">—</span>';
      if (prev) {
        const prevList = isAndroid
          ? prev.salesTop20.filter(x => x.brand.toLowerCase() !== 'apple')
          : prev.salesTop20;
        const prevItem = prevList.find(x => x.model === item.model && x.brand === item.brand);
        if (!prevItem) {
          changeHtml = '<span class="rank-new">NEW</span>';
        } else {
          const prevRank = isAndroid
            ? prevList.indexOf(prevItem) + 1
            : prevItem.rank;
          const diff = prevRank - rank;
          if (diff > 0) changeHtml = `<span class="rank-up">▲${diff}</span>`;
          else if (diff < 0) changeHtml = `<span class="rank-down">▼${Math.abs(diff)}</span>`;
          else changeHtml = '<span class="rank-same">━</span>';
        }
      }

      const meta = getBrandMeta(item.brand);
      tr.innerHTML = `
        <td><div class="rank-cell ${rankCls}"><span class="rank-medal">${rank}</span></div></td>
        <td class="change-cell">${changeHtml}</td>
        <td class="brand-cell"><span class="brand-logo ${meta.css}">${meta.label}</span>${item.brand}</td>
        <td class="model-cell" data-brand="${item.brand}" data-model="${item.model}">${item.model}</td>
      `;
      tbody.appendChild(tr);

      // Entrance animation
      tr.style.opacity = '0'; tr.style.transform = 'translateX(-10px)';
      requestAnimationFrame(() => {
        tr.style.transition = `opacity 0.3s ${i * 0.03}s, transform 0.3s ${i * 0.03}s`;
        tr.style.opacity = '1'; tr.style.transform = 'translateX(0)';
      });
    });
  }

  // ── Brand share bars ──
  function renderBrandBars(shares) {
    brandBars.innerHTML = '';
    const maxShare = Math.max(...shares.map(s => s.share), 1);
    shares.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'brand-bar-item';
      const rankCls = item.rank <= 3 ? `r${item.rank}` : 'rn';
      const brandKey = item.brand.toLowerCase();
      let fillCls = 'other';
      if (brandKey === 'apple') fillCls = 'apple';
      else if (brandKey === 'samsung') fillCls = 'samsung';
      else if (brandKey === 'oppo') fillCls = 'oppo';
      else if (brandKey === 'vivo') fillCls = 'vivo';

      const changeVal = item.change || '';
      let changeCls = 'change-flat';
      if (changeVal.startsWith('+') && changeVal !== '+0%') changeCls = 'change-up';
      else if (changeVal.startsWith('-')) changeCls = 'change-down';

      div.innerHTML = `
        <div class="brand-bar-rank ${rankCls}">${item.rank}</div>
        <div class="brand-bar-name">${item.brand}</div>
        <div class="brand-bar-track"><div class="brand-bar-fill ${fillCls}" style="width:0%"></div></div>
        <div class="brand-bar-value">${item.share}%</div>
        <div class="brand-bar-change ${changeCls}">${changeVal || '—'}</div>
      `;
      brandBars.appendChild(div);
      const fill = div.querySelector('.brand-bar-fill');
      requestAnimationFrame(() => { setTimeout(() => { fill.style.width = (item.share / maxShare * 100) + '%'; }, i * 60); });
    });
  }

  // ── Model history modal ──
  function showModelHistory(brand, model) {
    modalTitle.textContent = `${brand} ${model}`;
    const asc = sortedAsc();
    let html = '';
    asc.forEach(d => {
      const found = d.salesTop20.find(i => i.brand === brand && i.model === model);
      const mLabel = d.month.replace('/', '年') + '月';
      if (found) {
        const cls = found.rank <= 3 ? 'top3' : 'normal';
        html += `<div class="history-row"><span class="history-month">${mLabel}</span><span class="history-rank ${cls}">#${found.rank}</span></div>`;
      } else {
        html += `<div class="history-row"><span class="history-month">${mLabel}</span><span class="history-rank absent">未上榜</span></div>`;
      }
    });
    modalBody.innerHTML = html;
    modelModal.style.display = 'flex';
  }

  // ── Toast ──
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }



  // ── Theme toggle ──
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('tw-phone-theme', theme);
    // Re-render charts with new colors
    renderTrendChart();
    if (monthSelect.value) renderDonutChart(monthSelect.value);
  }
  themeToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  // ── Search ──
  let searchDebounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchTerm = searchInput.value.trim().toLowerCase();
      render(monthSelect.value);
    }, 200);
  });

  // ── Expand toggles ──
  btnExpandAll.addEventListener('click', () => { expandedAll = !expandedAll; render(monthSelect.value); });
  btnExpandAndroid.addEventListener('click', () => { expandedAndroid = !expandedAndroid; render(monthSelect.value); });

  // ── Modal events ──
  document.addEventListener('click', e => {
    const cell = e.target.closest('.model-cell');
    if (cell) showModelHistory(cell.dataset.brand, cell.dataset.model);
  });
  modalClose.addEventListener('click', () => { modelModal.style.display = 'none'; });
  modelModal.addEventListener('click', e => { if (e.target === modelModal) modelModal.style.display = 'none'; });

  // ── Excel export (multi-sheet) ──
  btnExport.addEventListener('click', () => {
    const month = monthSelect.value;
    const data = MARKET_DATA.find(d => d.month === month);
    if (!data) return;
    const [y, m] = month.split('/');
    const mNum = parseInt(m, 10);
    const wb = XLSX.utils.book_new();

    // Sheet 1: Full Top 20
    const rows1 = [['#', '品牌', '型號']];
    data.salesTop20.forEach(i => rows1.push([i.rank, i.brand, i.model]));
    const ws1 = XLSX.utils.aoa_to_sheet(rows1);
    ws1['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, ws1, `${mNum}月 Top 20`);

    // Sheet 2: Android Top
    const android = data.salesTop20.filter(i => i.brand.toLowerCase() !== 'apple');
    const rows2 = [['#', '品牌', '型號']];
    android.forEach((i, idx) => rows2.push([idx + 1, i.brand, i.model]));
    const ws2 = XLSX.utils.aoa_to_sheet(rows2);
    ws2['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 36 }];
    XLSX.utils.book_append_sheet(wb, ws2, `${mNum}月 Android`);

    // Sheet 3: Brand Share
    const rows3 = [['排名', '品牌', '市佔率(%)', '變動']];
    (data.brandShare || []).forEach(b => rows3.push([b.rank, b.brand, b.share, b.change || '']));
    const ws3 = XLSX.utils.aoa_to_sheet(rows3);
    ws3['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, `${mNum}月 品牌市占`);

    // Sheet 4: Trend
    const asc = sortedAsc();
    const allBrands = new Set();
    asc.forEach(d => (d.brandShare || []).forEach(b => allBrands.add(b.brand)));
    const brandArr = [...allBrands];
    const rows4 = [['月份', ...brandArr]];
    asc.forEach(d => {
      const row = [d.month];
      brandArr.forEach(br => {
        const f = (d.brandShare || []).find(b => b.brand === br);
        row.push(f ? f.share : '');
      });
      rows4.push(row);
    });
    const ws4 = XLSX.utils.aoa_to_sheet(rows4);
    ws4['!cols'] = [{ wch: 10 }, ...brandArr.map(() => ({ wch: 10 }))];
    XLSX.utils.book_append_sheet(wb, ws4, '市占趨勢');

    XLSX.writeFile(wb, `手機市占_${y}_${m}.xlsx`);
    toast('Excel 已匯出！');
  });

  // ── Month change ──
  monthSelect.addEventListener('change', () => render(monthSelect.value));

  // ── Init ──
  const savedTheme = localStorage.getItem('tw-phone-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

  populateMonthSelect();
  const desc = sortedDesc();
  if (desc.length) {
    render(desc[0].month);
    renderTrendChart();
  }

  // ── PWA Service Worker ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

})();
