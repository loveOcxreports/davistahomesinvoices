(function () {
  'use strict';
  const L = DavistaLib;
  const LS = { inv: 'davista_invoices_v1', clients: 'davista_clients_v1', terms: 'davista_terms_v1', addr: 'davista_addr_v1' };

  function readLS(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function writeLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const state = { view: 'edit', f: null, saved: [], clients: [], search: '', toast: '' };
  const refs = {};
  let toastTimer = null;

  const root = document.getElementById('app');

  function flash(msg) {
    state.toast = msg;
    renderToast();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { state.toast = ''; renderToast(); }, 2200);
  }

  function newInvoice() {
    const terms = readLS(LS.terms, null);
    const addr = readLS(LS.addr, null);
    state.f = L.blankInvoice(L.pad10(L.nextInvoiceNo(state.saved)), {
      terms: terms || undefined, companyAddr: addr || undefined
    });
    state.view = 'edit';
    renderAll();
  }

  function saveInvoice() {
    const f = state.f;
    if (!f.clientName.trim()) { flash('Add a guest name first'); return; }
    const rec = Object.assign({}, f, { total: L.grandTotal(f), savedAt: new Date().toISOString() });
    const saved = state.saved.slice();
    const at = saved.findIndex(s => s.id === rec.id);
    if (at >= 0) saved[at] = rec; else saved.unshift(rec);
    const clients = state.clients.slice();
    const key = f.clientName.trim().toLowerCase();
    const ci = clients.findIndex(c => c.name.trim().toLowerCase() === key);
    const client = { name: f.clientName, phone: f.clientPhone, email: f.clientEmail };
    if (ci >= 0) clients[ci] = client; else clients.unshift(client);
    writeLS(LS.inv, saved); writeLS(LS.clients, clients); writeLS(LS.addr, f.companyAddr);
    state.saved = saved; state.clients = clients; state.f = rec;
    flash('Invoice saved');
    renderAll();
  }

  function openInvoice(rec) {
    state.f = Object.assign({}, rec);
    state.view = 'edit';
    renderAll();
  }

  function duplicateInvoice(rec) {
    state.f = Object.assign({}, rec, {
      id: 'inv_' + Date.now(), invoiceNo: L.pad10(L.nextInvoiceNo(state.saved)), savedAt: null
    });
    state.view = 'edit';
    renderAll();
  }

  function deleteInvoice(id) {
    state.saved = state.saved.filter(x => x.id !== id);
    writeLS(LS.inv, state.saved);
    flash('Invoice deleted');
    renderAll();
  }

  function useClient(c) {
    state.f.clientName = c.name; state.f.clientPhone = c.phone; state.f.clientEmail = c.email;
    state.view = 'edit';
    renderAll();
  }

  function removeClient(c) {
    state.clients = state.clients.filter(x => x !== c);
    writeLS(LS.clients, state.clients);
    renderAll();
  }

  function exportPdf() {
    state.view = 'edit';
    renderAll();
    setTimeout(() => window.print(), 60);
  }

  // ---------- rendering ----------

  function renderAll() {
    root.innerHTML = '';
    root.appendChild(buildTopbar());
    root.appendChild(buildTabbar());
    const content = document.createElement('div');
    content.id = 'content';
    root.appendChild(content);
    if (state.view === 'edit') content.appendChild(buildEditView());
    else if (state.view === 'saved') content.appendChild(buildSavedView());
    else if (state.view === 'clients') content.appendChild(buildClientsView());
    root.appendChild(buildToastEl());
    tickClock();
  }

  function buildTopbar() {
    const bar = document.createElement('div');
    bar.className = 'topbar noprint';
    bar.innerHTML =
      '<div class="brand">' +
        '<div class="logo-chip">DH</div>' +
        '<div class="brand-meta">' +
          '<div class="brand-eyebrow">DAVISTA HOMES &middot; ABUJA &amp; LAGOS</div>' +
          '<div class="brand-title">Invoice Desk</div>' +
        '</div>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<div class="clock" id="clock"></div>' +
        '<button class="btn gold" id="btnExport">Export PDF &rarr;</button>' +
      '</div>';
    bar.querySelector('#btnExport').addEventListener('click', exportPdf);
    return bar;
  }

  function buildTabbar() {
    const bar = document.createElement('div');
    bar.className = 'tabbar noprint';
    const tab = (key, label) => {
      const b = document.createElement('button');
      b.className = 'btn tab' + (state.view === key ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => { state.view = key; renderAll(); });
      return b;
    };
    bar.appendChild(tab('edit', 'Invoice'));
    bar.appendChild(tab('saved', 'Saved · ' + state.saved.length));
    bar.appendChild(tab('clients', 'Guests · ' + state.clients.length));
    const spacer = document.createElement('div'); spacer.className = 'spacer';
    bar.appendChild(spacer);
    const btnNew = document.createElement('button'); btnNew.className = 'btn'; btnNew.textContent = 'New invoice';
    btnNew.addEventListener('click', newInvoice);
    const btnSave = document.createElement('button'); btnSave.className = 'btn'; btnSave.textContent = 'Save';
    btnSave.addEventListener('click', saveInvoice);
    bar.appendChild(btnNew); bar.appendChild(btnSave);
    return bar;
  }

  function buildToastEl() {
    const t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast' + (state.toast ? '' : ' hidden');
    t.textContent = state.toast || '';
    return t;
  }
  function renderToast() {
    const old = document.getElementById('toast');
    if (old) old.replaceWith(buildToastEl());
  }

  function tickClock() {
    const s = new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour12: false, hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('clock');
    if (el) el.textContent = s + ' WAT';
  }

  // ---------- Edit view ----------

  function buildEditView() {
    const layout = document.createElement('div');
    layout.className = 'layout';

    const editorCol = document.createElement('div');
    editorCol.className = 'editor-col noprint';
    editorCol.appendChild(buildGuestCard());
    editorCol.appendChild(buildDatesCard());
    editorCol.appendChild(buildLinesCard());
    editorCol.appendChild(buildTermsCard());
    layout.appendChild(editorCol);

    layout.appendChild(buildSheet());
    return layout;
  }

  function fieldEl(labelText, inputAttrs, value, onInput, spanFull) {
    const wrap = document.createElement('div');
    wrap.className = 'field' + (spanFull ? ' span-2' : '');
    const label = document.createElement('label'); label.textContent = labelText;
    const input = document.createElement('input');
    Object.keys(inputAttrs || {}).forEach(k => input.setAttribute(k, inputAttrs[k]));
    input.value = value == null ? '' : value;
    input.addEventListener('input', () => onInput(input.value));
    wrap.appendChild(label); wrap.appendChild(input);
    return { wrap, input };
  }

  function cardShell(title, dotColor) {
    const card = document.createElement('div'); card.className = 'card';
    const head = document.createElement('div'); head.className = 'card-head';
    const dot = document.createElement('span'); dot.className = 'dot';
    dot.style.background = dotColor; dot.style.boxShadow = '0 0 8px ' + dotColor;
    const t = document.createElement('span'); t.className = 'card-title'; t.textContent = title;
    head.appendChild(dot); head.appendChild(t);
    card.appendChild(head);
    const body = document.createElement('div'); body.className = 'card-body';
    card.appendChild(body);
    return { card, head, body };
  }

  function buildGuestCard() {
    const { card, body } = cardShell('Invoice & guest', '#8C2F39');
    const grid = document.createElement('div'); grid.className = 'field-grid';
    const f = state.f;

    grid.appendChild(fieldEl('INVOICE NUMBER', {}, f.invoiceNo, v => {
      f.invoiceNo = v; setText(refs.sheetInvoiceNo, v);
    }).wrap);

    const addrField = fieldEl('PROPERTY ADDRESS', { placeholder: L.DEFAULT_ADDR }, f.companyAddr, v => {
      f.companyAddr = v; setText(refs.sheetCompanyAddr, v);
    }, true);
    grid.appendChild(addrField.wrap);

    grid.appendChild(fieldEl('BILLED TO', { placeholder: 'Guest name' }, f.clientName, v => {
      f.clientName = v; setText(refs.sheetClientName, v);
    }).wrap);

    grid.appendChild(fieldEl('PHONE', { placeholder: '08030408640' }, f.clientPhone, v => {
      f.clientPhone = v; setText(refs.sheetClientPhone, v);
    }).wrap);

    grid.appendChild(fieldEl('EMAIL', { placeholder: 'guest@email.com' }, f.clientEmail, v => {
      f.clientEmail = v; setText(refs.sheetClientEmail, v);
    }).wrap);

    body.appendChild(grid);
    return card;
  }

  function buildDatesCard() {
    const { card, head, body } = cardShell('Stay dates', '#1D4ED8');
    const readout = document.createElement('span'); readout.className = 'card-readout';
    head.appendChild(readout);
    refs.nightsReadout = readout;

    const grid = document.createElement('div'); grid.className = 'field-grid dates';
    const f = state.f;

    grid.appendChild(fieldEl('CHECK-IN DATE', { type: 'date' }, f.checkIn, v => {
      f.checkIn = v; refreshDatesAndTotals();
    }).wrap);
    grid.appendChild(fieldEl('CHECK-OUT DATE', { type: 'date' }, f.checkOut, v => {
      f.checkOut = v; refreshDatesAndTotals();
    }).wrap);
    grid.appendChild(fieldEl('CHECK-IN TIME', { placeholder: '2pm' }, f.inTime, v => {
      f.inTime = v; refreshDatesAndTotals();
    }).wrap);
    grid.appendChild(fieldEl('CHECK-OUT TIME', { placeholder: '12noon' }, f.outTime, v => {
      f.outTime = v; refreshDatesAndTotals();
    }).wrap);

    body.appendChild(grid);
    updateNightsReadout();
    return card;
  }

  function updateNightsReadout() {
    const f = state.f;
    const n = L.nightsBetween(f.checkIn, f.checkOut);
    refs.nightsReadout.textContent = n ? (n + (n === 1 ? ' night' : ' nights')) : '—';
    return n;
  }

  function refreshDatesAndTotals() {
    updateNightsReadout();
    setText(refs.sheetStayLine, L.stayLine(state.f));
  }

  function buildLinesCard() {
    const { card, head, body } = cardShell('Line items', '#16A34A');
    const readout = document.createElement('span'); readout.className = 'card-readout big';
    head.appendChild(readout);
    refs.lineItemsReadout = readout;

    const linesWrap = document.createElement('div'); linesWrap.className = 'lines';
    refs.linesWrap = linesWrap;
    rebuildLineRows();
    body.appendChild(linesWrap);

    const addBtn = document.createElement('button'); addBtn.className = 'add-line'; addBtn.textContent = '+ Add line';
    addBtn.addEventListener('click', () => {
      const autoNights = L.nightsBetween(state.f.checkIn, state.f.checkOut);
      state.f.lines.push({ desc: '', unit: 1, nights: autoNights || 1, price: 0 });
      rebuildLineRows();
      rebuildSheetTable();
      refreshTotals();
    });
    body.appendChild(addBtn);

    refreshTotals();
    return card;
  }

  refs.lineRefs = [];

  function rebuildLineRows() {
    refs.linesWrap.innerHTML = '';
    refs.lineRefs = [];
    state.f.lines.forEach((l, i) => {
      const row = document.createElement('div'); row.className = 'line-row';
      const descField = fieldEl('DESCRIPTION', { placeholder: 'Payment for 3 Bedroom Apartment' }, l.desc, v => {
        l.desc = v; setText(refs.lineRefs[i].descCell, v);
      }, true);
      row.appendChild(descField.wrap);

      const grid = document.createElement('div'); grid.className = 'field-grid';
      const unitField = fieldEl('UNIT', { type: 'number' }, l.unit, v => {
        l.unit = v; onLineChanged(i);
      });
      const nightsField = fieldEl('NIGHTS', { type: 'number' }, l.nights, v => {
        l.nights = v; onLineChanged(i);
      });
      const priceField = fieldEl('UNIT PRICE', { type: 'number' }, l.price, v => {
        l.price = v; onLineChanged(i);
      });
      grid.appendChild(unitField.wrap); grid.appendChild(nightsField.wrap); grid.appendChild(priceField.wrap);

      const foot = document.createElement('div'); foot.className = 'line-foot';
      const footLabel = document.createElement('div'); footLabel.className = 'line-foot-label'; footLabel.textContent = 'Line total';
      const footTotal = document.createElement('div'); footTotal.className = 'line-foot-total';
      footTotal.textContent = L.money(L.lineTotal(l));
      const spacer = document.createElement('div'); spacer.className = 'spacer';
      const useDatesBtn = document.createElement('button'); useDatesBtn.className = 'btn ghost sm'; useDatesBtn.textContent = 'Use dates';
      useDatesBtn.addEventListener('click', () => {
        const autoNights = L.nightsBetween(state.f.checkIn, state.f.checkOut);
        if (autoNights) {
          l.nights = autoNights;
          nightsField.input.value = autoNights;
          onLineChanged(i);
        } else flash('Set both dates first');
      });
      const removeBtn = document.createElement('button'); removeBtn.className = 'btn danger sm'; removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => {
        state.f.lines.splice(i, 1);
        rebuildLineRows();
        rebuildSheetTable();
        refreshTotals();
      });
      foot.appendChild(footLabel); foot.appendChild(footTotal); foot.appendChild(spacer);
      foot.appendChild(useDatesBtn); foot.appendChild(removeBtn);
      grid.appendChild(foot);
      row.appendChild(grid);
      refs.linesWrap.appendChild(row);

      refs.lineRefs.push({ footTotal: footTotal, descCell: null, unitCell: null, durationCell: null, priceCell: null, totalCell: null });
    });
  }

  function onLineChanged(i) {
    const l = state.f.lines[i];
    const lr = refs.lineRefs[i];
    lr.footTotal.textContent = L.money(L.lineTotal(l));
    if (lr.unitCell) lr.unitCell.textContent = l.unit;
    if (lr.durationCell) lr.durationCell.textContent = L.durationLabel(l);
    if (lr.priceCell) lr.priceCell.textContent = L.money(l.price);
    if (lr.totalCell) lr.totalCell.textContent = L.money(L.lineTotal(l));
    refreshTotals();
  }

  function refreshTotals() {
    const total = L.grandTotal(state.f);
    refs.lineItemsReadout.textContent = L.money(total);
    setText(refs.sheetTotalsValue, L.money(total));
    setText(refs.sheetTotalsWords, L.words(total));
  }

  function buildTermsCard() {
    const { card, body } = cardShell('Terms & payment', '#6D28D9');
    const f = state.f;

    const label = document.createElement('label');
    label.style.cssText = 'font:700 10px var(--font-sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px';
    label.textContent = 'TERMS AND CONDITIONS — one per line';
    body.appendChild(label);

    const ta = document.createElement('textarea'); ta.className = 'terms-input'; ta.rows = 9; ta.value = f.terms;
    ta.addEventListener('input', () => { f.terms = ta.value; rebuildSheetTerms(); });
    body.appendChild(ta);

    const actions = document.createElement('div'); actions.className = 'terms-actions';
    const saveDefault = document.createElement('button'); saveDefault.className = 'btn sm'; saveDefault.textContent = 'Save as my default';
    saveDefault.addEventListener('click', () => { writeLS(LS.terms, f.terms); flash('Saved as your default terms'); });
    const reset = document.createElement('button'); reset.className = 'btn ghost sm'; reset.textContent = 'Reset to default';
    reset.addEventListener('click', () => {
      f.terms = readLS(LS.terms, L.DEFAULT_TERMS) || L.DEFAULT_TERMS;
      ta.value = f.terms;
      rebuildSheetTerms();
    });
    actions.appendChild(saveDefault); actions.appendChild(reset);
    body.appendChild(actions);

    const grid = document.createElement('div'); grid.className = 'field-grid'; grid.style.marginTop = '12px';
    grid.appendChild(fieldEl('PAYMENT LINE', {}, f.payment, v => { f.payment = v; setText(refs.sheetPayment, v); }, true).wrap);
    grid.appendChild(fieldEl('SIGNED BY', {}, f.signName, v => { f.signName = v; setText(refs.sheetSignName, v); }).wrap);
    grid.appendChild(fieldEl('SIGNATORY LINE', {}, f.signRole, v => { f.signRole = v; setText(refs.sheetSignRole, v); }).wrap);
    body.appendChild(grid);

    return card;
  }

  // ---------- Sheet (preview / print document) ----------

  function buildSheet() {
    const scroll = document.createElement('div'); scroll.className = 'sheet-scroll';
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    const f = state.f;

    sheet.innerHTML =
      '<div class="sheet-head">' +
        '<div>' +
          '<div class="sheet-title">INVOICE</div>' +
          '<div class="sheet-eyebrow">INVOICE NUMBER</div>' +
          '<div class="sheet-invno" id="sheetInvoiceNo"></div>' +
        '</div>' +
        '<div class="sheet-company">' +
          '<div class="sheet-company-name">DAVISTA HOMES</div>' +
          '<div class="sheet-company-addr" id="sheetCompanyAddr"></div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-rule"></div>' +
      '<div class="sheet-billed-eyebrow">BILLED TO</div>' +
      '<div class="sheet-client-name" id="sheetClientName"></div>' +
      '<div class="sheet-client-phone" id="sheetClientPhone"></div>' +
      '<div class="sheet-client-email" id="sheetClientEmail"></div>' +
      '<div class="sheet-table">' +
        '<div class="sheet-table-head">' +
          '<div>DESCRIPTION</div><div class="c">UNIT</div><div class="c">DURATION</div><div class="r">UNIT PRICE (N)</div>' +
        '</div>' +
        '<div id="sheetTableBody"></div>' +
      '</div>' +
      '<div class="sheet-stayline" id="sheetStayLine"></div>' +
      '<div class="sheet-totals-wrap">' +
        '<div class="sheet-totals">' +
          '<div class="sheet-totals-row">' +
            '<span class="sheet-totals-label">Total;</span>' +
            '<span class="sheet-totals-value" id="sheetTotalsValue"></span>' +
          '</div>' +
          '<div class="sheet-totals-words" id="sheetTotalsWords"></div>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-terms" id="sheetTermsWrap">' +
        '<div class="sheet-terms-heading">Terms and Conditions;</div>' +
        '<ul class="sheet-terms-list" id="sheetTermsList"></ul>' +
      '</div>' +
      '<div class="sheet-payment" id="sheetPayment"></div>' +
      '<div class="sheet-sign">' +
        '<div class="sheet-sign-name" id="sheetSignName"></div>' +
        '<div class="sheet-sign-role" id="sheetSignRole"></div>' +
      '</div>';

    scroll.appendChild(sheet);

    refs.sheetInvoiceNo = sheet.querySelector('#sheetInvoiceNo');
    refs.sheetCompanyAddr = sheet.querySelector('#sheetCompanyAddr');
    refs.sheetClientName = sheet.querySelector('#sheetClientName');
    refs.sheetClientPhone = sheet.querySelector('#sheetClientPhone');
    refs.sheetClientEmail = sheet.querySelector('#sheetClientEmail');
    refs.sheetTableBody = sheet.querySelector('#sheetTableBody');
    refs.sheetStayLine = sheet.querySelector('#sheetStayLine');
    refs.sheetTotalsValue = sheet.querySelector('#sheetTotalsValue');
    refs.sheetTotalsWords = sheet.querySelector('#sheetTotalsWords');
    refs.sheetTermsWrap = sheet.querySelector('#sheetTermsWrap');
    refs.sheetTermsList = sheet.querySelector('#sheetTermsList');
    refs.sheetPayment = sheet.querySelector('#sheetPayment');
    refs.sheetSignName = sheet.querySelector('#sheetSignName');
    refs.sheetSignRole = sheet.querySelector('#sheetSignRole');

    setText(refs.sheetInvoiceNo, f.invoiceNo);
    setText(refs.sheetCompanyAddr, f.companyAddr);
    setText(refs.sheetClientName, f.clientName);
    setText(refs.sheetClientPhone, f.clientPhone);
    setText(refs.sheetClientEmail, f.clientEmail);
    setText(refs.sheetStayLine, L.stayLine(f));
    setText(refs.sheetTotalsValue, L.money(L.grandTotal(f)));
    setText(refs.sheetTotalsWords, L.words(L.grandTotal(f)));
    setText(refs.sheetPayment, f.payment);
    setText(refs.sheetSignName, f.signName);
    setText(refs.sheetSignRole, f.signRole);

    rebuildSheetTable();
    rebuildSheetTerms();

    return scroll;
  }

  function rebuildSheetTable() {
    refs.sheetTableBody.innerHTML = '';
    state.f.lines.forEach((l, i) => {
      const row = document.createElement('div'); row.className = 'sheet-row';
      const descCell = document.createElement('div'); descCell.textContent = l.desc;
      const unitCell = document.createElement('div'); unitCell.className = 'c'; unitCell.textContent = l.unit;
      const durationCell = document.createElement('div'); durationCell.className = 'c'; durationCell.textContent = L.durationLabel(l);
      const priceCell = document.createElement('div'); priceCell.className = 'r'; priceCell.textContent = L.money(l.price);
      row.appendChild(descCell); row.appendChild(unitCell); row.appendChild(durationCell); row.appendChild(priceCell);
      refs.sheetTableBody.appendChild(row);

      const ltRow = document.createElement('div'); ltRow.className = 'sheet-linetotal';
      const ltLabel = document.createElement('div'); ltLabel.className = 'label'; ltLabel.textContent = 'Line total';
      const ltValue = document.createElement('div'); ltValue.className = 'value'; ltValue.textContent = L.money(L.lineTotal(l));
      ltRow.appendChild(ltLabel); ltRow.appendChild(ltValue);
      refs.sheetTableBody.appendChild(ltRow);

      if (refs.lineRefs[i]) {
        refs.lineRefs[i].descCell = descCell;
        refs.lineRefs[i].unitCell = unitCell;
        refs.lineRefs[i].durationCell = durationCell;
        refs.lineRefs[i].priceCell = priceCell;
        refs.lineRefs[i].totalCell = ltValue;
      }
    });
  }

  function rebuildSheetTerms() {
    const list = L.termsList(state.f);
    refs.sheetTermsWrap.style.display = list.length ? '' : 'none';
    refs.sheetTermsList.innerHTML = '';
    list.forEach(t => {
      const li = document.createElement('li'); li.textContent = t;
      refs.sheetTermsList.appendChild(li);
    });
  }

  function setText(el, text) { if (el) el.textContent = text == null ? '' : text; }

  // ---------- Saved view ----------

  function buildSavedView() {
    const wrap = document.createElement('div'); wrap.className = 'list-page noprint';

    const search = document.createElement('input');
    search.className = 'field-grid search-field';
    search.style.cssText = 'height:44px;width:100%;max-width:340px;border:1px solid var(--border-soft);border-radius:9px;background:var(--surface-tint);padding:0 12px;font-size:15px;color:var(--text);outline:none';
    search.placeholder = 'Search guest or number';
    search.value = state.search;
    search.addEventListener('input', () => { state.search = search.value; renderSavedRows(rowsWrap); });
    wrap.appendChild(search);

    const rowsWrap = document.createElement('div'); rowsWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px';
    wrap.appendChild(rowsWrap);
    renderSavedRows(rowsWrap);
    return wrap;
  }

  function renderSavedRows(rowsWrap) {
    rowsWrap.innerHTML = '';
    const q = state.search.trim().toLowerCase();
    const rows = state.saved.filter(s =>
      !q || s.clientName.toLowerCase().includes(q) || s.invoiceNo.toLowerCase().includes(q)
    );
    if (!rows.length) {
      const empty = document.createElement('div'); empty.className = 'empty-state';
      empty.textContent = state.saved.length ? 'No matches.' : 'No saved invoices yet. Fill the invoice and press Save.';
      rowsWrap.appendChild(empty);
      return;
    }
    rows.forEach(s => {
      const row = document.createElement('div'); row.className = 'saved-row';
      row.innerHTML =
        '<div class="saved-invno">' + esc(s.invoiceNo) + '</div>' +
        '<div class="saved-mid">' +
          '<div class="saved-name">' + esc(s.clientName) + '</div>' +
          '<div class="saved-date">' + esc(s.checkIn ? L.longDate(s.checkIn) : 'no dates') + '</div>' +
        '</div>' +
        '<div class="saved-total">' + esc(L.money(s.total)) + '</div>';
      const actions = document.createElement('div'); actions.className = 'saved-actions';
      const openBtn = document.createElement('button'); openBtn.className = 'btn sm'; openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => openInvoice(s));
      const dupBtn = document.createElement('button'); dupBtn.className = 'btn sm'; dupBtn.textContent = 'Duplicate';
      dupBtn.addEventListener('click', () => duplicateInvoice(s));
      const delBtn = document.createElement('button'); delBtn.className = 'btn danger sm'; delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteInvoice(s.id));
      actions.appendChild(openBtn); actions.appendChild(dupBtn); actions.appendChild(delBtn);
      row.appendChild(actions);
      rowsWrap.appendChild(row);
    });
  }

  // ---------- Clients view ----------

  function buildClientsView() {
    const wrap = document.createElement('div'); wrap.className = 'clients-grid noprint';
    if (!state.clients.length) {
      const empty = document.createElement('div'); empty.className = 'empty-state';
      empty.textContent = 'Guests are added to this book each time you save an invoice.';
      wrap.appendChild(empty);
      return wrap;
    }
    state.clients.forEach(c => {
      const card = document.createElement('div'); card.className = 'client-card';
      card.innerHTML =
        '<div class="client-name">' + esc(c.name) + '</div>' +
        '<div class="client-phone">' + esc(c.phone) + '</div>' +
        '<div class="client-email">' + esc(c.email) + '</div>';
      const actions = document.createElement('div'); actions.className = 'client-actions';
      const useBtn = document.createElement('button'); useBtn.className = 'btn sm'; useBtn.textContent = 'Use on invoice';
      useBtn.addEventListener('click', () => useClient(c));
      const rmBtn = document.createElement('button'); rmBtn.className = 'btn ghost sm'; rmBtn.textContent = 'Remove';
      rmBtn.addEventListener('click', () => removeClient(c));
      actions.appendChild(useBtn); actions.appendChild(rmBtn);
      card.appendChild(actions);
      wrap.appendChild(card);
    });
    return wrap;
  }

  // ---------- boot ----------

  function init() {
    const saved = readLS(LS.inv, []);
    const clients = readLS(LS.clients, []);
    const terms = readLS(LS.terms, null);
    const addr = readLS(LS.addr, null);
    state.saved = saved;
    state.clients = clients;
    state.f = L.blankInvoice(L.pad10(L.nextInvoiceNo(saved)), {
      terms: terms || undefined, companyAddr: addr || undefined
    });
    renderAll();
    setInterval(tickClock, 30000);
  }

  init();
})();
