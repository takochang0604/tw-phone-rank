// ===== app.js — 台灣手機市占排行工具 =====

(function () {
  'use strict';

  const monthSelect = document.getElementById('monthSelect');
  const btnExport = document.getElementById('btnExport');
  const btnSource = document.getElementById('btnSource');
  const btnEditUrl = document.getElementById('btnEditUrl');
  const urlEditor = document.getElementById('urlEditor');
  const urlInput = document.getElementById('urlInput');
  const btnSaveUrl = document.getElementById('btnSaveUrl');
  const btnCancelUrl = document.getElementById('btnCancelUrl');
  const tbodyAll = document.getElementById('tbodyAll');
  const tbodyAndroid = document.getElementById('tbodyAndroid');
  const brandBars = document.getElementById('brandBars');
  const titleAll = document.getElementById('titleAll');
  const titleAndroid = document.getElementById('titleAndroid');
  const titleShare = document.getElementById('titleShare');
  const latestMonth = document.getElementById('latestMonth');

  // ── Populate month selector (newest first) ──
  const sortedData = [...MARKET_DATA].sort((a, b) => b.month.localeCompare(a.month));
  sortedData.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = d.month;
    opt.textContent = d.month.replace('/', '年') + '月';
    if (i === 0) opt.selected = true;
    monthSelect.appendChild(opt);
  });

  // Show latest month in footer
  if (sortedData.length > 0) {
    latestMonth.textContent = sortedData[0].month.replace('/', '年') + '月';
  }

  monthSelect.addEventListener('change', () => render(monthSelect.value));

  // ── Initial render ──
  if (sortedData.length > 0) render(sortedData[0].month);

  // ── URL Editor ──
  btnEditUrl.addEventListener('click', () => {
    urlInput.value = btnSource.href;
    urlEditor.style.display = 'flex';
    urlInput.focus();
    urlInput.select();
  });
  btnCancelUrl.addEventListener('click', () => { urlEditor.style.display = 'none'; });
  btnSaveUrl.addEventListener('click', () => {
    const newUrl = urlInput.value.trim();
    if (!newUrl) return;
    const month = monthSelect.value;
    const data = MARKET_DATA.find(d => d.month === month);
    if (data) {
      data.sourceUrl = newUrl;
      btnSource.href = newUrl;
      // 存到 localStorage，下次開頁面也生效
      const overrides = JSON.parse(localStorage.getItem('urlOverrides') || '{}');
      overrides[month] = newUrl;
      localStorage.setItem('urlOverrides', JSON.stringify(overrides));
    }
    urlEditor.style.display = 'none';
  });

  // ── Main render function ──
  function render(month) {
    const data = MARKET_DATA.find(d => d.month === month);
    if (!data) return;

    // Update source link (check localStorage override first)
    const overrides = JSON.parse(localStorage.getItem('urlOverrides') || '{}');
    const url = overrides[month] || data.sourceUrl || 'https://www.jyes.com.tw/news.php?act=list&cid=22';
    btnSource.href = url;

    // Titles
    const [y, m] = month.split('/');
    const monthLabel = `${y}/${m}`;
    titleAll.textContent = `${monthLabel} 銷售排行 Top 10`;
    titleAndroid.textContent = `${monthLabel} Android 排行 Top 10`;
    titleShare.textContent = `${monthLabel} 品牌市占率`;

    // All Top 10
    const top10 = data.salesTop20.slice(0, 10);
    renderTable(tbodyAll, top10);

    // Android Top 10
    const androidItems = data.salesTop20.filter(item =>
      item.brand.toLowerCase() !== 'apple'
    ).slice(0, 10).map((item, i) => ({ ...item, rank: i + 1 }));
    renderTable(tbodyAndroid, androidItems);

    // Brand share
    renderBrandBars(data.brandShare || []);
  }

  // ── Render table rows ──
  function renderTable(tbody, items) {
    tbody.innerHTML = '';
    items.forEach((item, i) => {
      const tr = document.createElement('tr');
      const displayRank = item.rank;
      let rowClass = '';
      let rankClass = 'rank-other';
      if (displayRank === 1) { rowClass = 'row-gold'; rankClass = 'rank-1'; }
      else if (displayRank === 2) { rowClass = 'row-silver'; rankClass = 'rank-2'; }
      else if (displayRank === 3) { rowClass = 'row-bronze'; rankClass = 'rank-3'; }
      tr.className = rowClass;

      tr.innerHTML = `
        <td>
          <div class="rank-cell ${rankClass}">
            <span class="rank-medal">${displayRank}</span>
          </div>
        </td>
        <td class="brand-cell">${item.brand}</td>
        <td class="model-cell">${item.model}</td>
      `;
      tbody.appendChild(tr);

      // Animate in
      tr.style.opacity = '0';
      tr.style.transform = 'translateX(-10px)';
      requestAnimationFrame(() => {
        tr.style.transition = `opacity 0.3s ${i * 0.04}s, transform 0.3s ${i * 0.04}s`;
        tr.style.opacity = '1';
        tr.style.transform = 'translateX(0)';
      });
    });
  }

  // ── Render brand share bar chart ──
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
      else if (brandKey === 'samsung' || brandKey === '三星') fillCls = 'samsung';
      else if (brandKey === 'oppo') fillCls = 'oppo';
      else if (brandKey === 'vivo') fillCls = 'vivo';

      const changeVal = item.change || '';
      let changeCls = 'change-flat';
      if (changeVal.startsWith('+') && changeVal !== '+0%') changeCls = 'change-up';
      else if (changeVal.startsWith('-')) changeCls = 'change-down';

      div.innerHTML = `
        <div class="brand-bar-rank ${rankCls}">${item.rank}</div>
        <div class="brand-bar-name">${item.brand}</div>
        <div class="brand-bar-track">
          <div class="brand-bar-fill ${fillCls}" style="width: 0%"></div>
        </div>
        <div class="brand-bar-value">${item.share}%</div>
        <div class="brand-bar-change ${changeCls}">${changeVal || '—'}</div>
      `;
      brandBars.appendChild(div);

      // Animate bar
      const fill = div.querySelector('.brand-bar-fill');
      requestAnimationFrame(() => {
        setTimeout(() => {
          fill.style.width = (item.share / maxShare * 100) + '%';
        }, i * 60);
      });
    });
  }

  // ── Excel Export ──
  btnExport.addEventListener('click', () => {
    const month = monthSelect.value;
    const data = MARKET_DATA.find(d => d.month === month);
    if (!data) return;

    const [y, m] = month.split('/');
    const monthNum = parseInt(m, 10);

    // All Top 10
    const allTop10 = data.salesTop20.slice(0, 10);
    // Android Top 10
    const androidTop10 = data.salesTop20
      .filter(item => item.brand.toLowerCase() !== 'apple')
      .slice(0, 10);

    // Build worksheet data
    const rows = [];
    rows.push(['#', `${y}/${m} 銷售`, '', '#', `${monthNum}月Android銷售排行`]);

    const maxRows = Math.max(allTop10.length, androidTop10.length);
    for (let i = 0; i < maxRows; i++) {
      const allItem = allTop10[i];
      const andItem = androidTop10[i];
      rows.push([
        allItem ? (i + 1) : '',
        allItem ? `${allItem.brand} ${allItem.model}` : '',
        '',
        andItem ? (i + 1) : '',
        andItem ? `${andItem.brand} ${andItem.model}` : ''
      ]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 4 }, { wch: 36 }, { wch: 3 }, { wch: 4 }, { wch: 36 }];

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: { top: { style: "thin", color: { rgb: "4472C4" } }, bottom: { style: "thin", color: { rgb: "4472C4" } }, left: { style: "thin", color: { rgb: "4472C4" } }, right: { style: "thin", color: { rgb: "4472C4" } } }
    };
    const goldStyle = { fill: { fgColor: { rgb: "FFF2CC" } }, border: { top: { style: "thin", color: { rgb: "D6DCE4" } }, bottom: { style: "thin", color: { rgb: "D6DCE4" } }, left: { style: "thin", color: { rgb: "D6DCE4" } }, right: { style: "thin", color: { rgb: "D6DCE4" } } } };
    const silverStyle = { fill: { fgColor: { rgb: "D9E2F3" } }, border: { top: { style: "thin", color: { rgb: "D6DCE4" } }, bottom: { style: "thin", color: { rgb: "D6DCE4" } }, left: { style: "thin", color: { rgb: "D6DCE4" } }, right: { style: "thin", color: { rgb: "D6DCE4" } } } };
    const bronzeStyle = { fill: { fgColor: { rgb: "FCE4D6" } }, border: { top: { style: "thin", color: { rgb: "D6DCE4" } }, bottom: { style: "thin", color: { rgb: "D6DCE4" } }, left: { style: "thin", color: { rgb: "D6DCE4" } }, right: { style: "thin", color: { rgb: "D6DCE4" } } } };
    const normalStyle = { border: { top: { style: "thin", color: { rgb: "D6DCE4" } }, bottom: { style: "thin", color: { rgb: "D6DCE4" } }, left: { style: "thin", color: { rgb: "D6DCE4" } }, right: { style: "thin", color: { rgb: "D6DCE4" } } } };

    ['A', 'B', 'D', 'E'].forEach(col => { const cell = ws[`${col}1`]; if (cell) cell.s = headerStyle; });
    for (let i = 0; i < maxRows; i++) {
      const rowNum = i + 2;
      let style = normalStyle;
      if (i === 0) style = goldStyle;
      else if (i === 1) style = silverStyle;
      else if (i === 2) style = bronzeStyle;
      ['A', 'B', 'D', 'E'].forEach(col => { const cell = ws[`${col}${rowNum}`]; if (cell) cell.s = style; });
    }

    XLSX.utils.book_append_sheet(wb, ws, `${monthNum}月排行`);
    XLSX.writeFile(wb, `手機市占_${y}_${m}.xlsx`);
  });

})();
