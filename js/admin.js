/* ═══════════════════════════════════════════
   admin.js — 管理后台逻辑
   依赖：data.js（需先加载）
═══════════════════════════════════════════ */

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}

/* ── SHA-256 哈希工具 ────────────────────── */
function hashPw(pw) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
    .then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
}

/* ── 登入 / 登出 ─────────────────────────── */
function doLogin() {
  var input = document.getElementById('pw-input').value;
  if (!input) return;
  hashPw(input).then(function (hash) {
    var d = getData();
    if (hash === d.pw) {
      document.getElementById('gate-err').style.display = 'none';
      sessionStorage.setItem('fgh_admin', '1');
      showAdmin();
    } else {
      var err = document.getElementById('gate-err');
      err.textContent = '密码错误，请重试';
      err.style.display = 'block';
      document.getElementById('pw-input').value = '';
      document.getElementById('pw-input').focus();
    }
  });
}

function logout() {
  sessionStorage.removeItem('fgh_admin');
  location.reload();
}

/* ── 显示 / 隐藏密码 ─────────────────────── */
function togglePw(inputId, btn) {
  var el = document.getElementById(inputId);
  if (!el) return;
  var showing = el.type === 'text';
  el.type = showing ? 'password' : 'text';
  btn.querySelector('i').className = showing ? 'fas fa-eye' : 'fas fa-eye-slash';
}

/* ── Tab 切换 ────────────────────────────── */
function showTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
  var panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');
}

/* ── 显示管理面板 ────────────────────────── */
function showAdmin() {
  document.getElementById('gate').style.display  = 'none';
  document.getElementById('panel').style.display = 'block';
  document.getElementById('save-bar').style.display = 'flex';
  fillForms();
}

/* ── 填充表单 ────────────────────────────── */
function fillForms() {
  var d = getData();

  document.getElementById('c-display').value = d.contact.display;
  document.getElementById('c-wa').value      = d.contact.wa;
  document.getElementById('c-name').value    = d.contact.name;

  document.getElementById('h-tag').value  = d.hero.tag;
  document.getElementById('h-pre').value  = d.hero.pre;
  document.getElementById('h-em').value   = d.hero.em;
  document.getElementById('h-post').value = d.hero.post;
  document.getElementById('h-sub').value  = d.hero.sub;

  /* Cloudinary 设置 */
  var cl = d.cloudinary || { cloud: '', preset: '' };
  var clCloudEl  = document.getElementById('cl-cloud');
  var clPresetEl = document.getElementById('cl-preset');
  if (clCloudEl)  clCloudEl.value  = cl.cloud  || '';
  if (clPresetEl) clPresetEl.value = cl.preset || '';

  document.getElementById('stats-fields').innerHTML = d.stats.map(function (s, i) {
    return (
      '<div class="form-row" style="margin-bottom:14px">'
      + '<div class="field"><label>数据 ' + (i + 1) + ' — 数字</label>'
      +   '<input type="text" id="stat-num-' + i + '" value="' + esc(s.num) + '"></div>'
      + '<div class="field"><label>数据 ' + (i + 1) + ' — 标签</label>'
      +   '<input type="text" id="stat-lbl-' + i + '" value="' + esc(s.lbl) + '"></div>'
      + '</div>'
    );
  }).join('');

  document.getElementById('videos-fields').innerHTML = d.videos.map(function (v, i) {
    return (
      '<div class="item-card">'
      + '<div class="item-card-head"><span class="item-num">' + (i + 1) + '</span> 视频 ' + (i + 1) + '</div>'
      + '<div class="form-row">'
      +   '<div class="field"><label>标签（短分类）</label><input type="text" id="v-tag-' + i + '" value="' + esc(v.tag) + '"></div>'
      +   '<div class="field"><label>时长</label><input type="text" id="v-dur-' + i + '" value="' + esc(v.dur) + '"></div>'
      + '</div>'
      + '<div class="form-row full"><div class="field"><label>视频标题</label>'
      +   '<input type="text" id="v-title-' + i + '" value="' + esc(v.title) + '"></div></div>'
      + '<div class="form-row full"><div class="field"><label>视频简介</label>'
      +   '<textarea id="v-desc-' + i + '" rows="2">' + esc(v.desc) + '</textarea></div></div>'
      + '<div class="form-row">'
      +   '<div class="field"><label>难度 / 适合对象</label><input type="text" id="v-lvl-' + i + '" value="' + esc(v.lvl) + '"></div>'
      +   '<div class="field">'
      +     '<label>视频链接 / 直传上传</label>'
      +     '<input type="url" id="v-url-' + i + '" value="' + esc(v.url) + '" placeholder="https://www.youtube.com/watch?v=...">'
      +     '<div class="upload-row">'
      +       '<label class="btn-upload-vid">'
      +         '<input type="file" id="v-file-' + i + '" accept="video/*" onchange="handleVideoUpload(' + i + ', this)">'
      +         '<i class="fas fa-cloud-upload-alt"></i> 从手机/电脑上传视频'
      +       '</label>'
      +       '<div class="upload-prog" id="v-prog-' + i + '"></div>'
      +     '</div>'
      +   '</div>'
      + '</div>'
      + '</div>'
    );
  }).join('');

  document.getElementById('products-fields').innerHTML = d.products.map(function (p, i) {
    var redSel  = p.red ? ' selected' : '';
    var goldSel = p.red ? '' : ' selected';
    return (
      '<div class="item-card">'
      + '<div class="item-card-head"><span class="item-num">' + (i + 1) + '</span> 产品 ' + (i + 1) + '：' + esc(p.name) + '</div>'
      + '<div class="form-row three">'
      +   '<div class="field"><label>图片（emoji 或图片网址）</label>'
      +     '<input type="text" id="p-img-' + i + '" value="' + esc(p.img) + '" placeholder="🌸 或 https://..."></div>'
      +   '<div class="field"><label>标签文字</label>'
      +     '<input type="text" id="p-badge-' + i + '" value="' + esc(p.badge) + '"></div>'
      +   '<div class="field"><label>标签颜色</label>'
      +     '<select id="p-red-' + i + '">'
      +       '<option value="0"' + goldSel + '>金色</option>'
      +       '<option value="1"' + redSel  + '>红色</option>'
      +     '</select></div>'
      + '</div>'
      + '<div class="form-row full"><div class="field"><label>产品名称</label>'
      +   '<input type="text" id="p-name-' + i + '" value="' + esc(p.name) + '"></div></div>'
      + '<div class="form-row full"><div class="field"><label>产品描述</label>'
      +   '<textarea id="p-desc-' + i + '" rows="2">' + esc(p.desc) + '</textarea></div></div>'
      + '<div class="form-row full"><div class="field">'
      +   '<label>产品特点（每行一条，最多 4 条）</label>'
      +   '<textarea id="p-feats-' + i + '" rows="4">' + esc((p.feats || []).join('\n')) + '</textarea>'
      + '</div></div>'
      + '<div class="form-row three">'
      +   '<div class="field"><label>现价</label><input type="text" id="p-price-' + i + '" value="' + esc(p.price) + '" placeholder="RM 38"></div>'
      +   '<div class="field"><label>原价（划线）</label><input type="text" id="p-ori-' + i + '" value="' + esc(p.ori) + '" placeholder="RM 55"></div>'
      +   '<div class="field"><label>优惠文字</label><input type="text" id="p-save-' + i + '" value="' + esc(p.save) + '" placeholder="省 RM17"></div>'
      + '</div>'
      + '</div>'
    );
  }).join('');

  document.getElementById('steps-fields').innerHTML = d.steps.map(function (s, i) {
    return (
      '<div class="step-item">'
      + '<div class="step-label">第 ' + (i + 1) + ' 步</div>'
      + '<div class="form-row">'
      +   '<div class="field"><label>步骤标题</label>'
      +     '<input type="text" id="s-title-' + i + '" value="' + esc(s.title) + '"></div>'
      +   '<div class="field"><label>步骤说明</label>'
      +     '<input type="text" id="s-desc-' + i + '" value="' + esc(s.desc) + '"></div>'
      + '</div></div>'
    );
  }).join('');
}

/* ── 保存所有修改 ────────────────────────── */
function saveAll() {
  var d = getData();

  d.contact.display = val('c-display');
  d.contact.wa      = val('c-wa').replace(/\D/g, '');
  d.contact.name    = val('c-name');

  d.hero.tag  = val('h-tag');
  d.hero.pre  = val('h-pre');
  d.hero.em   = val('h-em');
  d.hero.post = val('h-post');
  d.hero.sub  = val('h-sub');

  d.stats.forEach(function (_, i) {
    d.stats[i].num = val('stat-num-' + i);
    d.stats[i].lbl = val('stat-lbl-' + i);
  });

  d.videos.forEach(function (_, i) {
    d.videos[i].tag   = val('v-tag-' + i);
    d.videos[i].title = val('v-title-' + i);
    d.videos[i].desc  = val('v-desc-' + i);
    d.videos[i].dur   = val('v-dur-' + i);
    d.videos[i].lvl   = val('v-lvl-' + i);
    d.videos[i].url   = val('v-url-' + i).trim();
  });

  d.products.forEach(function (_, i) {
    d.products[i].img   = val('p-img-' + i);
    d.products[i].badge = val('p-badge-' + i);
    d.products[i].red   = document.getElementById('p-red-' + i).value === '1';
    d.products[i].name  = val('p-name-' + i);
    d.products[i].desc  = val('p-desc-' + i);
    d.products[i].feats = val('p-feats-' + i).split('\n').map(function (f) { return f.trim(); }).filter(Boolean);
    d.products[i].price = val('p-price-' + i);
    d.products[i].ori   = val('p-ori-' + i);
    d.products[i].save  = val('p-save-' + i);
  });

  d.steps.forEach(function (_, i) {
    d.steps[i].title = val('s-title-' + i);
    d.steps[i].desc  = val('s-desc-' + i);
  });

  /* Cloudinary 设置 */
  if (!d.cloudinary) d.cloudinary = { cloud: '', preset: '' };
  var clCloudEl2  = document.getElementById('cl-cloud');
  var clPresetEl2 = document.getElementById('cl-preset');
  if (clCloudEl2)  d.cloudinary.cloud  = clCloudEl2.value.trim();
  if (clPresetEl2) d.cloudinary.preset = clPresetEl2.value.trim();

  saveData(d);
  showToast('✓ 已保存！点击「自动翻译」可更新英/马文', 'success');
}

/* ── 自动翻译（调用 MyMemory 免费 API）───── */
function translateText(text, targetLang, callback) {
  var pairs = { en: 'zh-CN|en', my: 'zh-CN|ms' };
  var pair  = pairs[targetLang];
  if (!pair || !text || !text.trim()) { callback(text); return; }
  var xhr = new XMLHttpRequest();
  xhr.open('GET',
    'https://api.mymemory.translated.net/get'
    + '?q='        + encodeURIComponent(text.substring(0, 480))
    + '&langpair=' + pair
    + '&de=linmingjie80@gmail.com',
    true);
  xhr.timeout = 9000;
  xhr.onload = function () {
    try {
      var res = JSON.parse(xhr.responseText);
      if (res.responseStatus === 200 && res.responseData.translatedText) {
        callback(res.responseData.translatedText);
      } else { callback(text); }
    } catch (e) { callback(text); }
  };
  xhr.onerror   = function () { callback(text); };
  xhr.ontimeout = function () { callback(text); };
  xhr.send();
}

function translateAll() {
  /* 先保存表单 */
  saveAll();
  var d = getData();

  /* 构建翻译任务队列 */
  var tasks = [];
  var langs = ['en', 'my'];

  function addTask(key, text) {
    if (!text || !text.trim()) return;
    langs.forEach(function (lang) { tasks.push({ key: key, text: text, lang: lang }); });
  }

  addTask('hero_tag',  d.hero.tag);
  addTask('hero_pre',  d.hero.pre);
  addTask('hero_em',   d.hero.em);
  addTask('hero_post', d.hero.post);
  addTask('hero_sub',  d.hero.sub);

  d.stats.forEach(function (s, i) { addTask('stat_lbl_' + i, s.lbl); });

  d.videos.forEach(function (v, i) {
    addTask('video_' + i + '_tag',   v.tag);
    addTask('video_' + i + '_title', v.title);
    addTask('video_' + i + '_desc',  v.desc);
    addTask('video_' + i + '_dur',   v.dur);
    addTask('video_' + i + '_lvl',   v.lvl);
  });

  d.products.forEach(function (p, i) {
    addTask('prod_' + i + '_name',  p.name);
    addTask('prod_' + i + '_desc',  p.desc);
    addTask('prod_' + i + '_badge', p.badge);
    (p.feats || []).forEach(function (f, j) { addTask('prod_' + i + '_feat_' + j, f); });
  });

  d.steps.forEach(function (s, i) {
    addTask('step_' + i + '_title', s.title);
    addTask('step_' + i + '_desc',  s.desc);
  });

  if (!d.i18n)    d.i18n    = {};
  if (!d.i18n.en) d.i18n.en = {};
  if (!d.i18n.my) d.i18n.my = {};

  var total = tasks.length;
  var done  = 0;

  /* 禁用按钮，显示进度 */
  var tBtn  = document.getElementById('btn-translate');
  var sBtn  = document.querySelector('.btn-save');
  if (tBtn) { tBtn.disabled = true; tBtn.querySelector('span').textContent = '翻译中…'; }
  if (sBtn) sBtn.disabled = true;

  function updateProgress() {
    var msg = document.getElementById('save-msg');
    if (msg) {
      msg.textContent = '⏳ ' + done + ' / ' + total;
      msg.className = 'show';
    }
  }

  function onDone() {
    saveData(d);
    if (tBtn) { tBtn.disabled = false; tBtn.querySelector('span').textContent = '自动翻译 EN/MY'; }
    if (sBtn) sBtn.disabled = false;
    showToast('✓ 翻译完成！' + total + ' 条文案已更新 EN/MY', 'success');
  }

  updateProgress();

  function processNext() {
    if (tasks.length === 0) { onDone(); return; }
    var task = tasks.shift();
    translateText(task.text, task.lang, function (translated) {
      d.i18n[task.lang][task.key] = translated;
      done++;
      updateProgress();
      setTimeout(processNext, 120);
    });
  }

  processNext();
}

/* ── 修改密码 ────────────────────────────── */
function changePw() {
  var old  = document.getElementById('pw-old').value;
  var nw   = document.getElementById('pw-new').value;
  var conf = document.getElementById('pw-confirm').value;
  var okEl  = document.getElementById('pw-ok');
  var errEl = document.getElementById('pw-err');
  okEl.style.display = errEl.style.display = 'none';

  if (nw.length < 4) {
    errEl.textContent = '新密码至少需要 4 位';
    errEl.style.display = 'block'; return;
  }
  if (nw !== conf) {
    errEl.textContent = '两次输入的新密码不一致';
    errEl.style.display = 'block'; return;
  }

  var d = getData();
  hashPw(old).then(function (oldHash) {
    if (oldHash !== d.pw) {
      errEl.textContent = '当前密码错误，请重试';
      errEl.style.display = 'block'; return;
    }
    hashPw(nw).then(function (newHash) {
      d.pw = newHash;
      saveData(d);
      okEl.style.display = 'block';
      ['pw-old', 'pw-new', 'pw-confirm'].forEach(function (id) {
        document.getElementById(id).value = '';
      });
    });
  });
}

/* ── 重置数据 ────────────────────────────── */
function resetData() {
  if (!confirm('确定要重置所有内容为默认值吗？\n此操作不可撤销！')) return;
  localStorage.removeItem('fgh_data');
  fillForms();
  showToast('↺ 已重置为默认值！请刷新网站查看效果', 'success');
}

/* ── Toast 提示 ─────────────────────────── */
function showToast(text, type) {
  var msg = document.getElementById('save-msg');
  if (!msg) return;
  msg.textContent = text;
  msg.className = 'show' + (type === 'success' ? ' ok' : '');
  clearTimeout(msg._t);
  msg._t = setTimeout(function () { msg.className = ''; }, 3500);
}

/* ── 直接上传视频到 Cloudinary ────────────── */
function handleVideoUpload(idx, input) {
  var file = input.files[0];
  if (!file) return;

  var d      = getData();
  var cloud  = ((d.cloudinary && d.cloudinary.cloud)  || '').trim();
  var preset = ((d.cloudinary && d.cloudinary.preset) || '').trim();

  if (!cloud || !preset) {
    alert('请先在「设置」标签填写 Cloudinary 的 Cloud Name 和 Upload Preset，才能直接上传视频。\n\n免费注册：cloudinary.com → Dashboard 复制 Cloud Name → 创建 Unsigned Upload Preset');
    input.value = '';
    return;
  }

  var prog = document.getElementById('v-prog-' + idx);
  if (prog) prog.textContent = '⏳ 上传中 0%';

  var fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + cloud + '/video/upload');

  xhr.upload.onprogress = function (e) {
    if (e.lengthComputable && prog) {
      prog.textContent = '⏳ 上传中 ' + Math.round(e.loaded / e.total * 100) + '%';
    }
  };

  xhr.onload = function () {
    try {
      var res = JSON.parse(xhr.responseText);
      if (res.secure_url) {
        var urlInput = document.getElementById('v-url-' + idx);
        if (urlInput) urlInput.value = res.secure_url;
        if (prog) prog.textContent = '✓ 上传成功！';
        setTimeout(function () { if (prog) prog.textContent = ''; }, 4000);
      } else {
        if (prog) prog.textContent = '✗ 上传失败：' + ((res.error && res.error.message) || '请检查 Cloud Name / Preset');
      }
    } catch (e) {
      if (prog) prog.textContent = '✗ 上传失败，请重试';
    }
    input.value = '';
  };

  xhr.onerror = function () {
    if (prog) prog.textContent = '✗ 网络错误，请检查连接';
    input.value = '';
  };

  xhr.send(fd);
}

/* ── 页面初始化 ─────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  if (sessionStorage.getItem('fgh_admin') === '1') showAdmin();
  var pwInput = document.getElementById('pw-input');
  if (pwInput) {
    pwInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doLogin();
    });
  }
});
