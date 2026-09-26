// --- Общие для всех страниц: бургер-меню в шапке, плавающая кнопка ВК и подвал ---
// Подключается в конце <body> после <footer class="site-footer"></footer>.
// Все ссылки строятся от адреса этого файла, поэтому скрипт работает
// и в корне сайта, и в articles/<slug>/.
(function() {
// Фраза-тизер для блока «О проекте» в подвале (полный текст — на about.html).
var ABOUT_TEXT = 'Кто ведёт этот блог и почему без прикрас';

var SOCIAL = [
{ title: 'ВКонтакте', href: 'https://vk.ru/zhivoy_ai' },
{ title: 'vc.ru', href: 'https://vc.ru/id6025411' },
{ title: 'Telegram', href: 'https://t.me/zhivoy_ii' }
];
var CONTACT_TG = 'https://t.me/zhivoy_ii';
var CONTACT_VK = 'https://vk.ru/zhivoy_ai';

var script = document.currentScript;
var base = script ? new URL('.', script.src).href : '/';

function ext(item) {
return '<a href="' + item.href + '" target="_blank" rel="noopener noreferrer">' + item.title + '</a>';
}

// --- Меню ---
var header = document.querySelector('.header, .site-header');
if (header) {
var socialItems = SOCIAL.map(function(s) { return '<li>' + ext(s) + '</li>'; }).join('');
var menu = document.createElement('div');
menu.className = 'site-menu';
menu.innerHTML =
'<button class="site-menu-btn" type="button" aria-label="Меню" aria-expanded="false" aria-controls="site-menu-panel">☰</button>' +
'<nav class="site-menu-panel" id="site-menu-panel" hidden>' +
'<ul>' +
'<li><a href="' + base + 'index.html">Главная</a></li>' +
'<li><a href="' + base + 'index.html#feed">Статьи</a></li>' +
'<li><a href="' + base + 'tools.html">Инструменты</a></li>' +
'<li><button class="site-menu-sub-toggle" type="button" aria-expanded="false" aria-controls="site-menu-social">Мы в соцсетях <span class="site-menu-arrow">▾</span></button>' +
'<ul class="site-menu-sub" id="site-menu-social" hidden>' + socialItems + '</ul></li>' +
'<li><a href="' + base + 'about.html">О проекте</a></li>' +
'</ul>' +
'</nav>';

var toggle = header.querySelector('.theme-toggle');
header.insertBefore(menu, toggle || header.firstChild);

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
vk.href = SOCIAL[0].href;
vk.target = '_blank';
vk.rel = 'noopener noreferrer';
vk.textContent = 'Мы в ВК';
document.body.appendChild(vk);

// --- Подвал ---
var footer = document.querySelector('.site-footer');
if (footer) {
footer.innerHTML =
'<div class="footer-cols">' +
'<div class="footer-col">' +
'<h3>О проекте</h3>' +
'<p>' + ABOUT_TEXT + '</p>' +
'<a href="' + base + 'about.html">Подробнее →</a>' +
'</div>' +
'<div class="footer-col">' +
'<h3>Мы в соцсетях</h3>' +
'<ul>' + SOCIAL.map(function(s) { return '<li>' + ext(s) + '</li>'; }).join('') + '</ul>' +
'</div>' +
'<div class="footer-col">' +
'<h3>Контакт</h3>' +
'<p>Есть вопрос или идея? Пишите:</p>' +
'<div class="footer-write-row">' +
'<a class="footer-write" href="' + CONTACT_TG + '" target="_blank" rel="noopener noreferrer">Написать в Telegram</a>' +
'<a class="footer-write" href="' + CONTACT_VK + '" target="_blank" rel="noopener noreferrer">Написать в ВК</a>' +
'</div>' +
'</div>' +
'</div>' +
'<p class="footer-copy">© Живой ИИ</p>';
}
})();
