// article-script.js — универсальная кнопка копирования промпта
(function() {
    'use strict';

    // Ищем все кнопки копирования на странице
    const copyButtons = document.querySelectorAll('.btn-copy');

    copyButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            // Найти текст в соседнем блоке кода (структура: .copy-toolbar > .btn-copy, затем .prompt-box > code)
            const wrapper = button.closest('.prompt-wrapper');
            if (!wrapper) return;

            const codeBlock = wrapper.querySelector('.prompt-box code');
            if (!codeBlock) return;

            const promptText = codeBlock.textContent || '';

            // Сохраняем оригинальное содержимое кнопки для восстановления
            const originalHTML = button.innerHTML;

            // Основной метод через Clipboard API
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

    // Запасной метод копирования для старых браузеров
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
})();
