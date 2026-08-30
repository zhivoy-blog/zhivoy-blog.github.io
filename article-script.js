(function() {
    'use strict';

    /* Внедряем стили, которые нужны новым блокам, — не завязываемся на внешний CSS-файл */
    function injectStyles() {
        if (document.getElementById('zhivoy-extra-styles')) return;
        const style = document.createElement('style');
        style.id = 'zhivoy-extra-styles';
        style.textContent = `
            .read-more-block {
                max-width: 600px;
                margin: 24px auto;
                padding: 18px;
                background-color: var(--card-bg, #1b436d);
                border: 1px solid var(--border-color, #0088cc);
                border-radius: 16px;
            }
            .read-more-block h3 {
                font-size: 17px;
                margin-bottom: 12px;
                color: var(--text-main, #fff);
            }
            .read-more-link {
                display: block;
                padding: 10px 0;
                color: var(--accent-blue, #007aff);
                text-decoration: none;
                font-size: 15px;
                border-top: 1px solid rgba(255,255,255,0.08);
            }
            .read-more-link:first-of-type {
                border-top: none;
            }
            .article-reactions {
                max-width: 600px;
                margin: 20px auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                padding: 0 4px;
            }
            .reactions-buttons {
                display: flex;
                gap: 10px;
            }
            .reaction-btn {
                background: transparent;
                border: 1px solid var(--border-color, #0088cc);
                color: var(--text-main, #fff);
                padding: 8px 14px;
                border-radius: 10px;
                font-size: 14px;
                cursor: pointer;
            }
            .reaction-btn.active {
                background-color: var(--accent-blue, #007aff);
                border-color: var(--accent-blue, #007aff);
            }
            .views-counter {
                font-size: 14px;
                color: var(--text-muted-alt, #8e9eaf);
            }
            .share-block {
                max-width: 600px;
                margin: 16px auto;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .share-btn {
                flex: 1 1 auto;
                text-align: center;
                padding: 12px 16px;
                border-radius: 12px;
                color: #fff;
                text-decoration: none;
                font-weight: 600;
                font-size: 14px;
            }
            .share-btn.vk { background-color: #0077ff; }
            .share-btn.tg { background-color: #29a9eb; }
            .share-btn.copy { background-color: #445b7c; cursor: pointer; border: none; }
            .scroll-top-btn {
                position: fixed;
                bottom: 24px;
                right: 20px;
                width: 46px;
                height: 46px;
                border-radius: 50%;
                background-color: var(--accent-blue, #007aff);
                color: #fff;
                border: none;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 14px rgba(0,0,0,0.3);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;
                z-index: 999;
            }
            .scroll-top-btn.visible {
                opacity: 1;
                pointer-events: auto;
            }
            .reading-progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                height: 3px;
                background-color: var(--accent-blue, #007aff);
                z-index: 1000;
                width: 0%;
            }
        `;
        document.head.appendChild(style);
    }

    /* Резервное копирование через textarea */
    function fallbackCopy(button, text, originalHTML) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            button.innerHTML = '✅ Скопировано!';
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        } catch (e) {
            alert('Не удалось скопировать.');
        } finally {
            document.body.removeChild(textarea);
        }
    }

    /* Инициализация кнопок копирования + ПРИНУДИТЕЛЬНОЕ ИСПРАВЛЕНИЕ ВЁРСТКИ */
    function initCopyButtons() {
        document.querySelectorAll('.prompt-wrapper').forEach(wrapper => {
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '12px';

            let toolbar = wrapper.querySelector('.copy-toolbar, .copy-textbox');
            if (!toolbar) {
                toolbar = document.createElement('div');
                toolbar.className = 'copy-toolbar';
                const existingBtn = wrapper.querySelector('.btn-copy');
                if (existingBtn) {
                    toolbar.appendChild(existingBtn);
                }
                const promptBox = wrapper.querySelector('.prompt-box');
                if (promptBox) {
                    wrapper.insertBefore(toolbar, promptBox);
                } else {
                    wrapper.prepend(toolbar);
                }
            }

            toolbar.style.display = 'flex';
            toolbar.style.justifyContent = 'flex-end';
            toolbar.style.width = '100%';
            toolbar.style.margin = '0';
            toolbar.style.padding = '0';
            toolbar.style.order = '0';

            const promptBox = wrapper.querySelector('.prompt-box');
            if (promptBox) {
                promptBox.style.order = '1';
                promptBox.style.marginTop = '0';
            }

            const btn = toolbar.querySelector('.btn-copy');
            if (btn && !btn.dataset.copyInitialized) {
                btn.dataset.copyInitialized = 'true';
                btn.addEventListener('click', function() {
                    const codeElement = wrapper.querySelector('.prompt-box code');
                    if (!codeElement) return;
                    const text = codeElement.textContent || '';
                    const originalHTML = btn.innerHTML;

                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).then(() => {
                            btn.innerHTML = '✅ Скопировано!';
                            btn.classList.add('copied');
                            setTimeout(() => {
                                btn.innerHTML = originalHTML;
                                btn.classList.remove('copied');
                            }, 2000);
                        }).catch(() => {
                            fallbackCopy(btn, text, originalHTML);
                        });
                    } else {
                        fallbackCopy(btn, text, originalHTML);
                    }
                });
            }
        });
    }

    /* Слайдер "Было / Стало" */
    function initImageSliders() {
        document.querySelectorAll('.image-slider').forEach(slider => {
            const topWrapper = slider.querySelector('.slider-top-wrapper');
            const handle = slider.querySelector('.slider-handle');
            const knob = handle ? handle.querySelector('.slider-knob') : null;
            if (!topWrapper || !handle || !knob) return;

            let isDragging = false;

            function updatePosition(clientX) {
                const rect = slider.getBoundingClientRect();
                let x = clientX - rect.left;
                if (x < 0) x = 0;
                if (x > rect.width) x = rect.width;
                const percent = (x / rect.width) * 100;
                topWrapper.style.width = percent + '%';
                handle.style.left = percent + '%';
            }

            function onStart(e) {
                isDragging = true;
                knob.style.cursor = 'grabbing';
                e.preventDefault();
                const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                updatePosition(clientX);
            }

            function onMove(e) {
                if (!isDragging) return;
                e.preventDefault();
                const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                updatePosition(clientX);
            }

            function onEnd() {
                if (isDragging) {
                    isDragging = false;
                    knob.style.cursor = 'grab';
                }
            }

            knob.addEventListener('mousedown', onStart);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            knob.addEventListener('touchstart', onStart, { passive: false });
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
            document.addEventListener('touchcancel', onEnd);
        });
    }

    /* Прогресс-бар чтения */
    function initProgressBar() {
        if (document.querySelector('.reading-progress-bar')) return;
        const bar = document.createElement('div');
        bar.className = 'reading-progress-bar';
        document.body.prepend(bar);

        function update() {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) + '%' : '0%';
        }
        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    /* Кнопка "Наверх" */
    function initScrollTop() {
        if (document.querySelector('.scroll-top-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'scroll-top-btn';
        btn.innerHTML = '↑';
        btn.setAttribute('aria-label', 'Наверх');
        document.body.appendChild(btn);

        btn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        window.addEventListener('scroll', function() {
            if (window.scrollY > 400) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }, { passive: true });
    }

    /* Кнопки "Поделиться" */
    function initShareButtons() {
        if (document.querySelector('.share-block')) return;

        const pageTitle = document.getElementById('page-title') ? document.getElementById('page-title').textContent : document.title;
        const pageUrl = window.location.href;

        const block = document.createElement('div');
        block.className = 'share-block';

        const vkLink = document.createElement('a');
        vkLink.className = 'share-btn vk';
        vkLink.target = '_blank';
        vkLink.rel = 'noopener noreferrer';
        vkLink.href = 'https://vk.com/share.php?url=' + encodeURIComponent(pageUrl) + '&title=' + encodeURIComponent(pageTitle);
        vkLink.textContent = 'Поделиться в ВК';

        const tgLink = document.createElement('a');
        tgLink.className = 'share-btn tg';
        tgLink.target = '_blank';
        tgLink.rel = 'noopener noreferrer';
        tgLink.href = 'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(pageTitle);
        tgLink.textContent = 'В Telegram';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'share-btn copy';
        copyBtn.textContent = '🔗 Скопировать ссылку';
        copyBtn.addEventListener('click', function() {
            const originalText = copyBtn.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(pageUrl).then(function() {
                    copyBtn.textContent = '✅ Ссылка скопирована';
                    setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
                });
            } else {
                fallbackCopy(copyBtn, pageUrl, originalText);
            }
        });

        block.appendChild(vkLink);
        block.appendChild(tgLink);
        block.appendChild(copyBtn);

        const articleEl = document.querySelector('article');
        if (articleEl) {
            articleEl.insertAdjacentElement('afterend', block);
        } else {
            document.body.appendChild(block);
        }
    }

    /* Блок "Читать также" — теперь берёт реальные статьи из manifest.json, а не из зашитого списка */
    function initReadMore() {
        if (document.querySelector('.read-more-block')) return;

        fetch('articles/manifest.json')
            .then(function(response) {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(function(articles) {
                const currentSlug = new URLSearchParams(window.location.search).get('article') || '';
                const otherArticles = articles.filter(a => a.slug !== currentSlug);
                if (!otherArticles.length) return;

                const selected = otherArticles.sort(() => 0.5 - Math.random()).slice(0, 3);
                const block = document.createElement('div');
                block.className = 'read-more-block';
                const heading = document.createElement('h3');
                heading.textContent = 'Читать также';
                block.appendChild(heading);

                selected.forEach(a => {
                    const link = document.createElement('a');
                    link.className = 'read-more-link';
                    link.href = 'article-template.html?article=' + a.slug;
                    link.textContent = a.title;
                    block.appendChild(link);
                });

                const shareBlock = document.querySelector('.share-block');
                if (shareBlock) {
                    shareBlock.insertAdjacentElement('afterend', block);
                } else {
                    const articleEl = document.querySelector('article');
                    if (articleEl) {
                        articleEl.insertAdjacentElement('afterend', block);
                    } else {
                        document.body.appendChild(block);
                    }
                }
            })
            .catch(function() {
                /* тихо ничего не показываем, если manifest недоступен */
            });
    }

    /* Реакции и счётчик просмотров (локально, по устройству посетителя) */
    function initReactions() {
        const currentSlug = new URLSearchParams(window.location.search).get('article') || 'index';
        const storageKey = 'article_' + currentSlug;

        if (document.querySelector('.article-reactions')) return;

        const reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'article-reactions';
        reactionsDiv.innerHTML = `
            <div class="reactions-buttons">
                <button class="reaction-btn like" data-type="like">👍 <span class="count">0</span></button>
                <button class="reaction-btn dislike" data-type="dislike">👎 <span class="count">0</span></button>
            </div>
            <div class="views-counter">👁️ <span class="count">0</span> просмотров</div>
        `;

        const shareBlock = document.querySelector('.share-block');
        if (shareBlock) {
            shareBlock.insertAdjacentElement('beforebegin', reactionsDiv);
        } else {
            const articleEl = document.querySelector('article');
            (articleEl || document.body).appendChild(reactionsDiv);
        }

        const likeBtn = reactionsDiv.querySelector('.reaction-btn.like');
        const dislikeBtn = reactionsDiv.querySelector('.reaction-btn.dislike');
        const likeCount = likeBtn.querySelector('.count');
        const dislikeCount = dislikeBtn.querySelector('.count');
        const viewsCount = reactionsDiv.querySelector('.views-counter .count');

        let allStats = {};
        try {
            allStats = JSON.parse(localStorage.getItem('blog_articles_stats')) || {};
        } catch (e) {
            allStats = {};
        }
        if (!allStats[storageKey]) {
            allStats[storageKey] = { views: 0, likes: 0, dislikes: 0 };
        }
        allStats[storageKey].views++;
        localStorage.setItem('blog_articles_stats', JSON.stringify(allStats));

        let userReaction = localStorage.getItem('user_reaction_' + storageKey);

        function updateUI() {
            const stats = allStats[storageKey] || { views: 0, likes: 0, dislikes: 0 };
            likeCount.textContent = stats.likes;
            dislikeCount.textContent = stats.dislikes;
            viewsCount.textContent = stats.views;

            if (userReaction === 'like') {
                likeBtn.classList.add('active');
                dislikeBtn.classList.remove('active');
            } else if (userReaction === 'dislike') {
                dislikeBtn.classList.add('active');
                likeBtn.classList.remove('active');
            } else {
                likeBtn.classList.remove('active');
                dislikeBtn.classList.remove('active');
            }
        }

        function handleReaction(e) {
            const type = e.currentTarget.getAttribute('data-type');
            const stats = allStats[storageKey] || { views: 0, likes: 0, dislikes: 0 };

            if (userReaction === type) {
                if (type === 'like') stats.likes = Math.max(0, stats.likes - 1);
                if (type === 'dislike') stats.dislikes = Math.max(0, stats.dislikes - 1);
                userReaction = null;
                localStorage.removeItem('user_reaction_' + storageKey);
            } else if (userReaction && userReaction !== type) {
                if (userReaction === 'like') stats.likes = Math.max(0, stats.likes - 1);
                if (userReaction === 'dislike') stats.dislikes = Math.max(0, stats.dislikes - 1);
                if (type === 'like') stats.likes++;
                if (type === 'dislike') stats.dislikes++;
                userReaction = type;
                localStorage.setItem('user_reaction_' + storageKey, type);
            } else {
                if (type === 'like') stats.likes++;
                if (type === 'dislike') stats.dislikes++;
                userReaction = type;
                localStorage.setItem('user_reaction_' + storageKey, type);
            }

            allStats[storageKey] = stats;
            localStorage.setItem('blog_articles_stats', JSON.stringify(allStats));
            updateUI();
        }

        likeBtn.addEventListener('click', handleReaction);
        dislikeBtn.addEventListener('click', handleReaction);
        updateUI();
    }

    /* Запуск всего */
    function initAll() {
        injectStyles();
        initCopyButtons();
        initImageSliders();
        initProgressBar();
        initScrollTop();
        initShareButtons();
        initReadMore();
        initReactions();
    }

    /* Наблюдатель за изменениями в article — ключевое исправление для динамического контента */
    function setupObserver() {
        const articleEl = document.querySelector('article');
        if (!articleEl) {
            setTimeout(setupObserver, 100);
            return;
        }

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    initAll();
                }
            });
        });

        observer.observe(articleEl, {
            childList: true,
            subtree: true
        });

        initAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupObserver);
    } else {
        setupObserver();
    }
})();
