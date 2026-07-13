// article-script.js — универсальная кнопка копирования + слайдер "Было / Стало"
(function() {
    'use strict';

    // ========== КНОПКИ КОПИРОВАНИЯ ПРОМПТОВ ==========
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

    // ========== ИНТЕРАКТИВНЫЙ СЛАЙДЕР "БЫЛО / СТАЛО" ==========
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
                // предотвращаем выделение текста и прочие дефолты
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

            // На случай, если палец уходит за пределы экрана
            document.addEventListener('touchcancel', onEnd);
        });
    }

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSliders);
    } else {
        initSliders();
    }

})();
