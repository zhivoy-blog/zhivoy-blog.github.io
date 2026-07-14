// article-script.js — универсальная кнопка копирования + слайдер "Было / Стало" + индикатор чтения + блок "Читать также"
(function() {
    'use strict';

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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
            setTimeout(function() {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        } catch (e) {
            alert('Не удалось скопировать. Пожалуйста, выделите текст вручную.');
        } finally {
            document.body.removeChild(textarea);
        }
    }

    // ========== 1. КНОПКИ КОПИРОВАНИЯ ПРОМПТОВ ==========
    function initCopyButtons() {
        const copyButtons = document.querySelectorAll('.btn-copy');

        copyButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const wrapper = button.closest('.prompt-wrapper');
                if (!wrapper) return;

                const codeBlock = wrapper.querySelector('.prompt-box code');
                if (!codeBlock) return;

                const promptText = codeBlock.textContent || '';
                const originalHTML = button.innerHTML;

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(promptText).then(function() {
                        button.innerHTML = '✅ Скопировано!';
                        button.classList.add('copied');
                        setTimeout(function() {
                            button.innerHTML = originalHTML;
                            button.classList.remove('copied');
                        }, 2000);
                    }).catch(function() {
                        fallbackCopy(button, promptText, originalHTML);
                    });
                } else {
                    fallbackCopy(button, promptText, originalHTML);
                }
            });
        });
    }

    // ========== 2. ИНТЕРАКТИВНЫЙ СЛАЙДЕР "БЫЛО / СТАЛО" ==========
    function initSliders() {
        const sliders = document.querySelectorAll('.image-slider');

        sliders.forEach(function(slider) {
            const topWrapper = slider.querySelector('.slider-top-wrapper');
            const handle = slider.querySelector('.slider-handle');
            const knob = handle ? handle.querySelector('.slider-knob') : null;

            if (!topWrapper || !handle || !knob) return;

            let dragging = false;

            function setPosition(clientX) {
                const rect = slider.getBoundingClientRect();
                let x = clientX - rect.left;
                if (x < 0) x = 0;
                if (x > rect.width) x = rect.width;
                const percent = (x / rect.width) * 100;
                topWrapper.style.width = percent + '%';
                handle.style.left = percent + '%';
            }

            function onStart(e) {
                dragging = true;
                knob.style.cursor = 'grabbing';
                e.preventDefault();
                const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                setPosition(clientX);
            }

            function onMove(e) {
                if (!dragging) return;
                e.preventDefault();
                const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                setPosition(clientX);
            }

            function onEnd() {
                if (!dragging) return;
                dragging = false;
                knob.style.cursor = 'grab';
            }

            // Мышь
            knob.addEventListener('mousedown', onStart);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);

            // Касания
            knob.addEventListener('touchstart', onStart, { passive: false });
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
            document.addEventListener('touchcancel', onEnd);
        });
    }

    // ========== 3. ИНДИКАТОР ПРОГРЕССА ЧТЕНИЯ ==========
    function initReadingProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'reading-progress-bar';
        document.body.prepend(progressBar);

        function updateProgress() {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (scrollHeight > 0) {
                const progress = (scrollTop / scrollHeight) * 100;
                progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
            } else {
                progressBar.style.width = '0%';
            }
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress(); // начальное значение
    }

    // ========== 4. БЛОК "ЧИТАТЬ ТАКЖЕ" ==========
    function initReadMore() {
        const allArticles = [
            { title: 'Краш-тест ИИ на окраине цивилизации', url: 'crash-test-3g.html' },
            { title: 'Музыкальный сериал — Часть 1', url: 'suno-music.html' },
            { title: 'Топ-3 бесплатных ИИ', url: 'top-3-free-ai.html' },
            { title: 'Промпт-репетитор английского языка', url: 'english-tutor-prompt.html' },
            { title: 'Пакет выживания на 3G', url: 'survival-pack-3g.html' }
        ];

        // Определяем текущий файл из URL (например, "/crash-test-3g.html" или "crash-test-3g.html")
        const currentPath = window.location.pathname.split('/').pop() || '';

        // Исключаем текущую статью
        const filteredArticles = allArticles.filter(function(article) {
            return article.url !== currentPath;
        });

        if (filteredArticles.length === 0) return;

        // Выбираем до 3 случайных статей из оставшихся
        const shuffled = filteredArticles.sort(function() { return 0.5 - Math.random(); });
        const selected = shuffled.slice(0, 3);

        // Создаём блок
        const readMoreBlock = document.createElement('div');
        readMoreBlock.className = 'read-more-block';

        const heading = document.createElement('h3');
        heading.textContent = 'Читать также';
        readMoreBlock.appendChild(heading);

        selected.forEach(function(article) {
            const link = document.createElement('a');
            link.className = 'read-more-link';
            link.href = article.url;
            link.textContent = article.title;
            readMoreBlock.appendChild(link);
        });

        // Вставляем после последнего <article> или в конец <body>
        const lastArticle = document.querySelector('article:last-of-type');
        if (lastArticle) {
            lastArticle.insertAdjacentElement('afterend', readMoreBlock);
        } else {
            document.body.appendChild(readMoreBlock);
        }
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ DOM ==========
    function onReady() {
        initCopyButtons();
        initSliders();
        initReadingProgress();
        initReadMore();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }

})();
