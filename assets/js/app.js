/* ============================================================
   BuffNook Tower · site app.js
   功能：游戏三步加载（封面→动画→iframe）、点赞分享全屏、FAQ 折叠
   架构：无框架、纯原生 JS、事件委托、延迟加载评论区
   ============================================================ */
(function () {
  'use strict';

  // ---------- 预埋 track()：后续接统计只改这个函数体 ----------
  window.track = function (event, payload) {
    // 占位：console.log('[track]', event, payload);
  };

  // ---------- 1. 游戏容器：iframe 自动加载，加载完显示 ----------
  function initGame(container) {
    if (!container) return;
    var iframe = container.querySelector('iframe');
    if (!iframe) return;

    var finish = function () {
      container.classList.remove('game-stage--loading', 'loading');
      container.classList.add('game-stage--loaded', 'loaded');
      window.track('game_loaded');
    };

    // iframe load 事件（浏览器认为加载完成时触发）
    iframe.addEventListener('load', finish, { once: true });

    // 10s 兜底：不管怎样都切到 loaded
    setTimeout(finish, 10000);

    window.track('game_init', { slug: container.dataset.slug || 'buffnook-tower' });
  }

  // ---------- 2. 分享 ----------
  function initShare(btn) {
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var url = location.href;
      var text = 'BuffNook Tower — how high can you build before you should stop?';
      window.track('share_click');

      // 优先系统分享（移动端）
      if (navigator.share) {
        try { await navigator.share({ title: 'BuffNook Tower', text: text, url: url }); window.track('share_native'); return; } catch (_) {}
      }
      // 回退：复制链接
      try {
        await navigator.clipboard.writeText(url);
        toast(document.documentElement.lang === 'zh-CN' ? '链接已复制' : 'Link copied');
        window.track('share_copy');
      } catch (_) {
        // 再回退：prompt 让用户手动复制
        window.prompt(document.documentElement.lang === 'zh-CN' ? '复制链接分享：' : 'Copy this link to share:', url);
      }
    });
  }

  // ---------- 4. 全屏（只让游戏容器全屏，不是整页） ----------
  function initFullscreen(btn) {
    if (!btn) return;
    var container = btn.closest('.game-stage') || document.querySelector('.game-stage');
    if (!container) return;

    btn.addEventListener('click', function () {
      window.track('fullscreen_toggle');
      if (document.fullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else {
        var el = container;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', function () {
      btn.classList.toggle('on', !!document.fullscreenElement);
      btn.querySelector('.icon').textContent = document.fullscreenElement ? '⤢' : '⤢';
    });
  }

  // ---------- 5. FAQ 折叠（纯原生 details/summary，JS 只做可选自动展开） ----------
  function initFaq() {
    var faqs = document.querySelectorAll('.faq details');
    // 只允许同时展开 1 个（手风琴）
    faqs.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) {
          faqs.forEach(function (other) { if (other !== d) other.open = false; });
          window.track('faq_open', { q: d.querySelector('summary').textContent.trim().slice(0, 40) });
        }
      });
    });
  }

  // ---------- 6. 通用 toast ----------
  var toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translate(-50%,8px);' +
        'background:rgba(27,23,20,.94);border:1px solid var(--line);color:var(--ink);' +
        'font-size:12px;padding:8px 14px;border-radius:var(--r-pill);opacity:0;pointer-events:none;' +
        'transition:opacity .16s,transform .16s;z-index:9999;';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translate(-50%, 0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translate(-50%, 8px)';
    }, 1600);
  }

  // ---------- 7. 网站双语字典 ----------
  // 游戏本体的翻译在它自己的 game.js 里，这里只管站点外壳
  var I18N = {
    en: {
      // Nav
      'nav.about': 'About',
      // Hero
      'hero.subtitle': 'Build high — then know when to stop. A free browser physics stacking game.',
      // Buttons
      'btn.share': 'Share',
      'btn.fullscreen': 'Fullscreen',
      // What is it
      'what.eyebrow': 'What is it',
      'what.title': 'BuffNook Tower is a physics game about knowing when to stop.',
      'what.body': 'Twelve blocks land on a tilted seesaw. Some blocks glue, some sink, some float, some slide. Bank your height at any point to keep 100% of it — but if you wait too long, the tower collapses and your score drops to 40% of the height you reached. Free to play in your browser, no account needed.',
      // How to play
      'how.eyebrow': 'How to play',
      'how.title': 'Land blocks, keep balance, decide when to bank.',
      'how.kbd.mode': 'Keyboard',
      'how.kbd.title': 'Q · E · Space · L',
      'how.kbd.body': '<strong>Q / E</strong> rotates the falling block 15°. <strong>Space</strong> drops it. <strong>L</strong> banks the tower after 3 blocks — hold still for 1.5 seconds and keep 100% of your height.',
      'how.mouse.mode': 'Mouse',
      'how.mouse.title': 'Click · Drag',
      'how.mouse.body': 'Click the left/right rotate buttons, tap the drop keycap, or drag directly on the canvas to aim. Everything works with just one hand.',
      'how.touch.mode': 'Touch',
      'how.touch.title': 'One hand, 56vh',
      'how.touch.body': 'Tap rotate, tap drop, tap bank. Mobile viewport shrinks the game area to 56vh so it stays visible above the control buttons. No scrolling, no pinching.',
      'how.goal.title': 'Goal & scoring',
      'how.goal.body': 'Your <strong>daily official run</strong> is locked on your first completed drop of the day (UTC reset). Any later run is a practice score that does not overwrite the official result. A successful bank scores <strong>100%</strong> of your height; a collapse during the 1.5-second lock confirmation keeps <strong>50%</strong>; collapsing before you bank keeps <strong>40%</strong>. Banking at 300 cm scores 300 cm; collapsing at 300 cm scores 120 cm. Progress is saved locally in <code>localStorage</code>.',
      // Tips
      'tips.eyebrow': 'Tips that actually work',
      'tips.title': 'Three habits that win rounds consistently.',
      'tips.1.title': 'Wait a beat before aiming',
      'tips.1.body': 'The seesaw sways for half a second after each block lands. Aim when the tower settles, not when it\'s still wobbling.',
      'tips.2.title': 'Treat each buff as a question',
      'tips.2.body': 'Glue sinks and stays — good for anchoring the base. Lead presses the beam down — park it on the light side. Float cancels lead exactly. Ice slides everything — land it last or not at all.',
      'tips.3.title': 'Bank at your personal ceiling',
      'tips.3.body': 'Most players collapse around the 280–340 cm mark. If your tower hits 280 and nothing obvious is wrong, bank it — a bank keeps 100% of your height, while waiting too long drops you to 40%.',
      // FAQ
      'faq.eyebrow': 'FAQ',
      'faq.title': 'Short answers, no fluff.',
      'faq.q1': 'When does the daily challenge reset?',
      'faq.a1': 'BuffNook Tower resets every day at <strong>00:00 UTC</strong>. New seed, new sequence, everyone in the world sees the same 12 blocks that day.',
      'faq.q2': 'Why is my score lower than the tower height?',
      'faq.a2': 'Height is measured on the seesaw in centimeters — <strong>a successful bank scores 100% of your height</strong>, <strong>a collapse during lock confirmation keeps 50%</strong>, and <strong>collapsing before you bank keeps 40%</strong>. Banking at 300 cm scores 300 cm; collapsing at 300 cm scores 120 cm.',
      'faq.q3': 'What is the difference between official and practice?',
      'faq.a3': 'Your <strong>first completed run each day</strong> is your official score — locked, archived, never overwritten. Every run after that is a practice run, saved separately for your own benchmarking.',
      'faq.q4': 'Is BuffNook Tower free to play?',
      'faq.a4': 'Yes. BuffNook Tower is 100% free to play in your browser — no account, no downloads, and no paywalls required. Progress saves only to your browser\'s <code>localStorage</code> under the key <code>buffnook.tower.save</code>. Clearing site data will reset it.',
      'faq.q5': 'Can I play on my phone?',
      'faq.a5': 'Yes. Mobile view shrinks the game canvas to 56vh, enlarges the rotate/drop/lock buttons, and keeps every action reachable with one hand. Works on iOS Safari and Chrome on Android.',

      // Footer
      'footer.about': 'About',
      'footer.contact': 'Contact',
      'footer.privacy': 'Privacy',
      'footer.terms': 'Terms',
      'footer.disclaimer': 'Disclaimer',
      // About page
      'about.h1': 'About BuffNook Tower',
      'about.eyebrow1': 'About',
      'about.title1': 'An independent game about knowing when to stop.',
      'about.body1': 'BuffNook Tower is a free browser game made by a small independent team. We wanted to build something that felt like the physics stacking games we loved as kids — without accounts, downloads, or the friction that clutters the modern web.',
      'about.eyebrow2': 'What we care about',
      'about.title2': 'Three principles that shape everything we build.',
      'about.card1.title': 'No accounts, ever',
      'about.card1.body': 'Progress saves in your browser\'s <code>localStorage</code>. We never ask for an email, a password, or any personal information.',
      'about.card2.title': 'No accounts, no downloads',
      'about.card2.body': 'Open the page and play. There is nothing to install, no sign-up and no paywall — your progress and scores stay in your own browser.',
      'about.card3.title': 'Desktop and mobile, first class',
      'about.card3.body': 'Every game we ship must work well on a laptop, a phone held one-handed, and a tablet in landscape. No "mobile coming soon".',
      'about.eyebrow3': 'Tech',
      'about.title3': 'Vanilla everything.',
      'about.body3': 'BuffNook Tower runs on a Planck.js physics engine inside a single self-contained HTML file. The site itself is plain HTML, CSS, and JavaScript — no frameworks, no build step beyond inlining. We deploy to Cloudflare Pages because it\'s fast and free for static sites. Source code for the game engine is available on request for educational use.',
      // Contact page
      'contact.h1': 'Contact',
      'contact.title1': 'Questions, feedback, or just saying hi.',
      'contact.body1': 'BuffNook Tower is a small independent project. We read every message and reply when we can. Expect a response within a few days.',
      'contact.eyebrow.email': 'Email',
      'contact.email.label': 'General inquiries',
      'contact.email.desc': 'Bug reports, feature ideas, partnership questions. Anything game-related.',
      'contact.eyebrow.press': 'Press & partnerships',
      'contact.press.desc': 'Review copies, interview requests, cross-promotion. We\'re happy to help.',
      'contact.eyebrow.response': 'What to expect',
      'contact.response.body': 'We\'re a tiny team. We read everything but can\'t reply to every email. If we don\'t get back within a week, feel free to send a follow-up.',
      // Privacy page
      'privacy.h1': 'Privacy Policy',
      'privacy.eyebrow': 'Privacy',
      'privacy.title': 'We collect almost nothing. Here\'s what that means.',
      'privacy.updated': 'Last updated: November 18, 2026',
      'privacy.s1.title': 'What happens on your device stays on your device',
      'privacy.s1.body': 'Game progress, scores, settings, and any other game state are stored in your browser\'s <code>localStorage</code> under keys prefixed with <code>buffnook.</code>. This data never leaves your device unless you explicitly clear it. We do not have, and will never have, a server that stores your game data.',
      'privacy.s2.title': 'What we do not collect',
      'privacy.s2.body': '<strong>No email addresses.</strong> No accounts, no newsletters, no password resets.<br><strong>No names or usernames.</strong> We don\'t know who you are.<br><strong>No precise location.</strong> We never request location access.<br><strong>No sale of personal data.</strong> We never sell or rent visitor information.',
      'privacy.s3.title': 'What Cloudflare sees',
      'privacy.s3.body': 'BuffNook Tower is hosted on Cloudflare Pages. Cloudflare may process your IP address and user agent in the course of delivering pages and protecting against abuse. Their privacy policy applies to that processing. We do not sell, trade, or otherwise use that information.',
      'privacy.s4.title': 'Cookies, analytics and advertising',
      'privacy.s4.body': 'Game progress, scores and your language choice are stored in your browser\'s <code>localStorage</code> — they are not cookies and are never sent to us. We may use privacy-respecting analytics to understand traffic, and we may show third-party advertising (for example Google AdSense) to keep the game free. Advertising and analytics partners may set cookies or use device identifiers to serve and measure ads; where the law requires it, we ask for consent before any non-essential cookie is set. You can block or delete cookies in your browser settings, and you can opt out of personalised advertising through Google\'s Ad Settings.',
      'privacy.s5.title': 'Changes to this policy',
      'privacy.s5.body': 'If this policy changes, we will update the "last updated" date at the top of this page. Material changes will be noted in the changelog below.',
      // Terms page
      'terms.h1': 'Terms of Service',
      'terms.eyebrow': 'Terms',
      'terms.title': 'Short, because it needs to be short.',
      'terms.updated': 'Last updated: November 17, 2026',
      'terms.s1.title': '1. Free to play',
      'terms.s1.body': 'All games on buffnook.com are free to play for personal, non-commercial use. You do not need an account, and you do not need to pay.',
      'terms.s2.title': '2. No warranty',
      'terms.s2.body': 'Games are provided "as is" without warranty of any kind. We do not guarantee uninterrupted availability, bug-free operation, or that saved progress will never be lost. Back up anything important.',
      'terms.s3.title': '3. Don\'t break the site',
      'terms.s3.body': 'Do not attempt to disrupt the service, access data you shouldn\'t, or use automated tools to scrape content at scale. We\'ll block repeat offenders.',
      'terms.s4.title': '4. Attribution',
      'terms.s4.body': 'You are welcome to link to BuffNook Tower, embed it (with an iframe to the official URL), or write about it. Attribution is appreciated but not required.',
      'terms.s5.title': '5. Changes',
      'terms.s5.body': 'We may update these terms from time to time. Continued use of the site after changes constitutes acceptance of the updated terms.',
      // List pages
      'list.games.h1': 'All games',
      'list.games.eyebrow': 'All',
      'list.games.intro': 'Every game currently live on BuffNook Tower. New ones drop as we build them.',
      'list.games.page.title': 'All Games · BuffNook Tower',
      'list.latest.h1': 'Latest arrivals',
      'list.latest.eyebrow': 'Latest',
      'list.latest.intro': 'Fresh releases on BuffNook Tower, sorted by release date.',
      'list.latest.page.title': 'Latest Games · BuffNook Tower',
      'list.popular.h1': 'Most popular',
      'list.popular.eyebrow': 'Most',
      'list.popular.intro': 'The games that get the most plays from the community.',
      'list.popular.page.title': 'Popular Games · BuffNook Tower',
      'list.empty': 'No games yet. Check back soon.',
      'game.buffnook-tower.desc': 'Stack 12 physics blocks, survive 5 buffs, and decide when to bank.',
      'game.loading': 'Loading…',
      // Page titles
      'game.buffnook-tower.page.title': 'BuffNook Tower · Free Physics Stacking Game',
      'about.page.title': 'About · BuffNook Tower',
      'contact.page.title': 'Contact · BuffNook Tower',
      'privacy.page.title': 'Privacy Policy · BuffNook Tower',
      'terms.page.title': 'Terms of Service · BuffNook Tower',
      // Site titles
      'site.title': 'BuffNook Tower · Free Physics Stacking Game',
      'site.description': 'Stack 12 physics blocks on a seesaw. Survive 5 buffs. Decide when to bank. BuffNook Tower is a free browser game — desktop & mobile, no account required.',
      'site.og.title': 'BuffNook Tower',
      'site.og.description': 'Stack 12 physics blocks on a seesaw. Survive 5 buffs. Decide when to bank. Free browser game.',
      'site.breadcrumb.home': 'Home',
      // Disclaimer page
      'disclaimer.h1': 'Disclaimer',
      'disclaimer.eyebrow': 'Disclaimer',
      'disclaimer.title': 'An independent game site, not affiliated with anyone else.',
      'disclaimer.updated': 'Last updated: November 18, 2026',
      'disclaimer.s1.title': 'Independent project',
      'disclaimer.s1.body': 'BuffNook Tower is an independent game and tools website built by a small team. We are not affiliated with, endorsed by, sponsored by, or otherwise connected to any third-party game publisher, developer, console maker, or platform. Any product names, logos, or trademarks mentioned on this site belong to their respective owners and are used only for identification.',
      'disclaimer.s2.title': 'No warranties',
      'disclaimer.s2.body': 'All games and tools on this site are provided \u201cas is\u201d, without warranties of any kind. Scores, rankings and statistics are for entertainment only and carry no official or competitive value. We do not guarantee uninterrupted availability or that saved progress will never be lost \u2014 clearing your browser data will reset it.',
      'disclaimer.s3.title': 'External links and advertising',
      'disclaimer.s3.body': 'This site may link to third-party websites and may display third-party advertising. We do not control and are not responsible for the content, products, or privacy practices of those third parties. Visiting an external site is at your own discretion.',
      'disclaimer.s4.title': 'Contact',
      'disclaimer.s4.body': 'If you believe any content on this site infringes your rights, please reach out through our contact page and we will review it promptly.',
      'disclaimer.page.title': 'Disclaimer · BuffNook Tower',
      // 404
      'notfound.title': 'Page not found',
      'notfound.body': 'The page you are looking for does not exist or has moved. The game is still here.',
      'notfound.back': 'Back to the game',
      'notfound.page.title': 'Page not found · BuffNook Tower',
    },
    'zh-CN': {
      'nav.about': '关于',
      'hero.subtitle': '堆得高——也要知道什么时候该停。一个免费的浏览器物理堆塔游戏。',
      'btn.share': '分享',
      'btn.fullscreen': '全屏',
      'what.eyebrow': '这是什么',
      'what.title': 'BuffNook Tower 是一个关于懂得何时收手的物理游戏。',
      'what.body': '十二块积木落在倾斜的跷跷板上。有的会粘住，有的会下沉，有的会漂浮，有的会滑动。随时可以封顶锁定，锁定后 100% 高度都计入成绩；等太久塔就会塌，只剩坍塌前高度的 40%。免费玩，无需账号，进度存在浏览器里。',
      'how.eyebrow': '怎么玩',
      'how.title': '落块、保持平衡、决定何时锁分。',
      'how.kbd.mode': '键盘',
      'how.kbd.title': 'Q · E · 空格 · L',
      'how.kbd.body': '<strong>Q / E</strong> 让下落的积木旋转 15°。<strong>空格</strong> 落块。<strong>L</strong> 连续落 3 块后可以封顶锁定——保持不动 1.5 秒，锁定后 100% 高度都计入成绩。',
      'how.mouse.mode': '鼠标',
      'how.mouse.title': '点击 · 拖拽',
      'how.mouse.body': '点左右旋转按钮、按键帽落块，或直接在画布上拖拽瞄准。单手就能玩。',
      'how.touch.mode': '触屏',
      'how.touch.title': '单手操作，56vh',
      'how.touch.body': '点旋转、点落块、点锁分。手机视口会把游戏区缩小到 56vh，保证控制按钮上方始终可见。不用滚动，不用缩放。',
      'how.goal.title': '目标与计分',
      'how.goal.body': '你每天 <strong>第一局完整完成的落块</strong> 会被记录为官方成绩（UTC 每日重置）。之后再玩都是练习分，不会覆盖官方成绩。成功封顶锁定保留 <strong>100%</strong> 高度；锁定确认期间意外坍塌保留 <strong>50%</strong>；未锁定直接坍塌只保留 <strong>40%</strong>。300 cm 锁定得 300 cm；300 cm 坍塌得 120 cm。进度存在浏览器的 <code>localStorage</code> 里。',
      'tips.eyebrow': '真正有用的技巧',
      'tips.title': '三个能稳定帮你赢的习惯。',
      'tips.1.title': '等积木落稳再瞄准',
      'tips.1.body': '每块积木落下后跷跷板会晃半秒。塔稳定了再瞄准，别在它还晃的时候出手。',
      'tips.2.title': '把每个 Buff 当成一个选择题',
      'tips.2.body': '粘 Buff 会让积木粘住不动——适合固定底部。铅 Buff 会把跷跷板压下去——放在轻的一侧。浮 Buff 刚好抵消铅。冰 Buff 让一切滑动——最后放或干脆不放。',
      'tips.3.title': '在你的个人天花板就锁分',
      'tips.3.body': '大多数玩家在 280–340 cm 附近坍塌。如果你的塔到了 280 而且没明显问题，直接封顶——锁定能保住 100% 高度，再等下去坍塌只剩 40%。',
      'faq.eyebrow': '常见问题',
      'faq.title': '短答，不啰嗦。',
      'faq.q1': '每日挑战什么时候重置？',
      'faq.a1': 'BuffNook Tower 每天在 <strong>UTC 00:00</strong> 重置。新种子、新顺序，全世界的人当天看到的 12 块积木都一样。',
      'faq.q2': '为什么我的分数比塔的高度低？',
      'faq.a2': '高度以厘米为单位在跷跷板上测量——<strong>成功封顶锁定保留 100% 高度</strong>，<strong>锁定确认期间意外坍塌保留 50%</strong>，<strong>未锁定直接坍塌只保留 40%</strong>。300 cm 锁定得 300 cm；300 cm 坍塌得 120 cm。',
      'faq.q3': '官方分和练习分有什么区别？',
      'faq.a3': '每天 <strong>第一局完整完成的</strong> 是你的官方成绩——锁定、存档、永不再覆盖。之后每一局都是练习分，单独保存供你自己对比。',
      'faq.q4': 'BuffNook Tower 免费吗？',
      'faq.a4': '完全免费，浏览器直接玩——无需账号、无需下载、没有付费墙。进度只存在浏览器的 <code>localStorage</code> 里，key 是 <code>buffnook.tower.save</code>。清除站点数据会重置。',
      'faq.q5': '手机上能玩吗？',
      'faq.a5': '能。手机视口会把游戏画布缩小到 56vh，旋转/落块/锁分按钮放大，所有操作一只手就能完成。iOS Safari 和 Android Chrome 都支持。',

      'footer.about': '关于',
      'footer.contact': '联系',
      'footer.privacy': '隐私',
      'footer.terms': '条款',
      'footer.disclaimer': '免责声明',
      // About page
      'about.h1': '关于 BuffNook Tower',
      'about.eyebrow1': '关于',
      'about.title1': '一个关于懂得何时收手的独立游戏。',
      'about.body1': 'BuffNook Tower 是一个免费的浏览器游戏，由一个小独立团队制作。我们想做一款像小时候玩过的物理堆塔游戏那样的作品——没有账号、没有下载，也没有现代网页上那些烦人的摩擦。',
      'about.eyebrow2': '我们在意什么',
      'about.title2': '三条原则，塑造我们做的每一件事。',
      'about.card1.title': '永远不要账号',
      'about.card1.body': '进度存在浏览器的 <code>localStorage</code> 里。我们永远不会要你的邮箱、密码或任何个人信息。',
      'about.card2.title': '无需账号，无需下载',
      'about.card2.body': '打开页面就能玩。不用安装、不用注册、没有付费墙——进度和成绩都存在你自己的浏览器里。',
      'about.card3.title': '桌面和手机，一等公民',
      'about.card3.body': '我们做的每款游戏都必须在笔记本上、单手拿的手机上、横屏平板上都好玩。不说"手机版马上来"。',
      'about.eyebrow3': '技术',
      'about.title3': '原生一切。',
      'about.body3': 'BuffNook Tower 在一个自包含的 HTML 文件里跑 Planck.js 物理引擎。站点本身就是纯 HTML、CSS、JavaScript — 没有框架，没有内联之外的构建步骤。我们部署到 Cloudflare Pages，因为它又快又免费，适合静态站。游戏引擎源码可应教育用途请求提供。',
      // Contact page
      'contact.h1': '联系',
      'contact.title1': '问题、反馈、或就打个招呼。',
      'contact.body1': 'BuffNook Tower 是一个小型独立项目。每封邮件我们都会读，能回就回。一般几天内会有答复。',
      'contact.eyebrow.email': '邮箱',
      'contact.email.label': '一般咨询',
      'contact.email.desc': 'Bug 报告、功能建议、合作问题。任何游戏相关的事。',
      'contact.eyebrow.press': '媒体与合作',
      'contact.press.desc': '评测副本、采访请求、交叉推广。我们乐意帮忙。',
      'contact.eyebrow.response': '预期',
      'contact.response.body': '我们是很小的团队。每封都会读，但没法每封都回。如果一周内没收到回复，可以再发一次。',
      // Privacy page
      'privacy.h1': '隐私政策',
      'privacy.eyebrow': '隐私',
      'privacy.title': '我们几乎不收集任何信息。意思是这样。',
      'privacy.updated': '最后更新：2026 年 11 月 18 日',
      'privacy.s1.title': '你设备上的数据就留在你设备上',
      'privacy.s1.body': '游戏进度、分数、设置和其他游戏状态都存在浏览器的 <code>localStorage</code> 里，key 前缀为 <code>buffnook.</code>。除非你主动清除，这些数据永远不会离开你的设备。我们没有、也永远不会有一台服务器来存你的游戏数据。',
      'privacy.s2.title': '我们不收集的',
      'privacy.s2.body': '<strong>不要邮箱。</strong> 没有账号、没有邮件列表、没有密码重置。<br><strong>不要名字或用户名。</strong> 我们不知道你是谁。<br><strong>不要精确位置。</strong> 我们不会请求定位权限。<br><strong>不出售个人数据。</strong> 我们不会出售或出租访客信息。',
      'privacy.s3.title': 'Cloudflare 看到什么',
      'privacy.s3.body': 'BuffNook Tower 托管在 Cloudflare Pages 上。Cloudflare 在提供页面和防护恶意行为时可能处理你的 IP 地址和 user agent。他们的隐私政策适用于这些处理。我们不会出售、交易或以其他方式使用这些信息。',
      'privacy.s4.title': 'Cookie、统计与广告',
      'privacy.s4.body': '游戏进度、成绩和语言偏好存在浏览器的 <code>localStorage</code> 里——它们不是 Cookie，也不会发送给我们。我们可能使用注重隐私的流量统计，也可能展示第三方广告（例如 Google AdSense）来维持游戏免费。广告与统计合作方可能会写入 Cookie 或使用设备标识来投放和衡量广告；在法律要求的地区，我们会在写入任何非必要 Cookie 前征求同意。你可以在浏览器设置中阻止或删除 Cookie，也可以通过 Google 广告设置退出个性化广告。',
      'privacy.s5.title': '政策变更',
      'privacy.s5.body': '如果政策有变，会更新本页顶部的"最后更新"日期。重大变更会在下方 changelog 注明。',
      // Terms page
      'terms.h1': '服务条款',
      'terms.eyebrow': '条款',
      'terms.title': '简短，因为就该简短。',
      'terms.updated': '最后更新：2026 年 11 月 17 日',
      'terms.s1.title': '1. 免费游玩',
      'terms.s1.body': 'buffnook.com 上所有游戏都可以免费用于个人、非商业用途。不需要账号，不需要付费。',
      'terms.s2.title': '2. 无保证',
      'terms.s2.body': '游戏按"现状"提供，不做任何形式的保证。我们不保证不中断运行、没有 bug、或存档永远不会丢。重要的东西请自己备份。',
      'terms.s3.title': '3. 不要搞破坏',
      'terms.s3.body': '不要尝试破坏服务、访问不该访问的数据、或用自动化工具大规模抓取内容。屡犯者会被封。',
      'terms.s4.title': '4. 署名',
      'terms.s4.body': '欢迎链接到 BuffNook Tower、用 iframe 嵌入官方 URL、或写相关文章。署名感谢但不强制。',
      'terms.s5.title': '5. 变更',
      'terms.s5.body': '我们可能会不时更新这些条款。修改后继续使用站点即视为接受更新后的条款。',
      // List pages
      'list.games.h1': '全部游戏',
      'list.games.eyebrow': '全部',
      'list.games.intro': '浏览 BuffNook Tower 当前上线的所有游戏，新游戏会持续加入。',
      'list.games.page.title': '全部游戏 · BuffNook Tower',
      'list.latest.h1': '最新上架',
      'list.latest.eyebrow': '最新',
      'list.latest.intro': 'BuffNook Tower 的新游戏，按发布日期排序。',
      'list.latest.page.title': '最新游戏 · BuffNook Tower',
      'list.popular.h1': '最受欢迎',
      'list.popular.eyebrow': '热门',
      'list.popular.intro': '玩家最常游玩的 BuffNook Tower 游戏。',
      'list.popular.page.title': '热门游戏 · BuffNook Tower',
      'list.empty': '还没有游戏，敬请期待。',
      'game.buffnook-tower.desc': '堆叠 12 块物理积木，应对 5 种 Buff，并决定何时锁分。',
      'game.loading': '加载中…',
      // Page titles
      'game.buffnook-tower.page.title': 'BuffNook 高塔 · 免费物理堆塔游戏',
      'about.page.title': '关于 · BuffNook Tower',
      'contact.page.title': '联系 · BuffNook Tower',
      'privacy.page.title': '隐私政策 · BuffNook Tower',
      'terms.page.title': '服务条款 · BuffNook Tower',
      'site.title': 'BuffNook 高塔 · 免费物理堆塔游戏',
      'site.description': '在跷跷板上堆 12 块物理积木，挺过 5 种 Buff，决定何时锁分。BuffNook Tower 是一个免费的浏览器游戏——桌面和手机都能玩，无需账号。',
      'site.og.title': 'BuffNook Tower',
      'site.og.description': '在跷跷板上堆 12 块物理积木，挺过 5 种 Buff，决定何时锁分。免费浏览器游戏。',
      'site.breadcrumb.home': '首页',
      // Disclaimer page
      'disclaimer.h1': '免责声明',
      'disclaimer.eyebrow': '免责声明',
      'disclaimer.title': '独立游戏站点，不隶属于任何第三方。',
      'disclaimer.updated': '最后更新：2026 年 11 月 18 日',
      'disclaimer.s1.title': '独立项目',
      'disclaimer.s1.body': 'BuffNook Tower 是由一个小团队制作的独立游戏与工具网站。我们与任何第三方游戏发行商、开发商、主机厂商或平台都没有隶属、背书、赞助或合作关系。本站提到的任何产品名称、Logo 或商标均归各自所有者所有，仅用于识别目的。',
      'disclaimer.s2.title': '不作任何担保',
      'disclaimer.s2.body': '本站所有游戏与工具均按“现状”提供，不附带任何形式的担保。分数、排名与统计数据仅供娱乐，不具备官方或竞技效力。我们不保证服务永不中断，也不保证存档永不丢失——清除浏览器数据会重置进度。',
      'disclaimer.s3.title': '外部链接与广告',
      'disclaimer.s3.body': '本站可能链接到第三方网站，也可能展示第三方广告。我们无法控制、也不对第三方的内容、产品或隐私做法负责。是否访问外部网站由你自行判断。',
      'disclaimer.s4.title': '联系我们',
      'disclaimer.s4.body': '如果你认为本站内容侵犯了你的权利，请通过联系页面告知我们，我们会尽快核实处理。',
      'disclaimer.page.title': '免责声明 · BuffNook Tower',
      // 404
      'notfound.title': '页面不存在',
      'notfound.body': '你要找的页面不存在，或者已经被移动了。游戏还在首页等你。',
      'notfound.back': '回到游戏',
      'notfound.page.title': '页面不存在 · BuffNook Tower',
    }
  };

  function applyI18n(lang) {
    var dict = I18N[lang] || I18N.en;
    document.documentElement.lang = lang === 'zh-CN' ? 'zh-CN' : 'en';
    
    // 遍历所有 data-i18n 元素
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.dataset.i18n;
      var val = dict[key];
      if (!val) { val = I18N.en[key]; } // 回退英文
      if (!val) return;
      el.innerHTML = val; // 用 innerHTML 保留 <strong> <code> 等标签
    });
    
    // 占位符与页面标题分别按当前页翻译，避免所有页面都被改成首页标题
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.dataset.i18nPlaceholder;
      var val = dict[key] || I18N.en[key];
      if (val) el.placeholder = val;
    });
    var titleKey = document.body.dataset.i18nTitle;
    var pageTitle = titleKey && (dict[titleKey] || I18N.en[titleKey]);
    if (pageTitle) document.title = pageTitle;
  }

  // ---------- 9. 语言切换：站点 ↔ iframe 游戏 ----------
  var GAME_SAVE_KEY = 'buffnook.tower.save';

  function getLang() {
    try {
      var raw = localStorage.getItem(GAME_SAVE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.settings && (data.settings.lang === 'zh-CN' || data.settings.lang === 'en')) return data.settings.lang;
      }
    } catch (e) {}
    return 'en';
  }
  function setLang(lang) {
    try {
      var raw = localStorage.getItem(GAME_SAVE_KEY);
      var data = raw ? JSON.parse(raw) : { v: 1, settings: {} };
      if (!data || typeof data !== 'object' || Array.isArray(data)) data = { v: 1, settings: {} };
      if (data.v === undefined) data.v = 1;
      data.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
      data.settings.lang = lang;
      localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(data));
    } catch (e) {}
    // 通知 iframe 游戏本体（同域 postMessage）
    var iframe = document.querySelector('.game-stage iframe');
    if (iframe && iframe.contentWindow) {
      try { iframe.contentWindow.postMessage({ type: 'SET_LANG', lang: lang }, '*'); } catch (_) {}
    }
    // 翻译网站外壳
    applyI18n(lang);
  }

  function initLang() {
    // 页面加载时无条件应用语言偏好（哪怕没切换按钮 — 法律页也需要翻译）
    applyI18n(getLang());
    
    var btn = document.getElementById('site-lang');
    if (!btn) return;
    
    function refresh() {
      var cur = getLang();
      btn.textContent = cur === 'zh-CN' ? 'EN' : '中文';
      btn.classList.toggle('active', cur === 'zh-CN');
    }
    refresh();
    btn.addEventListener('click', function () {
      var next = getLang() === 'en' ? 'zh-CN' : 'en';
      setLang(next);
      refresh();
      window.track('lang_switch', { to: next });
    });
    // 监听 iframe 内部切语言（用户在游戏本体也能点）
    window.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'LANG_CHANGED') { refresh(); applyI18n(e.data.lang); }
    });
  }

  // ---------- 9. 启动 ----------
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.game-stage').forEach(initGame);
    document.querySelectorAll('[data-action="share"]').forEach(initShare);
    document.querySelectorAll('[data-action="fullscreen"]').forEach(initFullscreen);
    initFaq();
    initLang();
    window.track('page_view', { path: location.pathname });
  });

})();
