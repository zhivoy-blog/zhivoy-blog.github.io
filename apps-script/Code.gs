/**
 * Живой ИИ: Контроль — бэкенд на Google Apps Script.
 *
 * Разворачивается один раз в Google-аккаунте kypatop5@gmail.com как Web App
 * (Deploy → New deployment → Web app; Execute as: Me; Who has access: Anyone).
 * Полученный URL и APP_TOKEN вводятся в приложении на вкладке «Настройки».
 *
 * Требуемые Script Properties (Project Settings → Script properties):
 *   APP_TOKEN            — придуманный вами секрет, защищает Web App от чужих запросов
 *   TELEGRAM_BOT_TOKEN    — токен бота из @BotFather (бот должен быть админом канала)
 *   VK_TOKEN               — access_token сообщества с правами wall,photos
 *   VK_API_VERSION          — опционально, по умолчанию 5.199
 *   GMAIL_QUERY             — опционально, поисковый запрос Gmail (по умолчанию ниже)
 *   PROCESSED_LABEL         — опционально, имя ярлыка «обработано» (по умолчанию ниже)
 */

const DEFAULT_GMAIL_QUERY = 'label:ЖИ -label:ЖИ-обработано';
const DEFAULT_PROCESSED_LABEL = 'ЖИ-обработано';
const DEFAULT_VK_VERSION = '5.199';
const MAX_THREADS = 25;

function doGet(e) {
  return ContentService.createTextOutput('Живой ИИ: Контроль — бэкенд работает.').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: 'Некорректное тело запроса' });
  }

  const props = PropertiesService.getScriptProperties();
  const appToken = props.getProperty('APP_TOKEN');
  if (!appToken || payload.token !== appToken) {
    return jsonOut({ ok: false, error: 'unauthorized' });
  }

  try {
    switch (payload.action) {
      case 'ping': return jsonOut({ ok: true, email: Session.getActiveUser().getEmail() || 'ok' });
      case 'fetchPosts': return jsonOut(actionFetchPosts(props));
      case 'markProcessed': return jsonOut(actionMarkProcessed(props, payload));
      case 'getStats': return jsonOut(actionGetStats(props, payload));
      case 'publishTelegram': return jsonOut(actionPublishTelegram(props, payload));
      case 'publishVk': return jsonOut(actionPublishVk(props, payload));
      default: return jsonOut({ ok: false, error: 'Неизвестное действие: ' + payload.action });
    }
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message || err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ===================== Письма ===================== */

function actionFetchPosts(props) {
  const query = props.getProperty('GMAIL_QUERY') || DEFAULT_GMAIL_QUERY;
  const threads = GmailApp.search(query, 0, MAX_THREADS);
  const posts = [];
  threads.forEach((thread) => {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];
    const attachments = message.getAttachments({ includeInlineImages: true, includeAttachments: true });
    const images = attachments
      .filter((blob) => /^image\//.test(blob.getContentType()) && blob.getBytes().length < 8 * 1024 * 1024)
      .map((blob) => ({ filename: blob.getName() || 'image.jpg', mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) }));
    posts.push({
      sourceMessageId: message.getId(),
      threadId: thread.getId(),
      receivedAt: message.getDate().toISOString(),
      subjectRaw: message.getSubject(),
      guessedPlatform: null,
      topic: message.getSubject(),
      bodyText: message.getPlainBody(),
      images,
    });
  });
  return { ok: true, posts };
}

function actionMarkProcessed(props, payload) {
  const labelName = props.getProperty('PROCESSED_LABEL') || DEFAULT_PROCESSED_LABEL;
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);
  const ids = payload.messageIds || [];
  let marked = 0;
  ids.forEach((id) => {
    try {
      const message = GmailApp.getMessageById(id);
      message.getThread().addLabel(label);
      marked += 1;
    } catch (err) { /* сообщение могло быть удалено — пропускаем */ }
  });
  return { ok: true, marked };
}

/* ===================== Статистика ===================== */

function actionGetStats(props, payload) {
  const result = { ok: true, telegram: null, vk: null };
  const tgToken = props.getProperty('TELEGRAM_BOT_TOKEN');
  if (tgToken && payload.chatId) {
    const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${tgToken}/getChatMemberCount?chat_id=${encodeURIComponent(payload.chatId)}`, { muteHttpExceptions: true });
    const data = JSON.parse(res.getContentText());
    if (data.ok) result.telegram = { subscribers: data.result };
  }
  const vkToken = props.getProperty('VK_TOKEN');
  const vkVersion = props.getProperty('VK_API_VERSION') || DEFAULT_VK_VERSION;
  if (vkToken && payload.groupId) {
    const res = UrlFetchApp.fetch(`https://api.vk.com/method/groups.getById?group_id=${encodeURIComponent(payload.groupId)}&fields=members_count&access_token=${vkToken}&v=${vkVersion}`, { muteHttpExceptions: true });
    const data = JSON.parse(res.getContentText());
    if (data.response && data.response.length) result.vk = { subscribers: data.response[0].members_count };
  }
  return result;
}

/* ===================== Публикация: Telegram ===================== */

function actionPublishTelegram(props, payload) {
  const token = props.getProperty('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('Не задан TELEGRAM_BOT_TOKEN в свойствах скрипта');
  const chatId = payload.chatId;
  const text = payload.text || '';
  const images = payload.images || [];
  const base = `https://api.telegram.org/bot${token}`;

  if (!images.length) {
    tgCall(base + '/sendMessage', { chat_id: chatId, text });
    return { ok: true };
  }

  if (images.length === 1) {
    const caption = text.length > 1024 ? text.slice(0, 1021) + '…' : text;
    const blob = Utilities.newBlob(Utilities.base64Decode(images[0].base64), images[0].mimeType, images[0].filename);
    UrlFetchApp.fetch(base + '/sendPhoto', { method: 'post', payload: { chat_id: chatId, caption, photo: blob }, muteHttpExceptions: true });
    if (text.length > 1024) tgCall(base + '/sendMessage', { chat_id: chatId, text });
    return { ok: true };
  }

  const caption = text.length > 1024 ? text.slice(0, 1021) + '…' : text;
  const media = [];
  const filePayload = { chat_id: chatId };
  images.forEach((img, i) => {
    const key = 'photo' + i;
    filePayload[key] = Utilities.newBlob(Utilities.base64Decode(img.base64), img.mimeType, img.filename);
    const entry = { type: 'photo', media: 'attach://' + key };
    if (i === 0) entry.caption = caption;
    media.push(entry);
  });
  filePayload.media = JSON.stringify(media);
  UrlFetchApp.fetch(base + '/sendMediaGroup', { method: 'post', payload: filePayload, muteHttpExceptions: true });
  if (text.length > 1024) tgCall(base + '/sendMessage', { chat_id: chatId, text });
  return { ok: true };
}

function tgCall(url, payload) {
  const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  const data = JSON.parse(res.getContentText());
  if (!data.ok) throw new Error('Telegram: ' + (data.description || res.getContentText()));
  return data;
}

/* ===================== Публикация: ВКонтакте ===================== */

function actionPublishVk(props, payload) {
  const token = props.getProperty('VK_TOKEN');
  if (!token) throw new Error('Не задан VK_TOKEN в свойствах скрипта');
  const version = props.getProperty('VK_API_VERSION') || DEFAULT_VK_VERSION;
  const groupId = String(payload.groupId).replace(/^-/, '');
  const ownerId = -Math.abs(Number(groupId));
  const images = payload.images || [];

  const attachments = images.map((img) => vkUploadPhoto(token, version, groupId, img));

  const res = UrlFetchApp.fetch('https://api.vk.com/method/wall.post', {
    method: 'post',
    payload: {
      owner_id: String(ownerId),
      from_group: '1',
      message: payload.text || '',
      attachments: attachments.join(','),
      access_token: token,
      v: version,
    },
    muteHttpExceptions: true,
  });
  const data = JSON.parse(res.getContentText());
  if (data.error) throw new Error('VK: ' + data.error.error_msg);
  return { ok: true, postId: data.response.post_id };
}

function vkUploadPhoto(token, version, groupId, img) {
  const uploadServerRes = UrlFetchApp.fetch(`https://api.vk.com/method/photos.getWallUploadServer?group_id=${groupId}&access_token=${token}&v=${version}`, { muteHttpExceptions: true });
  const uploadServer = JSON.parse(uploadServerRes.getContentText());
  if (uploadServer.error) throw new Error('VK upload server: ' + uploadServer.error.error_msg);

  const blob = Utilities.newBlob(Utilities.base64Decode(img.base64), img.mimeType, img.filename);
  const uploadRes = UrlFetchApp.fetch(uploadServer.response.upload_url, { method: 'post', payload: { photo: blob }, muteHttpExceptions: true });
  const uploaded = JSON.parse(uploadRes.getContentText());

  const saveRes = UrlFetchApp.fetch('https://api.vk.com/method/photos.saveWallPhoto', {
    method: 'post',
    payload: { group_id: groupId, photo: uploaded.photo, server: String(uploaded.server), hash: uploaded.hash, access_token: token, v: version },
    muteHttpExceptions: true,
  });
  const saved = JSON.parse(saveRes.getContentText());
  if (saved.error) throw new Error('VK save photo: ' + saved.error.error_msg);
  const photo = saved.response[0];
  return `photo${photo.owner_id}_${photo.id}`;
}
