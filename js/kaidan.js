/* ═══════════════════════════════════════════
   kaidan.js — 工人开单（发票）系统
   照搬 kf 的发票编辑器，保留工人 PIN 登录
   依赖：data.js、html2canvas、jspdf（CDN）
═══════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 配置：由后台 admin「设置」页填写，随 site-data.json 同步 ── */
  var SUPA_URL = '', SUPA_ANON = '';
  var CACHED = null;            // 网站数据（产品/价格/联系方式/Supabase 配置）

  /* ── 工具 ── */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt   = function (n) { return (+n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var money = function (n) { return 'RM ' + fmt(n); };
  var priceNum = function (s) { var m = String(s == null ? '' : s).replace(/[^0-9.]/g, ''); return parseFloat(m) || 0; };
  var todayISO = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var fmtDate  = function (d) { return d && d.indexOf('-') > -1 ? d.split('-').reverse().join('/') : (d || ''); };
  var configured = function () { return !!(SUPA_URL && SUPA_ANON); };

  function toast(msg) {
    var el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  /* 金额大写（RINGGIT） */
  function amountInWords(amount) {
    var ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
      'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    var tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    function toWords(n) {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' AND ' + toWords(n % 100) : '');
      if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
      return toWords(Math.floor(n / 1000000)) + ' MILLION' + (n % 1000000 ? ' ' + toWords(n % 1000000) : '');
    }
    var ringgit = Math.floor(Math.abs(amount)), sen = Math.round((Math.abs(amount) - ringgit) * 100);
    if (ringgit === 0 && sen === 0) return 'ZERO RINGGIT ONLY';
    var w = toWords(ringgit) + ' RINGGIT';
    if (sen > 0) w += ' AND ' + toWords(sen) + ' SEN';
    return w + ' ONLY';
  }

  /* ── Supabase RPC ── */
  function rpc(fn, params) {
    return fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
        if (!r.ok) throw new Error((data && data.message) || ('请求失败 ' + r.status));
        return data;
      });
    });
  }

  /* ── 登录态 ── */
  var SESSION = null;          // { name, pin, is_boss }
  function loadSession() { try { return JSON.parse(sessionStorage.getItem('fgh_kaidan')); } catch (e) { return null; } }

  /* ── 公司信息（用于发票抬头）── */
  function company() {
    var c = (CACHED && CACHED.contact) || {};
    return {
      name: '富贵花开 FUGUI HUA KAI',
      phone: c.display || '',
      wa: c.wa || '',
      person: c.name || ''
    };
  }

  /* ── 客户库 & 产品 ── */
  var CUSTOMERS = [];
  var PRODUCTS  = [];          // [{name, price(数字)}]

  /* ═══════════ 登录 ═══════════ */
  function doLogin() {
    var name = $('#in-name').value.trim(), pin = $('#in-pin').value.trim(), err = $('#login-err');
    err.textContent = '';
    if (!name || !pin) { err.textContent = '请输入名字和 PIN'; return; }
    if (!configured()) { err.textContent = '系统未配置 Supabase，请联系老板'; return; }
    var btn = $('#btn-login'); btn.disabled = true; btn.textContent = '登录中…';
    rpc('worker_login', { p_name: name, p_pin: pin }).then(function (rows) {
      if (rows && rows.length) {
        SESSION = { name: rows[0].name, pin: pin, is_boss: !!rows[0].is_boss };
        sessionStorage.setItem('fgh_kaidan', JSON.stringify(SESSION));
        enterApp();
      } else { err.textContent = '名字或 PIN 错误'; }
    }).catch(function (e) { err.textContent = e.message || '登录失败'; })
      .finally(function () { btn.disabled = false; btn.textContent = '登录'; });
  }
  function logout() { sessionStorage.removeItem('fgh_kaidan'); location.reload(); }

  /* ═══════════ 进入主界面 ═══════════ */
  var INVOICES = [];
  var editing = null, editingNew = false;

  function enterApp() {
    $('#login').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#who').textContent = SESSION.name + (SESSION.is_boss ? '（老板）' : '');
    PRODUCTS = ((CACHED && CACHED.products) || []).map(function (p) { return { name: p.name, price: priceNum(p.price) }; });
    Promise.all([loadInvoices(), loadCustomers()]).then(renderList).catch(renderList);
  }

  function loadInvoices() {
    return rpc('list_invoices', { p_name: SESSION.name, p_pin: SESSION.pin, p_limit: 300 })
      .then(function (rows) { INVOICES = rows || []; })
      .catch(function (e) { toast('载入发票失败：' + e.message); INVOICES = []; });
  }
  function loadCustomers() {
    return rpc('list_customers', { p_name: SESSION.name, p_pin: SESSION.pin })
      .then(function (rows) { CUSTOMERS = rows || []; })
      .catch(function () { CUSTOMERS = []; });
  }

  /* ── 行金额 / 数量显示 ── */
  function itemAmount(it) { if (it.isHeader) return 0; return (+it.qty || 1) * (+it.price || 0); }
  function qtyDisplay(it) { return it.qtyText || ((it.qty || 1) + ''); }
  function totals(inv) {
    var sub = (inv.items || []).reduce(function (s, it) { return s + itemAmount(it); }, 0);
    var total = Math.max(0, sub - (+inv.discount || 0));
    var paid = +inv.paid || 0, balance = total - paid;
    var status = paid <= 0 ? 'unpaid' : (paid >= total - 0.005 ? 'paid' : 'partial');
    return { sub: sub, total: total, paid: paid, balance: balance, status: status };
  }
  var STATUS = { unpaid: { zh: '未付', cls: 'st-unpaid' }, partial: { zh: '部分/订金', cls: 'st-partial' }, paid: { zh: '已付清', cls: 'st-paid' } };

  /* 把数据库行 → 编辑用发票对象 */
  function rowToInv(r) {
    return {
      id: r.id, number: r.number || '', date: r.inv_date || '', salesPerson: r.sales_person || '',
      custName: r.customer_name || '', custPhone: r.customer_phone || '', custAddress: r.customer_address || '',
      items: (r.items || []).map(function (it) { return Object.assign({}, it); }),
      discount: +r.discount || 0, paid: +r.paid || 0, notes: r.note || '', status: r.status || 'unpaid'
    };
  }
  function newInvoice() {
    return {
      id: null, number: '', date: todayISO(), salesPerson: SESSION.name,
      custName: '', custPhone: '', custAddress: '',
      items: [{ desc: '', subdesc: '', qtyText: '', qty: 1, price: '', isHeader: false }],
      discount: 0, paid: 0, notes: '', status: 'unpaid'
    };
  }

  /* ═══════════ 发票列表 ═══════════ */
  function renderList() {
    editing = null;
    var c = $('#content');
    var stat = '';
    if (SESSION.is_boss) {
      var today = todayISO(), tRev = 0, dRev = 0, dCnt = 0;
      INVOICES.forEach(function (r) {
        var tot = +r.total || 0; tRev += tot;
        if ((r.inv_date || (r.created_at || '').slice(0, 10)) === today) { dRev += tot; dCnt++; }
      });
      stat = '<div class="stats">'
        + '<div class="stat"><b>' + dCnt + '</b><small>今日单数</small></div>'
        + '<div class="stat"><b>' + fmt(dRev) + '</b><small>今日营业额</small></div>'
        + '<div class="stat"><b>' + INVOICES.length + '</b><small>总单数</small></div>'
        + '<div class="stat"><b>' + fmt(tRev) + '</b><small>总营业额</small></div>'
        + '</div>';
    }
    var rows = INVOICES.map(function (r) {
      var t = totals(rowToInv(r)), st = STATUS[t.status] || STATUS.unpaid;
      return '<div class="ord">'
        + '<div class="ord-top"><b>' + esc(r.number || ('#' + r.id)) + '</b>'
        +   '<span class="badge ' + st.cls + '">' + st.zh + '</span></div>'
        + '<div class="ord-meta">' + esc(fmtDate(r.inv_date)) + ' · ' + money(r.total)
        +   (r.customer_name ? ' · ' + esc(r.customer_name) : '')
        +   (SESSION.is_boss ? ' · ' + esc(r.worker_name) : '') + '</div>'
        + '<div class="ord-actions">'
        +   '<button data-edit="' + r.id + '">编辑</button>'
        +   '<button data-pdf="' + r.id + '">PDF</button>'
        +   '<button data-print="' + r.id + '">打印</button>'
        +   '<button data-wa="' + r.id + '">WhatsApp</button>'
        +   '<button class="danger" data-del="' + r.id + '">删除</button>'
        + '</div></div>';
    }).join('');

    c.innerHTML =
        '<div class="list-top">'
      +   '<button class="btn-primary" id="newInv"><i class="fas fa-plus"></i> 新建发票</button>'
      +   '<input id="invSearch" placeholder="搜索发票号 / 客户">'
      + '</div>'
      + stat
      + '<div id="invRows">' + (rows || '<p class="empty">暂无发票，点「新建发票」开始</p>') + '</div>';

    $('#newInv').addEventListener('click', function () { editing = newInvoice(); editingNew = true; beginNewNumber(); });
    $('#invSearch').addEventListener('input', function (e) { filterRows(e.target.value.trim().toLowerCase()); });
    bindRowActions();
  }

  function filterRows(q) {
    $$('#invRows .ord').forEach(function (el) {
      var txt = el.textContent.toLowerCase();
      el.style.display = !q || txt.indexOf(q) > -1 ? '' : 'none';
    });
  }
  function findRow(id) { return INVOICES.find(function (r) { return r.id == id; }); }
  function bindRowActions() {
    $$('#invRows [data-edit]').forEach(function (b) { b.addEventListener('click', function () { editing = rowToInv(findRow(b.dataset.edit)); editingNew = false; renderEditor(); }); });
    $$('#invRows [data-pdf]').forEach(function (b) { b.addEventListener('click', function () { exportPDF(rowToInv(findRow(b.dataset.pdf)), b); }); });
    $$('#invRows [data-print]').forEach(function (b) { b.addEventListener('click', function () { printDoc(invoiceInnerHTML(rowToInv(findRow(b.dataset.print)))); }); });
    $$('#invRows [data-wa]').forEach(function (b) { b.addEventListener('click', function () { sendWA(rowToInv(findRow(b.dataset.wa))); }); });
    $$('#invRows [data-del]').forEach(function (b) { b.addEventListener('click', function () { delInvoice(b.dataset.del); }); });
  }

  function beginNewNumber() {
    rpc('next_invoice_number', { p_name: SESSION.name, p_pin: SESSION.pin })
      .then(function (num) { editing.number = num || ('INV-' + Date.now()); })
      .catch(function () { editing.number = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4); })
      .finally(renderEditor);
  }

  function delInvoice(id) {
    if (!confirm('确定删除这张发票？')) return;
    rpc('delete_invoice', { p_name: SESSION.name, p_pin: SESSION.pin, p_id: +id }).then(function () {
      toast('已删除'); return loadInvoices();
    }).then(renderList).catch(function (e) { toast('删除失败：' + e.message); });
  }

  /* ═══════════ 发票编辑器 ═══════════ */
  function renderEditor() {
    var c = $('#content'), inv = editing, t = totals(inv);
    var custOptions = CUSTOMERS.map(function (cu) { return '<option value="' + cu.id + '">' + esc(cu.name) + (cu.phone ? ' (' + esc(cu.phone) + ')' : '') + '</option>'; }).join('');
    var prodChips = PRODUCTS.map(function (p, i) { return '<button type="button" class="chip" data-prod="' + i + '">+ ' + esc(p.name) + '</button>'; }).join('');
    var itemRows = (inv.items || []).map(function (it, i) { return itemRowHTML(it, i); }).join('');

    c.innerHTML =
        '<div class="inv-toolbar">'
      +   '<h2>' + (editingNew ? '新建发票' : '编辑发票') + '</h2>'
      +   '<div><button class="btn-ghost" id="cancelInv">← 返回</button>'
      +   '<button class="btn-primary" id="saveInv">💾 保存</button></div>'
      + '</div>'
      + '<div class="card"><div class="row2">'
      +   '<div class="field"><label>发票号</label><input id="f-number" value="' + esc(inv.number) + '"></div>'
      +   '<div class="field"><label>日期</label><input type="date" id="f-date" value="' + esc(inv.date) + '"></div>'
      + '</div>'
      +   '<div class="field"><label>销售员</label><input id="f-sales" value="' + esc(inv.salesPerson || '') + '"></div>'
      + '</div>'
      + '<div class="card"><h3>客户</h3>'
      +   '<div class="field"><label>选择已有客户</label><select id="f-custsel"><option value="">— 手动输入 —</option>' + custOptions + '</select></div>'
      +   '<div class="row2">'
      +     '<div class="field"><label>姓名</label><input id="f-cname" value="' + esc(inv.custName) + '"></div>'
      +     '<div class="field"><label>电话</label><input id="f-cphone" value="' + esc(inv.custPhone) + '"></div>'
      +   '</div>'
      +   '<div class="field"><label>地址</label><input id="f-caddr" value="' + esc(inv.custAddress) + '"></div>'
      +   '<button class="btn-ghost sm" id="saveCust">＋ 存入客户库</button>'
      + '</div>'
      + '<div class="card"><h3>项目</h3>'
      +   '<div class="chips">' + prodChips + '</div>'
      +   '<div id="itemRows">' + itemRows + '</div>'
      +   '<button class="add-btn" id="addItem">＋ 添加项目</button>'
      +   '<button class="add-btn" id="addHeader">＋ 标题/备注行</button>'
      + '</div>'
      + '<div class="card">'
      +   '<div class="row2">'
      +     '<div class="field"><label>折扣 (RM)</label><input type="number" id="f-disc" value="' + (inv.discount || 0) + '"></div>'
      +     '<div class="field"><label>已收款 (RM)</label><input type="number" id="f-paid" value="' + (inv.paid || 0) + '"></div>'
      +   '</div>'
      +   '<div class="field"><label>备注</label><textarea id="f-notes" rows="2">' + esc(inv.notes) + '</textarea></div>'
      +   '<div class="inv-totals" id="invTotals">' + totalsHTML(t) + '</div>'
      + '</div>';

    $('#cancelInv').addEventListener('click', renderList);
    $('#saveInv').addEventListener('click', saveInvoice);
    $('#f-number').addEventListener('input', function (e) { inv.number = e.target.value; });
    $('#f-date').addEventListener('input', function (e) { inv.date = e.target.value; });
    $('#f-sales').addEventListener('input', function (e) { inv.salesPerson = e.target.value; });
    $('#f-cname').addEventListener('input', function (e) { inv.custName = e.target.value; });
    $('#f-cphone').addEventListener('input', function (e) { inv.custPhone = e.target.value; });
    $('#f-caddr').addEventListener('input', function (e) { inv.custAddress = e.target.value; });
    $('#f-custsel').addEventListener('change', function (e) {
      var cu = CUSTOMERS.find(function (x) { return x.id == e.target.value; });
      if (cu) { inv.custName = cu.name || ''; inv.custPhone = cu.phone || ''; inv.custAddress = cu.address || '';
        $('#f-cname').value = inv.custName; $('#f-cphone').value = inv.custPhone; $('#f-caddr').value = inv.custAddress; }
    });
    $('#saveCust').addEventListener('click', saveCustomer);
    $('#f-disc').addEventListener('input', function (e) { inv.discount = +e.target.value || 0; refreshTotals(); });
    $('#f-paid').addEventListener('input', function (e) { inv.paid = +e.target.value || 0; refreshTotals(); });
    $('#f-notes').addEventListener('input', function (e) { inv.notes = e.target.value; });
    $('#addItem').addEventListener('click', function () { inv.items.push({ desc: '', subdesc: '', qtyText: '', qty: 1, price: '', isHeader: false }); renderEditor(); });
    $('#addHeader').addEventListener('click', function () { inv.items.push({ desc: '', subdesc: '', isHeader: true }); renderEditor(); });
    $$('.chip[data-prod]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = PRODUCTS[+b.dataset.prod];
        inv.items.push({ desc: p.name, subdesc: '', qtyText: '', qty: 1, price: p.price, isHeader: false });
        renderEditor();
      });
    });
    wireItems();
  }

  function itemRowHTML(it, i) {
    var isH = !!it.isHeader;
    return '<div class="item-row" data-i="' + i + '">'
      + '<div class="ir-top">'
      +   '<label class="ir-hdr"><input type="checkbox" data-f="isHeader" ' + (isH ? 'checked' : '') + '> 标题行</label>'
      +   '<input class="ir-desc" data-f="desc" placeholder="' + (isH ? '标题 / 备注文字' : '产品 / 描述') + '" value="' + esc(it.desc) + '">'
      +   '<button class="ir-del" data-del="' + i + '">×</button>'
      + '</div>'
      + (!isH ? '<div class="ir-bot">'
      +   '<input data-f="qtyText" placeholder="数量文字 如 2 瓶" value="' + esc(it.qtyText || '') + '" class="w-qt">'
      +   '<input type="number" data-f="qty" value="' + (it.qty || 1) + '" placeholder="数量" class="w-qty">'
      +   '<input type="number" data-f="price" value="' + (it.price || '') + '" placeholder="单价" class="w-pr">'
      +   '<span class="ir-amt">' + money(itemAmount(it)) + '</span>'
      + '</div>' : '')
      + '</div>';
  }

  function wireItems() {
    var inv = editing;
    $$('#itemRows .item-row').forEach(function (row) {
      var i = +row.dataset.i;
      $$('[data-f]', row).forEach(function (inp) {
        inp.addEventListener('input', function () {
          var f = inp.dataset.f;
          if (f === 'isHeader') { inv.items[i][f] = inp.checked; renderEditor(); return; }
          inv.items[i][f] = inp.value;
          var amtEl = row.querySelector('.ir-amt'); if (amtEl) amtEl.textContent = money(itemAmount(inv.items[i]));
          refreshTotals();
        });
      });
      var del = row.querySelector('[data-del]');
      if (del) del.addEventListener('click', function () {
        inv.items.splice(i, 1);
        if (!inv.items.length) inv.items.push({ desc: '', subdesc: '', qtyText: '', qty: 1, price: '', isHeader: false });
        renderEditor();
      });
    });
  }

  function totalsHTML(t) {
    var st = STATUS[t.status];
    return '<div class="tot-row"><span>小计</span><b>' + money(t.sub) + '</b></div>'
      + (t.sub !== t.total ? '<div class="tot-row"><span>折扣</span><b>- ' + money(t.sub - t.total) + '</b></div>' : '')
      + '<div class="tot-row big"><span>总额</span><b>' + money(t.total) + '</b></div>'
      + '<div class="tot-row"><span>已收</span><b>' + money(t.paid) + '</b></div>'
      + '<div class="tot-row bal"><span>余额</span><b>' + money(t.balance) + '</b></div>'
      + '<div class="tot-st"><span class="badge ' + st.cls + '">' + st.zh + '</span></div>';
  }
  function refreshTotals() { var el = $('#invTotals'); if (el) el.innerHTML = totalsHTML(totals(editing)); }

  /* ── 存客户库 ── */
  function saveCustomer() {
    var inv = editing;
    if (!inv.custName) { toast('请先填客户姓名'); return; }
    rpc('save_customer', { p_name: SESSION.name, p_pin: SESSION.pin, p_id: null, p_cname: inv.custName, p_phone: inv.custPhone, p_address: inv.custAddress })
      .then(function () { toast('已存入客户库'); return loadCustomers(); })
      .catch(function (e) { toast('保存失败：' + e.message); });
  }

  /* ── 保存发票 ── */
  function saveInvoice() {
    var inv = editing;
    if (!inv.number) { toast('请填发票号'); return; }
    inv.items = (inv.items || []).filter(function (it) { return it.desc || itemAmount(it) > 0 || it.isHeader; });
    if (!inv.items.length) { toast('请至少添加一个项目'); return; }
    var t = totals(inv);
    var btn = $('#saveInv'); btn.disabled = true; btn.textContent = '保存中…';
    rpc('save_invoice', {
      p_name: SESSION.name, p_pin: SESSION.pin, p_id: inv.id,
      p_number: inv.number, p_inv_date: inv.date, p_sales: inv.salesPerson || '',
      p_cust_name: inv.custName, p_cust_phone: inv.custPhone, p_cust_address: inv.custAddress,
      p_items: inv.items, p_subtotal: +t.sub.toFixed(2), p_discount: +(inv.discount || 0).toFixed(2),
      p_paid: +(inv.paid || 0).toFixed(2), p_total: +t.total.toFixed(2),
      p_note: inv.notes, p_status: t.status
    }).then(function () { toast('✓ 已保存'); return loadInvoices(); })
      .then(renderList)
      .catch(function (e) { toast('保存失败：' + e.message); })
      .finally(function () { btn.disabled = false; btn.textContent = '💾 保存'; });
  }

  /* ═══════════ 发票文档（打印 / PDF / WhatsApp）═══════════ */
  function invoiceInnerHTML(inv) {
    var t = totals(inv), co = company();
    var itemNum = 0;
    var rows = (inv.items || []).map(function (it) {
      if (it.isHeader) return '<tr><td></td><td colspan="4" style="font-weight:700;padding-top:7px">' + esc(it.desc) + '</td></tr>';
      itemNum++;
      var amount = itemAmount(it), hasPrice = (+it.price > 0) || amount > 0;
      return '<tr>'
        + '<td style="text-align:center;vertical-align:top">' + itemNum + '</td>'
        + '<td>' + esc(it.desc) + (it.subdesc ? '<div class="subdesc">' + esc(it.subdesc) + '</div>' : '') + '</td>'
        + '<td style="text-align:center">' + (hasPrice ? esc(qtyDisplay(it)) : '') + '</td>'
        + '<td style="text-align:right">' + (hasPrice && +it.price ? fmt(+it.price) : '') + '</td>'
        + '<td style="text-align:right">' + (hasPrice && amount ? fmt(amount) : '') + '</td>'
        + '</tr>';
    }).join('');

    return '<div class="inv-doc">'
      + '<div class="hdr-line">'
      +   '<div><div class="co-name">' + esc(co.name) + '</div>'
      +     '<div class="co-info">电话 Tel: ' + esc(co.phone) + (co.wa ? '　|　WhatsApp: ' + esc(co.wa) : '') + '</div></div>'
      +   '<div style="font-size:34px">🌸</div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:12px">'
      +   '<div style="width:54%"><div style="font-weight:700;margin-bottom:6px">BILL TO #</div>'
      +     '<div style="font-size:14px;font-weight:700">' + esc(inv.custName) + '</div>'
      +     '<div style="font-size:12px;margin-top:3px;line-height:1.6">' + esc(inv.custAddress) + '</div>'
      +     '<div style="margin-top:6px">TEL : ' + esc(inv.custPhone) + '</div></div>'
      +   '<div style="width:42%"><table class="inv-meta-box" style="width:100%">'
      +     '<tr><td class="inv-meta-title" colspan="2">INVOICE 发票</td></tr>'
      +     '<tr><td style="width:45%">No. :</td><td><b>' + esc(inv.number) + '</b></td></tr>'
      +     '<tr><td>DATE</td><td>: ' + fmtDate(inv.date) + '</td></tr>'
      +     '<tr><td>SALES</td><td>: ' + esc(inv.salesPerson || '') + '</td></tr>'
      +   '</table></div>'
      + '</div>'
      + '<div class="inv-doc-grow"><table class="items"><thead><tr>'
      +   '<th style="width:6%;text-align:left">NO.</th><th style="text-align:left">DESCRIPTION 描述</th>'
      +   '<th style="width:12%;text-align:center">QTY</th><th style="width:14%;text-align:right">PRICE<br>RM</th>'
      +   '<th style="width:14%;text-align:right">AMOUNT<br>RM</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
      + '<div class="tot-section">'
      +   '<div class="amt-words"><b>RINGGIT M\'SIA</b>&nbsp; ' + amountInWords(t.total) + '</div>'
      +   '<table class="tot-table">'
      +     '<tr><td style="text-align:right">SUB TOTAL</td><td style="text-align:right">' + fmt(t.sub) + '</td></tr>'
      +     (+inv.discount ? '<tr><td style="text-align:right">DISCOUNT</td><td style="text-align:right">- ' + fmt(+inv.discount) + '</td></tr>' : '')
      +     '<tr class="grand"><td style="text-align:right">GRAND TOTAL</td><td style="text-align:right">' + fmt(t.total) + '</td></tr>'
      +     (t.paid > 0 ? '<tr><td style="text-align:right">PAID</td><td style="text-align:right">' + fmt(t.paid) + '</td></tr><tr><td style="text-align:right"><b>BALANCE</b></td><td style="text-align:right"><b>' + fmt(t.balance) + '</b></td></tr>' : '')
      +   '</table>'
      + '</div>'
      + (inv.notes ? '<div class="notes-sec"><b>备注 Note:</b><br>' + esc(inv.notes).replace(/\n/g, '<br>') + '</div>' : '')
      + '<div class="sig-row">'
      +   '<div class="sig-cell">Received By<br><br><br>(客户签名 SIGNATURE)</div>'
      +   '<div class="sig-cell right">' + esc(co.name) + '<br><br><b>' + esc(inv.salesPerson || co.person) + '</b><br>(AUTHORISED SIGNATURE)</div>'
      + '</div>'
      + '</div>';
  }

  function docStyle() {
    return '<style>'
      + '*{box-sizing:border-box;margin:0;padding:0}'
      + "body{font-family:Arial,'Microsoft YaHei',sans-serif;font-size:12px;color:#000;background:#fff}"
      + '.inv-doc{width:794px;min-height:1050px;padding:32px 40px;display:flex;flex-direction:column}'
      + '.inv-doc-grow{flex:1}'
      + '.co-name{font-size:21px;font-weight:900;letter-spacing:.5px;line-height:1.2}'
      + '.co-info{font-size:11px;line-height:1.7;margin-top:4px}'
      + '.hdr-line{border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start}'
      + '.inv-meta-box{border:1px solid #000;border-collapse:collapse;font-size:12px}'
      + '.inv-meta-box td{padding:4px 10px;border-bottom:1px solid #ccc;white-space:nowrap}'
      + '.inv-meta-box tr:last-child td{border-bottom:none}'
      + '.inv-meta-title{background:#000;color:#fff;text-align:center;font-size:15px;font-weight:900;letter-spacing:2px;padding:7px 20px}'
      + 'table.items{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}'
      + 'table.items th{border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:7px 4px;font-weight:700}'
      + 'table.items td{padding:5px 4px;vertical-align:top}'
      + 'table.items tbody{border-bottom:1.5px solid #000}'
      + '.subdesc{color:#444;font-size:11px;margin-top:2px}'
      + '.tot-section{display:flex;justify-content:space-between;margin-top:8px;padding-top:6px}'
      + '.amt-words{font-size:11px;flex:1;padding-right:20px;line-height:1.6}'
      + '.tot-table{width:260px;font-size:12px;border-collapse:collapse}'
      + '.tot-table td{padding:3px 6px}'
      + '.tot-table tr.grand td{border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-weight:700;padding:5px 6px}'
      + '.notes-sec{margin-top:14px;font-size:11px;line-height:1.8}'
      + '.sig-row{display:flex;justify-content:space-between;margin-top:40px;font-size:12px}'
      + '.sig-cell{width:44%;border-top:1px solid #000;padding-top:6px;line-height:1.9}'
      + '.sig-cell.right{text-align:center}'
      + '</style>';
  }

  function printDoc(innerHTML) {
    var w = window.open('', '_blank', 'width=920,height=1100');
    if (!w) { toast('请允许弹出窗口'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8">' + docStyle() + '</head><body>' + innerHTML + '</body></html>');
    w.document.close(); w.focus();
    setTimeout(function () { w.print(); }, 500);
  }

  function renderDocCanvas(innerHTML) {
    var holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-10000px;top:0;background:#fff';
    holder.innerHTML = docStyle() + innerHTML;
    document.body.appendChild(holder);
    var node = holder.querySelector('.inv-doc');
    return html2canvas(node, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false })
      .then(function (canvas) { document.body.removeChild(holder); return canvas; });
  }

  function exportPDF(inv, btn) {
    var old = btn ? btn.textContent : ''; if (btn) { btn.disabled = true; btn.textContent = '生成中…'; }
    renderDocCanvas(invoiceInnerHTML(inv)).then(function (canvas) {
      var img = canvas.toDataURL('image/jpeg', 0.95);
      var JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      var pdf = new JsPDF('p', 'mm', 'a4');
      var pw = 210, ph = 297, ih = canvas.height * pw / canvas.width;
      if (ih <= ph) { pdf.addImage(img, 'JPEG', 0, 0, pw, ih); }
      else { var pos = 0, rem = ih; while (rem > 0) { pdf.addImage(img, 'JPEG', 0, pos, pw, ih); rem -= ph; if (rem > 0) { pdf.addPage(); pos -= ph; } } }
      pdf.save((inv.number || 'invoice') + '.pdf');
    }).catch(function (e) { toast('PDF 失败：' + (e && e.message || e)); })
      .finally(function () { if (btn) { btn.disabled = false; btn.textContent = old; } });
  }

  function waPhone(p) { var d = String(p || '').replace(/[^0-9]/g, ''); if (!d) return ''; if (d.charAt(0) === '0') d = '60' + d.slice(1); return d; }
  function sendWA(inv) {
    var t = totals(inv), co = company();
    var lines = ['🌸 *' + co.name + '*', '发票 ' + inv.number + '　' + fmtDate(inv.date), ''];
    (inv.items || []).forEach(function (it) {
      if (it.isHeader) { lines.push('— ' + it.desc + ' —'); return; }
      lines.push(it.desc + '　' + qtyDisplay(it) + ' × ' + fmt(it.price) + ' = ' + money(itemAmount(it)));
    });
    lines.push('');
    lines.push('小计：' + money(t.sub));
    if (+inv.discount) lines.push('折扣：- ' + money(+inv.discount));
    lines.push('*总额：' + money(t.total) + '*');
    if (t.paid > 0) { lines.push('已收：' + money(t.paid)); lines.push('余额：' + money(t.balance)); }
    lines.push(''); lines.push('感谢惠顾！');
    window.open('https://wa.me/' + waPhone(inv.custPhone) + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
  }

  /* ═══════════ 初始化 ═══════════ */
  document.addEventListener('DOMContentLoaded', function () {
    $('#btn-login').addEventListener('click', doLogin);
    $('#in-pin').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    $('#btn-logout').addEventListener('click', logout);

    loadData(function (d) {
      CACHED = d;
      if (d.supabase) { SUPA_URL = d.supabase.url || ''; SUPA_ANON = d.supabase.anon || ''; }
      var s = loadSession();
      if (s && s.name) { SESSION = s; enterApp(); }
    });
  });
})();
