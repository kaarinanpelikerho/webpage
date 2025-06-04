// events-loader.js
// Loads and sanitizes event data from Google Sheets CSV and injects events into the events section

const EVENTS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQVTtNvzAPWE7ng3OR1Bp2nUhgYO3IsvfaLoYH3RPCEIXqy0DPT1xe1uIkwcjDXu_LspPs3TFFhi7HG/pub?gid=0&single=true&output=csv';

async function fetchEventSheet() {
  const resp = await fetch(EVENTS_CSV_URL);
  const text = await resp.text();
  // Parse CSV (simple, no quoted commas supported)
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  // Assume first line is header, skip it
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    let cols = lines[i].split(',');
    // Remove column F (index 5) and everything after it
    if (cols.length > 5) cols = cols.slice(0, 5);
    let [date, title, small_info, ...large_info] = cols;
    large_info = large_info.join(',').replace(/^"|"$/g, '');
    // Treat large_info with only commas (empty/meaningless) as no large_info
    const cleaned_large_info = large_info ? large_info.trim() : '';
    const hasLargeInfo = cleaned_large_info.replace(/,/g, '').trim().length > 0;
    data.push({
      date: date ? date.trim() : '',
      title: title ? title.trim() : '',
      small_info: small_info ? small_info.trim().replace(/;/g, ',') : '',
      large_info: hasLargeInfo ? cleaned_large_info : ''
    });
  }
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
    // Add empty element for left alignment
    const emptyLeft = document.createElement('span');
    emptyLeft.className = 'd-none d-md-inline-block';
    emptyLeft.style.width = '9em' // Match badge+button width if expand exists
    li.appendChild(emptyLeft);
    const flexDiv = document.createElement('div');
    flexDiv.style.flex = 'auto';
    const left = document.createElement('span');
    left.innerHTML = `<strong>${sanitizeHTML(ev.title)}</strong><br><small>${sanitizeHTML(ev.small_info || ev.desc)}</small>`;
    flexDiv.appendChild(left);
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
    li.appendChild(flexDiv);
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
  const eventsSection = document.querySelector('#events .container');
  if (!eventsSection) return;
  // Add spinner if not present
  let spinner = document.getElementById('events-spinner');
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'events-spinner';
    spinner.className = 'text-center my-4';
    spinner.style.display = 'none';
    spinner.innerHTML = `
      <div class="spinner-border text-warning" role="status" style="width:3rem;height:3rem;">
        <span class="visually-hidden">Ladataan tapahtumia...</span>
      </div>
      <div class="mt-2">Ladataan tapahtumia...</div>
    `;
    eventsSection.insertBefore(spinner, eventsSection.firstChild.nextSibling); // after h2
  }
  // Hide list, show spinner
  let oldList = eventsSection.querySelector('ul.list-group');
  if (oldList) oldList.style.display = 'none';
  spinner.style.display = '';
  // Fetch and render events
  const events = (await fetchEventSheet()).map(ev => ({
    title: ev.title || 'Tapahtuma',
    date: ev.date || '',
    dateFormatted: formatDate(ev.date),
    small_info: ev.small_info || '',
    large_info: ev.large_info || '',
    desc: ''
  }));
  // Remove old list if present
  if (oldList) oldList.remove();
  eventsSection.appendChild(renderEvents(events));
  // Hide spinner, show list
  spinner.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', loadEvents);
