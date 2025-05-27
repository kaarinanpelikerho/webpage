// Loads info markdown files from /infos and displays them in the #info-list element
// Similar to events-loader.js but for infos

async function fetchInfoFiles() {
  // List of info files (hardcoded for static site)
  const files = [
    'infos/2025-06-12-abnormal-time.md',
    'infos/2025-06-20-summer-break.md'
  ];
  // Only include files that actually exist and are non-empty
  const results = await Promise.all(files.map(async f => {
    try {
      const res = await fetch(f);
      if (!res.ok) return null;
      const text = await res.text();
      if (!text.trim()) return null;
      return { file: f, text };
    } catch {
      return null;
    }
  }));
  return results.filter(Boolean);
}

function parseInfoMarkdown(md) {
  // Simple: first line as title, rest as body
  const lines = md.split('\n');
  const title = lines[0].replace(/^# /, '').trim();
  const body = lines.slice(1).join('\n').trim();
  return { title, body };
}

function sanitizeHTML(str) {
  str = str || '';
  return str.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/<script.*?>/gi, '')
            .replace(/<\/script>/gi, '');
}

function renderInfos(infos) {
  const ul = document.getElementById('info-list');
  ul.innerHTML = '';
  infos.forEach((info, idx) => {
    const li = document.createElement('li');
    li.className = 'list-group-item info-list-item d-flex flex-column flex-md-row justify-content-between align-items-md-center';
    const left = document.createElement('span');
    left.innerHTML = `<strong>${sanitizeHTML(info.title)}</strong><br><small>${sanitizeHTML(info.body)}</small>`;
    li.appendChild(left);
    ul.appendChild(li);
  });
}

async function loadInfos() {
  const infoList = document.getElementById('info-list');
  const infoSection = document.getElementById('infos');
  if (!infoList || !infoSection) return;
  const files = await fetchInfoFiles();
  const infos = files.map(f => parseInfoMarkdown(f.text));
  if (infos.length > 0) {
    renderInfos(infos);
    infoSection.style.display = '';
  } else {
    infoSection.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', loadInfos);
