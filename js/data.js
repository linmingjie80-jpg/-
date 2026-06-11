/* ═══════════════════════════════════════════
   data.js — 共享数据 & 工具函数
   index.html 和 admin.html 都依赖此文件
═══════════════════════════════════════════ */

/* ── 默认数据（唯一来源）─────────────────── */
var DEFAULT = {
  pw: 'admin888',
  contact: {
    display: '012-667 7895',
    wa:      '60126677895',
    name:    '阿迪'
  },
  hero: {
    tag:  '🌸 专业富贵花种植养护',
    pre:  '让你的 ',
    em:   '富贵花',
    post: '开得更美、更旺盛',
    sub:  '完整种植教学视频 · 专业配方养护药水\n专人指导，全程跟进，简单易学'
  },
  stats: [
    { num: '500+', lbl: '学员成功种植' },
    { num: '6',    lbl: '专业教学视频' },
    { num: '100%', lbl: '专业配方' },
    { num: '3款',  lbl: '专业养护药水' }
  ],
  videos: [
    { tag: '基础入门', title: '选盆选土 — 打好富贵花的基础',   desc: '如何挑选合适花盆与培土配方，让富贵花一开始就赢在起跑线。', dur: '约 15 分钟', lvl: '新手必看', url: '' },
    { tag: '浇水施肥', title: '正确浇水 & 施肥时机',           desc: '掌握浇水频率与施肥量，避免烂根和黄叶，让植株健壮生长。',   dur: '约 12 分钟', lvl: '实用技巧', url: '' },
    { tag: '药水使用', title: '专用药水完整使用示范',           desc: '详细示范催花液、营养液、防虫喷剂的正确使用方法与剂量。',   dur: '约 10 分钟', lvl: '配合产品', url: '' },
    { tag: '病虫防治', title: '常见病害 & 虫害识别处理',       desc: '认识富贵花常见病虫害，早发现早处理，守护花株全年健康。',   dur: '约 18 分钟', lvl: '进阶内容', url: '' },
    { tag: '修剪整形', title: '修剪整形让花更茂盛',             desc: '学习正确修剪部位与时机，促进分枝，花开更多、树形更美观。', dur: '约 14 分钟', lvl: '进阶技巧', url: '' },
    { tag: '换盆换土', title: '换盆换土完整操作教学',           desc: '掌握最佳换盆时机与步骤，减少伤根，让花株快速恢复活力。',  dur: '约 20 分钟', lvl: '定期维护', url: '' }
  ],
  products: [
    { img: '🌸', badge: '热销第一', red: true,  name: '富贵花催花液',     desc: '专为富贵花研发的催花配方，促进花苞分化，花期提前、花朵数量倍增。',         feats: ['经专业研发，效果经过验证', '7 天内可见花苞数量明显增加', '适合室内室外盆栽，全年使用', '容量：500ml / 瓶（约使用 2 个月）'], price: 'RM 38', ori: 'RM 55', save: '省 RM17' },
    { img: '💧', badge: '专业配方', red: false, name: '根系活化营养液',   desc: '深层滋养根系，增强养分吸收，防止烂根黄叶，让富贵花根粗叶绿、充满生命力。', feats: ['海藻精华 + 腐植酸复合配方', '促进新根生长，有效防止烂根', '换盆后使用，恢复速度快 3 倍', '容量：600ml / 瓶（约使用 3 个月）'], price: 'RM 42', ori: 'RM 60', save: '省 RM18' },
    { img: '🛡️', badge: '防虫护花', red: false, name: '专业防虫防病喷剂', desc: '苦楝油 + 大蒜精华配方，有效驱除蚜虫、红蜘蛛、白粉病，不伤花叶。', feats: ['使用时请佩戴口罩，远离儿童', '预防为主，每两周喷一次', '喷叶背效果倍增，全面防护', '容量：400ml / 瓶，即喷即用'], price: 'RM 35', ori: 'RM 48', save: '省 RM13' },
    { img: '🎁', badge: '超值套装', red: true,  name: '富贵花养护三件套', desc: '催花液 + 根系营养液 + 防虫喷剂，完整养护方案一次打包，附送专属使用手册。',   feats: ['三款核心药水齐全，一套搞定', '附赠：图文使用教程手册', '套装价比单购节省 RM 25', '限量优惠，送完即止'], price: 'RM 90', ori: 'RM 115', save: '省 RM25' }
  ],
  steps: [
    { title: '浇水后施用', desc: '浇透水后 1 小时内，土壤微湿状态下施用，效果最好。' },
    { title: '按比例稀释', desc: '催花液 1:100 稀释；营养液 1:80 稀释；防虫剂直接喷用。' },
    { title: '均匀淋施',   desc: '沿花盆边缘均匀淋入土壤，避免直接淋在茎干上。' },
    { title: '每两周一次', desc: '催花期每 2 周用一次，平日保养每月 1–2 次即可。' }
  ],
  /* 动态内容翻译（deepMerge 会用 admin 翻译覆盖预设值） */
  i18n: {
    en: {
      hero_tag:  '🌸 Professional 富贵花 Growing & Care',
      hero_pre:  'Make Your ',
      hero_em:   '富贵花',
      hero_post: 'Bloom More Beautifully',
      hero_sub:  'Complete growing tutorials · Professional care solutions\nPersonal guidance, full follow-up, easy to learn',
      stat_lbl_0: 'Students Succeeded', stat_lbl_1: 'Tutorial Videos',
      stat_lbl_2: 'Natural Formula',    stat_lbl_3: 'Care Solutions',
      video_0_title: 'Choosing Pots & Soil — The Right Foundation',
      video_0_desc:  'How to select the right pot and soil mix so your 富贵花 gets the best possible start.',
      video_0_tag: 'Basics', video_0_dur: '~15 min', video_0_lvl: 'Beginners Must-Watch',
      video_1_title: 'Correct Watering & Fertilising Schedule',
      video_1_desc:  'Master watering frequency and fertiliser amounts to prevent root rot and yellow leaves.',
      video_1_tag: 'Water & Fertilise', video_1_dur: '~12 min', video_1_lvl: 'Practical Tips',
      video_2_title: 'Complete Guide to Using the Care Products',
      video_2_desc:  'Step-by-step demonstration of the correct usage and dosage for each care solution.',
      video_2_tag: 'Product Usage', video_2_dur: '~10 min', video_2_lvl: 'Pairs with Products',
      video_3_title: 'Identifying & Treating Common Pests & Diseases',
      video_3_desc:  'Spot problems early and act fast to keep your plant healthy all year round.',
      video_3_tag: 'Pest Control', video_3_dur: '~18 min', video_3_lvl: 'Advanced',
      video_4_title: 'Pruning & Shaping for Fuller Blooms',
      video_4_desc:  'Learn the right spots and timing to prune — encourage branching and a beautiful shape.',
      video_4_tag: 'Pruning', video_4_dur: '~14 min', video_4_lvl: 'Advanced Tips',
      video_5_title: 'Repotting — Complete Step-by-Step Tutorial',
      video_5_desc:  'Get the timing right to minimise root damage and let your plant recover quickly.',
      video_5_tag: 'Repotting', video_5_dur: '~20 min', video_5_lvl: 'Regular Maintenance',
      prod_0_name:   '富贵花 Bloom Booster',
      prod_0_desc:   'A specially formulated bloom booster that promotes bud differentiation, bringing forward flower season and multiplying blossom count.',
      prod_0_badge:  'Best Seller',
      prod_0_feat_0: 'Professionally formulated, proven effective results',
      prod_0_feat_1: 'Visible increase in bud count within 7 days',
      prod_0_feat_2: 'Suitable for indoor & outdoor pots, use year-round',
      prod_0_feat_3: 'Volume: 500 ml / bottle (~2 months\' supply)',
      prod_1_name:   'Root Vitality Nutrient Solution',
      prod_1_desc:   'Deep-nourishes the root system, enhances nutrient absorption, prevents root rot and yellow leaves.',
      prod_1_badge:  'Natural Formula',
      prod_1_feat_0: 'Seaweed extract + humic acid complex formula',
      prod_1_feat_1: 'Promotes new root growth, effectively prevents root rot',
      prod_1_feat_2: 'Use after repotting — recovery 3× faster',
      prod_1_feat_3: 'Volume: 600 ml / bottle (~3 months\' supply)',
      prod_2_name:   'Professional Pest & Disease Spray',
      prod_2_desc:   'Neem oil + garlic extract formula effectively repels aphids, spider mites and powdery mildew — won\'t harm petals or leaves.',
      prod_2_badge:  'Pest Protection',
      prod_2_feat_0: 'Wear a mask during application, keep away from children',
      prod_2_feat_1: 'Prevention-first: spray every two weeks',
      prod_2_feat_2: 'Spray undersides of leaves for maximum protection',
      prod_2_feat_3: 'Volume: 400 ml / bottle, ready to use',
      prod_3_name:   '富贵花 Care Bundle (3-in-1)',
      prod_3_desc:   'Bloom Booster + Root Nutrient Solution + Pest Spray — complete care in one bundle, with an exclusive usage guide.',
      prod_3_badge:  'Best Value',
      prod_3_feat_0: 'All 3 core solutions — complete protection',
      prod_3_feat_1: 'Bonus: illustrated care instruction booklet',
      prod_3_feat_2: 'Bundle saves RM 25 vs buying separately',
      prod_3_feat_3: 'Limited promo — while stocks last',
      step_0_title: 'Water First',
      step_0_desc:  'Apply within 1 hour of watering, when soil is slightly moist — best results.',
      step_1_title: 'Dilute to Ratio',
      step_1_desc:  'Bloom Booster 1:100; Nutrient Solution 1:80; Pest Spray use undiluted.',
      step_2_title: 'Apply Evenly',
      step_2_desc:  'Pour along the pot edge into the soil. Avoid pouring directly onto the stem.',
      step_3_title: 'Every Two Weeks',
      step_3_desc:  'During bloom season: every 2 weeks. Regular maintenance: 1–2 times per month.'
    },
    my: {
      hero_tag:  '🌸 Penanaman & Penjagaan 富贵花 Profesional',
      hero_pre:  'Jadikan ',
      hero_em:   '富贵花',
      hero_post: 'Mekar Lebih Cantik & Subur',
      hero_sub:  'Tutorial penanaman lengkap · Larutan penjagaan profesional\nBimbingan peribadi, susulan penuh, mudah dipelajari',
      stat_lbl_0: 'Pelajar Berjaya',   stat_lbl_1: 'Video Tutorial',
      stat_lbl_2: 'Formula Semulajadi', stat_lbl_3: 'Larutan Penjagaan',
      video_0_title: 'Pilih Pasu & Tanah — Asas yang Kukuh',
      video_0_desc:  'Cara memilih pasu dan campuran tanah yang sesuai supaya 富贵花 anda bermula dengan baik.',
      video_0_tag: 'Asas', video_0_dur: '~15 minit', video_0_lvl: 'Wajib Pemula',
      video_1_title: 'Teknik Penyiraman & Jadual Baja yang Betul',
      video_1_desc:  'Kuasai kekerapan penyiraman dan jumlah baja untuk elak akar reput dan daun kuning.',
      video_1_tag: 'Siram & Baja', video_1_dur: '~12 minit', video_1_lvl: 'Tips Praktikal',
      video_2_title: 'Panduan Lengkap Penggunaan Produk Penjagaan',
      video_2_desc:  'Demonstrasi langkah demi langkah cara guna dan dos yang betul untuk setiap larutan.',
      video_2_tag: 'Guna Produk', video_2_dur: '~10 minit', video_2_lvl: 'Bersama Produk',
      video_3_title: 'Kenali & Rawat Perosak dan Penyakit Biasa',
      video_3_desc:  'Kesan masalah awal dan bertindak pantas untuk menjaga pokok sihat sepanjang tahun.',
      video_3_tag: 'Kawalan Perosak', video_3_dur: '~18 minit', video_3_lvl: 'Lanjutan',
      video_4_title: 'Pemangkasan untuk Bunga Lebih Lebat',
      video_4_desc:  'Pelajari tempat dan masa pemangkasan yang betul — galakkan percambahan dan bentuk cantik.',
      video_4_tag: 'Pemangkasan', video_4_dur: '~14 minit', video_4_lvl: 'Tips Lanjutan',
      video_5_title: 'Tukar Pasu — Tutorial Lengkap Langkah demi Langkah',
      video_5_desc:  'Pilih masa yang tepat dan minimumkan kecederaan akar supaya pokok pulih dengan cepat.',
      video_5_tag: 'Tukar Pasu', video_5_dur: '~20 minit', video_5_lvl: 'Penyelenggaraan Rutin',
      prod_0_name:   '富贵花 Pemacu Bunga',
      prod_0_desc:   'Formula pemacu bunga khas yang menggalakkan pembezaan kuncup, mempercepatkan musim bunga dan melipatgandakan jumlah bunga.',
      prod_0_badge:  'Terlaris',
      prod_0_feat_0: 'Formula profesional, keputusan terbukti berkesan',
      prod_0_feat_1: 'Peningkatan kuncup ketara dalam 7 hari',
      prod_0_feat_2: 'Sesuai untuk pasu dalam & luar rumah, guna sepanjang tahun',
      prod_0_feat_3: 'Isipadu: 500 ml / botol (~bekalan 2 bulan)',
      prod_1_name:   'Larutan Nutrisi Pengaktif Akar',
      prod_1_desc:   'Menutrisi sistem akar secara mendalam, tingkatkan penyerapan nutrien, cegah akar reput dan daun kuning.',
      prod_1_badge:  'Formula Semulajadi',
      prod_1_feat_0: 'Ekstrak rumpai laut + formula komposit asid humik',
      prod_1_feat_1: 'Galakkan pertumbuhan akar baru, cegah akar reput',
      prod_1_feat_2: 'Guna selepas tukar pasu — pemulihan 3× lebih cepat',
      prod_1_feat_3: 'Isipadu: 600 ml / botol (~bekalan 3 bulan)',
      prod_2_name:   'Semburan Perosak & Penyakit Profesional',
      prod_2_desc:   'Formula minyak nim + ekstrak bawang putih menghalau kutu daun, tungau dan tepung putih — tidak merosakkan bunga dan daun.',
      prod_2_badge:  'Perlindungan Perosak',
      prod_2_feat_0: 'Pakai pelitup muka semasa penggunaan, jauhkan dari kanak-kanak',
      prod_2_feat_1: 'Utamakan pencegahan: sembur setiap dua minggu',
      prod_2_feat_2: 'Sembur bahagian bawah daun untuk perlindungan penuh',
      prod_2_feat_3: 'Isipadu: 400 ml / botol, sedia guna',
      prod_3_name:   'Set Penjagaan 富贵花 (3-dalam-1)',
      prod_3_desc:   'Pemacu Bunga + Larutan Nutrisi Akar + Semburan Perosak — penjagaan lengkap dalam satu set, dengan panduan penggunaan eksklusif.',
      prod_3_badge:  'Nilai Terbaik',
      prod_3_feat_0: 'Ketiga-tiga larutan utama — perlindungan menyeluruh',
      prod_3_feat_1: 'Bonus: buku panduan penjagaan bergambar',
      prod_3_feat_2: 'Set jimat RM 25 berbanding beli berasingan',
      prod_3_feat_3: 'Promosi terhad — habis stok tidak ditambah',
      step_0_title: 'Siram Dahulu',
      step_0_desc:  'Guna dalam masa 1 jam selepas menyiram, ketika tanah sedikit lembap — kesan terbaik.',
      step_1_title: 'Cairkan Mengikut Nisbah',
      step_1_desc:  'Pemacu Bunga 1:100; Larutan Nutrisi 1:80; Semburan Perosak guna terus tanpa mencairkan.',
      step_2_title: 'Tuangkan Secara Rata',
      step_2_desc:  'Tuang di sepanjang tepi pasu ke dalam tanah. Elak tuang terus pada batang.',
      step_3_title: 'Setiap Dua Minggu',
      step_3_desc:  'Semasa musim berbunga: setiap 2 minggu. Penyelenggaraan biasa: 1–2 kali sebulan.'
    }
  }
};

/* ── localStorage 读写 ───────────────────── */
function getData() {
  try {
    var raw = localStorage.getItem('fgh_data');
    if (raw) {
      var stored = JSON.parse(raw);
      // 深合并：用 DEFAULT 做底，stored 覆盖已有字段
      return deepMerge(JSON.parse(JSON.stringify(DEFAULT)), stored);
    }
  } catch (e) { /* 损坏数据忽略 */ }
  return JSON.parse(JSON.stringify(DEFAULT));
}

function saveData(d) {
  localStorage.setItem('fgh_data', JSON.stringify(d));
}

/* ── 深合并（数组整体替换，对象递归合并）── */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  Object.keys(source).forEach(function (k) {
    var sv = source[k];
    if (Array.isArray(sv)) {
      // 数组整体替换（保持长度一致）
      target[k] = sv;
    } else if (sv !== null && typeof sv === 'object') {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k], sv);
    } else if (sv !== undefined) {
      target[k] = sv;
    }
  });
  return target;
}

/* ── HTML 转义（防 XSS）─────────────────── */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── YouTube URL → embed URL ────────────── */
function toEmbed(url) {
  if (!url) return '';
  url = url.trim();
  // 安全检查：只允许 http/https
  if (!/^https?:\/\//i.test(url)) return '';
  // 普通 watch 链接
  var m = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return 'https://www.youtube.com/embed/' + m[1] + '?rel=0';
  // 已是 embed 链接
  if (/youtube\.com\/embed\/[A-Za-z0-9_-]{11}/.test(url)) return url;
  // Vimeo player
  if (/player\.vimeo\.com\/video\/\d+/.test(url)) return url;
  // 其余 URL 拒绝（防止嵌入不明来源）
  return '';
}

/* ── 多语言翻译表 ─────────────────────────── */
var LANG = {
  zh: {
    nav_videos:    '教学视频',
    nav_products:  '药水购买',
    nav_howto:     '使用方法',
    nav_contact:   '联系我们',
    btn_watch:     '观看教学视频',
    btn_buy:       '选购养护药水',
    sec_videos_h:  '🎬 富贵花 <span>教学视频</span>',
    sec_videos_p:  '由专家亲自示范，从零开始，轻松掌握每一个种植技巧',
    sec_prods_h:   '🧪 专业 <span>养护药水</span>',
    sec_prods_p:   '专业配方，让富贵花开得更旺、更美、更持久',
    sec_steps_h:   '📋 <span>使用方法</span> — 简单 4 步',
    sec_steps_p:   '按步骤操作，效果最大化，简单易学',
    contact_h:     '有疑问？<span>WhatsApp</span> 咨询我',
    contact_p:     '专人为你解答种植问题、推荐合适药水，随时都可以问！',
    contact_wa:    '立即 WhatsApp 咨询',
    footer_p:      '© 2025 富贵花专业种植养护 &nbsp;|&nbsp; <span>全马配送</span> &nbsp;|&nbsp; 专业配方',
    wa_msg:        '您好{name}！我想了解富贵花种植和药水的更多资讯，谢谢！',
    coming_soon:   '视频即将上线',
    order_btn:     'WhatsApp 订购',
    order_msg:     '您好{name}，我想订购【{product}】，请问有货吗？',
    contact_role:  ' — 富贵花种植顾问',
    bottom_wa:     'WhatsApp 咨询 '
  },
  en: {
    nav_videos:    'Tutorial Videos',
    nav_products:  'Buy Products',
    nav_howto:     'How to Use',
    nav_contact:   'Contact Us',
    btn_watch:     'Watch Tutorials',
    btn_buy:       'Shop Products',
    sec_videos_h:  '🎬 富贵花 <span>Tutorial Videos</span>',
    sec_videos_p:  'Expert demonstrations from scratch — master every growing technique',
    sec_prods_h:   '🧪 Professional <span>Care Products</span>',
    sec_prods_p:   'Professional formula — for blooming, beautiful, long-lasting flowers',
    sec_steps_h:   '📋 <span>How to Use</span> — 4 Simple Steps',
    sec_steps_p:   'Follow the steps for maximum results — easy to learn',
    contact_h:     'Questions? Chat on <span>WhatsApp</span>',
    contact_p:     'Our consultant will answer your growing questions and recommend the right products anytime!',
    contact_wa:    'WhatsApp Us Now',
    footer_p:      '© 2025 富贵花 Professional Growing Care &nbsp;|&nbsp; <span>Nationwide Delivery</span> &nbsp;|&nbsp; Professional Formula',
    wa_msg:        'Hi {name}! I would like to learn more about 富贵花 growing and care products, thank you!',
    coming_soon:   'Video Coming Soon',
    order_btn:     'WhatsApp Order',
    order_msg:     'Hi {name}, I would like to order 【{product}】, is it still available?',
    contact_role:  ' — 富贵花 Growing Consultant',
    bottom_wa:     'WhatsApp '
  },
  my: {
    nav_videos:    'Video Tutorial',
    nav_products:  'Beli Produk',
    nav_howto:     'Cara Guna',
    nav_contact:   'Hubungi Kami',
    btn_watch:     'Tonton Tutorial',
    btn_buy:       'Beli Produk',
    sec_videos_h:  '🎬 富贵花 <span>Video Tutorial</span>',
    sec_videos_p:  'Demonstrasi pakar dari awal — kuasai setiap teknik penanaman',
    sec_prods_h:   '🧪 Produk <span>Penjagaan Pro</span>',
    sec_prods_p:   'Formula profesional — bunga cantik mekar tahan lama',
    sec_steps_h:   '📋 <span>Cara Penggunaan</span> — 4 Langkah',
    sec_steps_p:   'Ikut langkah untuk hasil terbaik — mudah dipelajari',
    contact_h:     'Ada soalan? <span>WhatsApp</span> kami',
    contact_p:     'Perunding kami sedia menjawab soalan dan mengesyorkan produk yang sesuai bila-bila masa!',
    contact_wa:    'WhatsApp Sekarang',
    footer_p:      '© 2025 富贵花 Penjagaan Profesional &nbsp;|&nbsp; <span>Penghantaran Seluruh MY</span> &nbsp;|&nbsp; Formula Profesional',
    wa_msg:        'Hai {name}! Saya ingin tahu lebih lanjut tentang 富贵花 dan produk penjagaan, terima kasih!',
    coming_soon:   'Video Akan Datang',
    order_btn:     'Pesan WhatsApp',
    order_msg:     'Hai {name}, saya ingin membeli 【{product}】, masih ada stok?',
    contact_role:  ' — Perunding Penanaman 富贵花',
    bottom_wa:     'WhatsApp '
  }
};

/* ── 语言 读/写/翻译 ──────────────────────── */
function getLang() {
  var l = localStorage.getItem('fgh_lang');
  return (l === 'en' || l === 'my') ? l : 'zh';
}

function setLang(l) {
  if (l === 'zh' || l === 'en' || l === 'my') localStorage.setItem('fgh_lang', l);
}

function t(key) {
  var l = getLang();
  var val = LANG[l] && LANG[l][key];
  return val !== undefined ? val : (LANG.zh[key] || key);
}

/* ── 读取动态内容的翻译（d 为当前数据对象）── */
function getStr(d, key, zhText) {
  var lang = getLang();
  if (lang === 'zh') return zhText;
  var val = d.i18n && d.i18n[lang] && d.i18n[lang][key];
  return (val !== undefined && val !== '') ? val : zhText;
}
