/** * @description basic script to YouTube page */
try {
    if (!window.injected) {
        const getLocalizedText = (key) => {
            const languages = {
                'zh': { 'download': '下载', 'downloads': '下载', 'extension': 'LitePipe 设置', 'chat': '聊天室', 'about': '关于', 'pip': '画中画', 'add_to_queue': '加入队列' },
                'zt': { 'download': '下載', 'downloads': '下載', 'extension': 'LitePipe 設置', 'chat': '聊天室', 'about': '關於', 'pip': '畫中畫', 'add_to_queue': '加入佇列' },
                'en': { 'download': 'Download', 'downloads': 'Downloads', 'extension': 'LitePipe Settings', 'chat': 'Chat', 'about': 'About', 'pip': 'PiP', 'add_to_queue': 'Add to queue' },
                'ja': { 'download': 'ダウンロード', 'downloads': 'ダウンロード', 'extension': 'LitePipe 設定', 'chat': 'チャット', 'about': '詳細', 'pip': 'PiP', 'add_to_queue': 'キューに追加' },
                'ko': { 'download': '다운로드', 'downloads': '다운로드', 'extension': 'LitePipe 플러그인', 'chat': '채팅', 'about': '정보', 'pip': 'PiP', 'add_to_queue': '대기열에 추가' },
                'fr': { 'download': 'Télécharger', 'downloads': 'Téléchargements', 'extension': 'Paramètres LitePipe', 'chat': 'Chat', 'about': 'À propos', 'pip': 'PiP', 'add_to_queue': 'Ajouter à la file' },
                'ru': { 'download': 'Скачать', 'downloads': 'Загрузки', 'extension': 'Настройки LitePipe', 'chat': 'Чат', 'about': 'О программе', 'pip': 'PiP', 'add_to_queue': 'Добавить в очередь' },
                'tr': { 'download': 'İndir', 'downloads': 'İndirilenler', 'extension': 'LitePipe Ayarları', 'chat': 'Sohbet', 'about': 'Hakkında', 'pip': 'PiP', 'add_to_queue': 'Kuyruğa ekle' },
            };
            const lang = (document.documentElement.lang || 'en').toLowerCase();
            let keyLang = lang.substring(0, 2);
            if (lang.includes('tw') || lang.includes('hk') || lang.includes('mo') || lang.includes('hant')) {
                keyLang = 'zt';
            }
            const entry = languages[keyLang] || languages['en'];
            return entry[key] || languages['en'][key] || key;
        };

        const getPageClass = (url) => {
            try {
                const u = new URL(url.toLowerCase());
                if (!u.hostname.includes('youtube.com')) return 'unknown';
                const segments = u.pathname.split('/').filter(Boolean);
                if (segments.length === 0) return 'home';
                const s0 = segments[0];
                if (s0 === 'shorts') return 'shorts';
                if (s0 === 'watch') return 'watch';
                if (s0 === 'channel') return 'channel';
                if (s0 === 'gaming') return 'gaming';
                if (s0 === 'feed' && segments.length > 1) return segments[1];
                if (s0 === 'select_site') return 'select_site';
                if (s0 === 'settings') return 'settings';
                if (s0.startsWith('@')) return '@';
                return segments.join('/');
            } catch (e) { return 'unknown'; }
        };

        const backoff = () => {
            const delays = [128, 256, 512, 1024, 2048];
            let tmr = null;
            let ver = 0;
            return (fn) => {
                clearTimeout(tmr);
                const v = ++ver;
                let k = 0;
                const runLoop = () => {
                    if (v !== ver) return;
                    const done = fn() === true;
                    if (done) return;
                    tmr = setTimeout(runLoop, delays[k] ?? 2048);
                    k += 1;
                };
                runLoop();
            };
        };
        const runLogic = backoff();

        window.__liteActive = true;
        window.__liteSetActive = (active) => {
            window.__liteActive = !!active;
            if (active) requestRun();
        };

        const isLiteActive = () => window.__liteActive !== false;

        const requestRun = () => {
            if (!isLiteActive()) return;
            runLogic(() => {
                if (!isLiteActive()) return true;
                return run();
            });
        };

        window.addEventListener('onRefresh', () => location.reload());
        window.addEventListener('onProgressChangeFinish', () => {
            android.finishRefresh();
        });

        const wrapState = (name) => {
            const orig = history[name];
            history[name] = function (data, title, url) {
                const pc = getPageClass(location.href);
                const targetUrl = url ? new URL(url, location.href).href : location.href;
                const nextPc = getPageClass(targetUrl);
                if (nextPc && nextPc !== pc && nextPc !== 'unknown') {
                    android.openTab(targetUrl, nextPc);
                    return;
                }
                orig.apply(this, arguments);
                if (nextPc === 'watch') android.play(targetUrl);
                else android.hidePlayer();
                requestRun();
            };
        };
        wrapState('pushState');
        wrapState('replaceState');

        window.addEventListener('popstate', () => {
            if (getPageClass(location.href) === 'watch') android.play(location.href);
            else android.hidePlayer();
            requestRun();
        });

        function run() {
            if (!isLiteActive()) return;
            const pc = getPageClass(location.href);
            const prefs = JSON.parse(android.getPreferences?.() || '{}');

            android.setRefreshLayoutEnabled(['home', 'subscriptions', 'library', 'settings', '@'].includes(pc));

            if (prefs.hide_shorts) {
                document.querySelectorAll('ytm-reel-shelf-renderer, ytm-shorts-shelf-renderer, ytm-shorts').forEach(el => el.style.display = 'none');
            }
            if (prefs.hide_comments) {
                document.querySelectorAll('ytm-item-section-renderer[section-identifier="comments-entry-point"], #comments').forEach(el => el.style.display = 'none');
            }

            if (pc === 'watch') {
                const ad = document.querySelector('.ad-showing video');
                if (ad) ad.currentTime = ad.duration;
            }

            if (pc === 'watch') {
                const anchor = document.querySelector('.ytSpecButtonViewModelHost.slim_video_action_bar_renderer_button');
                if (anchor && anchor.parentElement) {
                    const bar = anchor.parentElement;
                    if (!document.getElementById('downloadButton')) {
                        const dl = anchor.cloneNode(true);
                        dl.id = 'downloadButton';
                        dl.querySelector('.yt-spec-button-shape-next__button-text-content').innerText = getLocalizedText('download');
                        dl.onclick = (e) => { e.preventDefault(); android.download(location.href); };
                        bar.insertBefore(dl, anchor);
                    }
                    if (!document.getElementById('queueButton')) {
                        const q = anchor.cloneNode(true);
                        q.id = 'queueButton';
                        q.querySelector('.yt-spec-button-shape-next__button-text-content').innerText = getLocalizedText('add_to_queue');
                        q.onclick = (e) => {
                            e.preventDefault();
                            const v = document.querySelector('#movie_player')?.getVideoData?.();
                            if (v) android.addToQueue(JSON.stringify({
                                videoId: v.video_id, url: location.href, title: v.title, author: v.author,
                                thumbnailUrl: `https://img.youtube.com/vi/${v.video_id}/default.jpg`
                            }));
                        };
                        bar.insertBefore(q, anchor);
                    }
                }
            }

            if (pc === 'select_site' || pc === 'settings') {
                const settings = document.querySelector('ytm-settings');
                if (settings && !document.getElementById('extBtn')) {
                    const base = settings.firstElementChild;
                    if (base) {
                        const ext = base.cloneNode(true);
                        ext.id = 'extBtn';
                        ext.querySelector('.yt-core-attributed-string').innerText = getLocalizedText('extension');
                        ext.onclick = () => android.extension();
                        settings.insertBefore(ext, base);
                    }
                }
            }

            android.finishRefresh();
            return false;
        }

        document.addEventListener('animationstart', (e) => {
            if (e.animationName !== 'nodeInserted') return;
            const node = e.target;
            const pc = getPageClass(location.href);
            if (node.id === 'movie_player' && pc === 'watch') {
                node.mute?.();
                node.pauseVideo?.();
            }
            if (pc === 'watch') {
                if (node.id === 'player') node.style.visibility = 'hidden';
                if (node.id === 'player-container-id') node.style.backgroundColor = 'black';
            }
        }, true);

        requestRun();
        window.injected = true;
    }
} catch (e) { console.error(e); }
