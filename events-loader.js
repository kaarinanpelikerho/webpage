// events-loader.js
// Loads and sanitizes event .md files, parses frontmatter, and injects events into the events section

async function fetchEventFiles() {
  // List of event files (hardcoded for static site)
  const files = [
    'events/2025-05-30-terraforming-mars.md',
    'events/2025-06-06-magic-draft.md',
    'events/2025-06-13-wingspan.md',
  ];
  return Promise.all(files.map(f => fetch(f).then(r => r.text()).then(text => ({ file: f, text }))));
}

function parseFrontmatter(md) {
  const match = md.match(/^---([\s\S]*?)---/);
  if (!match) return {};
  const lines = match[1].split('\n');
  const data = {};
  let currentKey = null;
  let currentValue = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Multiline YAML block (|)
    if (/^\s*([\w_]+):\s*\|\s*$/.test(line)) {
      if (currentKey) data[currentKey] = currentValue.join('\n').replace(/^\n+|\n+$/g, '');
      const key = line.match(/^\s*([\w_]+):/)[1];
      currentKey = key;
      currentValue = [];
      // Read indented block
      i++;
      while (i < lines.length && (/^\s{2,}.+/.test(lines[i]) || lines[i].trim() === '')) {
        currentValue.push(lines[i].replace(/^\s{2}/, ''));
        i++;
      }
      i--; // step back for next loop
    } else if (/^\s*([\w_]+):/.test(line)) {
      if (currentKey) data[currentKey] = currentValue.join('\n').replace(/^\n+|\n+$/g, '');
      const [key, ...rest] = line.split(':');
      currentKey = key.trim();
      currentValue = [rest.join(':').trim()];
    } else if (currentKey) {
      currentValue.push(line);
    }
  }
  if (currentKey) data[currentKey] = currentValue.join('\n').replace(/^\n+|\n+$/g, '');
  return data;
}

function sanitizeHTML(str) {
  str = str || ''; // Ensure str is a string
  // Remove <script> tags and their content
  return str.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/<script.*?>/gi, '')
            .replace(/<\/script>/gi, '');
}

function renderEvents(events) {
  const ul = document.createElement('ul');
  ul.className = 'list-group';
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  events.forEach((ev, idx) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center';
    const left = document.createElement('span');
    left.innerHTML = `<strong>${sanitizeHTML(ev.title)}</strong><br><small>${sanitizeHTML(ev.small_info || ev.desc)}</small>`;
    const right = document.createElement('span');
    right.className = 'd-flex align-items-center';
    right.innerHTML = `<span class="badge bg-primary rounded-pill" style="${ev.large_info ? '' : 'margin-right:2.75em;'}">${sanitizeHTML(ev.dateFormatted)}</span>`;
    // Expand button if large_info exists
    let expandBtn = null;
    let largeInfoDiv = null;
    if (ev.large_info) {
      expandBtn = document.createElement('button');
      expandBtn.className = 'event-expand-btn ms-2';
      expandBtn.setAttribute('aria-expanded', 'false');
      expandBtn.setAttribute('aria-controls', `event-large-info-${idx}`);
      expandBtn.setAttribute('title', 'Näytä lisätiedot');
      expandBtn.innerHTML = '<i class="fa fa-chevron-down"></i>';
      expandBtn.onclick = function() {
        const expanded = expandBtn.getAttribute('aria-expanded') === 'true';
        expandBtn.setAttribute('aria-expanded', String(!expanded));
        expandBtn.innerHTML = expanded ? '<i class="fa fa-chevron-down"></i>' : '<i class="fa fa-chevron-up"></i>';
        if (largeInfoDiv) largeInfoDiv.style.display = expanded ? 'none' : 'block';
      };
      right.appendChild(expandBtn);
      largeInfoDiv = document.createElement('div');
      largeInfoDiv.className = 'event-large-info';
      largeInfoDiv.id = `event-large-info-${idx}`;
      largeInfoDiv.style.display = 'none';
      largeInfoDiv.style.marginRight = '0.75em'; // Add margin between large info and date field
      // Show large_info as sanitized HTML, preserving line breaks
      largeInfoDiv.innerHTML = sanitizeHTML(ev.large_info).replace(/\n/g, '<br>');
    }
    li.appendChild(left);
    li.appendChild(right);
    if (largeInfoDiv) left.appendChild(largeInfoDiv); // Attach under small info
    ul.appendChild(li);
  });
  return ul;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fi-FI', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function loadEvents() {
  const files = await fetchEventFiles();
  const events = files.map(f => {
    const fm = parseFrontmatter(f.text);
    // Support new fields: small_info, large_info
    return {
      title: fm.title || 'Tapahtuma',
      date: fm.date || '',
      dateFormatted: formatDate(fm.date),
      small_info: fm.small_info || '',
      large_info: fm.large_info || '',
      desc: f.text.replace(/^---([\s\S]*?)---/, '').trim()
    };
  });
  const eventsSection = document.querySelector('#events .container');
  if (eventsSection) {
    // Remove old list if present
    const oldList = eventsSection.querySelector('ul.list-group');
    if (oldList) oldList.remove();
    eventsSection.appendChild(renderEvents(events));
  }
}

document.addEventListener('DOMContentLoaded', loadEvents);
