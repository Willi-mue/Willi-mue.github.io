// Interactive terminal overlay (main page + post pages). Open with "/", Ctrl+K or by
// clicking any [data-terminal-open] element; Esc closes. Prose output comes from the `main-page.term-*`
// translation keys, everything else is deliberately "code-ish" and language-neutral.
(() => {
  const PROMPT = 'willi@homelab:~$';
  const history = [];
  let historyIndex = 0;
  let projectsCache = null;
  let lastFocus = null;

  // Post pages live one directory deep and have no skills/blog/project markup of their
  // own, so they read that data from the root index.html instead.
  const IN_POST = !document.getElementById('other-projects');
  const BASE = IN_POST ? '../' : '';
  let indexDocCache = null;

  const t = (key, fallback = '') =>
    (typeof translations !== 'undefined' && translations[`main-page.term-${key}`]) || fallback;
  const lang = () => (typeof currentLang !== 'undefined' ? currentLang : 'de');
  // Phones/tablets: no Tab or arrow keys, and the on-screen keyboard eats half the screen.
  const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  // Commands offered as tap targets (quick bar + help list); the others need arguments.
  const QUICK = ['help', 'whoami', 'skills', 'projects', 'blog', 'contact', 'neofetch', 'theme', 'lang', 'clear', 'exit'];

  /* ---------- DOM ---------- */
  const overlay = document.createElement('div');
  overlay.id = 'terminal';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="term-window" role="dialog" aria-modal="true" aria-label="Terminal">
      <div class="term-titlebar">
        <span class="term-title">willi@homelab: ~</span>
        <span class="term-controls">
          <span class="term-btn" aria-hidden="true">&#x2013;</span>
          <span class="term-btn" aria-hidden="true">&#x25A1;</span>
          <button type="button" class="term-btn term-btn-close" aria-label="exit">&#x2715;</button>
        </span>
      </div>
      <div class="term-body">
        <div class="term-output" aria-live="polite"></div>
        <label class="term-input-line">
          <span class="term-prompt">${PROMPT}</span>
          <input class="term-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command" />
        </label>
      </div>
      <div class="term-quick"></div>
    </div>`;
  document.body.appendChild(overlay);

  const output = overlay.querySelector('.term-output');
  const input = overlay.querySelector('.term-input');
  const bodyEl = overlay.querySelector('.term-body');
  const quick = overlay.querySelector('.term-quick');

  /* ---------- Printing ---------- */
  // A line is a string or an array of parts: string | { text, cls, href, action }.
  function line(parts, cls) {
    const row = document.createElement('div');
    row.className = `term-line${cls ? ` ${cls}` : ''}`;
    (Array.isArray(parts) ? parts : [parts]).forEach((part) => {
      if (typeof part === 'string') {
        row.append(part);
        return;
      }
      let el;
      if (part.href) {
        el = document.createElement('a');
        el.href = part.href;
        if (/^https?:/.test(part.href)) {
          el.target = '_blank';
          el.rel = 'noopener noreferrer';
        }
      } else if (part.action) {
        el = document.createElement('button');
        el.type = 'button';
        el.addEventListener('click', part.action);
      } else {
        el = document.createElement('span');
      }
      el.textContent = part.text;
      if (part.cls) el.className = part.cls;
      row.appendChild(el);
    });
    return row;
  }

  async function print(lines, cls) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const l of lines) {
      output.appendChild(line(l, cls));
      bodyEl.scrollTop = bodyEl.scrollHeight;
      if (!reduce && lines.length > 1) await new Promise((r) => setTimeout(r, 22));
    }
  }

  const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));

  /* ---------- Data from the page ---------- */
  async function indexDoc() {
    if (!IN_POST) return document;
    if (!indexDocCache) {
      const res = await fetch(`${BASE}index.html`);
      indexDocCache = new DOMParser().parseFromString(await res.text(), 'text/html');
    }
    return indexDocCache;
  }

  async function skills() {
    const doc = await indexDoc();
    return [...doc.querySelectorAll('.skill-ring-tile')].map((tile) => ({
      name: tile.querySelector('.skill-ring-name').textContent.trim(),
      pct: parseFloat((tile.getAttribute('style') || '').match(/--pct:\s*([\d.]+)/)?.[1]) || 0,
    }));
  }

  async function blogPosts() {
    const doc = await indexDoc();
    return [...doc.querySelectorAll('.blog-post')].map((post) => ({
      title: post.querySelector('h3').textContent.trim(),
      href: BASE + post.querySelector('a.button').getAttribute('href'),
    }));
  }

  async function projects() {
    if (!projectsCache) {
      const res = await fetch(`${BASE}data/projects_Willi-Mue.json`);
      projectsCache = await res.json();
    }
    return projectsCache;
  }

  function goTo(id) {
    close();
    if (IN_POST) {
      window.location.href = `${BASE}index.html#${id}`;
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  const SECTIONS = { about: 'about', skills: 'skills', projects: 'projects', blog: 'other-projects', contact: 'contact' };

  /* ---------- Commands ---------- */
  const COMMANDS = {
    help: {
      run: () =>
        print([
          t('help-intro', 'Verfügbare Befehle:'),
          ...Object.entries(COMMANDS)
            .filter(([, cmd]) => !cmd.hidden)
            .map(([name, cmd]) => [
              QUICK.includes(name)
                ? { text: name, cls: 'term-accent', action: () => run(name) }
                : { text: name, cls: 'term-accent' },
              ' '.repeat(Math.max(1, 12 - name.length)),
              t(`help-${name}`, cmd.usage || ''),
            ]),
          '',
          TOUCH
            ? t('help-hint-touch', 'Tippe auf einen Befehl oder schreib ihn selbst.')
            : t('help-hint', 'Tab = Autovervollständigung, ↑/↓ = Verlauf'),
        ], 'term-hang'),
    },

    whoami: {
      run: () =>
        print([
          [{ text: 'Willi Müller', cls: 'term-strong' }],
          t('whoami', 'Software-Entwickler mit Fokus IT-Security. Home-Lab-Admin, Bot-Bastler, Gamer.'),
        ]),
    },

    neofetch: {
      run: async () => {
        const doc = await indexDoc();
        const languages = [...doc.querySelectorAll('[data-i18n="skill-category-software"] + .skill-ring-grid .skill-ring-name')]
          .map((el) => el.textContent.trim())
          .join(', ');
        const logo = [
          ' __        __  ',
          ' \\ \\      / /  ',
          '  \\ \\ /\\ / /   ',
          '   \\ V  V /    ',
          '    \\_/\\_/     ',
          '               ',
          '  <willi-mue/> ',
          '               ',
        ];
        const info = [
          [{ text: 'willi', cls: 'term-accent' }, '@', { text: 'homelab', cls: 'term-accent' }],
          '-------------',
          [{ text: 'OS: ', cls: 'term-accent' }, 'WILLI-OS 2.0.0 x86_64'],
          [{ text: 'Host: ', cls: 'term-accent' }, 'willi-mue.github.io'],
          [{ text: 'Shell: ', cls: 'term-accent' }, 'bash 5.2 (100% handmade)'],
          [{ text: 'Languages: ', cls: 'term-accent' }, languages],
          [{ text: 'Uptime: ', cls: 'term-accent' }, `${Math.floor(performance.now() / 1000)}s`],
          [{ text: 'Theme: ', cls: 'term-accent' }, document.body.dataset.theme],
        ];
        return print(
          logo.map((l, i) => [{ text: l, cls: i < 5 ? 'term-logo-a' : 'term-logo-b' }, ...[].concat(info[i] || '')]),
          'term-pre',
        );
      },
    },

    ls: {
      usage: 'ls [dir]',
      complete: () => Object.keys(SECTIONS),
      run: (args) => {
        const dir = (args[0] || '').replace(/\/$/, '');
        if (!dir) {
          return print([Object.keys(SECTIONS).map((s) => ({ text: `${s}/`, cls: 'term-dir', action: () => run(`ls ${s}`) }))
            .flatMap((p) => [p, '  '])]);
        }
        if (dir === 'projects') return COMMANDS.projects.run();
        if (dir === 'skills') return COMMANDS.skills.run();
        if (dir === 'blog') return COMMANDS.blog.run();
        if (dir === 'contact') return COMMANDS.contact.run();
        if (dir === 'about') return COMMANDS.whoami.run();
        return print([`ls: ${dir}: ${t('no-such-dir', 'Datei oder Verzeichnis nicht gefunden')}`], 'term-error');
      },
    },

    cd: {
      usage: 'cd <dir>',
      complete: () => Object.keys(SECTIONS),
      run: (args) => {
        const dir = (args[0] || '').replace(/\/$/, '');
        if (!dir || dir === '~' || dir === '..') {
          close();
          if (IN_POST) window.location.href = `${BASE}index.html`;
          else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (window.location.hash) {
              history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
          return;
        }
        if (SECTIONS[dir]) return goTo(SECTIONS[dir]);
        return print([`cd: ${dir}: ${t('no-such-dir', 'Datei oder Verzeichnis nicht gefunden')}`], 'term-error');
      },
    },

    projects: {
      run: async () => {
        const list = await projects();
        const desc = (p) => (lang() === 'de' ? p.translation : p.description) || '';
        await print(
          list.flatMap((p) => [
            [
              { text: pad(p.name, 24), cls: 'term-accent', href: p.url },
              { text: Object.keys(p.languages || {}).slice(0, 2).join(', '), cls: 'term-muted' },
            ],
            [{ text: `  ${desc(p).slice(0, 90)}${desc(p).length > 90 ? '…' : ''}`, cls: 'term-muted' }],
          ]),
        );
      },
    },

    skills: {
      run: async () => {
        const list = (await skills()).sort((a, b) => b.pct - a.pct);
        const width = 20;
        return print(
          list.map(({ name, pct }) => {
            const filled = Math.round((pct / 100) * width);
            return [
              pad(name, 16),
              { text: '█'.repeat(filled), cls: 'term-bar' },
              { text: '░'.repeat(width - filled), cls: 'term-muted' },
              ` ${pct}%`,
            ];
          }),
          'term-pre',
        );
      },
    },

    blog: {
      run: async () =>
        print((await blogPosts()).map((p) => [{ text: '→ ', cls: 'term-accent' }, { text: p.title, href: p.href }])),
    },

    contact: {
      run: () =>
        print([
          [{ text: pad('email', 10), cls: 'term-accent' }, { text: 'willimuellerbremberg@gmail.com', href: 'mailto:willimuellerbremberg@gmail.com' }],
          [{ text: pad('github', 10), cls: 'term-accent' }, { text: 'github.com/Willi-mue', href: 'https://github.com/Willi-mue' }],
          [
            { text: pad('discord', 10), cls: 'term-accent' },
            {
              text: 'todes_ritter',
              cls: 'term-link',
              action: async () => {
                try {
                  await navigator.clipboard.writeText('todes_ritter');
                  print([t('copied', 'In die Zwischenablage kopiert.')], 'term-success');
                } catch (err) {
                  /* clipboard blocked */
                }
              },
            },
            { text: `  (${t('click-to-copy', 'klicken zum Kopieren')})`, cls: 'term-muted' },
          ],
        ]),
    },

    theme: {
      usage: 'theme [dark|light]',
      complete: () => ['dark', 'light'],
      run: (args) => {
        const next = args[0] || (document.body.dataset.theme === 'dark' ? 'light' : 'dark');
        if (!['dark', 'light'].includes(next)) return print(['usage: theme [dark|light]'], 'term-error');
        const rect = input.getBoundingClientRect();
        window.setTheme(next, { x: rect.left, y: rect.top });
        return print([`theme → ${next}`], 'term-success');
      },
    },

    lang: {
      usage: 'lang [de|en]',
      complete: () => ['de', 'en'],
      run: async (args) => {
        const next = args[0] || (lang() === 'de' ? 'en' : 'de');
        if (!['de', 'en'].includes(next)) return print(['usage: lang [de|en]'], 'term-error');
        await updateTexts(next);
        return print([`lang → ${next}`], 'term-success');
      },
    },

    reboot: {
      run: async () => {
        await print([[{ text: t('reboot', 'Starte neu …'), cls: 'term-success' }]]);
        try {
          sessionStorage.removeItem('booted');
        } catch (err) {
          /* storage blocked: the boot screen shows every time anyway */
        }
        // No hash: boot.js skips the animation when the URL has one.
        setTimeout(() => window.location.assign(`${BASE}index.html`), 600);
      },
    },

    matrix: {
      run: () => {
        close();
        window.EasterEggs?.matrix();
      },
    },

    date: { run: () => print([new Date().toString()]) },
    echo: { run: (args) => print([args.join(' ')]) },
    history: { run: () => print(history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`), 'term-pre') },
    clear: { run: () => { output.replaceChildren(); } },
    exit: { run: () => close() },

    sudo: {
      hidden: true,
      run: (args) => {
        if (args.join(' ') === 'hire willi') {
          window.EasterEggs?.toast(t('hire-toast', 'Gute Entscheidung!'), '🤝');
          return print(
            [
              '[sudo] password for recruiter: ********',
              [{ text: t('hire', 'Zugriff gewährt. Ich freu mich auf deine Nachricht:'), cls: 'term-success' }],
              [{ text: '→ contact', cls: 'term-link', action: () => goTo('contact') }],
            ],
          );
        }
        return print([t('sudo', 'Netter Versuch. Dieser Vorfall wird gemeldet.')], 'term-error');
      },
    },
    rm: {
      hidden: true,
      run: (args) =>
        args.includes('-rf')
          ? print([t('rm', 'Schönen Versuch. Das Portfolio bleibt stehen. 😄')], 'term-error')
          : print(['rm: permission denied'], 'term-error'),
    },
    vim: { hidden: true, run: () => print([t('vim', 'Du bist jetzt in vim gefangen. Tipp: :q! … nur Spaß.')]) },
    ':q!': { hidden: true, run: () => close() },
    ':q': { hidden: true, run: () => close() },
    ping: { hidden: true, run: () => print(['PONG 🏓']) },
  };

  /* ---------- Run / input handling ---------- */
  async function run(raw) {
    const cmdLine = raw.trim();
    output.appendChild(line([{ text: PROMPT, cls: 'term-prompt' }, ` ${cmdLine}`]));
    if (!cmdLine) return;

    history.push(cmdLine);
    historyIndex = history.length;

    const [name, ...args] = cmdLine.split(/\s+/);
    const cmd = COMMANDS[name.toLowerCase()];
    if (!cmd) {
      await print(
        [[`${name}: ${t('not-found', 'Befehl nicht gefunden. Tippe')} `, { text: 'help', cls: 'term-link', action: () => run('help') }]],
        'term-error',
      );
      return;
    }
    try {
      await cmd.run(args);
    } catch (err) {
      await print([`${name}: ${err.message}`], 'term-error');
    }
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function complete() {
    const value = input.value;
    const parts = value.split(/\s+/);
    let candidates;
    if (parts.length <= 1) {
      candidates = Object.keys(COMMANDS).filter((c) => !COMMANDS[c].hidden && c.startsWith(parts[0]));
      if (candidates.length === 1) input.value = `${candidates[0]} `;
    } else {
      const cmd = COMMANDS[parts[0]];
      const last = parts[parts.length - 1];
      candidates = (cmd?.complete?.() || []).filter((c) => c.startsWith(last));
      if (candidates.length === 1) input.value = [...parts.slice(0, -1), candidates[0]].join(' ');
    }
    if (candidates.length > 1) {
      output.appendChild(line([{ text: PROMPT, cls: 'term-prompt' }, ` ${value}`]));
      print([candidates.join('   ')], 'term-muted');
    }
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = input.value;
      input.value = '';
      run(value);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) input.value = history[--historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.min(historyIndex + 1, history.length);
      input.value = history[historyIndex] || '';
    } else if (e.key === 'Escape' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      close();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      output.replaceChildren();
    }
    // Keep terminal keystrokes away from the page-level "/" and Ctrl+K shortcuts.
    e.stopPropagation();
  });

  QUICK.forEach((name) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = name;
    chip.addEventListener('click', () => run(name));
    quick.append(chip);
  });

  // Keep the window inside the visible area when the on-screen keyboard opens
  // (the fixed overlay would otherwise stay full height behind the keyboard).
  const vv = window.visualViewport;
  function fitViewport() {
    if (!vv || overlay.hidden) return;
    overlay.style.top = `${vv.offsetTop}px`;
    overlay.style.height = `${vv.height}px`;
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }
  if (vv) {
    vv.addEventListener('resize', fitViewport);
    vv.addEventListener('scroll', fitViewport);
  }

  /* ---------- Open / close ---------- */
  let greeted = false;

  function open() {
    if (!overlay.hidden) return;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.documentElement.classList.add('term-open');
    requestAnimationFrame(() => overlay.classList.add('show'));
    fitViewport();
    // On touch devices the keyboard only comes up when the input is tapped.
    if (!TOUCH) input.focus();
    if (!greeted) {
      greeted = true;
      print([
        [{ text: 'WILLI-OS 2.0.0', cls: 'term-strong' }, ' — interactive shell'],
        [t('welcome', 'Willkommen! Tippe'), ' ', { text: 'help', cls: 'term-link', action: () => run('help') }, ' ', t('welcome-2', 'für alle Befehle.')],
        '',
      ]);
    }
  }

  function close() {
    if (overlay.hidden) return;
    overlay.classList.remove('show');
    document.documentElement.classList.remove('term-open');
    setTimeout(() => {
      overlay.hidden = true;
    }, 250);
    lastFocus?.focus?.();
  }

  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.term-btn-close').addEventListener('click', close);
  overlay.querySelector('.term-window').addEventListener('click', (e) => {
    if (TOUCH || e.target.closest('a, button') || window.getSelection().toString()) return;
    input.focus();
  });

  window.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (document.body.classList.contains('lightbox-open')) return;
    if (e.key === 'Escape' && !overlay.hidden) {
      close();
    } else if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && overlay.hidden)) {
      e.preventDefault();
      overlay.hidden ? open() : close();
    }
  });

  document.querySelectorAll('[data-terminal-open]').forEach((el) => el.addEventListener('click', open));

  // Top-bar terminal button on the main page: appears once the hero is mostly scrolled past.
  const revealBtn = document.querySelector('[data-terminal-open][data-scroll-reveal]');
  if (revealBtn) {
    const hero = document.querySelector('header');
    const update = () => revealBtn.classList.toggle('visible', window.scrollY > (hero?.offsetHeight || 400) * 0.6);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  window.Terminal = { open, close, run };
})();
