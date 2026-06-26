/* ═══════════════════════════════════════════
   staff.js — 后台「员工管理」（开单系统员工）
   依赖：data.js（getData / esc）；Supabase 配置来自「设置」页
═══════════════════════════════════════════ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* Supabase 配置：优先取设置页输入框，其次取已保存数据 */
  function sbConfig() {
    var urlEl = $('sb-url'), anonEl = $('sb-anon');
    var url = urlEl && urlEl.value ? urlEl.value.trim() : '';
    var anon = anonEl && anonEl.value ? anonEl.value.trim() : '';
    if (url && anon) return { url: url, anon: anon };
    var d = (typeof getData === 'function') ? getData() : {};
    var s = (d && d.supabase) || {};
    return { url: (s.url || '').trim(), anon: (s.anon || '').trim() };
  }

  function rpc(fn, params) {
    var cfg = sbConfig();
    if (!cfg.url || !cfg.anon) return Promise.reject(new Error('请先在「设置」页填写 Supabase 配置并保存'));
    return fetch(cfg.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'apikey': cfg.anon, 'Authorization': 'Bearer ' + cfg.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(function (r) {
      return r.text().then(function (txt) {
        var data; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
        if (!r.ok) throw new Error((data && data.message) || ('请求失败 ' + r.status));
        return data;
      });
    });
  }

  /* 老板凭据（本会话内记住，刷新后需重新解锁） */
  var BOSS = null;
  function loadBoss() { try { return JSON.parse(sessionStorage.getItem('fgh_staff_boss')); } catch (e) { return null; } }

  function unlock() {
    var name = $('staff-boss-name').value.trim();
    var pin = $('staff-boss-pin').value.trim();
    var err = $('staff-lock-err');
    err.textContent = '';
    if (!name || !pin) { err.textContent = '请输入老板名字和 PIN'; return; }
    var btn = $('staff-unlock'); btn.disabled = true; btn.textContent = '解锁中…';
    rpc('admin_list_workers', { p_name: name, p_pin: pin }).then(function (rows) {
      BOSS = { name: name, pin: pin };
      sessionStorage.setItem('fgh_staff_boss', JSON.stringify(BOSS));
      $('staff-lock').classList.add('hidden');
      $('staff-main').classList.remove('hidden');
      renderList(rows || []);
    }).catch(function (e) {
      err.textContent = (e.message && e.message.indexOf('无权限') > -1) ? '名字或 PIN 错误，或不是老板账号' : e.message;
    }).finally(function () { btn.disabled = false; btn.textContent = '解锁员工管理'; });
  }

  function reload() {
    if (!BOSS) return;
    rpc('admin_list_workers', { p_name: BOSS.name, p_pin: BOSS.pin })
      .then(function (rows) { renderList(rows || []); })
      .catch(function (e) { alert('载入失败：' + e.message); });
  }

  function renderList(rows) {
    if (!rows.length) { $('staff-list').innerHTML = '<p style="color:#888">暂无员工</p>'; return; }
    $('staff-list').innerHTML = rows.map(function (w) {
      var role = w.is_boss ? '<span style="color:#c9a961;font-weight:700">老板</span>' : '工人';
      var stat = w.active ? '<span style="color:#2e9e4f">启用</span>' : '<span style="color:#e2574c">已停用</span>';
      return '<div style="border:1px solid #e7e2d8;border-radius:10px;padding:12px;margin-bottom:10px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
        +   '<b style="font-size:1rem">' + esc(w.name) + '</b>'
        +   '<span style="font-size:.82rem">' + role + ' · ' + stat + '</span>'
        + '</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        +   '<button class="btn-mini" data-pin="' + esc(w.name) + '" data-curboss="' + (w.is_boss ? 1 : 0) + '">改 PIN</button>'
        +   '<button class="btn-mini" data-boss="' + esc(w.name) + '" data-cur="' + (w.is_boss ? 1 : 0) + '">'
        +     (w.is_boss ? '取消老板' : '设为老板') + '</button>'
        +   '<button class="btn-mini" data-active="' + esc(w.name) + '" data-cur="' + (w.active ? 1 : 0) + '">'
        +     (w.active ? '停用' : '启用') + '</button>'
        + '</div></div>';
    }).join('');

    Array.prototype.forEach.call(document.querySelectorAll('#staff-list [data-pin]'), function (b) {
      b.addEventListener('click', function () { changePin(b.dataset.pin, b.dataset.curboss === '1'); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#staff-list [data-boss]'), function (b) {
      b.addEventListener('click', function () { setBoss(b.dataset.boss, b.dataset.cur !== '1'); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#staff-list [data-active]'), function (b) {
      b.addEventListener('click', function () { setActive(b.dataset.active, b.dataset.cur !== '1'); });
    });
  }

  function addWorker() {
    var name = $('staff-name').value.trim();
    var pin = $('staff-pin').value.trim();
    var isBoss = $('staff-isboss').checked;
    var msg = $('staff-add-msg'); msg.textContent = ''; msg.style.color = '#e2574c';
    if (!name) { msg.textContent = '请填名字'; return; }
    var btn = $('staff-add'); btn.disabled = true; btn.textContent = '保存中…';
    rpc('admin_save_worker', { p_name: BOSS.name, p_pin: BOSS.pin, p_target: name, p_new_pin: pin, p_is_boss: isBoss })
      .then(function () {
        msg.style.color = '#2e9e4f'; msg.textContent = '✓ 已保存';
        $('staff-name').value = ''; $('staff-pin').value = ''; $('staff-isboss').checked = false;
        reload();
      })
      .catch(function (e) { msg.textContent = '失败：' + e.message; })
      .finally(function () { btn.disabled = false; btn.textContent = '保存员工'; });
  }

  function changePin(name, curIsBoss) {
    var pin = prompt('给「' + name + '」设置新 PIN（4-6 位数字）：');
    if (pin === null) return;
    pin = pin.trim();
    if (!pin) { alert('PIN 不能为空'); return; }
    /* 传回当前身份，避免改 PIN 时误改老板/工人身份 */
    rpc('admin_save_worker', { p_name: BOSS.name, p_pin: BOSS.pin, p_target: name, p_new_pin: pin, p_is_boss: !!curIsBoss })
      .then(function () { alert('✓ 已更新 ' + name + ' 的 PIN'); reload(); })
      .catch(function (e) { alert('失败：' + e.message); });
  }

  function setBoss(name, makeBoss) {
    if (!confirm((makeBoss ? '设「' : '取消「') + name + (makeBoss ? '」为老板？' : '」的老板身份？'))) return;
    rpc('admin_save_worker', { p_name: BOSS.name, p_pin: BOSS.pin, p_target: name, p_new_pin: '', p_is_boss: makeBoss })
      .then(reload).catch(function (e) { alert('失败：' + e.message); });
  }

  function setActive(name, makeActive) {
    if (!confirm((makeActive ? '启用「' : '停用「') + name + '」？')) return;
    rpc('admin_set_active', { p_name: BOSS.name, p_pin: BOSS.pin, p_target: name, p_active: makeActive })
      .then(reload).catch(function (e) { alert('失败：' + e.message); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if ($('staff-unlock')) $('staff-unlock').addEventListener('click', unlock);
    if ($('staff-boss-pin')) $('staff-boss-pin').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlock(); });
    if ($('staff-add')) $('staff-add').addEventListener('click', addWorker);
    /* 本会话已解锁过则自动恢复 */
    var b = loadBoss();
    if (b && b.name) { BOSS = b; if ($('staff-lock')) $('staff-lock').classList.add('hidden'); if ($('staff-main')) $('staff-main').classList.remove('hidden'); reload(); }
  });
})();
