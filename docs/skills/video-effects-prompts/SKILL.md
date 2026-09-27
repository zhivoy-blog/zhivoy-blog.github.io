---
name: video-effects-prompts
description: Use when the user wants to write a prompt for an AI video generator (KlingAI, Veo, Sora, etc.) and wants the video to have professional montage-style effects (speed ramps, slow-motion, zoom punches, whip pans, multi-exposure clones, etc.) rather than a plain description. Also use when the user asks to break down or analyze the editing effects of a reference video clip.
---

# Скилл: эффекты для промтов ИИ-видео

Методика превращения разбора монтажных эффектов в готовый промт для видео-нейросети.

## Шаг 1. Словарь эффектов (что можно попросить у нейросети)

| Эффект | Как описывать в промте |
|---|---|
| Speed ramp (разгон/торможение скорости) | "starts in slow motion then rapidly accelerates to normal speed" / наоборот |
| Slow-motion | "captured at high frame rate, ~20% speed, emphasizing muscle tension and micro-movements" |
| Camera shake/jitter | "subtle handheld camera vibration adding raw energy" |
| Digital zoom punch (резкий наезд/отъезд) | "camera punches in aggressively" / "slowly pulls back revealing the sky" |
| Whip pan (смаз-переход) | "fast whip pan motion blur transitioning to the next shot" |
| Multi-exposure clone (стробоскоп-клон) | "multiple ghosted instances of the subject at different points along the path, opacity building from faint to fully solid" |
| Focus pull (перефокусировка) | "rack focus shifting from foreground to background" |
| Frame rotation (наклон кадра) | "camera rolls clockwise ~15-20° creating a dutch angle" |
| Mirror/symmetry | "frame mirrored along vertical axis creating symmetrical composition" |
| White bloom flash-переход | "overexposed white bloom transition, blown highlights fading into the next scene" |

## Шаг 2. Трёхактная плотность эффектов
Любой сильный ролик 15-25 сек строится по одной и той же кривой энергии:

- **Акт 1 (первые ~30% ролика) — ВЗРЫВНОЙ.** Максимум эффектов одновременно (2-3 в одном кадре): speed ramp + zoom + shake. Цель — сразу зацепить.
- **Акт 2 (средние ~40%) — КОНТРОЛИРУЕМЫЙ.** Один фирменный сигнатурный эффект (например multi-exposure clone) — то, что запоминается и отличает именно этот ролик.
- **Акт 3 (последние ~30%) — РАЗРЕШЕНИЕ.** Эффекты стихают, камера успокаивается, плавный уход к финалу.

## Шаг 3. Фирменный элемент автора
Фишка обязательна в каждом ролике и встраивается в Акт 3. Её вид зависит от места съёмки:

- **Открытое пространство** (стадион, улица, горы, пляж, трасса): дрон сопровождает героя весь ролик. В последнем кадре, после завершения действия, герой поднимает указательный палец вверх, глядя в камеру, а рядом в кадре виден дрон. Снято третьим лицом со стороны, не от первого лица.
- **Помещение** (зал, арена под крышей, бассейн в здании, дом): дрона нет совсем, ни в кадре, ни в описании операторской работы (вместо дрона — трекинг, стедикам или ручная камера). Остаётся только финальный жест: герой поднимает указательный палец вверх, глядя в камеру, снято третьим лицом со стороны.

Если по описанию непонятно, улица это или помещение, — спроси, а не выбирай сам.

Пример финала для помещения: "In the final frame, after landing the last lift, the athlete turns to camera and raises one index finger up, filmed from the side in third-person by a smooth tracking camera. No drone."

## Шаг 4. Шаблон сборки промта
1. Опиши героя и обстановку (кто, что делает, где)
2. Опиши операторскую работу и её этап (акт 1/2/3 из шага 2)
3. Вставь конкретный эффект(ы) из словаря (шаг 1) — не более 2-3 одновременно
4. Укажи камеру: тип движения (дрон — только на открытом пространстве; трекинг/статика), ракурс (низкий/высокий/сбоку)
5. Заверши описанием звука/атмосферы, если нужно

## Пример короткого промта (спринтер на открытом стадионе, 15 сек)
"Raw handheld footage, sprinter bursts from starting blocks, speed ramp from slow-motion (20% speed) to full sprint speed, drone tracks alongside at low altitude throughout the entire shot, third-person perspective. In the final frame, after finishing the sprint, the athlete turns to camera and raises one index finger up, the drone hovering beside him in frame, filmed from the side. Natural daylight, documentary sports photography style, dynamic camera work."

## Как анализировать чужой референс-ролик по этой же схеме
Если пользователь прислал видео или его описание для анализа: разложи по кадрам (таймкод + что происходит + какой эффект), затем сведи в общий список эффектов с частотой использования, затем определи плотность эффектов по трети ролика (акт 1/2/3), затем сформулируй, какой эффект является "сигнатурным" для этого ролика.
