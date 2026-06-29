const ids = [
  "feishuHost",
  "appId",
  "appSecret",
  "popupLanguage",
  "baseUrl",
  "appToken",
  "tableId",
  "ocrEndpoint",
  "ocrApiKey",
  "ocrModel",
  "fieldTitle",
  "fieldImage",
  "fieldPrompt",
  "fieldModel",
  "fieldSource",
  "fieldTags",
  "tagOptions",
  "modelOptions"
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const languageStorageKey = "popupLanguage";
const versionBadge = document.getElementById("versionBadge");
const optionState = {
  tags: [],
  models: []
};

const languages = {
  zh: { htmlLang: "zh-CN" },
  ja: { htmlLang: "ja" },
  en: { htmlLang: "en" }
};

const translations = {
  zh: {
    pageTitle: "Prompt Collector for Feishu 设置",
    creatorLink: "作者 X：@azhu_032",
    introTitle: "连接你的提示词资料库",
    introText: "配置飞书多维表格后，即可把网页提示词、参考图和来源保存到你的资料库。框选识别会优先读取网页真实文字。",
    feishuApp: "飞书应用",
    feishuHost: "飞书开放平台域名",
    uiSettings: "界面设置",
    languageLabel: "界面语言",
    targetTable: "目标表格",
    baseUrlLabel: "多维表格链接，可用于辅助解析 Table ID",
    parseUrl: "从链接解析",
    ocrTitle: "OCR 视觉模型（可选备用）",
    ocrHint: "普通网页文字不需要填写这里；只有图片或视频画面里的文字才可能需要 OCR。",
    ocrEndpoint: "接口地址",
    ocrEndpointPlaceholder: "例如：https://api.openai.com/v1/chat/completions",
    ocrModel: "模型名",
    ocrModelPlaceholder: "填写支持图片理解的模型",
    testOcr: "检查备用 OCR 配置",
    fieldMapping: "字段映射",
    fieldTitle: "标题字段",
    fieldImage: "参考图字段",
    fieldPrompt: "提示词内容字段",
    fieldModel: "生图模型字段",
    fieldSource: "提示词来源字段",
    fieldTags: "标签字段",
    optionManagement: "选项管理",
    optionHint: "这里仅显示从飞书字段读取到的选项，不能在插件里编辑。需要调整选项时，请在飞书表格字段中修改后刷新设置页。",
    tagOptions: "标签选项",
    modelOptions: "生图模型选项",
    emptyOptions: "暂无选项",
    defaultStatus: "配置只保存在当前浏览器本地。",
    testFeishu: "测试飞书连接",
    openFeishu: "打开飞书",
    saveSettings: "保存设置",
    testingFeishu: "正在测试飞书连接...",
    connectionFailed: "连接失败。",
    missingFields: "连接成功，但没有找到字段：{fields}。请检查字段名。",
    openedFeishu: "已打开飞书表格。",
    openFeishuFailed: "无法打开飞书表格，请检查设置。",
    ocrIncomplete: "OCR 配置不完整。",
    pasteBaseUrl: "请先粘贴多维表格链接。",
    wikiNeedsToken: "已解析 Table ID；Wiki 链接里的 Base App Token 需要手动填写真实 Base Token。",
    parseDone: "解析完成，请保存或测试连接。",
    badUrl: "链接格式不正确。",
    settingsSaved: "设置已保存。",
    settingsSaveFailed: "设置保存失败。",
    syncedTags: "已从飞书读取 {count} 个标签选项。",
    syncedModels: "已从飞书读取 {count} 个生图模型选项。"
  },
  ja: {
    pageTitle: "Prompt Collector for Feishu 設定",
    creatorLink: "作者X：@azhu_032",
    introTitle: "プロンプト資料庫に接続",
    introText: "Feishu Base を設定すると、Web上のプロンプト、参考画像、出典を資料庫へ保存できます。範囲選択はページ上の実際の文字を優先して読み取ります。",
    feishuApp: "Feishuアプリ",
    feishuHost: "Feishu Open Platform ドメイン",
    uiSettings: "表示設定",
    languageLabel: "表示言語",
    targetTable: "保存先テーブル",
    baseUrlLabel: "Baseリンク（Table ID解析の補助）",
    parseUrl: "リンクから解析",
    ocrTitle: "OCR ビジョンモデル（任意）",
    ocrHint: "通常のWeb文字には不要です。画像や動画内の文字だけOCRが必要になる場合があります。",
    ocrEndpoint: "エンドポイント",
    ocrEndpointPlaceholder: "例：https://api.openai.com/v1/chat/completions",
    ocrModel: "モデル名",
    ocrModelPlaceholder: "画像理解に対応したモデル名",
    testOcr: "OCR設定を確認",
    fieldMapping: "フィールド対応",
    fieldTitle: "タイトルフィールド",
    fieldImage: "参考画像フィールド",
    fieldPrompt: "プロンプト本文フィールド",
    fieldModel: "画像生成モデルフィールド",
    fieldSource: "出典フィールド",
    fieldTags: "タグフィールド",
    optionManagement: "選択肢",
    optionHint: "ここにはFeishuフィールドから読み取った選択肢だけを表示します。編集する場合はFeishu側で変更し、設定ページを更新してください。",
    tagOptions: "タグ選択肢",
    modelOptions: "画像生成モデル選択肢",
    emptyOptions: "選択肢はありません",
    defaultStatus: "設定はこのブラウザ内にのみ保存されます。",
    testFeishu: "Feishu接続を確認",
    openFeishu: "Feishuを開く",
    saveSettings: "設定を保存",
    testingFeishu: "Feishu接続を確認しています...",
    connectionFailed: "接続に失敗しました。",
    missingFields: "接続しましたが、フィールドが見つかりません：{fields}。フィールド名を確認してください。",
    openedFeishu: "Feishuテーブルを開きました。",
    openFeishuFailed: "Feishuテーブルを開けません。設定を確認してください。",
    ocrIncomplete: "OCR設定が不足しています。",
    pasteBaseUrl: "先にBaseリンクを貼り付けてください。",
    wikiNeedsToken: "Table IDを解析しました。Wikiリンク内のBase App Tokenは手動入力が必要です。",
    parseDone: "解析しました。保存または接続確認をしてください。",
    badUrl: "リンク形式が正しくありません。",
    settingsSaved: "設定を保存しました。",
    settingsSaveFailed: "設定の保存に失敗しました。",
    syncedTags: "Feishuからタグ選択肢を {count} 件読み取りました。",
    syncedModels: "Feishuから画像生成モデル選択肢を {count} 件読み取りました。"
  },
  en: {
    pageTitle: "Prompt Collector for Feishu Settings",
    creatorLink: "Creator X: @azhu_032",
    introTitle: "Connect Your Prompt Library",
    introText: "After connecting a Feishu Base table, you can save web prompts, reference images, and sources into your library. Region selection reads real page text first.",
    feishuApp: "Feishu App",
    feishuHost: "Feishu Open Platform Host",
    uiSettings: "Interface",
    languageLabel: "Interface Language",
    targetTable: "Target Table",
    baseUrlLabel: "Base link, used to help parse the Table ID",
    parseUrl: "Parse Link",
    ocrTitle: "OCR Vision Model (Optional)",
    ocrHint: "Normal webpage text does not need this. OCR is only useful for text inside images or video frames.",
    ocrEndpoint: "Endpoint",
    ocrEndpointPlaceholder: "Example: https://api.openai.com/v1/chat/completions",
    ocrModel: "Model Name",
    ocrModelPlaceholder: "Use a model that supports image understanding",
    testOcr: "Check OCR Config",
    fieldMapping: "Field Mapping",
    fieldTitle: "Title Field",
    fieldImage: "Reference Image Field",
    fieldPrompt: "Prompt Content Field",
    fieldModel: "Image Model Field",
    fieldSource: "Prompt Source Field",
    fieldTags: "Tags Field",
    optionManagement: "Options",
    optionHint: "This area only shows options read from Feishu fields. Edit options in Feishu, then refresh this settings page.",
    tagOptions: "Tag Options",
    modelOptions: "Image Model Options",
    emptyOptions: "No options",
    defaultStatus: "Settings are stored locally in this browser.",
    testFeishu: "Test Feishu Connection",
    openFeishu: "Open Feishu",
    saveSettings: "Save Settings",
    testingFeishu: "Testing Feishu connection...",
    connectionFailed: "Connection failed.",
    missingFields: "Connection succeeded, but these fields were not found: {fields}. Please check the field names.",
    openedFeishu: "Opened the Feishu table.",
    openFeishuFailed: "Unable to open the Feishu table. Please check settings.",
    ocrIncomplete: "OCR config is incomplete.",
    pasteBaseUrl: "Paste the Base link first.",
    wikiNeedsToken: "Table ID parsed. Wiki links still require the real Base App Token manually.",
    parseDone: "Parsed. Save or test the connection next.",
    badUrl: "Invalid link format.",
    settingsSaved: "Settings saved.",
    settingsSaveFailed: "Failed to save settings.",
    syncedTags: "Read {count} tag options from Feishu.",
    syncedModels: "Read {count} image model options from Feishu."
  }
};

versionBadge.textContent = `v${chrome.runtime.getManifest().version}`;

document.getElementById("save").addEventListener("click", save);
document.getElementById("test").addEventListener("click", testFeishu);
document.getElementById("openFeishu").addEventListener("click", openFeishuTable);
document.getElementById("testOcr").addEventListener("click", testOcr);
document.getElementById("parseUrl").addEventListener("click", parseUrl);
el.popupLanguage.addEventListener("change", () => setLanguage(el.popupLanguage.value, true));

load();

async function load() {
  const response = await chrome.runtime.sendMessage({ type: "GET_CONFIG" });
  const storedLanguage = await chrome.storage.local.get(languageStorageKey).catch(() => ({}));
  const config = response.config;
  const language = storedLanguage[languageStorageKey] || "zh";
  el.feishuHost.value = config.feishuHost || "https://open.feishu.cn";
  el.appId.value = config.appId || "";
  el.appSecret.value = config.appSecret || "";
  el.popupLanguage.value = language;
  setLanguage(language, false);
  el.baseUrl.value = config.baseUrl || "";
  el.appToken.value = config.appToken || "";
  el.tableId.value = config.tableId || "";
  el.ocrEndpoint.value = config.ocr?.endpoint || "";
  el.ocrApiKey.value = config.ocr?.apiKey || "";
  el.ocrModel.value = config.ocr?.model || "";
  el.fieldTitle.value = config.fieldNames.title || "标题";
  el.fieldImage.value = config.fieldNames.referenceImage || "参考图";
  el.fieldPrompt.value = config.fieldNames.prompt || "提示词内容";
  el.fieldModel.value = config.fieldNames.model || "生图模型";
  el.fieldSource.value = config.fieldNames.source || "提示词来源";
  el.fieldTags.value = config.fieldNames.tags || "标签";
  renderOptionChips("tags", []);
  renderOptionChips("models", []);
  await refreshOptionsFromFeishu();
}

async function save() {
  const response = await chrome.runtime.sendMessage({
    type: "SAVE_CONFIG",
    config: collectConfig()
  });
  await chrome.storage.local.set({ [languageStorageKey]: el.popupLanguage.value });
  if (response.ok) {
    setStatus(t("settingsSaved"), true);
    return;
  }
  setStatus(response.message || t("settingsSaveFailed"));
}

async function refreshOptionsFromFeishu(options = {}) {
  await syncTagOptionsFromFeishu(options);
  await syncModelOptionsFromFeishu(options);
}

async function syncTagOptionsFromFeishu({ config = null, silent = false } = {}) {
  const response = await chrome.runtime.sendMessage({
    type: "SYNC_TAG_OPTIONS_FROM_FEISHU",
    config
  });
  if (response?.ok) {
    renderOptionChips("tags", response.options);
  }
  if (response?.synced && !silent) {
    setStatus(t("syncedTags", { count: optionState.tags.length }), true);
  }
}

async function syncModelOptionsFromFeishu({ config = null, silent = false } = {}) {
  const response = await chrome.runtime.sendMessage({
    type: "SYNC_MODEL_OPTIONS_FROM_FEISHU",
    config
  });
  if (response?.ok) {
    renderOptionChips("models", response.options);
  }
  if (response?.synced && !silent) {
    setStatus(t("syncedModels", { count: optionState.models.length }), true);
  }
}

async function testFeishu() {
  setStatus(t("testingFeishu"));
  const config = collectConfig();
  const response = await chrome.runtime.sendMessage({
    type: "TEST_FEISHU",
    config
  });
  if (!response.ok) {
    setStatus(response.message || t("connectionFailed"));
    return;
  }
  await refreshOptionsFromFeishu({ config, silent: true });

  const configured = [
    el.fieldTitle.value,
    el.fieldImage.value,
    el.fieldPrompt.value,
    el.fieldModel.value,
    el.fieldSource.value,
    el.fieldTags.value
  ];
  const missing = configured.filter((name) => !response.fields.includes(name));
  if (missing.length) {
    setStatus(t("missingFields", { fields: missing.join("、") }));
    return;
  }
  setStatus(response.message, true);
}

async function openFeishuTable() {
  const response = await chrome.runtime.sendMessage({ type: "OPEN_FEISHU_TABLE" });
  setStatus(response.ok ? t("openedFeishu") : response.message || t("openFeishuFailed"), Boolean(response.ok));
}

async function testOcr() {
  const response = await chrome.runtime.sendMessage({
    type: "TEST_OCR",
    config: collectConfig()
  });
  setStatus(response.ok ? response.message : response.message || t("ocrIncomplete"), response.ok);
}

function parseUrl() {
  const raw = el.baseUrl.value.trim();
  if (!raw) {
    setStatus(t("pasteBaseUrl"));
    return;
  }

  try {
    const url = new URL(raw);
    const table = url.searchParams.get("table") || url.searchParams.get("table_id");
    const baseMatch = url.pathname.match(/\/(?:base|bitable)\/([A-Za-z0-9_-]+)/);
    if (table) el.tableId.value = table;
    if (baseMatch?.[1]) el.appToken.value = baseMatch[1];

    if (!baseMatch && /\/wiki\//.test(url.pathname)) {
      setStatus(t("wikiNeedsToken"));
      return;
    }

    setStatus(t("parseDone"), true);
  } catch {
    setStatus(t("badUrl"));
  }
}

function collectConfig() {
  return {
    feishuHost: el.feishuHost.value.trim().replace(/\/$/, "") || "https://open.feishu.cn",
    appId: el.appId.value.trim(),
    appSecret: el.appSecret.value.trim(),
    baseUrl: el.baseUrl.value.trim(),
    appToken: el.appToken.value.trim(),
    tableId: el.tableId.value.trim(),
    ocr: {
      endpoint: el.ocrEndpoint.value.trim(),
      apiKey: el.ocrApiKey.value.trim(),
      model: el.ocrModel.value.trim()
    },
    fieldNames: {
      title: el.fieldTitle.value.trim() || "标题",
      referenceImage: el.fieldImage.value.trim() || "参考图",
      prompt: el.fieldPrompt.value.trim() || "提示词内容",
      model: el.fieldModel.value.trim() || "生图模型",
      source: el.fieldSource.value.trim() || "提示词来源",
      tags: el.fieldTags.value.trim() || "标签"
    },
    optionLists: {
      tags: optionState.tags,
      models: optionState.models
    }
  };
}

function renderOptionChips(kind, items) {
  const targetId = kind === "models" ? "modelOptions" : "tagOptions";
  const options = normalizeOptionList(items);
  optionState[kind] = options;
  el[targetId].innerHTML = "";
  if (!options.length) {
    const empty = document.createElement("span");
    empty.className = "option-empty";
    empty.textContent = t("emptyOptions");
    el[targetId].append(empty);
    return;
  }
  options.forEach((option) => {
    const chip = document.createElement("span");
    chip.className = "option-chip";
    chip.textContent = option;
    el[targetId].append(chip);
  });
}

function normalizeOptionList(items) {
  const out = [];
  const seen = new Set();
  const rawItems = Array.isArray(items) ? items : String(items || "").split(/\r?\n|,/);
  rawItems.forEach((item) => {
    const clean = String(item || "").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  });
  return out;
}

function setStatus(message, ok = false) {
  const status = document.getElementById("status");
  status.textContent = message;
  status.classList.toggle("ok", ok);
}

function setLanguage(language, persist) {
  const nextLanguage = languages[language] ? language : "zh";
  document.documentElement.lang = languages[nextLanguage].htmlLang;
  document.title = t("pageTitle", {}, nextLanguage);
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n, {}, nextLanguage);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder, {}, nextLanguage);
  });
  renderOptionChips("tags", optionState.tags);
  renderOptionChips("models", optionState.models);
  if (persist) chrome.storage.local.set({ [languageStorageKey]: nextLanguage });
}

function t(key, values = {}, language = el.popupLanguage?.value || "zh") {
  const text = translations[language]?.[key] || translations.zh[key] || key;
  return Object.entries(values).reduce((result, [name, value]) => {
    return result.replaceAll(`{${name}}`, value);
  }, text);
}
