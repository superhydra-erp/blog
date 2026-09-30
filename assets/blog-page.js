const script = document.currentScript;
const dataDir = script.dataset.dir;
const homeHref = script.dataset.home || "../";

const byId = (id) => document.getElementById(id);

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

async function loadText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.text();
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function makePill(text) {
  const span = document.createElement("span");
  span.className = "pill";
  span.textContent = text;
  return span;
}

function makeLink(label, url, note) {
  const li = document.createElement("li");
  li.className = "resource-item";
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.textContent = label;
  li.append(a);
  if (note) {
    const span = document.createElement("span");
    span.className = "resource-note";
    span.textContent = note;
    li.append(span);
  }
  return li;
}

function renderKeywords(meta) {
  const list = document.createElement("ul");
  list.className = "keyword-list";
  (meta.keywords || []).forEach((keyword) => {
    const li = document.createElement("li");
    li.textContent = keyword;
    list.append(li);
  });
  return list;
}

function renderResources(externalMedia) {
  const list = document.createElement("ul");
  list.className = "resource-list";
  const audioUrl = externalMedia?.podcast?.sourceUrls?.audio;
  const pdfUrl = externalMedia?.document?.sourceUrls?.pdf;
  const presentationUrl =
    externalMedia?.presentation?.presentationUrl || externalMedia?.presentation?.sourceUrls?.presentation;

  if (audioUrl) {
    const li = makeLink("Podcast audio", audioUrl, "Generated audio");
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = audioUrl;
    li.append(audio);
    list.append(li);
  }

  if (pdfUrl) list.append(makeLink("Generated PDF", pdfUrl, "Document export"));
  if (presentationUrl) list.append(makeLink("Presentation", presentationUrl, "Presentation share"));
  return list;
}

function renderSources(sourcesData) {
  const list = document.createElement("ul");
  list.className = "source-list";
  (sourcesData.sources || []).forEach((source) => {
    const li = document.createElement("li");
    li.className = "source-item";
    const a = document.createElement("a");
    a.href = source.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = source.title;
    const domain = document.createElement("span");
    domain.className = "source-domain";
    domain.textContent = source.publishedAt
      ? `${source.domain} / ${formatDate(source.publishedAt)}`
      : source.domain;
    li.append(a, domain);
    list.append(li);
  });
  return list;
}

function makePanel(title, content) {
  const section = document.createElement("section");
  section.className = "panel";
  const inner = document.createElement("div");
  inner.className = "panel-inner";
  const heading = document.createElement("h2");
  heading.textContent = title;
  inner.append(heading, content);
  section.append(inner);
  return section;
}

function cleanArticleHtml(article) {
  article.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") || "";
    const isRelative =
      src && !/^(?:[a-z]+:)?\/\//i.test(src) && !src.startsWith("/") && !src.startsWith("data:");
    if (isRelative) img.src = `${dataDir}/${src}`;
  });

}

function extractArticleHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.querySelector("article")?.innerHTML || html;
}

async function init() {
  try {
    const [meta, html, externalMedia, sources] = await Promise.all([
      loadJson(`${dataDir}/blog.json`),
      loadText(`${dataDir}/blog.html`),
      loadJson(`${dataDir}/external-media.json`),
      loadJson(`${dataDir}/sources.json`),
    ]);

    document.title = meta.seoTitle || meta.title;
    byId("page-title").textContent = meta.title;
    byId("excerpt").textContent = meta.excerpt || "";
    byId("category").textContent = meta.category || "Blog";
    byId("published-date").textContent = formatDate(meta.publishedDate);
    byId("reading-time").textContent = `${meta.readingTimeMinutes || "?"} min read`;
    byId("raw-html").href = `${dataDir}/blog.html`;
    byId("metadata").href = `${dataDir}/blog.json`;
    byId("home-link").href = homeHref;

    const image = byId("featured-image");
    image.src = `${dataDir}/${meta.originalImage || "featured-image.png"}`;
    image.alt = meta.imageAltText || "";
    byId("featured-source").srcset = `${dataDir}/${meta.featuredImage || "featured-image.webp"}`;
    byId("image-caption").textContent = meta.imageAltText || "";

    const article = byId("article");
    article.innerHTML = extractArticleHtml(html);
    cleanArticleHtml(article);

    byId("support").replaceChildren(
      makePanel("Keywords", renderKeywords(meta)),
      makePanel("Generated Media", renderResources(externalMedia)),
      makePanel("Sources", renderSources(sources)),
    );
  } catch (error) {
    byId("content").innerHTML =
      '<div class="error">The blog page could not load one or more export files.</div>';
    console.error(error);
  }
}

init();
