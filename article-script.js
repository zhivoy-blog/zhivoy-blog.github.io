(function() {
    'use strict';

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
            // 1. Принудительно ставим column, чтобы кнопка была НАД блоком
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '12px';

            // 2. Ищем или создаём тулбар для кнопки
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

            // 3. Принудительно выравниваем тулбар вправо
            toolbar.style.display = 'flex';
            toolbar.style.justifyContent = 'flex-end';
            toolbar.style.width = '100%';
            toolbar.style.margin = '0';
            toolbar.style.padding = '0';
            toolbar.style.order = '0';

            // 4. Блок с кодом идёт вторым
            const promptBox = wrapper.querySelector('.prompt-box');
            if (promptBox) {
                promptBox.style.order = '1';
                promptBox.style.marginTop = '0';
            }

            // 5. Вешаем обработчик на кнопку
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

    /* Блок "Читать также" */
    function initReadMore() {
        if (document.querySelector('.read-more-block')) return;

        const allArticles = [
            { title: 'GigaChat против Kling AI [Сравнение 2-х видео внутри]', url: 'article-template.html?article=gigachat-vs-kling' },
            { title: 'Как я пытался создать постоянного ИИ-персонажа для блога, и почему нейросеть раздела его от стресса', url: 'article-template.html?article=ai-striptiz' },
            { title: 'Музыкальный сериал – Часть 2', url: 'article-template.html?article=music-part-2' },
            { title: 'Краш-тест ИИ на окраине цивилизации', url: 'article-template.html?article=crash-test-3g' },
            { title: 'Музыкальный сериал — Часть 1', url: 'article-template.html?article=suno-music' },
            { title: 'Топ-3 бесплатных ИИ', url: 'article-template.html?article=top-3-free-ai' },
            { title: 'Промпт-репетитор английского языка', url: 'article-template.html?article=english-tutor-prompt' },
            { title: 'Пакет выживания на 3G', url: 'article-template.html?article=survival-pack-3g' }
        ];

        const currentSlug = new URLSearchParams(window.location.search).get('article') || '';
        const otherArticles = allArticles.filter(a => !a.url.includes(currentSlug));
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
            link.href = a.url;
            link.textContent = a.title;
            block.appendChild(link);
        });

        const articleEl = document.querySelector('article');
        if (articleEl) {
            articleEl.insertAdjacentElement('afterend', block);
        } else {
            document.body.appendChild(block);
        }
    }

    /* Реакции и счётчик просмотров */
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

        const readMoreBlock = document.querySelector('.read-more-block');
        if (readMoreBlock) {
            readMoreBlock.parentNode.insertBefore(reactionsDiv, readMoreBlock);
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
        initCopyButtons();
        initImageSliders();
        initProgressBar();
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
