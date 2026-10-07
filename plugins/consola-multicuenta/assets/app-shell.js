/* app-shell · Estructura de panel multicuenta: selector de cuentas, sidebar con grupos, riel con vista rápida al pasar
   el cursor, vistas deslizantes por recurso, recientes, búsqueda Ctrl/⌘ K y menú de usuario. Sin dependencias.
   Script clásico (abre desde file://): window.AppShell.mount(elemento, config) → api. Ver references/api.md. */
(function () {
    'use strict';

    const ICONS = {
        chevron: '<path d="M6 4l4 4-4 4"/>',
        updown: '<path d="M5 6l3-3 3 3M5 10l3 3 3-3"/>',
        search: '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>',
        check: '<path d="M3 8.5l3 3 7-7"/>',
        plus: '<path d="M8 3v10M3 8h10"/>',
        back: '<path d="M13 8H3M7 4L3 8l4 4"/>',
        panel: '<rect x="2" y="2.5" width="12" height="11" rx="2"/><path d="M6 2.5v11"/>',
        user: '<circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c.8-2.6 2.7-4 5-4s4.2 1.4 5 4"/>',
        menu: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>',
        clock: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/>',
        arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
        sort: '<path d="M8 13V3M4.5 6.5L8 3l3.5 3.5"/>',
    };
    const svg = n => `<svg class="as-ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

    const T = {
        search: 'Búsqueda rápida...', searchPh: 'Busca productos, páginas y funciones...', recents: 'Recientes',
        tips: 'Consejos de búsqueda', results: 'Resultados', noResults: 'Sin resultados', navigate: 'para navegar',
        select: 'para seleccionar', switchAccount: 'Cambiar cuenta', searchAccounts: 'Buscar cuentas...',
        createAccount: 'Crear cuenta', accounts: 'Cuentas', pickAccount: 'Selecciona una cuenta.', account: 'Cuenta',
        org: 'Organización', collapse: 'Contraer barra lateral', expand: 'Expandir barra lateral', menu: 'Menú',
        user: 'Menú de usuario', appearance: 'Apariencia', light: 'Claro', dark: 'Oscuro', system: 'Sistema',
        accountsGroup: 'Cuentas',
    };

    function h(tag, attrs, ...kids) {
        const el = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            if (v == null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'html') el.innerHTML = v;   // solo íconos constantes o del config del desarrollador
            else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
            else el.setAttribute(k, v === true ? '' : v);
        }
        for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
        return el;
    }
    const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter(c => c != null && c !== false));
    const icon = (ic, cls = 'as-ni') => ic && ic.trim().startsWith('<') ? h('span', { class: cls, html: ic, 'aria-hidden': 'true' })
        : h('i', { class: cls + ' ' + (ic || ''), 'aria-hidden': 'true' });
    const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);

    function mount(root, cfg) {
        const t = Object.assign({}, T, cfg.t);
        const key = cfg.storageKey || 'app-shell';
        const store = {
            get(k, d) { try { const v = JSON.parse(localStorage.getItem(key + ':' + k)); return v ?? d; } catch { return d; } },
            set(k, v) { try { localStorage.setItem(key + ':' + k, JSON.stringify(v)); } catch { } },
        };
        const st = {
            account: cfg.account || null, path: cfg.path || location.pathname, scope: cfg.scope || null,
            collapsed: store.get('collapsed', false), open: new Set(store.get('open', [])),
        };
        const acc = () => cfg.accounts.find(a => a.id === st.account);
        const resolve = href => href && href.replace(':account', st.account || '').replace(':scope', st.scope ? st.scope.id : '');
        const go = href => { closeMobile(); cfg.navigate ? cfg.navigate(href) : location.assign(href); };
        const emit = (name, detail) => root.dispatchEvent(new CustomEvent('as:' + name, { detail }));
        const onLink = e => {
            if (!cfg.navigate || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault(); go(e.currentTarget.getAttribute('href'));
        };

        // ── Esqueleto ──
        const accBtn = h('button', { class: 'as-acc', type: 'button', 'aria-label': t.switchAccount, popovertarget: 'as-acc-pop' });
        const accPop = h('div', { class: 'as-pop as-pop--acc', id: 'as-acc-pop', popover: 'auto' });
        const views = h('div', { class: 'as-views' });
        const toggle = h('button', { class: 'as-iconbtn as-toggle', type: 'button', html: svg('panel'), onclick: () => setCollapsed(!st.collapsed) });
        const panel = h('div', { class: 'as-panel' },
            h('div', { class: 'as-head' },
                h('a', { class: 'as-logo', href: cfg.brand?.href || '/', onclick: onLink, 'aria-label': cfg.brand?.name || 'Inicio' },
                    cfg.brand?.logo ? h('img', { src: cfg.brand.logo, alt: '' }) : h('span', { class: 'as-logo-mark' }, (cfg.brand?.name || 'A')[0])),
                accBtn, accPop),
            h('button', { class: 'as-search', type: 'button', onclick: () => openCmd() },
                h('span', { class: 'as-ni', html: svg('search') }), h('span', { class: 'as-label' }, t.search),
                h('kbd', { class: 'as-label' }, isMac ? '⌘ K' : 'Ctrl K')),
            views,
            h('div', { class: 'as-foot' }, toggle));
        const sidebar = h('aside', { class: 'as-sidebar', 'aria-label': 'Navegación' }, panel);
        const main = h('main', { class: 'as-main', id: 'as-main', tabindex: '-1' });
        const userPop = h('div', { class: 'as-pop as-pop--user', id: 'as-user-pop', popover: 'auto' });
        const top = h('header', { class: 'as-top' },
            h('button', { class: 'as-iconbtn as-burger', type: 'button', 'aria-label': t.menu, html: svg('menu'), onclick: () => shell.setAttribute('data-mobile', 'open') }),
            h('div', { class: 'as-top-actions' },
                (cfg.actions || []).map(a => a.href
                    ? h('a', { class: 'as-topbtn', href: a.href, onclick: onLink }, a.icon && icon(a.icon, 'as-ti'), h('span', {}, a.label))
                    : h('button', { class: 'as-topbtn', type: 'button', onclick: a.onClick }, a.icon && icon(a.icon, 'as-ti'), h('span', {}, a.label))),
                h('button', { class: 'as-iconbtn', type: 'button', 'aria-label': t.user, popovertarget: 'as-user-pop', html: svg('user') }),
                userPop));
        const footer = (cfg.footer || []).length || cfg.copyright ? h('footer', { class: 'as-footer' },
            h('nav', {}, (cfg.footer || []).map(f => h('a', { href: f.href }, f.label))), cfg.copyright && h('span', {}, cfg.copyright)) : null;
        const shell = h('div', { class: 'as' },
            h('a', { class: 'as-skip', href: '#as-main' }, 'Saltar al contenido'),
            sidebar, h('div', { class: 'as-backdrop', onclick: () => closeMobile() }),
            h('div', { class: 'as-body' }, top, main, footer));
        const cmd = buildCmd();
        root.replaceChildren(shell, cmd.dialog);

        // ── Popovers: posición bajo el botón que los abre (top layer, position: fixed) ──
        function place(pop, btn, alignRight) {
            pop.addEventListener('beforetoggle', e => {
                if (e.newState !== 'open') return;
                const r = btn.getBoundingClientRect();
                pop.style.top = r.bottom + 4 + 'px';
                if (alignRight) { pop.style.right = innerWidth - r.right + 'px'; pop.style.left = 'auto'; }
                else pop.style.left = r.left + 'px';
            });
            pop.addEventListener('toggle', e => {
                btn.setAttribute('aria-expanded', e.newState === 'open');
                if (e.newState === 'open') (pop.querySelector('input') || pop.querySelector('button,a'))?.focus();
            });
            pop.addEventListener('keydown', e => {   // flechas entre opciones
                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                const items = [...pop.querySelectorAll('.as-pop-item:not([hidden])')];
                const i = items.indexOf(document.activeElement);
                items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
                e.preventDefault();
            });
        }
        place(accPop, accBtn, false);
        place(userPop, top.querySelector('[popovertarget=as-user-pop]'), true);

        function renderAccounts() {
            const a = acc();
            accBtn.hidden = !a;
            if (!a) return;
            accBtn.replaceChildren(h('span', { class: 'as-acc-name as-label' }, a.name), h('span', { class: 'as-label', html: svg('updown') }));
            const list = cfg.accounts.map(x => h('button', {
                class: 'as-pop-item', type: 'button', 'aria-current': x.id === st.account ? 'true' : null, 'data-q': norm(x.name),
                onclick: () => { accPop.hidePopover(); switchAccount(x.id); },
            }, h('span', { class: 'as-trunc' }, x.name), x.id === st.account && h('span', { class: 'as-pop-check', html: svg('check') })));
            const q = h('input', { class: 'as-pop-search', type: 'search', placeholder: t.searchAccounts, 'aria-label': t.searchAccounts,
                oninput: () => list.forEach(b => b.hidden = !b.dataset.q.includes(norm(q.value))),
                onkeydown: e => { if (e.key === 'Enter') list.find(b => !b.hidden)?.click(); } });
            fill(accPop, h('div', { class: 'as-pop-sw' }, h('span', { html: svg('search') }), q), h('div', { class: 'as-pop-list' }, list),
                cfg.onCreateAccount && h('div', { class: 'as-pop-sep' }),
                cfg.onCreateAccount && h('button', { class: 'as-pop-item', type: 'button', onclick: () => { accPop.hidePopover(); cfg.onCreateAccount(); } },
                    h('span', { html: svg('plus') }), t.createAccount));
        }

        function switchAccount(id) {
            emit('account', { id });
            if (cfg.onAccount) cfg.onAccount(id);
            else { const prev = st.account; st.account = id; const href = resolve(cfg.accountHome || '/:account/home'); st.account = prev; go(href); }
        }

        function renderUser() {
            const items = (cfg.userMenu || []).map(m => m.separator ? h('div', { class: 'as-pop-sep' })
                : m.href ? h('a', { class: 'as-pop-item', href: m.href, onclick: e => { userPop.hidePopover(); onLink(e); } }, m.icon && icon(m.icon, 'as-ti'), m.label)
                : h('button', { class: 'as-pop-item' + (m.danger ? ' is-danger' : ''), type: 'button', onclick: () => { userPop.hidePopover(); m.onClick?.(); } }, m.icon && icon(m.icon, 'as-ti'), m.label));
            const cur = themePref();
            const seg = ['light', 'dark', 'system'].map(v => h('button', { type: 'button', 'aria-pressed': cur === v ? 'true' : 'false',
                onclick: e => { setTheme(v); seg.forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); } }, t[v]));
            fill(userPop, cfg.user?.email && h('div', { class: 'as-pop-email' }, cfg.user.email),
                h('div', { class: 'as-pop-theme' }, h('span', {}, t.appearance), h('div', { class: 'as-seg', role: 'group', 'aria-label': t.appearance }, seg)),
                h('div', { class: 'as-pop-sep' }), items);
        }
        // Tema: usa window.dtTheme (default-theme/head.html) si está; si no, data-theme en <html> guardado aquí.
        function themePref() {
            if (window.dtTheme) { const p = dtTheme.get(); return p.mode === 'auto' ? 'system' : p.single.split('_')[0]; }
            return store.get('theme', 'system');
        }
        function setTheme(v) {
            if (window.dtTheme) {
                const p = dtTheme.get(), vision = (p.single.split('_')[1] ? '_' + p.single.split('_')[1] : '');
                dtTheme.set(Object.assign(p, v === 'system' ? { mode: 'auto', day: 'light' + vision, night: 'dark' + vision } : { mode: 'single', single: v + vision }));
            } else { store.set('theme', v); applyTheme(); }
        }
        function applyTheme() {
            if (window.dtTheme) return;
            const v = store.get('theme', 'system');
            if (v === 'system') document.documentElement.removeAttribute('data-theme');
            else document.documentElement.setAttribute('data-theme', v);
        }
        applyTheme();

        // ── Navegación ──
        const recents = () => store.get('recents:' + st.account, []);
        function viewItems() {   // árbol de la vista activa (cuenta o recurso)
            return st.scope ? (cfg.scopes?.[st.scope.type]?.nav || []) : (cfg.nav || []);
        }
        function leaves(items, trail = [], out = []) {
            for (const it of items) {
                if (it.children) leaves(it.children, trail.concat(it), out);
                else if (it.href) out.push({ it, trail, href: resolve(it.href) });
            }
            return out;
        }
        function activeLeaf() {
            const p = st.path;
            return leaves(viewItems()).filter(l => p === l.href || p.startsWith(l.href.replace(/\/$/, '') + '/'))
                .sort((a, b) => b.href.length - a.href.length)[0] || null;
        }

        function renderNav(items, ctx, active, depth = 0) {
            const ul = h('ul', { class: depth ? 'as-submenu' : 'as-menu', role: 'list' });
            for (const it of items) {
                if (it.separator) { ul.append(h('li', { class: 'as-sep', role: 'separator' })); continue; }
                if (it.section) { ul.append(h('li', { class: 'as-section' }, h('span', { class: 'as-label' }, it.section))); continue; }
                const kids = it.recents ? recents().map(r => ({ label: r.label, href: r.href })) : it.children;
                if (it.recents && !kids.length) continue;
                const id = ctx + '/' + (it.id || it.label);
                const label = [h('span', { class: 'as-label as-trunc' }, it.label), it.badge && h('span', { class: 'as-badge as-label' }, it.badge)];
                if (kids) {
                    const open = st.open.has(id);
                    const sub = h('div', { class: 'as-sub', 'data-open': open || null, inert: !open || null }, renderNav(kids, id, active, depth + 1));
                    const btn = h('button', { class: 'as-item', type: 'button', 'aria-expanded': open ? 'true' : 'false',
                        onclick: () => {
                            const now = !st.open.has(id);
                            now ? st.open.add(id) : st.open.delete(id);
                            store.set('open', [...st.open]);
                            btn.setAttribute('aria-expanded', now);
                            sub.toggleAttribute('data-open', now); sub.inert = !now;
                        } },
                        depth ? null : icon(it.recents ? it.icon || svg('clock') : it.icon), label, h('span', { class: 'as-chev as-label', html: svg('chevron') }));
                    ul.append(h('li', { 'data-id': id }, btn, sub));
                } else {
                    const href = resolve(it.href);
                    ul.append(h('li', {}, h('a', { class: 'as-item', href, onclick: onLink,
                        'aria-current': active === href ? 'page' : null }, depth ? null : icon(it.icon), label)));
                }
            }
            return ul;
        }

        function renderSidebar() {
            const leaf = activeLeaf();
            if (leaf) {   // abre los grupos que contienen la página actual
                let id = st.scope ? 'scope' : 'account';
                for (const g of leaf.trail) { id += '/' + (g.id || g.label); st.open.add(id); }
            }
            const keep = [...views.children].map(v => v.scrollTop);
            const acctView = h('div', { class: 'as-view', inert: st.scope ? true : null }, renderNav(cfg.nav || [], 'account', st.scope ? null : leaf?.href));
            const sc = st.scope && cfg.scopes?.[st.scope.type];
            const scopeView = h('div', { class: 'as-view', inert: sc ? null : true },
                sc && h('a', { class: 'as-item as-back', href: resolve(sc.back.href), onclick: onLink }, h('span', { class: 'as-ni', html: svg('back') }), h('span', { class: 'as-label as-trunc' }, sc.back.label)),
                sc && h('div', { class: 'as-scope-title as-label as-trunc' }, st.scope.label || st.scope.id),
                sc && renderNav(sc.nav, 'scope', leaf?.href));
            views.replaceChildren(acctView, scopeView);
            views.dataset.active = sc ? 'scope' : 'account';
            [...views.children].forEach((v, i) => v.scrollTop = keep[i] || 0);
            sidebar.hidden = !st.account;
        }

        function recordRecent() {
            const leaf = activeLeaf();
            if (!st.account || !leaf || leaf.it.recent === false) return;
            const label = (st.scope ? (st.scope.label || st.scope.id) + ' / ' : '') + leaf.it.label;
            const list = recents().filter(r => r.href !== leaf.href);
            list.unshift({ href: leaf.href, label, icon: (leaf.trail[0] || leaf.it).icon || null });
            store.set('recents:' + st.account, list.slice(0, cfg.recentsMax || 5));
        }

        // ── Selector de cuentas (página sin cuenta) ──
        let sortDir = 1;
        function renderPicker() {
            const rows = h('tbody');
            const fill = () => {
                const q = norm(search.value);
                rows.replaceChildren(...cfg.accounts.filter(a => norm(a.name + ' ' + (a.org || '')).includes(q))
                    .sort((a, b) => sortDir * a.name.localeCompare(b.name))
                    .map(a => h('tr', {}, h('td', {}, h('a', { href: '#', onclick: e => { e.preventDefault(); switchAccount(a.id); } }, a.name)), h('td', {}, a.org || '—'))));
            };
            const search = h('input', { class: 'as-input', type: 'search', placeholder: t.searchAccounts, 'aria-label': t.searchAccounts, oninput: fill });
            const th = h('th', { 'aria-sort': 'ascending' }, h('button', { type: 'button', onclick: () => {
                sortDir = -sortDir; th.setAttribute('aria-sort', sortDir > 0 ? 'ascending' : 'descending'); th.classList.toggle('is-desc', sortDir < 0); fill();
            } }, t.account, h('span', { html: svg('sort') })));
            fill();
            main.replaceChildren(h('div', { class: 'as-page as-page--narrow' },
                cfg.user?.email && h('p', { class: 'as-muted' }, cfg.user.email),
                h('h1', { class: 'as-h1' }, t.accounts), h('p', {}, t.pickAccount),
                h('div', { class: 'as-row' }, h('div', { class: 'as-input-wrap' }, h('span', { html: svg('search') }), search),
                    cfg.onCreateAccount && h('button', { class: 'as-btn as-btn--primary', type: 'button', onclick: cfg.onCreateAccount }, h('span', { html: svg('plus') }), t.createAccount)),
                h('table', { class: 'as-table' }, h('thead', {}, h('tr', {}, th, h('th', {}, t.org))), rows)));
        }

        // ── Búsqueda Ctrl/⌘ K ──
        function buildCmd() {
            const input = h('input', { class: 'as-cmd-input', type: 'text', placeholder: t.searchPh, 'aria-label': t.searchPh,
                role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'as-cmd-list', autocomplete: 'off' });
            const list = h('div', { class: 'as-cmd-list', id: 'as-cmd-list', role: 'listbox' });
            const dialog = h('dialog', { class: 'as-cmd', 'aria-label': t.search },
                h('div', { class: 'as-cmd-head' }, h('span', { html: svg('search') }), input, h('kbd', {}, 'Esc')), list,
                h('div', { class: 'as-cmd-foot' }, h('kbd', {}, '↑'), h('kbd', {}, '↓'), h('span', {}, t.navigate), h('kbd', {}, '↵'), h('span', {}, t.select)));
            dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });   // clic en el fondo
            let items = [], idx = 0, seq = 0;

            function draw(groups) {
                items = []; idx = 0;
                list.replaceChildren(...groups.filter(g => g.items.length).map(g => h('div', { class: 'as-cmd-group' },
                    h('div', { class: 'as-cmd-label' }, g.label),
                    g.items.map(it => {
                        const i = items.length;
                        const el = h('div', { class: 'as-cmd-item', role: 'option', id: 'as-cmd-' + i,
                            onmousemove: () => mark(i), onclick: () => pick(i) },
                            icon(it.icon || '', 'as-ti'), it.prefix ? [h('b', {}, it.prefix), h('span', { class: 'as-muted' }, '— ' + it.label)]
                                : [h('span', { class: 'as-trunc' }, it.label), it.hint && h('span', { class: 'as-muted as-trunc' }, it.hint)],
                            h('span', { class: 'as-cmd-go', html: svg('arrow') }));
                        items.push(Object.assign({ el }, it));
                        return el;
                    }))));
                if (!items.length) list.append(h('div', { class: 'as-cmd-empty' }, t.noResults));
                mark(0);
            }
            function mark(i) {
                items[idx]?.el.removeAttribute('aria-selected');
                idx = i;
                if (!items[i]) return input.removeAttribute('aria-activedescendant');
                items[i].el.setAttribute('aria-selected', 'true');
                items[i].el.scrollIntoView({ block: 'nearest' });
                input.setAttribute('aria-activedescendant', items[i].el.id);
            }
            function pick(i) {
                const it = items[i];
                if (!it) return;
                if (it.prefix) { input.value = it.prefix + ' '; input.focus(); return update(); }
                dialog.close();
                if (it.account) switchAccount(it.account);
                else if (it.onSelect) it.onSelect();
                else if (it.href) go(it.href);
            }
            async function update() {
                const my = ++seq, raw = input.value.trim();
                const tip = (cfg.searchTips || []).find(x => raw.toLowerCase().startsWith(x.prefix));
                if (!raw) return draw([
                    { label: t.recents, items: recents().map(r => ({ label: r.label, href: r.href, icon: r.icon || svg('clock') })) },
                    { label: t.tips, items: cfg.searchTips || [] }]);
                const q = tip ? raw.slice(tip.prefix.length).trim() : raw;
                let local = [];
                if (!tip) {
                    const words = norm(q).split(/\s+/);
                    const pool = leaves(cfg.nav || []).concat(st.scope ? leaves(cfg.scopes?.[st.scope.type]?.nav || []) : []);
                    local = pool.map(l => ({ l, text: norm(l.trail.map(g => g.label).concat(l.it.label).join(' ')) }))
                        .filter(x => words.every(w => x.text.includes(w)))
                        .sort((a, b) => norm(b.l.it.label).startsWith(words[0]) - norm(a.l.it.label).startsWith(words[0]))
                        .slice(0, 12)
                        .map(({ l }) => ({ label: l.it.label, hint: l.trail.map(g => g.label).join(' › '), href: l.href, icon: (l.trail[0] || l.it).icon }));
                    const accs = cfg.accounts.filter(a => a.id !== st.account && words.every(w => norm(a.name).includes(w)))
                        .map(a => ({ label: a.name, hint: t.switchAccount, account: a.id, icon: svg('user') }));
                    local = local.concat(accs);
                }
                draw([{ label: tip ? tip.label : t.results, items: local }]);
                if (cfg.search && q) {
                    const remote = await Promise.resolve(cfg.search(q, tip ? tip.prefix : null)).catch(() => []);
                    if (my === seq && remote?.length) draw([{ label: tip ? tip.label : t.results, items: local }, { label: cfg.searchLabel || 'Recursos', items: remote }]);
                }
            }
            input.addEventListener('input', update);
            input.addEventListener('keydown', e => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (items.length) mark((idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length); }
                else if (e.key === 'Enter') { e.preventDefault(); pick(idx); }
            });
            return { dialog, open() { input.value = ''; update(); dialog.showModal(); input.focus(); } };
        }
        function openCmd() { if (!cmd.dialog.open) { closeMobile(); cmd.open(); } }
        const onKey = e => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); }
            else if (e.key === 'Escape') closeMobile();
        };
        document.addEventListener('keydown', onKey);

        // ── Contraer / móvil ──
        function setCollapsed(v) {
            st.collapsed = v;
            store.set('collapsed', v);
            shell.dataset.state = v ? 'collapsed' : 'expanded';
            toggle.setAttribute('aria-label', v ? t.expand : t.collapse);
            toggle.title = toggle.getAttribute('aria-label');
            emit('collapse', { collapsed: v });
        }
        function closeMobile() { shell.removeAttribute('data-mobile'); }

        // ── API ──
        let pickerShown = false;
        function update(partial) {
            Object.assign(st, partial || {});
            recordRecent(); renderAccounts(); renderUser(); renderSidebar();
            if (!st.account) { renderPicker(); pickerShown = true; }
            else if (pickerShown) { main.replaceChildren(); pickerShown = false; }
            closeMobile();
        }
        setCollapsed(st.collapsed);
        update();
        return {
            main, update,
            get state() { return { account: st.account, path: st.path, scope: st.scope, collapsed: st.collapsed }; },
            setCollapsed, openSearch: openCmd,
            destroy() { document.removeEventListener('keydown', onKey); root.replaceChildren(); },
        };
    }

    window.AppShell = { mount };
})();
