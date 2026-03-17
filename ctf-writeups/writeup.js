// Repo config
const GITHUB_CTF_REPO = {
  owner: "erik-stief",
  repo: "ctf-writeups",
  path: "2026",
};

const GITHUB_API_BASE = "https://api.github.com";


function simpleMarkdownToHtml(md, item = null) {
  const codeBlocks = [];
  const placeholder = (i) => `__CODE_BLOCK_${i}__`;

  md = md.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (match, code) => {
    let cleaned = code.replace(/\r\n/g, "\n");
    if (cleaned.startsWith("\n")) cleaned = cleaned.slice(1);
    if (cleaned.endsWith("\n")) cleaned = cleaned.slice(0, -1);
    codeBlocks.push(cleaned);
    return placeholder(codeBlocks.length - 1);
  });

  if (item && item.images) {
    item.images.forEach(img => {
      const rawUrl = img.url.replace('/contents/', '/raw/');  // FIXED: Direct replace
      const imgTag = `<img src="${rawUrl}" alt="${img.name}" style="max-width:100%;height:auto;">`;
      md = md.replace(new RegExp(`!\\[[^\\]]*\\]\\(\\s*${img.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*\\)`, 'gi'), imgTag);
    });
  }

  let html = md
    .replace(/^### (.*$)/gim, "<h3>$1</h3><hr>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2><hr>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n{2,}/gim, "</p><p>")
    .replace(/\n/gim, "<br />");

  codeBlocks.forEach((code, i) => {
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const blockHtml = `<pre><code>${escaped}</code></pre>`;
    html = html.replace(placeholder(i), blockHtml);
  });

  if (!html.trim().startsWith("<h") && !html.trim().startsWith("<pre")) {
    html = `<p>${html}</p>`;
  }

  return html;
}


function prettyName(segment) {
  return segment
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function getDirEntries(path) {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_CTF_REPO.owner}/${GITHUB_CTF_REPO.repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'CTF-Writeup-Viewer/1.0' 
    }
  });
  if (!res.ok) {
    console.error("Failed to list contents for", path, res.status);
    return [];
  }
  return res.json();
}

async function listMarkdownFilesRecursive(path) {
  const entries = await getDirEntries(path);
  let files = [];

  for (const entry of entries) {
    if (entry.type === "dir") {
      const subFiles = await listMarkdownFilesRecursive(entry.path);
      files = files.concat(subFiles);
    } else if (
      entry.type === "file" &&
      entry.name.toLowerCase().endsWith(".md") &&
      entry.name.toLowerCase() !== "readme.md"
    ) {
      files.push(entry);
    }
  }

  return files;
}

// Build tree: 2026 -> events -> challenges, plus per-event README and root README.
async function buildTreeWithReadmes(mdFiles) {
  const tree = {};

  // Populate challenges from markdown files
  for (const file of mdFiles) {
    const parts = file.path.split("/");
    const year = parts[0];              
    const event = parts[1] || "Unknown Event";
    const challengeFolder = parts[3] || parts[2] || "Challenge";
    const title = prettyName(challengeFolder);

    if (!tree[year]) tree[year] = { rootReadme: null, events: {} };
    if (!tree[year].events[event]) tree[year].events[event] = { readme: null, challenges: [] };

    tree[year].events[event].challenges.push({
      title,
      path: file.path,
      download_url: file.download_url,
      category: parts[2] || "",
      images: [],
    });
  }

  // Sort challenges within each event
  for (const year of Object.keys(tree)) {
    for (const event of Object.keys(tree[year].events)) {
      tree[year].events[event].challenges.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  const rootEntries = await getDirEntries("");
  const rootReadme = rootEntries.find(
    (e) => e.type === "file" && e.name.toLowerCase() === "readme.md"
  );

  for (const year of Object.keys(tree)) {
    if (rootReadme) {
      tree[year].rootReadme = {
        title: "",
        path: rootReadme.path,
        download_url: rootReadme.download_url,
      };
    }

    for (const event of Object.keys(tree[year].events)) {
      const eventPath = `${year}/${event}`;
      const eventEntries = await getDirEntries(eventPath);
      const eventReadme = eventEntries.find(
        (e) => e.type === "file" && e.name.toLowerCase() === "readme.md"
      );
      if (eventReadme) {
        tree[year].events[event].readme = {
          title: "",
          path: eventReadme.path,
          download_url: eventReadme.download_url,
        };
      }

      // For each challenge, look for PNGs in the same folder as the markdown
      for (const ch of tree[year].events[event].challenges) {
        const chParts = ch.path.split("/");
        chParts.pop();                     
        const chDir = chParts.join("/"); 
        const chEntries = await getDirEntries(chDir);
        const pngs = chEntries.filter(
          (e) =>
            e.type === "file" &&
            (e.name.toLowerCase().endsWith(".png") ||
             e.name.toLowerCase().endsWith(".jpg") ||
             e.name.toLowerCase().endsWith(".jpeg") ||
             e.name.toLowerCase().endsWith(".gif"))
        );
        ch.images = pngs.map((img) => ({
          name: img.name,
          url: img.download_url,
        }));
      }
    }
  }

  return tree;
}


function renderTree(tree) {
  const container = document.getElementById("ctf-tree");
  if (!container) return;

  container.innerHTML = "";
  const years = Object.keys(tree).sort().reverse();

  let initialItem = null;
  let initialElement = null;

  years.forEach((year) => {
    const yearData = tree[year];
    const yearDiv = document.createElement("div");
    yearDiv.className = "ctf-year";

    const yearTitle = document.createElement("div");
    yearTitle.className = "ctf-year-title";
    yearTitle.textContent = year;
    yearTitle.addEventListener("click", () => {
      yearDiv.classList.toggle("expanded");
      eventList.hidden = !eventList.hidden;
      if (yearData.rootReadme) {
        loadWriteup(yearTitle, yearData.rootReadme);
      }
    });

    const eventList = document.createElement("div");
    eventList.className = "ctf-event-list";
    eventList.hidden = true;

    const events = Object.keys(yearData.events).sort();
    events.forEach((event) => {
      const eventData = yearData.events[event];
      const eventDiv = document.createElement("div");
      eventDiv.className = "ctf-event";

      const eventTitle = document.createElement("div");
      eventTitle.className = "ctf-event-title";
      eventTitle.textContent = prettyName(event);
      eventTitle.addEventListener("click", () => {
        eventDiv.classList.toggle("expanded");
        challengeList.hidden = !challengeList.hidden;
        if (eventData.readme) {
          loadWriteup(eventTitle, eventData.readme);
        }
      });

      const challengeList = document.createElement("div");
      challengeList.className = "ctf-challenge-list";
      challengeList.hidden = true;

      eventData.challenges.forEach((challenge) => {
        const chDiv = document.createElement("div");
        chDiv.className = "ctf-challenge";
        chDiv.textContent = `${challenge.title} (${challenge.category})`;
        chDiv.addEventListener("click", () => loadWriteup(chDiv, challenge));
        challengeList.appendChild(chDiv);
      });

      eventDiv.appendChild(eventTitle);
      eventDiv.appendChild(challengeList);
      eventList.appendChild(eventDiv);
    });

    yearDiv.appendChild(yearTitle);
    yearDiv.appendChild(eventList);
    container.appendChild(yearDiv);

    if (!initialItem && yearData.rootReadme) {
      initialItem = yearData.rootReadme;
      initialElement = yearTitle;
    }
  });

  // Show root README on initial load
  if (initialItem && initialElement) {
    loadWriteup(initialElement, initialItem);
  }
}

let currentActiveChallenge = null;

async function loadWriteup(element, item) {
  const titleEl = document.getElementById("ctf-viewer-title");
  const metaEl = document.getElementById("ctf-viewer-meta");
  const contentEl = document.getElementById("ctf-viewer-content");
  if (!titleEl || !metaEl || !contentEl) return;

  if (currentActiveChallenge) {
    currentActiveChallenge.classList.remove("active");
  }
  currentActiveChallenge = element;
  element.classList.add("active");

  if (item.title && item.title.trim().length > 0) {
    titleEl.textContent = item.title;
  }
  metaEl.textContent = "";

  contentEl.textContent = "Loading writeupâ€¦";

  try {
    const res = await fetch(item.download_url);
    if (!res.ok) {
      contentEl.textContent = "Failed to load writeup.";
      return;
    }
    const md = await res.text();
    contentEl.innerHTML = simpleMarkdownToHtml(md, item);
  } catch (err) {
    console.error(err);
    contentEl.textContent = "Error loading writeup.";
  }
}

async function initCtfPage() {
  const treeContainer = document.getElementById("ctf-tree");
  if (!treeContainer) return;

  treeContainer.textContent = "Loading writeups from GitHubâ€¦";

  try {
    const mdFiles = await listMarkdownFilesRecursive(GITHUB_CTF_REPO.path);
    if (!mdFiles.length) {
      treeContainer.textContent = "No writeups found.";
      return;
    }

    const tree = await buildTreeWithReadmes(mdFiles);
    renderTree(tree);
  } catch (err) {
    console.error(err);
    treeContainer.textContent = "Error loading writeups.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initCtfPage();
});