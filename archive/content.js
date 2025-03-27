// Content script to be injected into Google Scholar pages
function extractAndSaveFilter(inputSelector) {
  // Get the input element
  const inputElement = document.querySelector(inputSelector);
  
  if (!inputElement) {
      throw new Error('Input element not found');
  }
  
  // Extract the value attribute
  let filterString = inputElement.getAttribute('value');
  
  // If value attribute is not found, try the element's value property
  if (!filterString) {
      filterString = inputElement.value;
  }
  
  // Clean up the string by removing escaped quotes
  filterString = filterString.replace(/&quot;/g, '"');
  
  // Save the filter (you can modify this part based on your needs)
  const savedFilter = {
      originalQuery: filterString,
      timestamp: new Date().toISOString(),
      sources: extractSources(filterString),
      sites: extractSites(filterString)
  };
  
  // Helper function to extract sources
  function extractSources(str) {
      const sourceRegex = /source:"([^"]+)"/g;
      const sources = [];
      let match;
      
      while ((match = sourceRegex.exec(str)) !== null) {
          sources.push(match[1]);
      }
      
      return sources;
  }
  
  // Helper function to extract sites
  function extractSites(str) {
      const siteRegex = /site:([^\s\)]+)/g;
      const sites = [];
      let match;
      
      while ((match = siteRegex.exec(str)) !== null) {
          sites.push(match[1]);
      }
      
      return sites;
  }
  
  // You can store this in localStorage, send to an API, etc.
  localStorage.setItem('savedFilter', JSON.stringify(savedFilter));
  
  return savedFilter;
}
const filter = extractAndSaveFilter('.gs_in_txt');

function buildFilterString(activeFilters) {
  if (activeFilters.length === 0) return '';

  // Collect all sources and sites from active filters
  const allSources = activeFilters.flatMap(filterName => FILTERS[filterName].sources);
  const allSites = activeFilters.flatMap(filterName => FILTERS[filterName].sites);

  // Remove duplicates
  const uniqueSources = [...new Set(allSources)];
  const uniqueSites = [...new Set(allSites)];

  // Build the combined filter string
  const sourceString = uniqueSources.map(source => `source:"${source}"`).join(' OR ');
  const siteString = uniqueSites.map(site => `site:${site}`).join(' OR ');

  return `(${sourceString}) AND (${siteString})`;
}

function getActiveFilters(query) {
  return Object.keys(FILTERS).filter(filterName => {
    const filter = FILTERS[filterName];
    // Check if any of the sources from this filter are in the query
    return filter.sources.some(source => query.includes(`source:"${source}"`));
  });
}

function createCheckbox(filterName, filterConfig) {
  const newCheckboxLi = document.createElement('li');
  newCheckboxLi.className = 'gs_inw';

  const checkboxLink = document.createElement('a');
  checkboxLink.className = 'gs_cb_gen gs_in_cb';
  checkboxLink.setAttribute('role', 'checkbox');
  
  // Get current search query and active filters
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('q') || '';
  const activeFilters = getActiveFilters(query);
  const isActive = activeFilters.includes(filterName);
  
  checkboxLink.setAttribute('aria-checked', isActive.toString());
  if (isActive) {
    checkboxLink.classList.add('gs_sel');
  }
  checkboxLink.setAttribute('data-s', isActive ? '1' : '0');

  const labelSpan = document.createElement('span');
  labelSpan.className = 'gs_lbl';
  labelSpan.textContent = filterConfig.label;

  const checkSpan = document.createElement('span');
  checkSpan.className = 'gs_chk';
  const boxSpan = document.createElement('span');
  boxSpan.className = 'gs_cbx';

  checkboxLink.appendChild(labelSpan);
  checkboxLink.appendChild(checkSpan);
  checkboxLink.appendChild(boxSpan);
  newCheckboxLi.appendChild(checkboxLink);

  checkboxLink.addEventListener('click', function(e) {
    e.preventDefault();
    
    const urlParams = new URLSearchParams(window.location.search);
    let query = urlParams.get('q') || '';
    
    // Remove any existing source/site filters from the query
    query = query.replace(/\(source:[^)]+\)\s+AND\s+\(site:[^)]+\)/g, '').trim();
    
    // Get currently active filters
    let activeFilters = getActiveFilters(query);
    
    if (!isActive) {
      // Add this filter to active filters
      activeFilters.push(filterName);
    } else {
      // Remove this filter from active filters
      activeFilters = activeFilters.filter(f => f !== filterName);
    }

    // Build new filter string
    const filterString = buildFilterString(activeFilters);
    
    // Combine with any remaining query terms
    query = query ? `${query} ${filterString}` : filterString;

    // Update URL with new query
    urlParams.set('q', query);
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.location.href = newUrl;
  });

  return newCheckboxLi;
}

function addFilterCheckboxes() {
  const checkboxSection = Array.from(document.querySelectorAll('.gs_bdy_sb_sec'))
    .find(section => section.querySelector('.gs_inw'));
  if (!checkboxSection) return;

  Object.entries(FILTERS).forEach(([filterName, filterConfig]) => {
    const checkbox = createCheckbox(filterName, filterConfig);
    checkboxSection.appendChild(checkbox);
  });
}



// Get all filters from Chrome storage
async function getFilters() {
  try {
    const result = await chrome.storage.local.get('filters');
    return result.filters || DEFAULT_FILTERS;
  } catch (error) {
    console.error('Error getting filters:', error);
    return DEFAULT_FILTERS;
  }
}

// Save filters to Chrome storage
async function saveFilters(filters) {
  try {
    await chrome.storage.local.set({ filters });
    return true;
  } catch (error) {
    console.error('Error saving filters:', error);
    throw new Error('Failed to save filters to storage');
  }
}

// Add a new filter
async function addFilter(name, label, sources, sites = []) {
  // Input validation
  if (!name || typeof name !== 'string') {
    throw new Error('Filter name is required and must be a string');
  }
  
  if (!Array.isArray(sources) || !sources.length) {
    throw new Error('Sources must be a non-empty array');
  }
  
  if (!Array.isArray(sites)) {
    throw new Error('Sites must be an array');
  }

  try {
    const filters = await getFilters();
    
    // Check if filter name already exists
    if (filters[name] && !confirm(`Filter "${name}" already exists. Do you want to override it?`)) {
      return false;
    }
    
    // Clean and validate sources and sites
    const cleanSources = sources
      .filter(s => s && typeof s === 'string')
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    const cleanSites = sites
      .filter(s => s && typeof s === 'string')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Create new filter object
    filters[name] = {
      label: (label || name).trim(),
      sources: cleanSources,
      sites: cleanSites,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    await saveFilters(filters);
    await updateFiltersList();
    clearInputs();
    return true;
  } catch (error) {
    console.error('Error adding filter:', error);
    throw new Error('Failed to add filter');
  }
}

// Delete a filter
async function deleteFilter(name) {
  if (!name) {
    throw new Error('Filter name is required');
  }
  
  try {
    const filters = await getFilters();
    
    if (!filters[name]) {
      throw new Error(`Filter "${name}" not found`);
    }
    
    if (!confirm(`Are you sure you want to delete the filter "${name}"?`)) {
      return false;
    }
    
    delete filters[name];
    await saveFilters(filters);
    await updateFiltersList();
    return true;
  } catch (error) {
    console.error('Error deleting filter:', error);
    throw new Error('Failed to delete filter');
  }
}

// Update a filter
async function updateFilter(name, updates) {
  if (!name || !updates) {
    throw new Error('Filter name and updates are required');
  }
  
  try {
    const filters = await getFilters();
    
    if (!filters[name]) {
      throw new Error(`Filter "${name}" not found`);
    }
    
    filters[name] = {
      ...filters[name],
      ...updates,
      lastModified: new Date().toISOString()
    };
    
    await saveFilters(filters);
    await updateFiltersList();
    return true;
  } catch (error) {
    console.error('Error updating filter:', error);
    throw new Error('Failed to update filter');
  }
}

// Get a single filter by name
async function getFilter(name) {
  if (!name) {
    throw new Error('Filter name is required');
  }
  
  try {
    const filters = await getFilters();
    return filters[name] || null;
  } catch (error) {
    console.error('Error getting filter:', error);
    return null;
  }
}

async function updateFiltersList() {
  const filtersList = document.getElementById('filters-list');
  const filters = await getFilters();
  
  filtersList.innerHTML = Object.entries(filters).map(([name, filter]) => `
    <div class="gs_md_wp gs_ttss">
      <div class="gs_md_wpt">
        <span class="gs_lbl">${filter.label}</span>
        <a class="gs_btnM gs_in_ib delete-filter" data-name="${name}">
          <span class="gs_lbl">Delete</span>
        </a>
      </div>
      <div class="gs_md_wpc">
        <div class="sources">
          <strong>Sources:</strong>
          ${filter.sources.map(s => `<div>${escapeHtml(s)}</div>`).join('')}
        </div>
        ${filter.sites?.length ? `
          <div class="sites">
            <strong>Sites:</strong>
            ${filter.sites.map(s => `<div>${escapeHtml(s)}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function createSettingsUI() {

  const settingsDiv = document.createElement('div');
  settingsDiv.id = 'gs_filter_settings';
  settingsDiv.className = 'gs_md_d gs_md_ds gs_ttzi gs_vis';
  settingsDiv.setAttribute('role', 'dialog');
  settingsDiv.setAttribute('tabindex', '-1');
  settingsDiv.setAttribute('aria-labelledby', 'gs_asd-t');
  settingsDiv.style.cssText = `
    width: 80%;
    max-width: 552px;
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    background: white;
  `;

  // Create header elements
  const header = document.createElement('div');
  header.className = 'gs_md_hdr';
  
  const closeButton = document.createElement('a');
  closeButton.href = 'javascript:void(0)';
  closeButton.id = 'gs_asd-x';
  closeButton.role = 'button';
  closeButton.setAttribute('aria-label', 'Cancel');
  closeButton.className = 'gs_btnCLS gs_md_x gs_md_hdr_c gs_in_ib gs_btn_lrge';
  ['gs_ico', 'gs_ia_notf', 'gs_lbl'].forEach(className => {
    const span = document.createElement('span');
    span.className = className;
    closeButton.appendChild(span);
  });

  const title = document.createElement('h2');
  title.id = 'gs_asd-t';
  title.className = 'gs_md_hdr_t';
  title.textContent = 'Manage Filters';

  const headerButtons = document.createElement('div');
  headerButtons.className = 'gs_md_hdr_b';
  
  const addFilterButton = document.createElement('button');
  addFilterButton.type = 'button';
  addFilterButton.id = 'add-filter';
  addFilterButton.setAttribute('aria-label', 'Save');
  addFilterButton.className = 'gs_btnG gs_in_ib gs_btn_act gs_btn_half gs_btn_lsb';
  addFilterButton.innerHTML = '<span class="gs_wr"><span class="gs_ico"></span><span class="gs_lbl">Add Filter</span></span>';

  // Create body elements
  const body = document.createElement('div');
  body.id = 'gs_asd-bdy';
  body.className = 'gs_md_bdy';

  const form = document.createElement('form');
  form.id = 'gs_asd_frm';
  form.className = 'gs_scl';

  const createFormRow = (title, inputId, inputType = 'input', rows = null) => {
    const row = document.createElement('div');
    row.className = 'gs_asd_tr';

    const dt = document.createElement('div');
    dt.className = 'gs_asd_dt';
    const label = document.createElement('label');
    label.htmlFor = inputId;
    label.textContent = title;
    dt.appendChild(label);

    const dd = document.createElement('div');
    dd.className = 'gs_asd_dd';
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'gs_in_txtw gs_in_txtm gs_in_txtb';

    const input = document.createElement(inputType);
    input.className = 'gs_in_txt';
    input.id = inputId;
    input.setAttribute('autocapitalize', 'off');
    if (inputType === 'input') {
      input.rows = rows;
    }

    inputWrapper.appendChild(input);
    const inputState = document.createElement('div');
    inputState.className = 'gs_in_txts';
    inputWrapper.appendChild(inputState);
    dd.appendChild(inputWrapper);

    row.appendChild(dt);
    row.appendChild(dd);
    return row;
  };

  // Assemble the components
  headerButtons.appendChild(addFilterButton);
  header.appendChild(closeButton);
  header.appendChild(title);
  header.appendChild(headerButtons);

  const titleRow = document.createElement('div');
  titleRow.className = 'gs_asd_tr';
  titleRow.innerHTML = '<div class="gs_asd_dt"><b>Filter Settings</b></div>';

  form.appendChild(createFormRow('Filter name', 'new-filter-name'));

  const filtersList = document.createElement('div');
  filtersList.id = 'filters-list';
  filtersList.className = 'gs_asd_tr';
  form.appendChild(filtersList);

  body.appendChild(form);
  settingsDiv.appendChild(header);
  settingsDiv.appendChild(body);
  
  document.body.appendChild(settingsDiv);
  
  const closeBtn = settingsDiv.querySelector('#gs_asd-x');
  closeBtn.onclick = () => {
    settingsDiv.style.display = 'none';
  };
  
  return settingsDiv;
}

function attachEventListeners(settingsDiv) {
  document.getElementById('add-filter').addEventListener('click', async () => {
    try {
      const name = document.getElementById('new-filter-name').value.trim();    
      await addFilter(name, journals, sites);
      settingsDiv.style.display = 'none';
    } catch (error) {
      console.error('Failed to add filter:', error);
    }
  });

  document.getElementById('gs_asd-x').addEventListener('click', () => {
    settingsDiv.style.display = 'none';
  });

  document.getElementById('filters-list').addEventListener('click', async (e) => {
    const deleteBtn = e.target.closest('[data-filter-name]');
    if (deleteBtn) {
      try {
        await deleteFilter(deleteBtn.dataset.filterName);
      } catch (error) {
        console.error('Failed to delete filter:', error);
      }
    }
  });
}

function addSettingsButton() {
  const btnContainer = document.getElementById('gs_ab_btns');
  if (!btnContainer) return;
  
  const settingsBtn = document.createElement('a'); 
  settingsBtn.className = 'gs_btnL gs_in_ib gs_in_gray gs_nph gs_nta';
  settingsBtn.innerHTML = '<span class="gs_ico"></span><span class="gs_ia_notf"></span><span class="gs_lbl">Add Filter</span>';
  settingsBtn.onclick = () => {
    document.getElementById('gs_filter_settings').style.display = 'block';
  };
  
  btnContainer.appendChild(settingsBtn);
 }

 // Default filters if none exist in storage
const DEFAULT_FILTERS = {
  'top5Economics': {
    label: 'Top 5 Economics',
    sources: [
      'Quarterly Journal of Economics',
      'Journal of Political Economy', 
      'Econometrica',
      'American Economic Review',
      'Review of Economic Studies'
    ]
    }
};

async function initializeFilters() {
  await chrome.storage.local.set({ filters: FILTERS });
  addFilterCheckboxes();
  addSettingsButton();
}

// Update initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFilters);
} else {
  initializeFilters();
  createSettingsUI();
}