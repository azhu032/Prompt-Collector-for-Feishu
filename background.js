const DEFAULT_CONFIG = {
  feishuHost: "https://open.feishu.cn",
  appId: "",
  appSecret: "",
  baseUrl: "",
  appToken: "",
  tableId: "",
  fieldNames: {
    title: "标题",
    referenceImage: "参考图",
    prompt: "提示词内容",
    model: "生图模型",
    source: "提示词来源",
    tags: "标签"
  },
  optionLists: {
    tags: [],
    models: []
  },
  ocr: {
    endpoint: "",
    apiKey: "",
    model: ""
  }
};

const TOKEN_SKEW_MS = 5 * 60 * 1000;
const OCR_MAX_REGION_HEIGHT = 5200;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "save-prompt-to-feishu",
      title: "识别并保存提示词到飞书",
      contexts: ["page", "selection", "link"]
    });
    chrome.contextMenus.create({
      id: "add-reference-image",
      title: "添加到提示词参考图",
      contexts: ["image"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  try {
    if (info.menuItemId === "add-reference-image") {
      await addDraftImage(info.srcUrl, tab.url);
      return;
    }

    if (info.menuItemId === "save-prompt-to-feishu") {
      const extracted = await extractFromTab(tab.id);
      const result = await savePromptRecord(extracted);
      await chrome.storage.session.set({ lastSaveResult: result });
    }
  } catch (error) {
    await chrome.storage.session.set({ lastSaveResult: { ok: false, message: error.message } });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_CONFIG") {
      sendResponse({ ok: true, config: await getConfig() });
      return;
    }

    if (message.type === "SAVE_CONFIG") {
      const current = await getConfig();
      const next = mergeConfig(current, message.config || {});
      await chrome.storage.local.set({ config: next });
      sendResponse({
        ok: true,
        synced: false,
        message: "设置已保存。"
      });
      return;
    }

    if (message.type === "SYNC_TAG_OPTIONS_FROM_FEISHU") {
      sendResponse(await syncTagOptionsFromFeishu(message.config || null));
      return;
    }

    if (message.type === "SYNC_MODEL_OPTIONS_FROM_FEISHU") {
      sendResponse(await syncModelOptionsFromFeishu(message.config || null));
      return;
    }

    if (message.type === "EXTRACT_ACTIVE_TAB") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || tab.url?.startsWith("chrome-extension://")) {
        throw new Error("没有找到可采集的网页。请先打开要采集的网页。");
      }
      sendResponse({ ok: true, data: await extractFromTab(tab.id) });
      return;
    }

    if (message.type === "START_REGION_CAPTURE") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || tab.url?.startsWith("chrome-extension://")) {
        throw new Error("没有找到可框选的网页。请先打开要采集的网页。");
      }
      await ensureContentScript(tab.id);
      await chrome.tabs.sendMessage(tab.id, {
        type: "START_REGION_CAPTURE",
        target: message.target || "all",
        tagOptions: (await getConfig()).optionLists.tags
      });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "REGION_CAPTURE_RESULT") {
      const result = await buildRegionCaptureResult(sender.tab, message.target || "all", message.data || {});
      await chrome.storage.session.set({ pendingRegionCapture: result });
      chrome.runtime.sendMessage({ type: "APPLY_REGION_CAPTURE", pending: result }).catch(() => {});
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "GET_PENDING_REGION_CAPTURE") {
      const { pendingRegionCapture } = await chrome.storage.session.get("pendingRegionCapture");
      await chrome.storage.session.remove("pendingRegionCapture");
      sendResponse({ ok: true, pending: pendingRegionCapture || null });
      return;
    }

    if (message.type === "GET_DRAFT_IMAGES") {
      const { draftImages } = await chrome.storage.local.get("draftImages");
      await chrome.storage.local.remove("draftImages");
      sendResponse({ ok: true, images: draftImages || [] });
      return;
    }

    if (message.type === "OPEN_SIDE_PANEL") {
      if (!chrome.sidePanel?.open) {
        throw new Error("当前 Chrome 版本不支持侧边栏，请更新浏览器后再试。");
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.windowId) throw new Error("没有找到当前浏览器窗口。");
      await chrome.sidePanel.setOptions({ path: "popup.html?mode=side", enabled: true });
      await chrome.sidePanel.open({ windowId: tab.windowId });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CLOSE_SIDE_PANEL") {
      if (chrome.sidePanel?.setOptions) {
        await chrome.sidePanel.setOptions({ enabled: false });
        setTimeout(() => chrome.sidePanel.setOptions({ path: "popup.html?mode=side", enabled: true }), 300);
      }
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "SAVE_PROMPT") {
      sendResponse(await savePromptRecord(message.data || {}));
      return;
    }

    if (message.type === "OPEN_FEISHU_TABLE") {
      await openFeishuTable();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "TEST_FEISHU") {
      const config = mergeConfig(await getConfig(), message.config || {});
      sendResponse(await testFeishuConnection(config));
      return;
    }

    if (message.type === "TEST_OCR") {
      const config = mergeConfig(await getConfig(), message.config || {});
      validateOcrConfig(config);
      sendResponse({ ok: true, message: "备用 OCR 配置已填写。普通网页文字框选不需要 OCR。" });
      return;
    }

    if (message.type === "GET_MODEL_OPTIONS") {
      sendResponse(await getModelFieldOptions());
      return;
    }
  })().catch((error) => sendResponse({ ok: false, message: error.message }));

  return true;
});

async function buildRegionCaptureResult(tab, target, data) {
  const rawText = cleanText(data.rawText || data.prompt || "");
  const base = {
    target,
    data: {
      title: data.title || "",
      prompt: data.prompt || "",
      model: data.model || "",
      source: data.source || "",
      sourceUrl: data.sourceUrl || tab?.url || "",
      imageUrls: data.imageUrls || [],
      tags: normalizeTags(data.tags || []),
      rawText: data.rawText || ""
    }
  };

  if (target === "title") {
    base.data.title = cleanText(base.data.title || firstUsefulLine(rawText)).slice(0, 120);
  } else if (target === "prompt") {
    base.data.prompt = cleanText(base.data.prompt || rawText);
  } else {
    base.data.title = cleanText(base.data.title || firstUsefulLine(rawText)).slice(0, 120);
    base.data.prompt = cleanText(base.data.prompt || rawText);
  }

  if (!rawText) {
    base.data.textReadError = "框选区域没有读取到网页文字。它可能是图片、视频画面或特殊渲染内容。";
  }

  return base;
}

async function captureRegionImage(tab, rect) {
  if (!rect) throw new Error("没有收到框选区域。");
  const safeRect = {
    left: Math.max(0, rect.left),
    top: Math.max(0, rect.top),
    right: Math.max(rect.left + 8, rect.right),
    bottom: Math.min(Math.max(rect.top + 8, rect.bottom), rect.top + OCR_MAX_REGION_HEIGHT)
  };
  const widthCss = Math.max(8, safeRect.right - safeRect.left);
  const heightCss = Math.max(8, safeRect.bottom - safeRect.top);

  const firstMetrics = await scrollTabTo(tab.id, safeRect.top);
  const dpr = firstMetrics.devicePixelRatio || 1;
  const output = new OffscreenCanvas(Math.ceil(widthCss * dpr), Math.ceil(heightCss * dpr));
  const ctx = output.getContext("2d");

  let cursorTop = safeRect.top;
  while (cursorTop < safeRect.bottom) {
    const metrics = await scrollTabTo(tab.id, cursorTop);
    await wait(160);
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const bitmap = await dataUrlToBitmap(screenshot);

    const visible = {
      left: metrics.scrollX,
      top: metrics.scrollY,
      right: metrics.scrollX + metrics.innerWidth,
      bottom: metrics.scrollY + metrics.innerHeight
    };
    const cut = intersectRect(safeRect, visible);
    if (!cut) {
      cursorTop += Math.max(240, metrics.innerHeight * 0.8);
      continue;
    }

    ctx.drawImage(
      bitmap,
      Math.round((cut.left - metrics.scrollX) * dpr),
      Math.round((cut.top - metrics.scrollY) * dpr),
      Math.round((cut.right - cut.left) * dpr),
      Math.round((cut.bottom - cut.top) * dpr),
      Math.round((cut.left - safeRect.left) * dpr),
      Math.round((cut.top - safeRect.top) * dpr),
      Math.round((cut.right - cut.left) * dpr),
      Math.round((cut.bottom - cut.top) * dpr)
    );

    cursorTop = cut.bottom + 1;
  }

  const blob = await output.convertToBlob({ type: "image/png" });
  return blobToDataUrl(blob);
}

async function scrollTabTo(tabId, pageY) {
  const [metrics] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [pageY],
    func: async (targetY) => {
      window.scrollTo({ top: Math.max(0, targetY), behavior: "auto" });
      await new Promise((resolve) => setTimeout(resolve, 80));
      return {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1
      };
    }
  });
  return metrics.result;
}

async function runOcr(target, imageDataUrl) {
  const config = await getConfig();
  validateOcrConfig(config);
  const prompt = target === "all"
    ? "请识别这张截图中的文字，并提取 AI 生图提示词信息。只返回 JSON：{\"title\":\"标题\",\"prompt\":\"完整提示词内容\",\"model\":\"生图模型，没有则为空\"}。不要添加解释。"
    : target === "title"
      ? "请只识别截图中最适合作为标题的文字。只返回标题文本，不要添加解释。"
      : "请识别截图中的完整提示词内容。只返回提示词原文，不要添加解释。";

  const response = await fetch(config.ocr.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.ocr.apiKey}`
    },
    body: JSON.stringify({
      model: config.ocr.model,
      temperature: 0,
      messages: [
        { role: "system", content: "你是一个精准 OCR 和信息提取助手，保留原文结构，避免编造。" },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } }
          ]
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || payload.message || `OCR 请求失败：${response.status}`);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OCR 模型没有返回文字。");
  return content.trim();
}

function validateOcrConfig(config) {
  if (!config.ocr?.endpoint || !config.ocr?.apiKey || !config.ocr?.model) {
    throw new Error("请先在设置页填写 OCR 接口地址、API Key 和模型名。");
  }
}

function parseOcrJson(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const data = JSON.parse(cleaned);
    return typeof data === "object" && data ? data : null;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function firstUsefulLine(text) {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

function intersectRect(a, b) {
  const rect = {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom)
  };
  if (rect.left >= rect.right || rect.top >= rect.bottom) return null;
  return rect;
}

async function dataUrlToBitmap(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:${blob.type || "image/png"};base64,${btoa(binary)}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addDraftImage(url, sourceUrl) {
  if (!url) throw new Error("没有找到图片地址。");
  const { draftImages } = await chrome.storage.local.get("draftImages");
  const images = draftImages || [];
  if (!images.some((image) => image.url === url)) {
    images.push({ url, sourceUrl, addedAt: Date.now() });
  }
  await chrome.storage.local.set({ draftImages: images.slice(-12) });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING_COLLECTOR_CONTENT" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["contentScript.js"] });
  }
}

async function getConfig() {
  const { config } = await chrome.storage.local.get("config");
  return mergeConfig(DEFAULT_CONFIG, config || {});
}

function mergeConfig(base, patch) {
  return {
    ...base,
    ...patch,
    fieldNames: {
      ...base.fieldNames,
      ...(patch.fieldNames || {})
    },
    optionLists: {
      tags: normalizeOptionList(patch.optionLists?.tags || base.optionLists?.tags || []),
      models: normalizeOptionList(patch.optionLists?.models || base.optionLists?.models || [])
    },
    ocr: {
      ...base.ocr,
      ...(patch.ocr || {})
    }
  };
}

async function extractFromTab(tabId, preferredImageUrl = "") {
  await ensureContentScript(tabId);
  const config = await getConfig();
  const response = await chrome.tabs.sendMessage(tabId, {
    type: "EXTRACT_PROMPT",
    preferredImageUrl,
    tagOptions: config.optionLists.tags
  });
  if (response?.ok) return response.data;
  throw new Error(response?.message || "页面提取失败。");
}

async function savePromptRecord(input) {
  const config = await getConfig();
  validateConfig(config);

  const data = normalizePromptData(input);
  if (!data.prompt) throw new Error("没有识别到提示词内容，请手动填写后再保存。");

  const fields = {};
  fields[config.fieldNames.title] = data.title || buildTitle(data);
  fields[config.fieldNames.prompt] = data.prompt;
  fields[config.fieldNames.source] = data.sourceUrl || data.source || "";
  if (data.model) fields[config.fieldNames.model] = data.model;
  if (data.tags.length && config.fieldNames.tags) fields[config.fieldNames.tags] = data.tags;

  const token = await getTenantAccessToken(config);
  const created = await feishuFetch(config, token, `/open-apis/bitable/v1/apps/${encodeURIComponent(config.appToken)}/tables/${encodeURIComponent(config.tableId)}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });

  const recordId = created?.data?.record?.record_id || created?.data?.record_id;
  const attachmentReport = await maybeUploadReferenceMedia(config, token, recordId, data.images);

  return {
    ok: true,
    message: attachmentReport.message || "已保存到飞书表格。",
    recordId,
    attachmentUploaded: attachmentReport.uploaded
  };
}

async function openFeishuTable() {
  const config = await getConfig();
  const url = buildFeishuTableUrl(config);
  if (!url) throw new Error("请先在设置页填写多维表格链接，或填写 Base App Token 和 Table ID。");
  await chrome.tabs.create({ url });
}

function buildFeishuTableUrl(config) {
  if (config.baseUrl) return config.baseUrl;
  if (!config.appToken || !config.tableId) return "";
  return `https://www.feishu.cn/base/${encodeURIComponent(config.appToken)}?table=${encodeURIComponent(config.tableId)}`;
}

async function maybeUploadReferenceMedia(config, token, recordId, images = []) {
  if (!recordId || !images.length) return { uploaded: false, message: "已保存到飞书表格。" };

  try {
    const fields = await listFields(config, token);
    const attachmentField = fields.find((field) => field.field_name === config.fieldNames.referenceImage);
    if (!attachmentField) {
      return { uploaded: false, message: "已保存文字内容；没有找到参考素材字段 ID，附件未上传。" };
    }
    if (!isAttachmentField(attachmentField)) {
      return { uploaded: false, message: "已保存文字内容；参考素材字段不是附件类型，附件未上传。" };
    }

    const fileTokens = [];
    const uploadErrors = [];
    for (const media of images.slice(0, 6)) {
      try {
        const fileToken = await uploadBitableMedia(config, token, media);
        fileTokens.push(fileToken);
      } catch (error) {
        console.warn("Reference media upload failed:", media, error);
        uploadErrors.push(error.message || "未知错误");
      }
    }

    if (fileTokens.length) {
      await updateRecordAttachments(config, token, recordId, attachmentField.field_name, fileTokens);
      const suffix = uploadErrors.length ? ` 另有 ${uploadErrors.length} 个附件失败：${uploadErrors[0]}` : "";
      return { uploaded: true, message: `已保存到飞书表格，并上传 ${fileTokens.length} 个参考素材。${suffix}` };
    }
    return { uploaded: false, message: `已保存文字内容；参考素材下载或上传失败：${uploadErrors[0] || "没有可上传的素材"}` };
  } catch (error) {
    console.warn("Attachment lookup failed:", error);
    return { uploaded: false, message: "已保存文字内容；参考素材附件上传未完成。" };
  }
}

async function listFields(config, token) {
  const response = await feishuFetch(config, token, `/open-apis/bitable/v1/apps/${encodeURIComponent(config.appToken)}/tables/${encodeURIComponent(config.tableId)}/fields?page_size=100`);
  return response?.data?.items || [];
}

async function getBaseField(config, token, field) {
  const fieldId = field?.field_id || field?.id || field?.field_name || field?.name;
  if (!fieldId) return field;
  try {
    const response = await feishuFetch(config, token, `/open-apis/base/v3/bases/${encodeURIComponent(config.appToken)}/tables/${encodeURIComponent(config.tableId)}/fields/${encodeURIComponent(fieldId)}`);
    return response?.data?.field || response?.data || response?.field || field;
  } catch {
    return field;
  }
}

async function syncTagOptionsFromFeishu(configPatch = null) {
  return syncConfiguredOptionsFromFeishu({
    configKey: "tags",
    fieldName: "tags",
    label: "标签",
    configPatch
  });
}

async function syncModelOptionsFromFeishu(configPatch = null) {
  return syncConfiguredOptionsFromFeishu({
    configKey: "models",
    fieldName: "model",
    label: "生图模型",
    configPatch
  });
}

async function syncConfiguredOptionsFromFeishu({ configKey, fieldName, label, configPatch = null }) {
  try {
    const storedConfig = await getConfig();
    const config = configPatch ? mergeConfig(storedConfig, configPatch) : storedConfig;
    validateConfig(config);
    const token = await getTenantAccessToken(config);
    const fields = await listFields(config, token);
    const targetFieldName = config.fieldNames[fieldName];
    const targetField = fields.find((field) => field.field_name === targetFieldName || field.name === targetFieldName);
    if (!targetField) throw new Error(`没有找到${label}字段：${targetFieldName}`);

    const fullField = await getBaseField(config, token, targetField);
    const remoteOptions = extractSelectOptions(fullField).length ? extractSelectOptions(fullField) : extractSelectOptions(targetField);
    const syncedOptions = normalizeOptionList(remoteOptions);
    await chrome.storage.local.set({
      config: mergeConfig(storedConfig, {
        optionLists: {
          ...storedConfig.optionLists,
          [configKey]: syncedOptions
        }
      })
    });

    return {
      ok: true,
      synced: true,
      options: syncedOptions,
      message: syncedOptions.length ? `已从飞书同步 ${syncedOptions.length} 个${label}选项。` : `飞书${label}字段暂无可同步的选项。`
    };
  } catch (error) {
    const config = await getConfig().catch(() => DEFAULT_CONFIG);
    return {
      ok: false,
      synced: false,
      message: error.message,
      options: normalizeOptionList(config.optionLists?.[configKey] || [])
    };
  }
}

async function getModelFieldOptions() {
  try {
    const config = await getConfig();
    const configured = normalizeOptionList(config.optionLists?.models || []);
    return {
      ok: true,
      options: configured.length ? configured : DEFAULT_CONFIG.optionLists.models
    };
  } catch (error) {
    const config = await getConfig().catch(() => DEFAULT_CONFIG);
    return { ok: false, message: error.message, options: normalizeOptionList(config.optionLists?.models || []) };
  }
}

function extractSelectOptions(field) {
  const options = field?.property?.options || field?.property?.options_list || field?.options || [];
  if (!Array.isArray(options)) return [];
  const names = [];
  const seen = new Set();
  for (const option of options) {
    const name = cleanText(option?.name || option?.text || option?.value || option);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

function isAttachmentField(field) {
  return Number(field?.type) === 17 || String(field?.ui_type || "").toLowerCase() === "attachment";
}

async function uploadBitableMedia(config, token, media) {
  const { blob, name } = await mediaToBlob(media);
  if (!blob.size) throw new Error("素材为空。");
  if (blob.size > 20 * 1024 * 1024) throw new Error("素材超过 20MB，暂不支持上传。");

  const extension = guessMediaExtension(blob.type, name || media.url || "");
  const fileName = name || `reference-${Date.now()}.${extension}`;
  const file = new File([blob], fileName, {
    type: blob.type || "application/octet-stream"
  });

  const form = new FormData();
  form.append("file_name", fileName);
  form.append("parent_type", "bitable_file");
  form.append("parent_node", config.appToken);
  form.append("size", String(blob.size));
  form.append("file", file);

  const uploaded = await feishuFetch(config, token, "/open-apis/drive/v1/medias/upload_all", {
    method: "POST",
    body: form
  });
  const fileToken = uploaded?.data?.file_token;
  if (!fileToken) throw new Error("飞书没有返回附件 file_token。");
  return fileToken;
}

async function updateRecordAttachments(config, token, recordId, fieldName, fileTokens) {
  const fields = {};
  fields[fieldName] = fileTokens.map((fileToken) => ({ file_token: fileToken }));

  await feishuFetch(config, token, `/open-apis/bitable/v1/apps/${encodeURIComponent(config.appToken)}/tables/${encodeURIComponent(config.tableId)}/records/${encodeURIComponent(recordId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields })
  });
}

async function mediaToBlob(media) {
  if (typeof media === "string") media = { url: media };

  if (media.dataUrl) {
    const response = await fetch(media.dataUrl);
    return { blob: await response.blob(), name: media.name };
  }

  if (media.url) {
    const response = await fetch(media.url, { credentials: "omit" });
    if (!response.ok) throw new Error(`素材下载失败：${response.status}`);
    return { blob: await response.blob(), name: media.name };
  }

  throw new Error("素材来源无效。");
}

function guessMediaExtension(mime, url) {
  if (mime?.includes("mp4")) return "mp4";
  if (mime?.includes("webm")) return "webm";
  if (mime?.includes("quicktime")) return "mov";
  if (mime?.includes("ogg")) return "ogv";
  if (mime?.includes("png")) return "png";
  if (mime?.includes("webp")) return "webp";
  if (mime?.includes("gif")) return "gif";
  const match = String(url).match(/\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v|ogg|ogv)(?:\?|#|$)/i);
  return match ? match[1].replace("jpeg", "jpg").toLowerCase() : "jpg";
}

async function testFeishuConnection(config) {
  validateConfig(config);
  const token = await getTenantAccessToken(config, true);
  const fields = await listFields(config, token);
  const names = fields.map((field) => field.field_name);
  return {
    ok: true,
    message: `连接成功，已读取 ${fields.length} 个字段。`,
    fields: names
  };
}

async function getTenantAccessToken(config, forceRefresh = false) {
  const cacheKey = `tenantToken:${config.appId}`;
  const cached = await chrome.storage.local.get(cacheKey);
  const tokenInfo = cached[cacheKey];

  if (!forceRefresh && tokenInfo?.token && tokenInfo.expiresAt > Date.now() + TOKEN_SKEW_MS) {
    return tokenInfo.token;
  }

  const response = await fetch(`${config.feishuHost}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret
    })
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(payload.msg || `获取飞书 token 失败：${response.status}`);
  }

  const token = payload.tenant_access_token;
  const expiresAt = Date.now() + Math.max(1, payload.expire || 7200) * 1000;
  await chrome.storage.local.set({ [cacheKey]: { token, expiresAt } });
  return token;
}

async function feishuFetch(config, token, path, options = {}) {
  const response = await fetch(`${config.feishuHost}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok || (typeof payload.code === "number" && payload.code !== 0)) {
    throw new Error(payload.msg || payload.message || `飞书请求失败：${response.status}`);
  }
  return payload;
}

function validateConfig(config) {
  const missing = [];
  if (!config.appId) missing.push("App ID");
  if (!config.appSecret) missing.push("App Secret");
  if (!config.appToken) missing.push("Base App Token");
  if (!config.tableId) missing.push("Table ID");
  if (missing.length) throw new Error(`请先在设置页填写：${missing.join("、")}`);
}

function normalizePromptData(input) {
  const images = [];
  for (const item of input.images || []) {
    if (item?.url || item?.dataUrl) images.push(item);
  }
  for (const url of input.imageUrls || []) {
    if (url) images.push({ url });
  }

  const unique = [];
  const seen = new Set();
  for (const image of images) {
    const key = image.dataUrl || image.url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(image);
  }

  return {
    title: cleanText(input.title).slice(0, 120),
    prompt: cleanText(input.prompt),
    model: cleanText(input.model),
    source: cleanText(input.source),
    sourceUrl: cleanText(input.sourceUrl),
    tags: normalizeTags(input.tags || []),
    images: unique.slice(0, 6)
  };
}

function normalizeTags(tags) {
  const out = [];
  const seen = new Set();
  for (const tag of tags) {
    const clean = cleanText(tag);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function normalizeOptionList(items) {
  const rawItems = Array.isArray(items) ? items : String(items || "").split(/\r?\n|,/);
  const out = [];
  const seen = new Set();
  for (const item of rawItems) {
    const clean = cleanText(item);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function cleanText(value = "") {
  return String(value).replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

function buildTitle(data) {
  const firstLine = data.prompt.split(/\n/).find(Boolean) || "未命名提示词";
  return firstLine.slice(0, 60);
}
