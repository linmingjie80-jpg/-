/* ═══════════════════════════════════════════
   photos.js — 后台「相册」模块（1000+ 照片 + 名字 + 搜索）
   照片存 Cloudinary，名字/链接存 Supabase。Photos.init() 由 admin 调用。
   复用 admin.js 的 sbRpc / SESSION / getData / esc
═══════════════════════════════════════════ */
window.Photos = (function () {
  'use strict';
  var byId = function (id) { return document.getElementById(id); };
  var PAGE = 60;
  var state = { q: '', offset: 0, done: false, loading: false };

  function toast(m) {
    var el = byId('admin-toast');
    if (!el) { el = document.createElement('div'); el.id = 'admin-toast'; el.className = 'admin-toast'; document.body.appendChild(el); }
    el.textContent = m; el.className = 'admin-toast show';
    clearTimeout(el._t); el._t = setTimeout(function () { el.className = 'admin-toast'; }, 2600);
  }

  function clConfig() {
    var d = (typeof getData === 'function') ? getData() : {};
    var c = (d && d.cloudinary) || {};
    return { cloud: (c.cloud || '').trim(), preset: (c.preset || '').trim() };
  }
  function thumb(url) {
    if (/res\.cloudinary\.com\/.+\/image\/upload\//.test(url)) {
      return url.replace('/image/upload/', '/image/upload/w_300,h_300,c_fill,q_auto,f_auto/');
    }
    return url;
  }

  /* ── 界面 ── */
  function init() {
    var root = byId('tab-photos');
    root.innerHTML =
        '<div class="card">'
      +   '<div class="card-title"><span class="ct-icon">📷</span> 相册</div>'
      +   '<div class="tip"><i class="fas fa-circle-info"></i> 上传照片（可一次多选），每张可填名字，之后用上方搜索框按名字快速找到。需先在「设置」配好 Cloudinary。</div>'
      +   '<div class="ph-bar">'
      +     '<label class="btn-save ph-upbtn"><input type="file" id="ph-file" accept="image/*" multiple hidden> <i class="fas fa-cloud-upload-alt"></i> 上传照片</label>'
      +     '<input id="ph-search" placeholder="🔍 按名字搜索照片">'
      +   '</div>'
      +   '<div id="ph-prog" class="ph-prog"></div>'
      + '</div>'
      + '<div id="ph-grid" class="ph-grid"></div>'
      + '<div style="text-align:center;margin-top:14px"><button id="ph-more" class="btn-mini" style="display:none">加载更多</button></div>';

    byId('ph-file').addEventListener('change', onUpload);
    byId('ph-more').addEventListener('click', function () { load(false); });
    var t;
    byId('ph-search').addEventListener('input', function (e) {
      clearTimeout(t); var v = e.target.value.trim();
      t = setTimeout(function () { state.q = v; load(true); }, 300);
    });
    load(true);
  }

  /* ── 加载/搜索 ── */
  function load(reset) {
    if (state.loading) return;
    if (reset) { state.offset = 0; state.done = false; byId('ph-grid').innerHTML = ''; }
    if (state.done) return;
    state.loading = true;
    byId('ph-more').textContent = '加载中…';
    sbRpc('list_photos', { p_name: SESSION.name, p_pin: SESSION.pin, p_q: state.q, p_limit: PAGE, p_offset: state.offset })
      .then(function (rows) {
        rows = rows || [];
        appendCards(rows);
        state.offset += rows.length;
        state.done = rows.length < PAGE;
        byId('ph-more').style.display = state.done ? 'none' : 'inline-block';
        byId('ph-more').textContent = '加载更多';
        if (!byId('ph-grid').children.length) byId('ph-grid').innerHTML = '<p style="color:#888;grid-column:1/-1;text-align:center;padding:20px">' + (state.q ? '没找到符合的照片' : '还没有照片，点「上传照片」开始') + '</p>';
      })
      .catch(function (e) { toast('载入失败：' + e.message); })
      .finally(function () { state.loading = false; });
  }

  function appendCards(rows) {
    var empty = byId('ph-grid').querySelector('p'); if (empty) empty.remove();
    var html = rows.map(function (p) {
      return '<div class="ph-card" data-id="' + p.id + '">'
        + '<a href="' + esc(p.url) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(thumb(p.url)) + '" alt=""></a>'
        + '<input class="ph-name" value="' + esc(p.name) + '" placeholder="名字" data-id="' + p.id + '">'
        + '<button class="ph-del" data-id="' + p.id + '">删除</button>'
        + '</div>';
    }).join('');
    byId('ph-grid').insertAdjacentHTML('beforeend', html);
    Array.prototype.forEach.call(byId('ph-grid').querySelectorAll('.ph-name:not([data-wired])'), function (inp) {
      inp.setAttribute('data-wired', '1');
      inp.addEventListener('change', function () { rename(inp.dataset.id, inp.value.trim()); });
    });
    Array.prototype.forEach.call(byId('ph-grid').querySelectorAll('.ph-del:not([data-wired])'), function (b) {
      b.setAttribute('data-wired', '1');
      b.addEventListener('click', function () { del(b.dataset.id); });
    });
  }

  function rename(id, name) {
    sbRpc('update_photo', { p_name: SESSION.name, p_pin: SESSION.pin, p_id: +id, p_pname: name })
      .then(function () { toast('✓ 已改名'); }).catch(function (e) { toast('改名失败：' + e.message); });
  }
  function del(id) {
    if (!confirm('删除这张照片？（Cloudinary 上的原图不会删）')) return;
    sbRpc('delete_photo', { p_name: SESSION.name, p_pin: SESSION.pin, p_id: +id })
      .then(function () { var c = byId('ph-grid').querySelector('.ph-card[data-id="' + id + '"]'); if (c) c.remove(); toast('已删除'); })
      .catch(function (e) { toast('删除失败：' + e.message); });
  }

  /* ── 上传（多选，逐个传 Cloudinary 再存 Supabase）── */
  function onUpload(e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    var cfg = clConfig();
    if (!cfg.cloud || !cfg.preset) { alert('请先在「设置」填好 Cloudinary 的 Cloud Name 和 Upload Preset'); return; }
    var prog = byId('ph-prog'), done = 0, ok = 0;
    function next(i) {
      if (i >= files.length) {
        prog.textContent = '✓ 完成，成功上传 ' + ok + ' / ' + files.length + ' 张';
        setTimeout(function () { prog.textContent = ''; }, 4000);
        load(true);
        return;
      }
      prog.textContent = '上传中 ' + (i + 1) + ' / ' + files.length + ' …';
      uploadOne(files[i], cfg).then(function (url) {
        var nm = files[i].name.replace(/\.[^.]+$/, '');
        return sbRpc('save_photo', { p_name: SESSION.name, p_pin: SESSION.pin, p_pname: nm, p_url: url });
      }).then(function () { ok++; }).catch(function () { /* 跳过失败的 */ })
        .finally(function () { done++; next(i + 1); });
    }
    next(0);
  }

  function uploadOne(file, cfg) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', cfg.preset);
    return fetch('https://api.cloudinary.com/v1_1/' + cfg.cloud + '/image/upload', { method: 'POST', body: fd })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (res.secure_url) return res.secure_url; throw new Error((res.error && res.error.message) || '上传失败'); });
  }

  return { init: init };
})();
