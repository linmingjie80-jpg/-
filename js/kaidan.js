/* ═══════════════════════════════════════════
   kaidan.js — 工人开单逻辑
   依赖：data.js（产品/价格来源）、html2canvas（收据图）
═══════════════════════════════════════════ */

/* Supabase 配置：由老板在后台 admin「设置」页填写，随网站数据同步过来。
   （anon key 是公开 key，放前端安全，真正的保护在数据库 RPC 里。） */
var SUPA_URL  = '';
var SUPA_ANON = '';
var CACHED_DATA = null;        // 启动时加载的网站数据（含产品/价格/配置）

/* ── 工具 ── */
function $(id){ return document.getElementById(id); }
function money(n){ return 'RM ' + (Number(n) || 0).toFixed(2); }
function priceNum(s){ var m = String(s == null ? '' : s).replace(/[^0-9.]/g, ''); return parseFloat(m) || 0; }
function configured(){ return !!(SUPA_URL && SUPA_ANON); }

function toast(msg){
  var el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function(){ el.classList.remove('show'); }, 2200);
}

/* ── Supabase RPC 调用 ── */
function rpc(fn, params){
  return fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      'apikey':        SUPA_ANON,
      'Authorization': 'Bearer ' + SUPA_ANON,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify(params)
  }).then(function(r){
    return r.text().then(function(txt){
      var data; try { data = txt ? JSON.parse(txt) : null; } catch(e){ data = txt; }
      if(!r.ok){ throw new Error((data && data.message) || ('请求失败 ' + r.status)); }
      return data;
    });
  });
}

/* ── 登录态 ── */
var SESSION = null;          // { name, pin, is_boss }
function loadSession(){ try { return JSON.parse(sessionStorage.getItem('fgh_kaidan')); } catch(e){ return null; } }
function saveSession(s){ sessionStorage.setItem('fgh_kaidan', JSON.stringify(s)); }
function clearSession(){ sessionStorage.removeItem('fgh_kaidan'); }

/* ── 开单状态 ── */
var PRODUCTS = [];           // [{ name, unit(数字单价), emoji }]
var QTY = [];                // 与 PRODUCTS 同长度的数量数组

/* ═══════════ 登录 ═══════════ */
function doLogin(){
  var name = $('in-name').value.trim();
  var pin  = $('in-pin').value.trim();
  var err  = $('login-err');
  err.textContent = '';
  if(!name || !pin){ err.textContent = '请输入名字和 PIN'; return; }
  if(!configured()){ err.textContent = '系统未配置 Supabase，请联系老板'; return; }

  var btn = $('btn-login'); btn.disabled = true; btn.textContent = '登录中…';
  rpc('worker_login', { p_name: name, p_pin: pin }).then(function(rows){
    if(rows && rows.length){
      SESSION = { name: rows[0].name, pin: pin, is_boss: !!rows[0].is_boss };
      saveSession(SESSION);
      enterApp();
    } else {
      err.textContent = '名字或 PIN 错误';
    }
  }).catch(function(e){
    err.textContent = e.message || '登录失败，请检查网络';
  }).finally(function(){
    btn.disabled = false; btn.textContent = '登录';
  });
}

function logout(){ clearSession(); SESSION = null; location.reload(); }

/* ═══════════ 进入主界面 ═══════════ */
function enterApp(){
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('who').textContent = SESSION.name + (SESSION.is_boss ? '（老板）' : '');

  if(SESSION.is_boss){
    $('view-boss').classList.remove('hidden');
    loadOrders();
  } else {
    $('view-order').classList.remove('hidden');
    $('actionbar').classList.remove('hidden');
    initOrderForm();
  }
}

/* ═══════════ 工人：开单表单 ═══════════ */
function initOrderForm(){
  /* 产品来自网站数据（老板改价后这里自动跟着变） */
  var d = CACHED_DATA || getData();
  PRODUCTS = (d.products || []).map(function(p){
    return { name: p.name, unit: priceNum(p.price), emoji: /^https?:/i.test(p.img) ? '🌸' : (p.img || '🌸') };
  });
  QTY = PRODUCTS.map(function(){ return 0; });
  renderProducts();
  recalc();

  ['a-disc','a-ship'].forEach(function(id){ $(id).addEventListener('input', recalc); });
  $('btn-submit').addEventListener('click', submitOrder);
}

function renderProducts(){
  $('prod-list').innerHTML = PRODUCTS.map(function(p, i){
    return '<div class="prod-row" id="prow-' + i + '">'
      + '<div class="prod-emoji">' + esc(p.emoji) + '</div>'
      + '<div class="prod-info"><div class="nm">' + esc(p.name) + '</div>'
      +   '<div class="pr">' + money(p.unit) + '</div></div>'
      + '<div class="qty">'
      +   '<button type="button" onclick="bump(' + i + ',-1)">−</button>'
      +   '<input id="q-' + i + '" type="number" inputmode="numeric" min="0" value="0" onchange="setQty(' + i + ',this.value)">'
      +   '<button type="button" onclick="bump(' + i + ',1)">+</button>'
      + '</div></div>';
  }).join('');
}

function bump(i, delta){ setQty(i, (QTY[i] || 0) + delta); }
function setQty(i, val){
  var n = Math.max(0, Math.floor(Number(val) || 0));
  QTY[i] = n;
  $('q-' + i).value = n;
  $('prow-' + i).classList.toggle('on', n > 0);
  recalc();
}

function calcTotals(){
  var sub = 0;
  PRODUCTS.forEach(function(p, i){ sub += p.unit * (QTY[i] || 0); });
  var disc = Math.max(0, Number($('a-disc').value) || 0);
  var ship = Math.max(0, Number($('a-ship').value) || 0);
  var total = Math.max(0, sub - disc + ship);
  return { sub: sub, disc: disc, ship: ship, total: total };
}

function recalc(){
  var t = calcTotals();
  $('a-sub').textContent   = money(t.sub);
  $('a-total').textContent = money(t.total);
  $('bar-total').textContent = money(t.total);
}

function currentItems(){
  var items = [];
  PRODUCTS.forEach(function(p, i){
    if(QTY[i] > 0) items.push({ name: p.name, price: p.unit, qty: QTY[i], subtotal: +(p.unit * QTY[i]).toFixed(2) });
  });
  return items;
}

/* ═══════════ 提交订单 ═══════════ */
function submitOrder(){
  var items = currentItems();
  if(!items.length){ toast('请先选择产品和数量'); return; }
  var t = calcTotals();
  var btn = $('btn-submit'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中';

  rpc('create_order', {
    p_name: SESSION.name, p_pin: SESSION.pin,
    p_customer_name:    $('c-name').value.trim(),
    p_customer_phone:   $('c-phone').value.trim(),
    p_customer_address: $('c-addr').value.trim(),
    p_items: items,
    p_subtotal: +t.sub.toFixed(2), p_discount: +t.disc.toFixed(2),
    p_shipping: +t.ship.toFixed(2), p_total: +t.total.toFixed(2),
    p_note: $('a-note').value.trim()
  }).then(function(id){
    showReceipt(id, items, t);
    resetForm();
    toast('✓ 开单成功 #' + id);
  }).catch(function(e){
    toast('提交失败：' + (e.message || '请重试'));
  }).finally(function(){
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> 确认开单';
  });
}

function resetForm(){
  QTY = PRODUCTS.map(function(){ return 0; });
  renderProducts();
  ['c-name','c-phone','c-addr','a-note'].forEach(function(id){ $(id).value = ''; });
  $('a-disc').value = 0; $('a-ship').value = 0;
  recalc();
}

/* ═══════════ 收据 ═══════════ */
var LAST_RECEIPT = null;     // 用于发 WhatsApp

function showReceipt(id, items, t){
  var cust = {
    name:  $('c-name').value.trim(),
    phone: $('c-phone').value.trim(),
    addr:  $('c-addr').value.trim()
  };
  var dt = new Date().toLocaleString('zh-CN', { hour12: false });

  var itemsHtml = items.map(function(it){
    return '<div class="it"><span>' + esc(it.name) + ' <small>×' + it.qty + '</small></span>'
      + '<span>' + money(it.subtotal) + '</span></div>';
  }).join('');

  var custHtml = (cust.name || cust.phone || cust.addr)
    ? '<div class="cust">' + [
        cust.name  ? '客户：' + esc(cust.name)  : '',
        cust.phone ? '电话：' + esc(cust.phone) : '',
        cust.addr  ? '地址：' + esc(cust.addr)  : ''
      ].filter(Boolean).join('<br>') + '</div>'
    : '';

  $('receipt').innerHTML =
    '<h2>🌸 <em>富贵花开</em></h2>'
    + '<div class="meta">订单 #' + id + ' · ' + esc(dt) + '<br>开单：' + esc(SESSION.name) + '</div>'
    + itemsHtml
    + '<div class="sum">'
    +   '<div><span>小计</span><span>' + money(t.sub) + '</span></div>'
    +   (t.disc ? '<div><span>折扣</span><span>- ' + money(t.disc) + '</span></div>' : '')
    +   (t.ship ? '<div><span>运费</span><span>+ ' + money(t.ship) + '</span></div>' : '')
    +   '<div class="tt"><span>应收</span><span>' + money(t.total) + '</span></div>'
    + '</div>'
    + custHtml
    + '<div class="thanks">感谢惠顾 · 富贵花开</div>';

  /* WhatsApp 文字版 */
  var lines = ['🌸 *富贵花开* 订单 #' + id, ''];
  items.forEach(function(it){ lines.push(it.name + ' ×' + it.qty + '  ' + money(it.subtotal)); });
  lines.push('');
  lines.push('小计：' + money(t.sub));
  if(t.disc) lines.push('折扣：- ' + money(t.disc));
  if(t.ship) lines.push('运费：+ ' + money(t.ship));
  lines.push('*应收：' + money(t.total) + '*');
  if(cust.name || cust.addr) lines.push('');
  if(cust.name) lines.push('客户：' + cust.name);
  if(cust.addr) lines.push('地址：' + cust.addr);
  lines.push('');
  lines.push('感谢惠顾！');
  LAST_RECEIPT = { text: lines.join('\n'), phone: cust.phone, id: id };

  $('modal').classList.remove('hidden');
}

function waPhone(p){
  var d = String(p || '').replace(/[^0-9]/g, '');
  if(!d) return '';
  if(d.charAt(0) === '0') d = '60' + d.slice(1);   // 马来西亚本地号 → 国际格式
  return d;
}

function sendReceiptWA(){
  if(!LAST_RECEIPT) return;
  var ph = waPhone(LAST_RECEIPT.phone);
  window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(LAST_RECEIPT.text), '_blank');
}

function saveReceiptImg(){
  var node = $('receipt');
  if(typeof html2canvas !== 'function'){ toast('图片功能加载失败，请截图'); return; }
  html2canvas(node, { scale: 2, backgroundColor: '#ffffff' }).then(function(canvas){
    canvas.toBlob(function(blob){
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'order-' + (LAST_RECEIPT ? LAST_RECEIPT.id : '') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    }, 'image/png');
  }).catch(function(){ toast('生成图片失败，请截图'); });
}

/* ═══════════ 老板：订单列表 ═══════════ */
function loadOrders(){
  $('ord-list').innerHTML = '<p style="color:#888;font-size:.85rem">加载中…</p>';
  rpc('list_orders', { p_name: SESSION.name, p_pin: SESSION.pin, p_limit: 300 }).then(function(rows){
    renderStats(rows || []);
    renderOrders(rows || []);
  }).catch(function(e){
    $('ord-list').innerHTML = '<p style="color:#e2574c;font-size:.85rem">加载失败：' + esc(e.message) + '</p>';
  });
}

function isToday(iso){
  var d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function renderStats(rows){
  var tOrders = rows.length, tRev = 0, dOrders = 0, dRev = 0;
  rows.forEach(function(o){
    var tot = Number(o.total) || 0;
    tRev += tot;
    if(isToday(o.created_at)){ dOrders++; dRev += tot; }
  });
  $('stats').innerHTML =
      '<div class="stat"><b>' + dOrders + '</b><small>今日单数</small></div>'
    + '<div class="stat"><b>' + money(dRev).replace('RM ', '') + '</b><small>今日营业额</small></div>'
    + '<div class="stat"><b>' + tOrders + '</b><small>总单数</small></div>'
    + '<div class="stat"><b>' + money(tRev).replace('RM ', '') + '</b><small>总营业额</small></div>';
}

var STLABEL = { pending: '待付款', paid: '已付款', shipped: '已发货' };

function renderOrders(rows){
  if(!rows.length){ $('ord-list').innerHTML = '<p style="color:#888;font-size:.85rem">暂无订单</p>'; return; }
  $('ord-list').innerHTML = rows.map(function(o){
    var items = (o.items || []).map(function(it){ return esc(it.name) + ' ×' + it.qty; }).join('，');
    var dt = new Date(o.created_at).toLocaleString('zh-CN', { hour12: false });
    var st = o.status || 'pending';
    return '<div class="ord">'
      + '<div class="ord-top"><b>' + money(o.total) + '</b>'
      +   '<span class="st ' + st + '">' + (STLABEL[st] || st) + '</span></div>'
      + '<div class="ord-items">' + items + '</div>'
      + '<div class="ord-meta">'
      +   '#' + o.id + ' · ' + esc(dt) + ' · 开单：' + esc(o.worker_name) + '<br>'
      +   (o.customer_name  ? '客户：' + esc(o.customer_name) + ' ' : '')
      +   (o.customer_phone ? esc(o.customer_phone) : '')
      +   (o.customer_address ? '<br>地址：' + esc(o.customer_address) : '')
      +   (o.note ? '<br>备注：' + esc(o.note) : '')
      + '</div>'
      + '<div class="ord-actions">'
      +   (st !== 'paid'    ? '<button onclick="setStatus(' + o.id + ',\'paid\')">标记已付款</button>' : '')
      +   (st !== 'shipped' ? '<button onclick="setStatus(' + o.id + ',\'shipped\')">标记已发货</button>' : '')
      +   (st !== 'pending' ? '<button onclick="setStatus(' + o.id + ',\'pending\')">退回待付款</button>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}

function setStatus(id, status){
  rpc('update_order_status', { p_name: SESSION.name, p_pin: SESSION.pin, p_id: id, p_status: status }).then(function(){
    toast('已更新');
    loadOrders();
  }).catch(function(e){ toast('更新失败：' + (e.message || '')); });
}

/* ═══════════ 初始化 ═══════════ */
document.addEventListener('DOMContentLoaded', function(){
  $('btn-login').addEventListener('click', doLogin);
  $('in-pin').addEventListener('keydown', function(e){ if(e.key === 'Enter') doLogin(); });
  $('btn-logout').addEventListener('click', logout);
  $('b-wa').addEventListener('click', sendReceiptWA);
  $('b-img').addEventListener('click', saveReceiptImg);
  $('b-close').addEventListener('click', function(){ $('modal').classList.add('hidden'); });

  /* 先加载网站数据（含 Supabase 配置 + 产品价格），再决定是否自动登录 */
  loadData(function(d){
    CACHED_DATA = d;
    if(d.supabase){ SUPA_URL = d.supabase.url || ''; SUPA_ANON = d.supabase.anon || ''; }
    var s = loadSession();
    if(s && s.name){ SESSION = s; enterApp(); }
  });
});
