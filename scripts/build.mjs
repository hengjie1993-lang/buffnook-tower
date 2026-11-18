/* ============================================================
   BuffNook Tower · Site Build Script
   Reads data/games.json + _templates/*.html
   Generates games/<slug>/index.html, games/index.html,
   games/latest/index.html, games/popular/index.html, sitemap.xml
   ============================================================ */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
  const prefix = depthPrefix(targetRel);

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
    IFRAME: prefix + g.iframe,
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

    HOME_LINK: prefix,
    GAMES_LINK: prefix + 'games/index.html',
    BLOG_LINK: prefix + 'blog/index.html',
    ABOUT_LINK: prefix + 'about.html',
    CONTACT_LINK: prefix + 'contact.html',
    PRIVACY_LINK: prefix + 'privacy.html',
    TERMS_LINK: prefix + 'terms.html',
    CSS_PATH: prefix + 'assets/css/style.css',
    JS_PATH: prefix + 'assets/js/app.js',

    HOME_CANONICAL: SITE_URL + '/',
    GAMES_CANONICAL: `${SITE_URL}/games/`,
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
    HOME_LINK: prefix,
    GAMES_LINK: prefix + 'games/index.html',
    BLOG_LINK: prefix + 'blog/index.html',
    ABOUT_LINK: prefix + 'about.html',
    CONTACT_LINK: prefix + 'contact.html',
    PRIVACY_LINK: prefix + 'privacy.html',
    TERMS_LINK: prefix + 'terms.html',
    CSS_PATH: prefix + 'assets/css/style.css',
    JS_PATH: prefix + 'assets/js/app.js',
    JSONLD: `<script type="application/ld+json">${breadcrumbJsonLd}</script>`,
    BODY: body,
  };

  const html = renderTemplate(pageTpl, vars);
  const targetAbs = join(ROOT, targetRel);
  writeFileSync(targetAbs, html, 'utf8');
  console.log(`[build] ✓ ${targetRel}`);
}

// games/index.html — 全量
buildListPage({
  targetRel: 'games/index.html',
  i18nKey: 'list.games',
  title: 'All Games · BuffNook Tower',
  description: 'Browse all physics stacking games on BuffNook Tower.',
  h2: 'All games',
  intro: 'Every game currently live on BuffNook Tower. New ones drop as we build them.',
  sortKey: null, // 保持 JSON 顺序
});

// games/latest/index.html — 按 dateAdded 倒序
buildListPage({
  targetRel: 'games/latest/index.html',
  i18nKey: 'list.latest',
  title: 'Latest Games · BuffNook Tower',
  description: 'The most recently added games on BuffNook Tower.',
  h2: 'Latest arrivals',
  intro: 'Fresh releases on BuffNook Tower, sorted by release date.',
  sortKey: 'dateAdded',
});

// games/popular/index.html — 按 popular 倒序
buildListPage({
  targetRel: 'games/popular/index.html',
  i18nKey: 'list.popular',
  title: 'Popular Games · BuffNook Tower',
  description: 'The most-played games on BuffNook Tower.',
  h2: 'Most popular',
  intro: 'The games that get the most plays from the community.',
  sortKey: 'popular',
});

// blog/index.html（空壳，posts.json 为空）
buildListPage({
  targetRel: 'blog/index.html',
  i18nKey: 'list.blog',
  title: 'Blog · BuffNook Tower',
  description: 'Dev logs, design notes, and stacking tips from the BuffNook Tower team.',
  h2: 'Blog',
  intro: 'Dev logs, design notes, and stacking tips. More posts coming soon.',
  sortKey: null,
  items: [],
  emptyKey: 'blog.empty',
  emptyText: 'No posts yet — check back soon.',
});

// ---------- 生成 sitemap.xml ----------
const urls = [
  { url: SITE_URL + '/', changefreq: 'daily', priority: '1.0' },
  { url: `${SITE_URL}/games/`, changefreq: 'weekly', priority: '0.9' },
  { url: `${SITE_URL}/games/latest/`, changefreq: 'weekly', priority: '0.7' },
  { url: `${SITE_URL}/games/popular/`, changefreq: 'weekly', priority: '0.7' },
  { url: `${SITE_URL}/blog/`, changefreq: 'weekly', priority: '0.6' },
  { url: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.3' },
  { url: `${SITE_URL}/privacy`, changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/terms`, changefreq: 'yearly', priority: '0.1' },
  { url: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.2' },
  ...gamePages.map(p => ({ url: p.url, changefreq: 'weekly', priority: '0.8' })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.url}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
console.log(`[build] ✓ sitemap.xml (${urls.length} URLs)`);

console.log('\n[build] done.');
