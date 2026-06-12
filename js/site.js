/* ═══════════════════════════════════════════
   site.js — index.html 渲染逻辑
   依赖：data.js（需先加载）
═══════════════════════════════════════════ */

function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ── 主渲染函数 ─────────────────────────── */
function renderPage(d) {
  var wa   = d.contact.wa;
  var name = d.contact.name;
  var gs   = function (k, zh) { return getStr(d, k, zh); };

  /* WA 链接：使用当前语言消息模板 */
  var waMsg = t('wa_msg').replace('{name}', name);
  document.querySelectorAll('.wa-link').forEach(function (el) {
    el.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(waMsg);
  });

  /* Hero（支持三语） */
  setText('hero-tag-txt', gs('hero_tag',  d.hero.tag));
  setText('hero-pre',     gs('hero_pre',  d.hero.pre));
  setText('hero-em',      gs('hero_em',   d.hero.em));
  setText('hero-post',    gs('hero_post', d.hero.post));
  var subEl = document.getElementById('hero-sub');
  if (subEl) {
    subEl.innerHTML = esc(gs('hero_sub', d.hero.sub)).replace(/\n/g, '<br>');
  }

  /* 数据栏（数字不变，标签翻译） */
  d.stats.forEach(function (s, i) {
    setText('stat-num-' + i, s.num);
    setText('stat-lbl-' + i, gs('stat_lbl_' + i, s.lbl));
  });

  /* 联系区 */
  setText('contact-phone',  d.contact.display);
  setText('contact-name',   name + t('contact_role'));
  setText('bottom-wa-name', name);

  /* 视频卡 */
  var vg = document.getElementById('video-grid');
  if (vg) {
    vg.innerHTML = d.videos.map(function (v, i) {
      var key   = 'video_' + i;
      var embed = toEmbed(v.url);
      var isDirect = !embed && v.url && (
        /\.(mp4|webm|mov|ogg|avi)(\?|#|$)/i.test(v.url) ||
        /cloudinary\.com/i.test(v.url)
      );
      var thumb = embed
        ? '<iframe src="' + esc(embed) + '" allowfullscreen loading="lazy"></iframe>'
        : isDirect
          ? '<video src="' + esc(v.url) + '" controls playsinline preload="none"></video>'
          : '<div class="vplaceholder"><i class="fas fa-play-circle"></i>'
            + '<small>' + esc(t('coming_soon')) + '</small></div>';
      return (
        '<div class="vcard">'
        + '<div class="vthumb">' + thumb + '</div>'
        + '<div class="vinfo">'
        +   '<span class="vtag">'  + esc(gs(key + '_tag',   v.tag))   + '</span>'
        +   '<h3>'                 + esc(gs(key + '_title', v.title)) + '</h3>'
        +   '<p>'                  + esc(gs(key + '_desc',  v.desc))  + '</p>'
        +   '<div class="vmeta">'
        +     '<span><i class="fas fa-clock"></i>' + esc(gs(key + '_dur', v.dur)) + '</span>'
        +     '<span><i class="fas fa-user"></i>'  + esc(gs(key + '_lvl', v.lvl)) + '</span>'
        +   '</div>'
        + '</div></div>'
      );
    }).join('');
  }

  /* 产品卡 */
  var pg = document.getElementById('prod-grid');
  if (pg) {
    pg.innerHTML = d.products.map(function (p, i) {
      var key     = 'prod_' + i;
      var isUrl   = /^https?:\/\//i.test(p.img);
      var imgHtml = isUrl
        ? '<img src="' + esc(p.img) + '" alt="' + esc(gs(key + '_name', p.name)) + '">'
        : '<span>' + p.img + '</span>';
      var feats = (p.feats || []).map(function (f, j) {
        return '<li>' + esc(gs(key + '_feat_' + j, f)) + '</li>';
      }).join('');
      var orderMsg = t('order_msg').replace('{name}', name).replace('{product}', p.name);
      return (
        '<div class="pcard">'
        + '<div class="pcard-img">'
        +   imgHtml
        +   '<span class="pbadge' + (p.red ? ' red' : '') + '">'
        +     esc(gs(key + '_badge', p.badge))
        +   '</span>'
        + '</div>'
        + '<div class="pcard-body">'
        +   '<h3>' + esc(gs(key + '_name', p.name)) + '</h3>'
        +   '<p>'  + esc(gs(key + '_desc', p.desc)) + '</p>'
        +   '<ul class="features">' + feats + '</ul>'
        +   '<div class="price-row">'
        +     '<span class="price">'     + esc(p.price) + '</span>'
        +     '<span class="price-ori">' + esc(p.ori)   + '</span>'
        +     '<span class="price-save">'+ esc(p.save)  + '</span>'
        +   '</div>'
        +   '<a class="btn-order" href="https://wa.me/' + wa
        +      '?text=' + encodeURIComponent(orderMsg) + '" target="_blank">'
        +     '<i class="fa-brands fa-whatsapp"></i> ' + esc(t('order_btn'))
        +   '</a>'
        + '</div></div>'
      );
    }).join('');
  }

  /* 使用步骤 */
  var sg = document.getElementById('steps-grid');
  if (sg) {
    sg.innerHTML = d.steps.map(function (s, i) {
      var key = 'step_' + i;
      return (
        '<div class="step">'
        + '<div class="step-num">' + (i + 1) + '</div>'
        + '<h4>' + esc(gs(key + '_title', s.title)) + '</h4>'
        + '<p>'  + esc(gs(key + '_desc',  s.desc))  + '</p>'
        + '</div>'
      );
    }).join('');
  }
}

/* ── 应用语言到静态文案（data-i18n 属性）── */
function applyLang() {
  var lang = getLang();
  ['zh', 'en', 'my'].forEach(function (l) {
    var btn = document.getElementById('lang-' + l);
    if (btn) btn.classList.toggle('active', l === lang);
  });
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
}

/* ── 切换语言入口 ────────────────────────── */
function switchLang(lang) {
  setLang(lang);
  renderPage(getData());
  applyLang();
}

/* ── 页面初始化 ─────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  renderPage(getData());
  applyLang();

  /* 汉堡菜单 */
  var toggle = document.getElementById('navToggle');
  var menu   = document.getElementById('navMenu');
  var icon   = document.getElementById('navIcon');
  if (toggle && menu && icon) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      icon.className = open ? 'fas fa-times' : 'fas fa-bars';
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.remove('open');
        icon.className = 'fas fa-bars';
      });
    });
  }

  /* 平滑滚动 */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
