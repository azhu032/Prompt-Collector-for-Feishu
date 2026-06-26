chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING_COLLECTOR_CONTENT") {
    sendResponse({ ok: true });
    return;
  }

  if (message.type === "EXTRACT_PROMPT") {
    try {
      sendResponse({
        ok: true,
        data: extractPromptFromPage(message.preferredImageUrl || "", message.tagOptions || [])
      });
    } catch (error) {
      sendResponse({ ok: false, message: error.message });
    }
    return;
  }

  if (message.type === "START_REGION_CAPTURE") {
    startRegionCapture(message.target || "all", message.tagOptions || []);
    sendResponse({ ok: true });
  }
});

const TAG_RULES = [
  ["插画", /插画|illustration|illustrator|绘本|手绘|水彩|anime|manga|cartoon|comic|sketch/i],
  ["海报", /海报|poster|banner|campaign|kv\b|key visual|主视觉|宣传图/i],
  ["建筑设计", /建筑|architecture|architectural|building|facade|cityscape|城市设计|景观设计/i],
  ["室内设计", /室内|interior|living room|bedroom|kitchen|bathroom|home decor|家具|软装|空间设计/i],
  ["电商", /电商|商品|产品图|主图|详情页|product shot|e-?commerce|amazon|taobao|tmall|shopify|packshot/i],
  ["教育", /教育|课程|课堂|学校|老师|学生|training|course|lesson|education|teaching|learning/i],
  ["SNS", /sns|social media|instagram|小红书|xhs|twitter|x\.com|facebook|tiktok|抖音|朋友圈|post template/i],
  ["摄影", /摄影|photography|photo|portrait|shoot|camera|lens|cinematic photo|realistic photo|写真|照片/i],
  ["Cosplay", /cosplay|coser|角色扮演|动漫真人|game character costume/i],
  ["时尚", /时尚|fashion|runway|editorial|lookbook|穿搭|服装|服饰|model wearing|high-fashion/i],
  ["影视分镜", /分镜|storyboard|shot list|film still|cinematic|movie scene|camera angle|镜头|电影画面|影视/i],
  ["创意", /创意|creative|conceptual|surreal|experimental|idea|脑洞|概念|奇思妙想/i],
  ["PPT", /\bppt\b|powerpoint|presentation|slide deck|slides?|演示文稿|幻灯片/i],
  ["UI", /\bui\b|ux|interface|app screen|dashboard|网页界面|应用界面|图标组|icon set/i],
  ["游戏", /game|游戏|手游|关卡|npc|rpg|game character|游戏角色|场景概念/i]
];

function extractPromptFromPage(preferredImageUrl, tagOptions = []) {
  const selection = window.getSelection()?.toString()?.trim() || "";
  const pageText = getBestPageText();
  const prompt = extractPromptText(selection || pageText);
  const scanText = `${selection}\n${pageText}\n${document.title}`;
  const imageUrls = getImageUrls(preferredImageUrl);

  return {
    title: buildPageTitle(prompt),
    prompt,
    model: detectModel(`${pageText}\n${document.title}`),
    source: detectSource(),
    sourceUrl: location.href,
    tags: detectTags(scanText, tagOptions),
    imageUrls
  };
}

function startRegionCapture(target, tagOptions = []) {
  removeRegionCapture();

  const root = document.createElement("div");
  root.id = "__feishu_prompt_region_root";
  root.innerHTML = `
    <div class="fpc-dim"></div>
    <div class="fpc-box"></div>
    <div class="fpc-tip">拖拽框选要识别的区域；按住拖拽时可滚动页面；Esc 取消</div>
  `;
  document.documentElement.append(root);

  const style = document.createElement("style");
  style.id = "__feishu_prompt_region_style";
  style.textContent = `
    #__feishu_prompt_region_root {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      cursor: crosshair;
      pointer-events: auto;
      font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    #__feishu_prompt_region_root .fpc-dim {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.22);
    }
    #__feishu_prompt_region_root .fpc-box {
      position: absolute;
      display: none;
      border: 2px solid #2454e6;
      background: rgba(36, 84, 230, 0.12);
      box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.16);
    }
    #__feishu_prompt_region_root .fpc-tip {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 8px;
      background: #ffffff;
      color: #17202a;
      padding: 10px 14px;
      box-shadow: 0 12px 36px rgba(15, 23, 42, 0.24);
      font-size: 14px;
      pointer-events: none;
      white-space: nowrap;
    }
  `;
  document.documentElement.append(style);

  const box = root.querySelector(".fpc-box");
  let drawing = false;
  let startPageX = 0;
  let startPageY = 0;
  let lastClientX = 0;
  let lastClientY = 0;

  const updateBox = () => {
    const endPageX = lastClientX + window.scrollX;
    const endPageY = lastClientY + window.scrollY;
    const leftPage = Math.min(startPageX, endPageX);
    const topPage = Math.min(startPageY, endPageY);
    const width = Math.abs(endPageX - startPageX);
    const height = Math.abs(endPageY - startPageY);
    box.style.display = width > 4 && height > 4 ? "block" : "none";
    box.style.left = `${leftPage - window.scrollX}px`;
    box.style.top = `${topPage - window.scrollY}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
  };

  const onPointerDown = (event) => {
    drawing = true;
    startPageX = event.clientX + window.scrollX;
    startPageY = event.clientY + window.scrollY;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    updateBox();
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!drawing) return;
    lastClientX = event.clientX;
    lastClientY = event.clientY;
    updateBox();
  };

  const onWheel = (event) => {
    if (!drawing) return;
    window.scrollBy({ top: event.deltaY, left: event.deltaX, behavior: "auto" });
    updateBox();
    event.preventDefault();
  };

  const onPointerUp = () => {
    if (!drawing) return;
    drawing = false;
    const endPageX = lastClientX + window.scrollX;
    const endPageY = lastClientY + window.scrollY;
    const rect = {
      left: Math.min(startPageX, endPageX),
      top: Math.min(startPageY, endPageY),
      right: Math.max(startPageX, endPageX),
      bottom: Math.max(startPageY, endPageY)
    };
    removeRegionCapture();
    chrome.runtime.sendMessage({
      type: "REGION_CAPTURE_RESULT",
      target,
      data: extractRegionData(rect, tagOptions)
    });
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") removeRegionCapture();
  };

  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointermove", onPointerMove);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown, { once: true });
}

function removeRegionCapture() {
  document.getElementById("__feishu_prompt_region_root")?.remove();
  document.getElementById("__feishu_prompt_region_style")?.remove();
}

function extractRegionData(rect, tagOptions = []) {
  const selectedText = getTextInRegion(rect);
  const imageUrls = getImagesInRegion(rect);
  const prompt = extractPromptText(selectedText);

  return {
    rect,
    title: selectedText ? buildPageTitle(prompt || selectedText) : "",
    prompt: prompt || selectedText,
    model: detectModel(selectedText),
    source: detectSource(),
    sourceUrl: location.href,
    tags: detectTags(selectedText, tagOptions),
    imageUrls: Array.from(new Set(imageUrls)).slice(0, 6),
    rawText: selectedText
  };
}

function getTextInRegion(rect) {
  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = normalizeText(node.textContent || "");
      if (text.length < 2) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest("#__feishu_prompt_region_root")) return NodeFilter.FILTER_REJECT;
      if (!isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const textRects = getTextNodePageRects(node);
    const hit = textRects.find((textRect) => intersects(rect, textRect));
    if (!hit) continue;
    items.push({
      text: normalizeText(node.textContent || ""),
      top: hit.top,
      left: hit.left
    });
  }

  return uniqueText(items
    .sort((a, b) => a.top - b.top || a.left - b.left)
    .map((item) => item.text))
    .join("\n");
}

function getImagesInRegion(rect) {
  const urls = [];
  document.querySelectorAll("img").forEach((img) => {
    const nodeRect = getPageRect(img);
    if (!intersects(rect, nodeRect)) return;
    if (nodeRect.right - nodeRect.left < 40 || nodeRect.bottom - nodeRect.top < 40) return;
    if (/profile|avatar|emoji|icon/i.test(`${img.alt} ${img.src}`)) return;
    const src = img.currentSrc || img.src;
    if (src && !src.startsWith("data:")) urls.push(src);
  });
  return Array.from(new Set(urls)).slice(0, 6);
}

function getTextNodePageRects(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      right: rect.right + window.scrollX,
      bottom: rect.bottom + window.scrollY
    }));
  range.detach();
  return rects;
}

function isVisibleElement(element) {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  return element.getClientRects().length > 0;
}

function getPageRect(node) {
  const rect = node.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
    right: rect.right + window.scrollX,
    bottom: rect.bottom + window.scrollY
  };
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function uniqueText(items) {
  const out = [];
  const seen = new Set();
  for (const item of items.map(normalizeText).filter(Boolean)) {
    if (seen.has(item)) continue;
    if (out.some((existing) => existing.includes(item))) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function getBestPageText() {
  if (isXPost()) {
    const article = findPrimaryArticle();
    if (article) return getVisibleText(article);
  }

  const candidates = [];
  for (const selector of ["pre", "code", "blockquote", "article", "main", "[role='main']"]) {
    document.querySelectorAll(selector).forEach((node) => {
      const text = getVisibleText(node);
      if (text.length > 30) candidates.push(scoreText(text));
    });
  }

  document.querySelectorAll("p, li, div").forEach((node) => {
    const text = getDirectText(node);
    if (text.length > 80 && text.length < 6000) candidates.push(scoreText(text));
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.text || document.body?.innerText || "";
}

function extractPromptText(text) {
  const cleaned = normalizeText(text);
  if (!cleaned) return "";

  const labelMatch = cleaned.match(/(?:^|\n)\s*(?:prompt|prompts|提示词|正向提示词|提示詞)\s*[:：]\s*([\s\S]+)/i);
  if (labelMatch) return trimPromptEnd(labelMatch[1]);

  const fenced = cleaned.match(/```(?:[a-z0-9_-]+)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]?.trim().length > 20) return fenced[1].trim();

  return cleaned;
}

function trimPromptEnd(text) {
  return normalizeText(text)
    .replace(/\n\s*(?:negative prompt|负向提示词|参数|settings|seed|steps)\s*[:：][\s\S]*$/i, "")
    .replace(/\n\s*(?:reply|repost|like|share|views)\b[\s\S]*$/i, "")
    .trim();
}

function scoreText(text) {
  const normalized = normalizeText(text);
  let score = Math.min(normalized.length, 2000);
  if (/prompt|提示词|提示詞|instruction|system|user/i.test(normalized)) score += 900;
  if (/midjourney|stable diffusion|flux|dall|chatgpt|gpt image|imagen|即梦|可灵|豆包/i.test(normalized)) score += 450;
  if (normalized.includes("\n")) score += 150;
  if (normalized.length < 80) score -= 500;
  return { text: normalized, score };
}

function getImageUrls(preferredImageUrl) {
  const urls = [];
  if (preferredImageUrl) urls.push(preferredImageUrl);

  const scope = isXPost() ? findPrimaryArticle() || document : document;
  scope.querySelectorAll("img").forEach((img) => {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith("data:")) return;
    const rect = img.getBoundingClientRect();
    if (rect.width < 120 || rect.height < 120) return;
    if (/profile|avatar|emoji|icon/i.test(`${img.alt} ${src}`)) return;
    urls.push(src);
  });

  return Array.from(new Set(urls)).slice(0, 6);
}

function isXPost() {
  return /(^|\.)x\.com$|(^|\.)twitter\.com$/.test(location.hostname);
}

function findPrimaryArticle() {
  const articles = Array.from(document.querySelectorAll("article"));
  if (!articles.length) return null;
  const viewportCenter = window.innerHeight / 2;
  return articles
    .map((article) => {
      const rect = article.getBoundingClientRect();
      const text = getVisibleText(article);
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      return { article, score: text.length - distance * 0.2 };
    })
    .sort((a, b) => b.score - a.score)[0]?.article;
}

function detectModel(text) {
  const models = [
    ["GPT Image", /gpt image|chatgpt|4o image|image on chatgpt/i],
    ["Midjourney", /midjourney|--ar|--v\s?\d/i],
    ["Flux", /\bflux\b|flux\.1/i],
    ["Stable Diffusion", /stable diffusion|sdxl|comfyui|automatic1111/i],
    ["Imagen", /imagen/i],
    ["DALL-E", /dall[\s-]?e/i],
    ["即梦", /即梦|jimeng/i],
    ["可灵", /可灵|kling/i],
    ["豆包", /豆包|doubao/i]
  ];
  return models.find(([, pattern]) => pattern.test(text))?.[0] || "";
}

function detectTags(text, tagOptions = []) {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  const allowed = normalizeOptionList(tagOptions);
  const allowedSet = new Set(allowed);
  const ruleTags = TAG_RULES
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([tag]) => tag)
    .filter((tag) => !allowedSet.size || allowedSet.has(tag));
  const labelTags = allowed.filter((tag) => new RegExp(escapeRegExp(tag), "i").test(normalized));
  return Array.from(new Set([...ruleTags, ...labelTags]));
}

function normalizeOptionList(items) {
  const rawItems = Array.isArray(items) ? items : String(items || "").split(/\r?\n|,/);
  const out = [];
  const seen = new Set();
  for (const item of rawItems) {
    const clean = normalizeText(item);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectSource() {
  if (isXPost()) return "X/Twitter";
  if (/chatgpt\.com$/.test(location.hostname)) return "ChatGPT";
  if (/midjourney\.com$/.test(location.hostname)) return "Midjourney";
  return location.hostname.replace(/^www\./, "");
}

function buildPageTitle(prompt) {
  const title = document.title.replace(/\s+[-|]\s+X$/, "").trim();
  if (title && title.length <= 80) return title;
  const firstLine = prompt.split(/\n/).find(Boolean) || title || "未命名提示词";
  return firstLine.slice(0, 80);
}

function getVisibleText(node) {
  return normalizeText(node.innerText || node.textContent || "");
}

function getDirectText(node) {
  const pieces = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) pieces.push(child.textContent);
  });
  return normalizeText(pieces.join(" "));
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
