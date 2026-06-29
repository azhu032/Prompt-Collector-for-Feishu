const fields = {
  title: document.getElementById("title"),
  prompt: document.getElementById("prompt"),
  model: document.getElementById("model"),
  source: document.getElementById("source"),
  sourceUrl: document.getElementById("sourceUrl")
};

const dropZone = document.getElementById("dropZone");
const imageList = document.getElementById("imagePreview");
const imageInput = document.getElementById("imageFileInput");
const pasteImageButton = document.getElementById("pasteImage");
const tagList = document.getElementById("tagList");
const tagPicker = document.getElementById("tagPicker");
const toggleTagPicker = document.getElementById("toggleTagPicker");
const modelPicker = document.getElementById("modelPicker");
const toggleModelPicker = document.getElementById("toggleModelPicker");
const previewOverlay = document.getElementById("previewOverlay");
const previewImage = document.getElementById("previewImage");
const toast = document.getElementById("toast");
const saveButton = document.getElementById("save");
const openFeishuButton = document.getElementById("openFeishu");
const isSideMode = new URLSearchParams(location.search).get("mode") === "side";
const languageStorageKey = "popupLanguage";
const panelDraftKey = "panelTransferDraft";
const panelDraftMaxAgeMs = 10 * 60 * 1000;

const languages = {
  zh: { label: "中文", htmlLang: "zh-CN" },
  ja: { label: "日本語", htmlLang: "ja" },
  en: { label: "English", htmlLang: "en" }
};

const defaultTagOptions = [];

const translations = {
  zh: {
    appTitle: "提示词采集器",
    languageToggle: "中文",
    pinOpen: "侧栏",
    pinClose: "小窗",
    pinOpenTitle: "打开常驻侧边栏",
    pinCloseTitle: "退出侧栏模式，回到插件小窗",
    captureShort: "框选",
    captureAllTitle: "框选网页文字并填入",
    settings: "设置",
    statusReading: "正在读取当前页面...",
    statusSideReady: "侧栏已常驻，可拖入网页图片。",
    titleLabel: "标题",
    captureFill: "框选填入",
    captureTitleTitle: "框选网页文字填入标题",
    promptLabel: "提示词内容",
    capturePromptTitle: "框选网页文字填入提示词",
    tagLabel: "标签",
    addTagTitle: "添加标签",
    noTags: "未选择标签",
    removeTagTitle: "删除标签",
    modelLabel: "生图模型",
    addModelTitle: "选择生图模型",
    autoDetect: "点击进行选择",
    sourceLabel: "来源",
    sourceUrlLabel: "来源链接",
    referenceImages: "参考素材",
    addImage: "添加素材",
    pasteImage: "粘贴",
    pasteImageTitle: "从剪贴板粘贴图片",
    dropHint: "本地图片或视频可拖到这里。点侧栏进入常驻模式后，可从网页直接拖图；拖动缩略图可排序。",
    refresh: "重新识别",
    openFeishu: "打开飞书",
    openFeishuFailed: "无法打开飞书表格，请检查设置。",
    save: "保存到飞书",
    previewAlt: "参考图预览",
    sideCloseFailed: "无法关闭侧边栏。",
    sideClosed: "已切回小窗模式。请点击浏览器右上角插件图标打开小窗。",
    sidePanelUnsupported: "当前 Chrome 版本不支持侧边栏，请更新浏览器后再试。",
    noCurrentWindow: "没有找到当前浏览器窗口。",
    sideOpened: "已打开常驻侧边栏。",
    sideOpenFailed: "无法打开侧边栏。",
    extractFailed: "识别失败，请手动填写。",
    extractSuccess: "已识别，可以检查后保存。",
    extractEmpty: "没有识别到提示词，请手动粘贴内容。",
    draftImagesAdded: "已加入 {count} 张右键添加的参考图。",
    captureSideInstruction: "请在网页中框选文字区域，识别后会直接填入这里。",
    capturePopupInstruction: "请在网页中框选文字区域。小窗会收起，完成后再次打开插件即可看到结果。",
    captureStartFailed: "无法启动框选。",
    titleCaptured: "标题已通过框选文字填入。",
    promptCaptured: "提示词内容已通过框选文字填入。",
    regionCaptured: "框选区域文字已填入。",
    regionNoText: "没有读取到框选区域文字。",
    saving: "正在保存到飞书...",
    saveSuccess: "已保存到飞书。",
    saveToast: "已成功保存",
    saveFailedToast: "保存失败",
    saveFailed: "保存失败，请检查设置和权限。",
    pasteNoImage: "剪贴板里没有可用图片。",
    pasteFailed: "读取剪贴板失败，请复制图片后再试。",
    pasteAdded: "已从剪贴板加入 {count} 张参考图。",
    draftRestored: "已保留刚才编辑的内容。",
    imageEmpty: "未添加参考素材",
    imageAlt: "参考素材",
    videoAlt: "参考视频",
    removeImageTitle: "删除参考素材"
  },
  ja: {
    appTitle: "プロンプト収集",
    languageToggle: "日本語",
    pinOpen: "サイド",
    pinClose: "小窓",
    pinOpenTitle: "常駐サイドバーを開く",
    pinCloseTitle: "サイドバーモードを終了してポップアップに戻る",
    captureShort: "範囲",
    captureAllTitle: "ページ上の文字を範囲選択して入力",
    settings: "設定",
    statusReading: "現在のページを読み取っています...",
    statusSideReady: "サイドバーは常駐中です。Webページの画像をドラッグできます。",
    titleLabel: "タイトル",
    captureFill: "範囲入力",
    captureTitleTitle: "ページ上の文字を範囲選択してタイトルへ入力",
    promptLabel: "プロンプト本文",
    capturePromptTitle: "ページ上の文字を範囲選択してプロンプトへ入力",
    tagLabel: "タグ",
    addTagTitle: "タグを追加",
    noTags: "タグ未選択",
    removeTagTitle: "タグを削除",
    modelLabel: "画像生成モデル",
    addModelTitle: "画像生成モデルを選択",
    autoDetect: "自動認識",
    sourceLabel: "出典",
    sourceUrlLabel: "出典リンク",
    referenceImages: "参考素材",
    addImage: "素材を追加",
    pasteImage: "貼り付け",
    pasteImageTitle: "クリップボードから画像を貼り付け",
    dropHint: "ローカル画像または動画をここにドラッグできます。サイドバーの常駐モードではWebページから直接画像をドラッグでき、サムネイルの並べ替えもできます。",
    refresh: "再認識",
    openFeishu: "Feishuを開く",
    openFeishuFailed: "Feishuテーブルを開けません。設定を確認してください。",
    save: "Feishuに保存",
    previewAlt: "参考画像プレビュー",
    sideCloseFailed: "サイドバーを閉じられません。",
    sideClosed: "小窓モードに戻しました。ブラウザ右上の拡張機能アイコンから開いてください。",
    sidePanelUnsupported: "現在のChromeはサイドバーに対応していません。ブラウザを更新してからお試しください。",
    noCurrentWindow: "現在のブラウザウィンドウが見つかりません。",
    sideOpened: "常駐サイドバーを開きました。",
    sideOpenFailed: "サイドバーを開けません。",
    extractFailed: "認識に失敗しました。手動で入力してください。",
    extractSuccess: "認識しました。確認してから保存できます。",
    extractEmpty: "プロンプトを認識できませんでした。手動で貼り付けてください。",
    draftImagesAdded: "右クリックで追加した参考画像を {count} 枚追加しました。",
    captureSideInstruction: "Webページ上で文字範囲を選択してください。認識後ここに入力されます。",
    capturePopupInstruction: "Webページ上で文字範囲を選択してください。小窓はいったん閉じ、完了後に再度開くと結果が表示されます。",
    captureStartFailed: "範囲選択を開始できません。",
    titleCaptured: "タイトルを範囲選択した文字から入力しました。",
    promptCaptured: "プロンプト本文を範囲選択した文字から入力しました。",
    regionCaptured: "選択範囲の文字を入力しました。",
    regionNoText: "選択範囲の文字を読み取れませんでした。",
    saving: "Feishuに保存しています...",
    saveSuccess: "Feishuに保存しました。",
    saveToast: "保存しました",
    saveFailedToast: "保存失敗",
    saveFailed: "保存に失敗しました。設定と権限を確認してください。",
    pasteNoImage: "クリップボードに利用できる画像がありません。",
    pasteFailed: "クリップボードを読み取れません。画像をコピーしてからお試しください。",
    pasteAdded: "クリップボードから参考画像を {count} 枚追加しました。",
    draftRestored: "先ほど編集中の内容を引き継ぎました。",
    imageEmpty: "参考素材は未追加です",
    imageAlt: "参考素材",
    videoAlt: "参考動画",
    removeImageTitle: "参考素材を削除"
  },
  en: {
    appTitle: "Prompt Collector for Feishu",
    languageToggle: "English",
    pinOpen: "Side",
    pinClose: "Popup",
    pinOpenTitle: "Open the persistent side panel",
    pinCloseTitle: "Exit side panel mode and return to the popup",
    captureShort: "Select",
    captureAllTitle: "Select page text and fill it in",
    settings: "Settings",
    statusReading: "Reading the current page...",
    statusSideReady: "The side panel is pinned. You can drag in images from the page.",
    titleLabel: "Title",
    captureFill: "Fill from selection",
    captureTitleTitle: "Select page text and fill the title",
    promptLabel: "Prompt content",
    capturePromptTitle: "Select page text and fill the prompt",
    tagLabel: "Tags",
    addTagTitle: "Add tags",
    noTags: "No tags selected",
    removeTagTitle: "Remove tag",
    modelLabel: "Image model",
    addModelTitle: "Choose image model",
    autoDetect: "Auto detect",
    sourceLabel: "Source",
    sourceUrlLabel: "Source link",
    referenceImages: "Reference media",
    addImage: "Add media",
    pasteImage: "Paste",
    pasteImageTitle: "Paste image from clipboard",
    dropHint: "Drag local images or videos here. In pinned side panel mode, you can drag images directly from webpages; drag thumbnails to reorder.",
    refresh: "Detect again",
    openFeishu: "Open Feishu",
    openFeishuFailed: "Unable to open the Feishu table. Please check settings.",
    save: "Save to Feishu",
    previewAlt: "Reference image preview",
    sideCloseFailed: "Unable to close the side panel.",
    sideClosed: "Switched back to popup mode. Click the extension icon in the browser toolbar to open the popup.",
    sidePanelUnsupported: "This Chrome version does not support side panels. Please update the browser and try again.",
    noCurrentWindow: "Could not find the current browser window.",
    sideOpened: "Persistent side panel opened.",
    sideOpenFailed: "Unable to open the side panel.",
    extractFailed: "Detection failed. Please fill it in manually.",
    extractSuccess: "Detected. You can review and save it.",
    extractEmpty: "No prompt was detected. Please paste the content manually.",
    draftImagesAdded: "Added {count} reference images from the context menu.",
    captureSideInstruction: "Select a text area on the webpage. It will be filled here after detection.",
    capturePopupInstruction: "Select a text area on the webpage. The popup will close; reopen it after finishing to see the result.",
    captureStartFailed: "Unable to start selection.",
    titleCaptured: "Title filled from the selected text.",
    promptCaptured: "Prompt content filled from the selected text.",
    regionCaptured: "Selected text has been filled in.",
    regionNoText: "No text was read from the selected area.",
    saving: "Saving to Feishu...",
    saveSuccess: "Saved to Feishu.",
    saveToast: "Saved successfully",
    saveFailedToast: "Save failed",
    saveFailed: "Save failed. Please check settings and permissions.",
    pasteNoImage: "No usable image found in the clipboard.",
    pasteFailed: "Unable to read the clipboard. Copy an image and try again.",
    pasteAdded: "Added {count} reference images from the clipboard.",
    draftRestored: "Your edited content was preserved.",
    imageEmpty: "No reference media added",
    imageAlt: "Reference media",
    videoAlt: "Reference video",
    removeImageTitle: "Remove reference media"
  }
};

let images = [];
let selectedTags = [];
let tagOptions = [...defaultTagOptions];
let modelOptions = [];
let draggedImageId = null;
let dragInsertIndex = null;
let previewState = { scale: 1, x: 0, y: 0, dragging: false, lastX: 0, lastY: 0 };
let currentLanguage = "zh";
let toastTimer = null;

document.documentElement.classList.toggle("side-mode", isSideMode);
document.body.classList.toggle("side-mode", isSideMode);

const pinButton = document.getElementById("pinPanel");
setPinButtonText();
pinButton.addEventListener("click", togglePanelMode);

document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("refresh").addEventListener("click", async () => {
  await chrome.storage.session.remove(panelDraftKey);
  await extractCurrentPage();
});
saveButton.addEventListener("click", savePrompt);
openFeishuButton.addEventListener("click", openFeishuTable);
document.getElementById("captureAll").addEventListener("click", () => startRegionCapture("all"));
document.getElementById("addImageFile").addEventListener("click", () => imageInput.click());
pasteImageButton.addEventListener("click", pasteImagesFromClipboard);
toggleTagPicker.addEventListener("click", () => {
  toggleTagPickerPanel();
});
toggleModelPicker.addEventListener("click", () => {
  modelPicker.hidden = !modelPicker.hidden;
  if (!modelPicker.hidden) closeTagPickerPanel();
  renderModelPicker();
});
tagList.addEventListener("click", (event) => {
  if (event.target.closest(".tag-chip button")) return;
  toggleTagPickerPanel();
});
tagList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toggleTagPickerPanel();
});
fields.model.addEventListener("click", () => {
  modelPicker.hidden = !modelPicker.hidden;
  if (!modelPicker.hidden) closeTagPickerPanel();
  renderModelPicker();
});
document.querySelectorAll("[data-capture]").forEach((button) => {
  button.addEventListener("click", () => startRegionCapture(button.dataset.capture));
});
imageInput.addEventListener("change", async () => {
  await addFiles(imageInput.files);
  imageInput.value = "";
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("drag-over");
  const types = Array.from(event.dataTransfer?.types || []);
  if (draggedImageId || types.includes("application/x-prompt-collector-image")) return;
  await handleImageDrop(event.dataTransfer);
});

imageList.addEventListener("dragover", (event) => {
  if (!draggedImageId) return;
  event.preventDefault();
  dragInsertIndex = getDropIndex(event.clientX, event.clientY);
  paintSortTarget(dragInsertIndex);
});
imageList.addEventListener("drop", (event) => {
  if (!draggedImageId) return;
  event.preventDefault();
  event.stopPropagation();
  reorderImages(draggedImageId, dragInsertIndex ?? images.length);
});

previewOverlay.addEventListener("click", (event) => {
  if (event.target === previewOverlay) closePreview();
});
previewOverlay.addEventListener("wheel", (event) => {
  if (previewOverlay.hidden) return;
  event.preventDefault();
  previewState.scale = clamp(previewState.scale + (event.deltaY < 0 ? 0.12 : -0.12), 0.3, 5);
  updatePreviewTransform();
}, { passive: false });
previewOverlay.addEventListener("pointerdown", (event) => {
  if (event.target !== previewImage) return;
  previewState.dragging = true;
  previewState.lastX = event.clientX;
  previewState.lastY = event.clientY;
  previewOverlay.classList.add("dragging");
  previewImage.setPointerCapture(event.pointerId);
});
previewOverlay.addEventListener("pointermove", (event) => {
  if (!previewState.dragging) return;
  previewState.x += event.clientX - previewState.lastX;
  previewState.y += event.clientY - previewState.lastY;
  previewState.lastX = event.clientX;
  previewState.lastY = event.clientY;
  updatePreviewTransform();
});
previewOverlay.addEventListener("pointerup", (event) => {
  previewState.dragging = false;
  previewOverlay.classList.remove("dragging");
  try {
    previewImage.releasePointerCapture(event.pointerId);
  } catch {}
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !previewOverlay.hidden) closePreview();
  if (event.key === "Escape" && !tagPicker.hidden) closeTagPickerPanel();
  if (event.key === "Escape" && !modelPicker.hidden) modelPicker.hidden = true;
});
document.addEventListener("paste", async (event) => {
  const count = await addClipboardItems(event.clipboardData?.items || []);
  if (count) {
    event.preventDefault();
    setStatus(t("pasteAdded", { count }), true);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "APPLY_REGION_CAPTURE" && message.pending) {
    applyPendingCapture(message.pending);
  }
});

init();

async function init() {
  await loadLanguage();
  await loadOptionLists();
  await loadModelOptions();
  setStatus(t(isSideMode ? "statusSideReady" : "statusReading"));
  const restored = await restorePanelDraft();
  if (restored) {
    setStatus(t("draftRestored"), true);
    return;
  }
  await extractCurrentPage();
  await loadDraftImages();
  await loadPendingRegionCapture();
}

async function loadOptionLists() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_CONFIG" });
    const lists = response?.config?.optionLists || {};
    tagOptions = normalizeOptionList(lists.tags);
    modelOptions = normalizeOptionList(lists.models);
    selectedTags = selectedTags.filter((tag) => tagOptions.includes(tag));
  } catch {
    tagOptions = [];
    modelOptions = [];
  }
}

async function loadLanguage() {
  try {
    const stored = await chrome.storage.local.get(languageStorageKey);
    setLanguage(stored[languageStorageKey] || "zh", false);
  } catch {
    setLanguage("zh", false);
  }
}

function setLanguage(language, persist) {
  currentLanguage = languages[language] ? language : "zh";
  document.documentElement.lang = languages[currentLanguage].htmlLang;
  document.title = t("appTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((node) => {
    node.alt = t(node.dataset.i18nAlt);
  });
  setPinButtonText();
  renderTags();
  renderTagPicker();
  renderModelPicker();
  renderImages();
  if (persist) chrome.storage.local.set({ [languageStorageKey]: currentLanguage });
}

function t(key, values = {}) {
  const text = translations[currentLanguage]?.[key] || translations.zh[key] || key;
  return Object.entries(values).reduce((result, [name, value]) => {
    return result.replaceAll(`{${name}}`, value);
  }, text);
}

function setPinButtonText() {
  pinButton.textContent = t(isSideMode ? "pinClose" : "pinOpen");
  pinButton.title = t(isSideMode ? "pinCloseTitle" : "pinOpenTitle");
}

function toggleTagPickerPanel() {
  tagPicker.hidden = !tagPicker.hidden;
  tagList.setAttribute("aria-expanded", String(!tagPicker.hidden));
  if (!tagPicker.hidden) modelPicker.hidden = true;
  renderTagPicker();
}

function closeTagPickerPanel() {
  tagPicker.hidden = true;
  tagList.setAttribute("aria-expanded", "false");
}

async function loadModelOptions() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_MODEL_OPTIONS" });
    if (response?.options?.length) {
      modelOptions = response.options.slice(0, 12);
    }
  } catch {}
  renderModelPicker();
}

function setModelValue(value, overwrite = true) {
  const normalized = normalizeModelValue(value);
  if (!normalized || (!overwrite && fields.model.value)) return;
  fields.model.value = normalized;
  renderModelPicker();
}

function normalizeModelValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const direct = modelOptions.find((option) => option.toLowerCase() === raw.toLowerCase());
  if (direct) return direct;

  const normalizedRaw = raw.toLowerCase();
  const aliases = [
    [/gpt|chatgpt|4o|openai|dall/, ["gpt", "chatgpt", "openai", "dall"]],
    [/midjourney|--v|--ar|\bmj\b/, ["midjourney", "mj"]],
    [/stable diffusion|sdxl|\bsd\b|comfyui|automatic1111/, ["stable", "sdxl", "sd", "comfy"]],
    [/flux/, ["flux"]],
    [/即梦|jimeng/, ["即梦", "jimeng"]],
    [/可灵|kling/, ["可灵", "kling"]],
    [/豆包|doubao/, ["豆包", "doubao"]]
  ];

  for (const [pattern, optionHints] of aliases) {
    if (!pattern.test(normalizedRaw)) continue;
    const option = modelOptions.find((item) => {
      const lower = item.toLowerCase();
      return optionHints.some((hint) => lower.includes(hint));
    });
    if (option) return option;
  }

  return modelOptions.includes(raw) ? raw : "";
}

function normalizeOptionList(items) {
  const rawItems = Array.isArray(items) ? items : String(items || "").split(/\r?\n|,/);
  const out = [];
  const seen = new Set();
  for (const item of rawItems) {
    const clean = String(item || "").trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function renderModelPicker() {
  modelPicker.innerHTML = "";
  modelOptions.forEach((model) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "model-option";
    option.classList.toggle("selected", fields.model.value === model);
    option.textContent = model;
    option.addEventListener("click", () => {
      fields.model.value = fields.model.value === model ? "" : model;
      renderModelPicker();
    });
    modelPicker.append(option);
  });
}

function collectDraftPayload() {
  return {
    title: fields.title.value,
    prompt: fields.prompt.value,
    model: fields.model.value,
    source: fields.source.value,
    sourceUrl: fields.sourceUrl.value,
    tags: selectedTags,
    images,
    savedAt: Date.now()
  };
}

async function savePanelDraft() {
  await chrome.storage.session.set({ [panelDraftKey]: collectDraftPayload() });
}

async function restorePanelDraft() {
  const stored = await chrome.storage.session.get(panelDraftKey);
  const draft = stored[panelDraftKey];
  await chrome.storage.session.remove(panelDraftKey);
  if (!draft || Date.now() - Number(draft.savedAt || 0) > panelDraftMaxAgeMs) return false;

  fields.title.value = draft.title || "";
  fields.prompt.value = draft.prompt || "";
  fields.model.value = draft.model || "";
  fields.source.value = draft.source || "";
  fields.sourceUrl.value = draft.sourceUrl || "";
  selectedTags = normalizeOptionList(draft.tags || []).filter((tag) => tagOptions.includes(tag));
  images = Array.isArray(draft.images) ? draft.images.filter((image) => image?.url || image?.dataUrl) : [];
  renderTags();
  renderTagPicker();
  renderModelPicker();
  renderImages();
  return true;
}

async function togglePanelMode() {
  if (isSideMode) {
    await savePanelDraft();
    const response = await chrome.runtime.sendMessage({ type: "CLOSE_SIDE_PANEL" });
    if (!response?.ok) {
      setStatus(response?.message || t("sideCloseFailed"));
      return;
    }
    setStatus(t("sideClosed"), true);
    window.close();
    return;
  }

  try {
    await savePanelDraft();
    if (!chrome.sidePanel?.open) {
      throw new Error(t("sidePanelUnsupported"));
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.windowId) throw new Error(t("noCurrentWindow"));
    await chrome.sidePanel.setOptions({ path: "popup.html?mode=side", enabled: true });
    await chrome.sidePanel.open({ windowId: tab.windowId });
    setStatus(t("sideOpened"), true);
    window.close();
  } catch (error) {
    setStatus(error.message || t("sideOpenFailed"));
  }
}

async function extractCurrentPage() {
  const response = await chrome.runtime.sendMessage({ type: "EXTRACT_ACTIVE_TAB" });
  if (!response?.ok) {
    setStatus(response?.message || t("extractFailed"));
    return;
  }
  applyExtractedData(response.data || {}, true);
  setStatus(response.data?.prompt ? t("extractSuccess") : t("extractEmpty"), Boolean(response.data?.prompt));
}

async function loadDraftImages() {
  const response = await chrome.runtime.sendMessage({ type: "GET_DRAFT_IMAGES" });
  if (response?.images?.length) {
    addImageItems(response.images.map((image) => ({
      id: crypto.randomUUID(),
      url: image.url,
      sourceUrl: image.sourceUrl
    })));
    setStatus(t("draftImagesAdded", { count: response.images.length }), true);
  }
}

async function loadPendingRegionCapture() {
  const response = await chrome.runtime.sendMessage({ type: "GET_PENDING_REGION_CAPTURE" });
  if (response?.pending) applyPendingCapture(response.pending);
}

function applyPendingCapture(pending) {
  applyRegionCapture(pending.target || "all", pending.data || {});
  if (pending.data?.textReadError) setStatus(pending.data.textReadError);
}

async function startRegionCapture(target) {
  setStatus(t(isSideMode ? "captureSideInstruction" : "capturePopupInstruction"));
  const response = await chrome.runtime.sendMessage({ type: "START_REGION_CAPTURE", target });
  if (!response?.ok) setStatus(response?.message || t("captureStartFailed"));
}

function applyRegionCapture(target, data) {
  const hasText = Boolean(data.title || data.prompt || data.rawText);
  if (target === "title") {
    fields.title.value = data.title || data.rawText || "";
    addTags(data.tags || []);
    setStatus(hasText ? t("titleCaptured") : data.textReadError || t("regionNoText"), hasText);
    return;
  }
  if (target === "prompt") {
    fields.prompt.value = data.prompt || data.rawText || "";
    setModelValue(data.model, false);
    addTags(data.tags || []);
    addTags(detectPromptTags(fields.prompt.value));
    addUrlImages(data.imageUrls || []);
    setStatus(hasText ? t("promptCaptured") : data.textReadError || t("regionNoText"), hasText);
    return;
  }
  applyExtractedData(data, false);
  setStatus(hasText ? t("regionCaptured") : data.textReadError || t("regionNoText"), hasText);
}

function applyExtractedData(data, replaceImages) {
  fields.title.value = data.title || fields.title.value || "";
  fields.prompt.value = data.prompt || fields.prompt.value || "";
  if (replaceImages) fields.model.value = "";
  setModelValue(data.model, false);
  fields.source.value = data.source || fields.source.value || "";
  fields.sourceUrl.value = data.sourceUrl || fields.sourceUrl.value || "";
  if (replaceImages) selectedTags = [];
  addTags(data.tags || []);
  addTags(detectPromptTags(fields.prompt.value));
  if (replaceImages) images = [];
  addUrlImages(data.imageUrls || []);
}

function addTags(tags) {
  const next = new Set(selectedTags);
  tags.forEach((tag) => {
    if (tagOptions.includes(tag)) next.add(tag);
  });
  selectedTags = tagOptions.filter((tag) => next.has(tag));
  renderTags();
  renderTagPicker();
}

function toggleTag(tag) {
  if (selectedTags.includes(tag)) {
    selectedTags = selectedTags.filter((item) => item !== tag);
  } else {
    selectedTags = tagOptions.filter((item) => item === tag || selectedTags.includes(item));
  }
  renderTags();
  renderTagPicker();
}

function renderTags() {
  tagList.innerHTML = "";
  tagList.setAttribute("aria-expanded", String(!tagPicker.hidden));
  if (!selectedTags.length) {
    const empty = document.createElement("span");
    empty.className = "tag-empty";
    empty.textContent = t("noTags");
    tagList.append(empty);
    return;
  }

  selectedTags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.textContent = tag;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = t("removeTagTitle");
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleTag(tag);
    });

    chip.append(remove);
    tagList.append(chip);
  });
}

function renderTagPicker() {
  tagPicker.innerHTML = "";
  tagOptions.forEach((tag) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "tag-option";
    option.classList.toggle("selected", selectedTags.includes(tag));
    option.textContent = tag;
    option.addEventListener("click", () => toggleTag(tag));
    tagPicker.append(option);
  });
}

function detectPromptTags(text) {
  const normalized = normalizeForTagMatch(text);
  if (!normalized) return [];
  return tagOptions.filter((tag) => tagMatchesPrompt(tag, normalized));
}

function tagMatchesPrompt(tag, normalizedText) {
  const normalizedTag = normalizeForTagMatch(tag);
  if (!normalizedTag) return false;
  if (containsTagTerm(normalizedText, normalizedTag)) return true;
  return getTagMatchHints(normalizedTag).some((hint) => containsTagTerm(normalizedText, normalizeForTagMatch(hint)));
}

function getTagMatchHints(normalizedTag) {
  const hints = [];
  const add = (items) => hints.push(...items);
  if (/插画|插圖|illustration|illustrator/.test(normalizedTag)) add(["插画", "插圖", "插图", "illustration", "illustrated", "anime", "漫画", "manga", "水彩", "绘本"]);
  if (/海报|poster/.test(normalizedTag)) add(["海报", "poster", "kv", "key visual", "主视觉", "宣传图", "封面"]);
  if (/建筑|建築|architect/.test(normalizedTag)) add(["建筑", "建築", "architecture", "architectural", "building", "facade", "立面", "空间设计"]);
  if (/室内|室內|interior/.test(normalizedTag)) add(["室内", "室內", "interior", "living room", "bedroom", "kitchen", "家居", "软装", "軟裝"]);
  if (/电商|電商|ecommerce|e-commerce/.test(normalizedTag)) add(["电商", "電商", "ecommerce", "e-commerce", "商品图", "主图", "详情页", "product shot", "product photo"]);
  if (/教育|education|edu/.test(normalizedTag)) add(["教育", "education", "teaching", "learning", "课堂", "课程", "培训", "school"]);
  if (/sns|social|社交/.test(normalizedTag)) add(["sns", "social media", "instagram", "小红书", "社媒", "社交媒体", "post"]);
  if (/摄影|攝影|photo|photography/.test(normalizedTag)) add(["摄影", "攝影", "photo", "photography", "portrait", "camera", "镜头", "拍摄"]);
  if (/cosplay|cos/.test(normalizedTag)) add(["cosplay", "coser", "角色扮演", "cos"]);
  if (/时尚|時尚|fashion/.test(normalizedTag)) add(["时尚", "時尚", "fashion", "runway", "editorial", "lookbook", "穿搭", "高级感"]);
  if (/分镜|分鏡|storyboard|影视|影視/.test(normalizedTag)) add(["分镜", "分鏡", "storyboard", "cinematic", "film still", "镜头语言", "影视"]);
  if (/创意|創意|creative/.test(normalizedTag)) add(["创意", "創意", "creative", "concept", "idea", "脑洞", "概念"]);
  if (/ppt|presentation|幻灯|簡報|简报/.test(normalizedTag)) add(["ppt", "presentation", "slide", "deck", "幻灯片", "简报", "簡報"]);
  if (/^ui$|ux|interface|界面/.test(normalizedTag)) add(["ui", "ux", "interface", "app screen", "dashboard", "界面", "组件", "按钮"]);
  if (/游戏|遊戲|game/.test(normalizedTag)) add(["游戏", "遊戲", "game", "game art", "character design", "关卡", "道具", "场景概念"]);
  return hints;
}

function normalizeForTagMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u3000]/g, " ")
    .replace(/[，、。；：！？（）【】《》“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsTagTerm(normalizedText, normalizedTerm) {
  if (!normalizedTerm) return false;
  if (/^[a-z0-9+#.-]{1,4}$/.test(normalizedTerm)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`, "i").test(normalizedText);
  }
  return normalizedText.includes(normalizedTerm);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function savePrompt() {
  setStatus(t("saving"));
  const payload = {
    title: fields.title.value,
    prompt: fields.prompt.value,
    model: fields.model.value,
    source: fields.source.value,
    sourceUrl: fields.sourceUrl.value,
    tags: selectedTags,
    images
  };
  try {
    const response = await chrome.runtime.sendMessage({ type: "SAVE_PROMPT", data: payload });
    if (response?.ok) {
      setStatus(response.message || t("saveSuccess"), true);
      showToast(t("saveToast"), true, 2800);
      return;
    }
    const message = response?.message || t("saveFailed");
    setStatus(message);
    showToast(message || t("saveFailedToast"), false, 4600);
  } catch (error) {
    const message = error?.message || t("saveFailed");
    setStatus(message);
    showToast(message, false, 4600);
  }
}

async function openFeishuTable() {
  const response = await chrome.runtime.sendMessage({ type: "OPEN_FEISHU_TABLE" });
  if (!response?.ok) {
    setStatus(response?.message || t("openFeishuFailed"));
    showToast(t("openFeishuFailed"), false);
  }
}

async function handleImageDrop(dataTransfer) {
  if (dataTransfer.files?.length) {
    await addFiles(dataTransfer.files);
    return;
  }
  const urls = [];
  const uri = dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/plain");
  const html = dataTransfer.getData("text/html");
  if (html) {
    urls.push(...extractDroppedMediaUrls(html));
  }
  if (!urls.length && uri && isUsableMediaUrl(uri.trim(), true)) {
    urls.push(uri.trim());
  }
  addUrlImages(urls);
}

function extractDroppedMediaUrls(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const mediaItems = [];
  const push = (value, mediaType, strict = false) => {
    const clean = String(value || "").trim();
    if (!clean || clean.startsWith("blob:")) return;
    if (isUsableMediaUrl(clean, strict)) {
      mediaItems.push({
        url: clean,
        mediaType: mediaType || mediaKindFromUrl(clean)
      });
    }
  };

  doc.querySelectorAll("img").forEach((img) => {
    push(img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || img.currentSrc || img.src, "image");
  });
  doc.querySelectorAll("video, video source").forEach((video) => {
    push(video.getAttribute("src") || video.getAttribute("data-src") || video.getAttribute("data-video-src") || video.getAttribute("data-url") || video.currentSrc || video.src, "video");
  });
  doc.querySelectorAll("a").forEach((link) => {
    push(link.getAttribute("href") || link.href, "", true);
  });
  return mediaItems;
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter(isSupportedMediaFile);
  addImageItems(await Promise.all(files.map(fileToMediaItem)));
}

async function pasteImagesFromClipboard() {
  try {
    if (!navigator.clipboard?.read) {
      setStatus(t("pasteFailed"));
      return;
    }
    const clipboardItems = await navigator.clipboard.read();
    const imagesToAdd = [];
    for (const item of clipboardItems) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      imagesToAdd.push(await blobToImageItem(blob, imageType));
    }
    if (!imagesToAdd.length) {
      setStatus(t("pasteNoImage"));
      return;
    }
    addImageItems(imagesToAdd);
    setStatus(t("pasteAdded", { count: imagesToAdd.length }), true);
  } catch {
    setStatus(t("pasteFailed"));
  }
}

async function addClipboardItems(items) {
  const imageItems = [];
  for (const item of Array.from(items || [])) {
    if (!item.type?.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (!file) continue;
    imageItems.push(await fileToMediaItem(file));
  }
  if (imageItems.length) addImageItems(imageItems);
  return imageItems.length;
}

function fileToMediaItem(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: crypto.randomUUID(),
      dataUrl: reader.result,
      name: file.name,
      type: file.type,
      mediaType: file.type ? mediaKindFromMime(file.type) : mediaKindFromUrl(file.name)
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToImageItem(blob, type) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: crypto.randomUUID(),
      dataUrl: reader.result,
      name: `clipboard-${Date.now()}.${guessImageExtension(type)}`,
      type,
      mediaType: "image"
    });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function guessImageExtension(type) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

function addUrlImages(urls) {
  const unique = new Map();
  for (const item of urls || []) {
    const url = typeof item === "string" ? item : item?.url;
    if (!url || unique.has(url)) continue;
    unique.set(url, {
      id: crypto.randomUUID(),
      url,
      mediaType: typeof item === "string" ? mediaKindFromUrl(url) : item.mediaType || mediaKindFromUrl(url)
    });
  }
  addImageItems(Array.from(unique.values()));
}

function addImageItems(items) {
  const existing = new Set(images.map((image) => image.dataUrl || image.url));
  for (const item of items) {
    const key = item.dataUrl || item.url;
    if (!key || existing.has(key)) continue;
    existing.add(key);
    images.push(item);
  }
  images = images.slice(0, 12);
  renderImages();
}

function renderImages() {
  imageList.innerHTML = "";
  if (!images.length) {
    const empty = document.createElement("div");
    empty.className = "image-empty";
    empty.textContent = t("imageEmpty");
    imageList.append(empty);
    return;
  }
  images.forEach((image) => {
    const card = document.createElement("div");
    card.className = "image-card";
    card.draggable = true;
    card.dataset.id = image.id;

    const mediaSrc = image.dataUrl || image.url;
    const isVideo = isVideoMedia(image);
    const preview = document.createElement(isVideo ? "video" : "img");
    preview.src = mediaSrc;
    preview.title = image.name || image.url || t("imageAlt");
    preview.addEventListener("click", () => {
      if (isVideo) return;
      openPreview(mediaSrc);
    });
    if (isVideo) {
      preview.muted = true;
      preview.playsInline = true;
      preview.preload = "metadata";
      preview.title = image.name || image.url || t("videoAlt");
      preview.setAttribute("aria-label", t("videoAlt"));
      const badge = document.createElement("span");
      badge.className = "media-badge";
      badge.textContent = "VIDEO";
      card.append(badge);
    } else {
      preview.alt = t("imageAlt");
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = t("removeImageTitle");
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      images = images.filter((item) => item.id !== image.id);
      renderImages();
    });

    card.addEventListener("dragstart", (event) => {
      draggedImageId = image.id;
      dragInsertIndex = images.findIndex((item) => item.id === image.id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", image.id);
      event.dataTransfer.setData("application/x-prompt-collector-image", image.id);
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => {
      draggedImageId = null;
      dragInsertIndex = null;
      clearSortTargets();
      card.classList.remove("dragging");
    });
    card.append(preview, remove);
    imageList.append(card);
  });
}

function isSupportedMediaFile(file) {
  return file.type.startsWith("image/") || file.type.startsWith("video/") || /\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v|ogg|ogv)$/i.test(file.name || "");
}

function mediaKindFromMime(type = "") {
  return type.startsWith("video/") ? "video" : "image";
}

function mediaKindFromUrl(url = "") {
  const raw = String(url);
  if (/\.(mp4|webm|mov|m4v|ogg|ogv)(?:\?|#|$)/i.test(raw)) return "video";
  if (/(?:format|mime|type)=(?:video|mp4|webm|mov|m4v|ogg|ogv)/i.test(raw)) return "video";
  return "image";
}

function isVideoMedia(item) {
  return item?.mediaType === "video" || String(item?.type || "").startsWith("video/") || mediaKindFromUrl(item?.url || item?.name || "") === "video";
}

function isUsableMediaUrl(url, strict = false) {
  if (!/^(https?:|data:)/i.test(url)) return false;
  if (/^data:/i.test(url)) return /^data:(image|video)\//i.test(url);
  if (!strict) return true;
  if (/\.(png|jpe?g|webp|gif|mp4|webm|mov|m4v|ogg|ogv)(?:\?|#|$)/i.test(url)) return true;
  return /(?:format|mime|type)=(?:image|video|jpg|jpeg|png|webp|gif|mp4|webm)/i.test(url);
}

function getDropIndex(clientX, clientY) {
  const cards = Array.from(imageList.querySelectorAll(".image-card:not(.dragging)"));
  if (!cards.length) return images.length;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const isSameRow = clientY >= rect.top && clientY <= rect.bottom;
    if (clientY < rect.top + rect.height / 2 || (isSameRow && clientX < rect.left + rect.width / 2)) return indexForCard(card);
  }
  return images.length;
}

function indexForCard(card) {
  return images.findIndex((image) => image.id === card.dataset.id);
}

function paintSortTarget(index) {
  clearSortTargets();
  const target = images[index]?.id;
  if (target) imageList.querySelector(`[data-id="${CSS.escape(target)}"]`)?.classList.add("sort-target");
}

function clearSortTargets() {
  imageList.querySelectorAll(".sort-target").forEach((card) => card.classList.remove("sort-target"));
}

function reorderImages(fromId, toIndex) {
  const fromIndex = images.findIndex((image) => image.id === fromId);
  if (fromIndex < 0) return;
  const [item] = images.splice(fromIndex, 1);
  images.splice(clamp(fromIndex < toIndex ? toIndex - 1 : toIndex, 0, images.length), 0, item);
  draggedImageId = null;
  dragInsertIndex = null;
  renderImages();
}

function openPreview(src) {
  previewImage.src = src;
  previewState = { scale: 1, x: 0, y: 0, dragging: false, lastX: 0, lastY: 0 };
  updatePreviewTransform();
  previewOverlay.hidden = false;
}

function closePreview() {
  previewOverlay.hidden = true;
  previewOverlay.classList.remove("dragging");
}

function updatePreviewTransform() {
  previewImage.style.transform = `translate(${previewState.x}px, ${previewState.y}px) scale(${previewState.scale})`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message, ok = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.toggle("ok", ok);
}

function showToast(message, ok = true, duration = 2200) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", !ok);
  toast.hidden = false;
  positionToast();
  requestAnimationFrame(() => {
    positionToast();
    toast.classList.add("show");
  });
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    toastTimer = setTimeout(() => {
      toast.hidden = true;
      toastTimer = null;
    }, 200);
  }, duration);
}

function positionToast() {
  const rect = saveButton.getBoundingClientRect();
  toast.style.left = `${rect.left + rect.width / 2}px`;
  toast.style.top = `${Math.max(12, rect.top - 8)}px`;
}
