/* ═══════════════════════════════════════════
   staff.js — 后台「员工管理」模块
   作为 admin 的标签使用：StaffMgr.init()（老板登录后）
   复用 admin.js 的 sbRpc / SESSION / esc
═══════════════════════════════════════════ */
window.StaffMgr = (function () {
  'use strict';
  var byId = function (id) { return document.getElementById(id); };
  var bound = false, LAST = [];

  var PERMS   = ['inv_view_all', 'inv_delete', 'inv_discount', 'cust_manage', 'site'];
  var PERMLBL = { inv_view_all: '看全部', inv_delete: '删发票', inv_discount: '折扣', cust_manage: '管客户', site: '改网站' };

  function init() {
    if (typeof SESSION === 'undefined' || !SESSION || !SESSION.is_boss) {
      byId('staff-list').innerHTML = '<p style="color:#888">仅老板可管理员工</p>'; return;
    }
    if (!bound) { byId('staff-add').addEventListener('click', addWorker); bound = true; }
    reload();
  }

  function readForm() {
    return {
      name: byId('staff-name').value.trim(),
      pin: byId('staff-pin').value.trim(),
      isBoss: byId('staff-isboss').checked,
      perms: PERMS.filter(function (k) { var el = byId('perm-' + k); return el && el.checked; })
    };
  }
  function clearForm() {
    byId('staff-name').value = ''; byId('staff-pin').value = ''; byId('staff-isboss').checked = false;
    PERMS.forEach(function (k) { var el = byId('perm-' + k); if (el) el.checked = false; });
  }
  function fillForm(w) {
    byId('staff-name').value = w.name; byId('staff-pin').value = '';
    byId('staff-isboss').checked = !!w.is_boss;
    PERMS.forEach(function (k) { var el = byId('perm-' + k); if (el) el.checked = (w.perms || []).indexOf(k) > -1; });
    var msg = byId('staff-add-msg'); msg.style.color = '#647585'; msg.textContent = '正在修改「' + w.name + '」（PIN 留空 = 不改）';
    byId('staff-name').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function addWorker() {
    var f = readForm(), msg = byId('staff-add-msg'); msg.style.color = '#e2574c'; msg.textContent = '';
    if (!f.name) { msg.textContent = '请填名字'; return; }
    var btn = byId('staff-add'); btn.disabled = true; btn.textContent = '保存中…';
    sbRpc('admin_save_worker', { p_name: SESSION.name, p_pin: SESSION.pin, p_target: f.name, p_new_pin: f.pin, p_is_boss: f.isBoss, p_perms: f.perms })
      .then(function () { msg.style.color = '#2e9e4f'; msg.textContent = '✓ 已保存'; clearForm(); reload(); })
      .catch(function (e) { msg.textContent = '失败：' + e.message; })
      .finally(function () { btn.disabled = false; btn.textContent = '保存员工'; });
  }

  function reload() {
    sbRpc('admin_list_workers', { p_name: SESSION.name, p_pin: SESSION.pin })
      .then(function (rows) { LAST = rows || []; renderList(LAST); })
      .catch(function (e) { byId('staff-list').innerHTML = '<p style="color:#e2574c">载入失败：' + esc(e.message) + '</p>'; });
  }

  function renderList(rows) {
    if (!rows.length) { byId('staff-list').innerHTML = '<p style="color:#888">暂无员工</p>'; return; }
    byId('staff-list').innerHTML = rows.map(function (w) {
      var role = w.is_boss ? '<span style="color:#c9a961;font-weight:700">老板</span>' : '工人';
      var stat = w.active ? '<span style="color:#2e9e4f">启用</span>' : '<span style="color:#e2574c">已停用</span>';
      var tags = w.is_boss ? '全部权限' : ((w.perms || []).map(function (k) { return PERMLBL[k] || k; }).join('、') || '仅开单');
      return '<div style="border:1px solid #e7e2d8;border-radius:10px;padding:12px;margin-bottom:10px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
        +   '<b style="font-size:1rem">' + esc(w.name) + '</b>'
        +   '<span style="font-size:.82rem">' + role + ' · ' + stat + '</span></div>'
        + '<div style="font-size:.8rem;color:#888;margin-bottom:8px">权限：' + esc(tags) + '</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        +   '<button class="btn-mini" data-edit="' + esc(w.name) + '">编辑</button>'
        +   '<button class="btn-mini" data-active="' + esc(w.name) + '" data-cur="' + (w.active ? 1 : 0) + '">'
        +     (w.active ? '停用' : '启用') + '</button>'
        + '</div></div>';
    }).join('');

    Array.prototype.forEach.call(document.querySelectorAll('#staff-list [data-edit]'), function (b) {
      b.addEventListener('click', function () { var w = LAST.find(function (x) { return x.name === b.dataset.edit; }); if (w) fillForm(w); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#staff-list [data-active]'), function (b) {
      b.addEventListener('click', function () { setActive(b.dataset.active, b.dataset.cur !== '1'); });
    });
  }

  function setActive(name, makeActive) {
    if (!confirm((makeActive ? '启用「' : '停用「') + name + '」？停用后该员工无法登录，但他开过的发票保留。')) return;
    sbRpc('admin_set_active', { p_name: SESSION.name, p_pin: SESSION.pin, p_target: name, p_active: makeActive })
      .then(reload).catch(function (e) { alert('失败：' + e.message); });
  }

  return { init: init };
})();
