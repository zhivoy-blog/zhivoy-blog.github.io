// --- Общие для всех страниц: бургер-меню в шапке, плавающая кнопка ВК и подвал ---
// Меню и подвал лежат обычной разметкой прямо в HTML страницы (чтобы поисковики
// видели ссылки без скриптов). Разметку пишут shtab-d14558/app.js и scripts/build-chrome.mjs,
// а этот скрипт только открывает и закрывает меню и добавляет кнопку ВК.
(function() {
var VK_URL = 'https://vk.ru/zhivoy_ai';

// --- Меню ---
var menu = document.querySelector('.site-menu');
if (menu) {
var btn = menu.querySelector('.site-menu-btn');
var panel = menu.querySelector('.site-menu-panel');
var subBtn = menu.querySelector('.site-menu-sub-toggle');
var sub = menu.querySelector('.site-menu-sub');

function setOpen(open) {
panel.hidden = !open;
btn.setAttribute('aria-expanded', open ? 'true' : 'false');
btn.textContent = open ? '✕' : '☰';
}

btn.addEventListener('click', function(e) {
e.stopPropagation();
setOpen(panel.hidden);
});
subBtn.addEventListener('click', function() {
var open = sub.hidden;
sub.hidden = !open;
subBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});
// Клик по пункту (в т.ч. по якорю «Статьи» на главной) закрывает меню
panel.addEventListener('click', function(e) {
if (e.target.closest('a')) setOpen(false);
});
document.addEventListener('click', function(e) {
if (!panel.hidden && !menu.contains(e.target)) setOpen(false);
});
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape' && !panel.hidden) {
setOpen(false);
btn.focus();
}
});
}

// --- Плавающая кнопка ВК ---
var vk = document.createElement('a');
vk.className = 'vk-float';
vk.href = VK_URL;
vk.target = '_blank';
vk.rel = 'noopener noreferrer';
vk.textContent = 'Мы в ВК';
document.body.appendChild(vk);

// --- Цели Яндекс.Метрики: клики по ссылкам на ВК ---
// Одна проверка на весь документ, поэтому считаются и кнопки, которые
// появляются позже (блок «Перейти во ВКонтакте →» в статьях, ссылки в тексте).
// Цель — по месту ссылки: vk_float, vk_footer, vk_header, иначе vk_article.
document.addEventListener('click', function(e) {
var link = e.target.closest && e.target.closest('a[href^="https://vk.ru/zhivoy_ai"]');
if (!link || typeof window.ym !== 'function') return;
var goal = link.closest('.vk-float') ? 'vk_float'
: link.closest('.site-footer, .footer-promo') ? 'vk_footer'
: link.closest('.header, .site-header') ? 'vk_header'
: 'vk_article';
window.ym(112807526, 'reachGoal', goal);
}, true);
})();
