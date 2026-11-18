/* ============================================================
   BuffNook Tower · Site Build Script
   Reads data/games.json + _templates/*.html
   Generates games/<slug>/index.html and sitemap.xml
   （列表页入口暂不生成，组件保留备用）
   ============================================================ */
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITE_URL = 'https://buffnook.com';

// ---------- 工具：按目标文件深度生成前缀 ----------
function depthPrefix(targetRelPath) {
  // targetRelPath 例如 "games/buffnook-tower/index.html" → depth 2 → "../../"
  // targetRelPath 例如 "index.html" → depth 0 → ""
  const parts = targetRelPath.split('/');
  const dirs = parts.length - 1; // 文件名不算
  if (dirs === 0) return '';
  return '../'.repeat(dirs);
}

// ---------- 工具：简单模板替换 {{VAR}} / {{#BLOCK}}...{{/BLOCK}} ----------
function renderTemplate(tpl, vars) {
  let out = tpl;
  // 先处理条件块 {{#NAME}}...{{/NAME}}
  out = out.replace(/\{\{#([A-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (m, name, body) => {
    const val = vars[name];
    if (!val) return '';
    return body;
  });
  // 再处理变量 {{NAME}}
  out = out.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, name) => {
    return vars[name] !== undefined ? String(vars[name]) : '';
  });
  return out;
}

// ---------- 读取源数据 ----------
const gamesData = JSON.parse(readFileSync(join(ROOT, 'data/games.json'), 'utf8'));
const games = gamesData.games || [];
console.log(`[build] ${games.length} games loaded from data/games.json`);

const gameTpl = readFileSync(join(ROOT, '_templates/game.html'), 'utf8');
const pageTpl = readFileSync(join(ROOT, '_templates/page.html'), 'utf8');

// ---------- 生成游戏内页 ----------
const gamePages = []; // 用于 sitemap

for (const g of games) {
  const targetRel = `games/${g.slug}/index.html`;

  // HowTo blocks
  const howtoModes = ['kbd', 'mouse', 'touch'];
  const howtoBlocks = (g.howto || []).map((h, i) => `
        <div class="howto">
          <h3><span class="kbd" data-i18n="how.${howtoModes[i]}.mode">${h.mode}</span> <span data-i18n="how.${howtoModes[i]}.title">${h.keys}</span></h3>
          <p data-i18n="how.${howtoModes[i]}.body">${h.text}</p>
        </div>`).join('');

  // Goal block
  const goalBlock = g.goal ? `
      <div class="prose" style="margin-top:18px;">
        <h3 data-i18n="how.goal.title">Goal & scoring</h3>
        <p data-i18n="how.goal.body">${g.goal}</p>
      </div>` : '';

  // Tips cards
  const tipsBlocks = (g.tips || []).map((t, i) => `
        <div class="card">
          <div class="card-num">${t.num}</div>
          <h3 data-i18n="tips.${i + 1}.title">${t.title}</h3>
          <p data-i18n="tips.${i + 1}.body">${t.text}</p>
        </div>`).join('');

  // FAQ details
  const faqBlocks = (g.faq || []).map((f, i) => `
        <details><summary data-i18n="faq.q${i + 1}">${f.q}</summary>
          <p data-i18n="faq.a${i + 1}">${f.a}</p>
        </details>`).join('');

  // FAQ JSON-LD entries
  const faqJsonLd = (g.faq || []).map(f =>
    `{"@type": "Question", "name": ${JSON.stringify(f.q)}, "acceptedAnswer": {"@type": "Answer", "text": ${JSON.stringify(f.a.replace(/<[^>]+>/g, ''))}}}`
  ).join(',\n        ');

  const coverMark = (g.name || 'BN').slice(0, 2).toUpperCase();

  const whatSentence = g.intro ? g.intro.split('.')[0] + '.' : '';

  const vars = {
    TITLE: g.title || `${g.name} · BuffNook`,
    DESCRIPTION: g.description || '',
    CANONICAL: `${SITE_URL}/games/${g.slug}/`,
    OG_IMAGE: `${SITE_URL}/assets/img/logo.png`,
    TITLE_I18N: `game.${g.slug}.page.title`,
    NAME: g.name,
    SLUG: g.slug,
    H1: g.h1 || g.name,
    SUBTITLE: g.subtitle || g.description || '',
    IFRAME: '/' + g.iframe,
    COVER_MARK: coverMark,
    WHAT_SENTENCE: whatSentence,
    INTRO: g.intro || '',
    HOWTO_HEAD: g.howtoHead || 'Land blocks, keep balance, decide when to bank.',
    HOWTO_BLOCKS: howtoBlocks,
    GOAL_BLOCK: goalBlock,
    TIPS_HEAD: g.tipsHead || 'Three habits that win rounds consistently.',
    TIPS_BLOCKS: tipsBlocks,
    FAQ_BLOCKS: faqBlocks,
    FAQ_JSONLD: faqJsonLd,

    HOME_LINK: '/',
    ABOUT_LINK: '/about',
    CONTACT_LINK: '/contact',
    PRIVACY_LINK: '/privacy',
    TERMS_LINK: '/terms',
    DISCLAIMER_LINK: '/disclaimer',
    CSS_PATH: '/assets/css/style.css',
    JS_PATH: '/assets/js/app.js',

    HOME_CANONICAL: SITE_URL + '/',
  };

  const html = renderTemplate(gameTpl, vars);
  const targetAbs = join(ROOT, targetRel);
  writeFileSync(targetAbs, html, 'utf8');
  gamePages.push({ slug: g.slug, url: `${SITE_URL}/games/${g.slug}/`, date: g.dateAdded });
  console.log(`[build] ✓ ${targetRel}`);
}

// ---------- 生成列表页 ----------
function renderGameCards(list, prefix) {
  return list.map(g => {
    const href = `${prefix}games/${g.slug}/`;
    const desc = (g.description || g.intro || '').slice(0, 100);
    return `
      <a class="related-card" href="${href}">
        <img class="related-cover" src="${g.cover || `${prefix}assets/img/cover.png`}" alt="${g.name} cover" loading="lazy" onerror="this.style.display='none'">
        <div class="related-info">
          <div class="related-name">${g.name}</div>
          <div class="related-desc" data-i18n="game.${g.slug}.desc">${desc}</div>
        </div>
      </a>`;
  }).join('');
}

function buildListPage({ targetRel, title, description, h1, h2, intro, sortKey, i18nKey, items = games, emptyKey = 'list.empty', emptyText = 'No games yet — check back soon.' }) {
  const prefix = depthPrefix(targetRel);
  let sorted = [...items];
  if (sortKey === 'dateAdded') sorted.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
  else if (sortKey === 'popular') sorted.sort((a, b) => (b.popular || 0) - (a.popular || 0));
  else if (sortKey === 'featured') sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const cardsHtml = renderGameCards(sorted, prefix);
  const canonical = `${SITE_URL}/${targetRel.replace(/index\.html$/, '')}`;
  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
      { '@type': 'ListItem', position: 2, name: h1 || h2, item: canonical },
    ],
  }, null, 2);

  const body = `
  <article class="site">
    <section class="sec sec-head">
      <span class="eyebrow" data-i18n="${i18nKey}.eyebrow">${h2 ? h2.split(' ')[0] || 'Browse' : 'Browse'}</span>
      <h2 data-i18n="${i18nKey}.h1">${h2}</h2>
      <p class="prose" data-i18n="${i18nKey}.intro">${intro}</p>
    </section>
    <section class="sec">
      <div class="related-grid">
        ${cardsHtml || `<p class="prose" data-i18n="${emptyKey}">${emptyText}</p>`}
      </div>
    </section>
  </article>`;

  const vars = {
    TITLE: title,
    DESCRIPTION: description,
    CANONICAL: canonical,
    SLUG: '',
    H1: h1 || h2,
    H1_I18N: `${i18nKey}.h1`,
    TITLE_I18N: `${i18nKey}.page.title`,
    OG_TYPE: 'website',
    OG_IMAGE: `${SITE_URL}/assets/img/logo.png`,
    HOME_LINK: '/',
    ABOUT_LINK: '/about',
    CONTACT_LINK: '/contact',
    PRIVACY_LINK: '/privacy',
    TERMS_LINK: '/terms',
    DISCLAIMER_LINK: '/disclaimer',
    CSS_PATH: '/assets/css/style.css',
    JS_PATH: '/assets/js/app.js',
    JSONLD: `<script type="application/ld+json">${breadcrumbJsonLd}</script>`,
    BODY: body,
  };

  const html = renderTemplate(pageTpl, vars);
  const targetAbs = join(ROOT, targetRel);
  writeFileSync(targetAbs, html, 'utf8');
  console.log(`[build] ✓ ${targetRel}`);
}

// 列表页组件保留备用：当前站点仅一个游戏，首页即游戏主体，
// 为避免产生空壳/重复排序页，暂不生成 games/index、games/latest、games/popular。

// ---------- 生成 /zh/ 中文静态页 ----------
// 从 app.js 提取 I18N 对象（花括号深度扫描，跳过字符串内容）
function extractI18N(source) {
  const start = source.indexOf('var I18N');
  if (start < 0) throw new Error('[build] app.js 中找不到 I18N 字典');
  const open = source.indexOf('{', start);
  let depth = 0, quote = null;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return new Function('return ' + source.slice(open, i + 1))(); }
  }
  throw new Error('[build] I18N 对象解析失败');
}

const i18n = extractI18N(readFileSync(join(ROOT, 'assets/js/app.js'), 'utf8'));
const zhDict = i18n['zh-CN'];

// 元素级翻译：只替换 data-i18n 元素的内部 HTML 与 data-i18n-placeholder 的 placeholder
function translateTo(html, dict, fallback) {
  let out = html.replace(
    /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)data-i18n="([^"]+)"((?:"[^"]*"|'[^']*'|[^>"'])*?)>([\s\S]*?)<\/\1>/g,
    (m, tag, pre, key, post) => {
      const val = dict[key] !== undefined ? dict[key] : fallback[key];
      if (val === undefined) return m;
      return `<${tag}${pre}data-i18n="${key}"${post}>${val}</${tag}>`;
    }
  );
  out = out.replace(
    /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)data-i18n-placeholder="([^"]+)"((?:"[^"]*"|'[^']*'|[^>"'])*?)>/g,
    (m, tag, pre, key, post) => {
      const val = dict[key] !== undefined ? dict[key] : fallback[key];
      if (val === undefined) return m;
      return `<${tag}${pre}data-i18n-placeholder="${key}"${post} placeholder="${String(val).replace(/"/g, '&quot;')}">`;
    }
  );
  return out;
}

const zhPages = [
  {
    src: 'index.html', out: 'zh/index.html', enPath: '/', zhPath: '/zh/',
    title: 'BuffNook 高塔 — 免费浏览器物理平衡与堆塔游戏',
    desc: '在浏览器里免费玩 BuffNook 高塔。在会晃的跷跷板上平衡倾斜方块，驯服 5 种物理增益，在坍塌前锁定分数。每日 UTC 挑战 + 沙盒模式。',
  },
  {
    src: 'about.html', out: 'zh/about.html', enPath: '/about', zhPath: '/zh/about',
    title: '关于 · BuffNook 高塔',
    desc: 'BuffNook 高塔是一个由小团队独立开发的浏览器物理堆塔游戏。无需注册、无需下载、没有付费墙。',
  },
  {
    src: 'contact.html', out: 'zh/contact.html', enPath: '/contact', zhPath: '/zh/contact',
    title: '联系 · BuffNook 高塔',
    desc: '联系 BuffNook 高塔团队：问题反馈、功能建议、媒体与商务合作。',
  },
  {
    src: 'privacy.html', out: 'zh/privacy.html', enPath: '/privacy', zhPath: '/zh/privacy',
    title: '隐私政策 · BuffNook 高塔',
    desc: 'BuffNook 高塔隐私政策：我们在浏览器里保存了什么、Cloudflare 处理了什么，以及统计与广告 Cookie 的处理方式。',
  },
  {
    src: 'terms.html', out: 'zh/terms.html', enPath: '/terms', zhPath: '/zh/terms',
    title: '服务条款 · BuffNook 高塔',
    desc: 'BuffNook 高塔服务条款：免费供个人游玩，不提供担保，欢迎注明出处。',
  },
  {
    src: 'disclaimer.html', out: 'zh/disclaimer.html', enPath: '/disclaimer', zhPath: '/zh/disclaimer',
    title: '免责声明 · BuffNook 高塔',
    desc: 'BuffNook 高塔免责声明：独立游戏与工具站点，与任何第三方游戏发行商均无关联。',
  },
];

mkdirSync(join(ROOT, 'zh'), { recursive: true });

for (const p of zhPages) {
  const canonical = SITE_URL + p.zhPath;
  let html = readFileSync(join(ROOT, p.src), 'utf8');

  // 语言与页面标识
  html = html.replace('<html lang="en">', '<html lang="zh-CN">');
  html = html.replace(/(<body[^>]*?)data-locale="en"/, '$1data-locale="zh-CN"');

  // 标题与描述
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${p.title}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(">)/, `$1${p.desc}$2`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${p.title}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(">)/g, `$1${p.desc}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${p.title}$2`);
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(">)/g, `$1${p.desc}$2`);

  // canonical / og:url / hreflang
  html = html.replace(/(<link rel="canonical" href=")[^"]*(">)/, `$1${canonical}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(">)/, `$1${canonical}$2`);
  html = html.replace(/\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, '');
  html = html.replace(/(<link rel="canonical" href="[^"]*">)/,
    `$1\n<link rel="alternate" hreflang="en" href="${SITE_URL}${p.enPath}">` +
    `\n<link rel="alternate" hreflang="zh-CN" href="${canonical}">` +
    `\n<link rel="alternate" hreflang="x-default" href="${SITE_URL}${p.enPath}">`);

  // 资源与内部链接：改为根绝对路径，并加 /zh 前缀
  html = html.replace(/\s(src|href)="(assets|embed)\//g, ' $1="/$2/');
  html = html.replace(/href="\/(about|contact|privacy|terms|disclaimer)"/g, 'href="/zh/$1"');
  html = html.replace(/href="\/"/g, 'href="/zh/"');
  // 语言按钮最后处理，避免其英文 href 被上面的 /zh 规则改写
  html = html.replace(/<a class="nav-lang" id="site-lang"[^>]*>中文<\/a>/,
    `<a class="nav-lang" id="site-lang" href="${p.enPath}" hreflang="en" rel="alternate" aria-label="Switch to English">EN</a>`);

  // JSON-LD 中的绝对地址同步到中文页
  html = html.replace(/"item": "https:\/\/buffnook\.com\/(about|contact|privacy|terms|disclaimer)"/g, `"item": "${SITE_URL}/zh/$1"`);
  html = html.replace(/"item": "https:\/\/buffnook\.com\/"/g, `"item": "${canonical}"`);
  html = html.replace(/"url": "https:\/\/buffnook\.com\/"/g, `"url": "${canonical}"`);

  html = translateTo(html, zhDict, i18n.en);

  writeFileSync(join(ROOT, p.out), html, 'utf8');
  console.log(`[build] ✓ ${p.out}`);
}

// ---------- 生成 sitemap.xml ----------
// lastmod 取对应源文件的修改时间（YYYY-MM-DD），供 Google 判断抓取优先级
function lastmodOf(relPath) {
  try {
    return statSync(join(ROOT, relPath)).mtime.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

const urls = [
  { url: SITE_URL + '/', lastmod: lastmodOf('index.html'), changefreq: 'daily', priority: '1.0' },
  { url: `${SITE_URL}/zh/`, lastmod: lastmodOf('zh/index.html'), changefreq: 'daily', priority: '0.9' },
  { url: `${SITE_URL}/about`, lastmod: lastmodOf('about.html'), changefreq: 'monthly', priority: '0.3' },
  { url: `${SITE_URL}/zh/about`, lastmod: lastmodOf('zh/about.html'), changefreq: 'monthly', priority: '0.3' },
  { url: `${SITE_URL}/privacy`, lastmod: lastmodOf('privacy.html'), changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/zh/privacy`, lastmod: lastmodOf('zh/privacy.html'), changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/terms`, lastmod: lastmodOf('terms.html'), changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/zh/terms`, lastmod: lastmodOf('zh/terms.html'), changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/disclaimer`, lastmod: lastmodOf('disclaimer.html'), changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/zh/disclaimer`, lastmod: lastmodOf('zh/disclaimer.html'), changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/contact`, lastmod: lastmodOf('contact.html'), changefreq: 'monthly', priority: '0.2' },
  { url: `${SITE_URL}/zh/contact`, lastmod: lastmodOf('zh/contact.html'), changefreq: 'monthly', priority: '0.2' },
  ...gamePages.map(p => ({ url: p.url, lastmod: lastmodOf(`games/${p.slug}/index.html`), changefreq: 'weekly', priority: '0.8' })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.url}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
console.log(`[build] ✓ sitemap.xml (${urls.length} URLs)`);

console.log('\n[build] done.');
