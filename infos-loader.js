// Loads info data from a Google Sheets CSV and displays them in the #info-list element
// Similar to events-loader.js but for infos

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQVTtNvzAPWE7ng3OR1Bp2nUhgYO3IsvfaLoYH3RPCEIXqy0DPT1xe1uIkwcjDXu_LspPs3TFFhi7HG/pub?gid=379856739&single=true&output=csv';

async function fetchInfoRows() {
  const res = await fetch(CSV_URL);
  if (!res.ok) return [];
  const text = await res.text();
  // Replace all semicolons with commas for CSV parsing
  const csvText = text.replace(/;/g, ',');
  // Parse CSV (simple, no quoted commas)
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  // Remove header row if present (assume first row is header if it contains 'Title')
  if (lines.length && /title/i.test(lines[0])) lines.shift();
  return lines.map(line => {
    // Only use columns A and B, and ignore extra columns
    const cols = line.split(',');
    // Remove surrounding quotes and trim for only first 2 columns
    const clean = [0, 1].map(i => {
      let col = cols[i] || '';
      col = col.trim();
      if (col.startsWith('"')) col = col.slice(1);
      if (col.endsWith('"')) col = col.slice(0, -1);
      return col.trim();
    });
    const [title, info] = clean;
    return { title, body: info };
  }).filter(row => row.title && row.body);
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
    const flexDiv = document.createElement('div');
    flexDiv.style.flex = 'auto';
    const left = document.createElement('span');
    left.innerHTML = `<strong>${sanitizeHTML(info.title)}</strong><br><small>${sanitizeHTML(info.body)}</small>`;
    flexDiv.appendChild(left);
    li.appendChild(flexDiv);
    ul.appendChild(li);
  });
}

async function loadInfos() {
  const infoList = document.getElementById('info-list');
  const infoSection = document.getElementById('infos');
  if (!infoList || !infoSection) return;
  const infos = await fetchInfoRows();
  if (infos.length > 0) {
    renderInfos(infos);
    infoSection.style.display = '';
  } else {
    infoSection.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', loadInfos);
