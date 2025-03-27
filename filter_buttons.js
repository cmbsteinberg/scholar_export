// UI Setup
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

    const header = document.createElement('div');
    header.className = 'gs_md_hdr';

    const closeButton = document.createElement('a');
    closeButton.href = 'javascript:void(0)';
    closeButton.id = 'gs_asd-x';
    closeButton.role = 'button';
    closeButton.setAttribute('aria-label', 'Cancel');
    closeButton.className = 'gs_btnCLS gs_md_x gs_md_hdr_c gs_in_ib gs_btn_lrge';
    closeButton.onclick = () => settingsDiv.style.display = 'none';

    ['gs_ico', 'gs_ia_notf', 'gs_lbl'].forEach(className => {
        const span = document.createElement('span');
        span.className = className;
        closeButton.appendChild(span);
    });

    const title = document.createElement('h2');
    title.id = 'gs_asd-t';
    title.className = 'gs_md_hdr_t';
    title.textContent = 'Save Search Filter';

    // Add form body
    const body = document.createElement('div');
    body.className = 'gs_md_bdy';

    const form = document.createElement('form');
    form.id = 'gs_filter_form';
    form.className = 'gs_scl';

    const inputRow = document.createElement('div');
    inputRow.className = 'gs_asd_tr';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'gs_asd_dt';
    const label = document.createElement('label');
    label.htmlFor = 'search_name';
    label.textContent = 'Search Name';
    labelDiv.appendChild(label);

    const inputDiv = document.createElement('div');
    inputDiv.className = 'gs_asd_dd';
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'gs_in_txtw gs_in_txtm';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'search_name';
    input.className = 'gs_in_txt';

    inputWrapper.appendChild(input);
    inputDiv.appendChild(inputWrapper);
    inputRow.appendChild(labelDiv);
    inputRow.appendChild(inputDiv);
    form.appendChild(inputRow);
    body.appendChild(form);

    const headerButtons = document.createElement('div');
    headerButtons.className = 'gs_md_hdr_b';

    const addFilterButton = document.createElement('button');
    addFilterButton.type = 'button';
    addFilterButton.id = 'add-filter';
    addFilterButton.className = 'gs_btnG gs_in_ib gs_btn_act gs_btn_half gs_btn_lsb';
    addFilterButton.innerHTML = '<span class="gs_wr"><span class="gs_ico"></span><span class="gs_lbl">Save Filter</span></span>';
    addFilterButton.onclick = () => {
        const searchInput = document.getElementById('gs_hdr_tsi');
        const nameInput = document.getElementById('search_name');
        if (searchInput && nameInput.value) {
            const searchData = parseSearch(searchInput.value);
            const searchName = nameInput.value;
            const namedSearch = {
                [searchName]: {
                    ...Object.values(searchData)[0],
                    label: searchName
                }
            };
            saveSearch(namedSearch);
            settingsDiv.style.display = 'none';
        }
    };

    header.appendChild(closeButton);
    header.appendChild(title);
    headerButtons.appendChild(addFilterButton);
    header.appendChild(headerButtons);
    settingsDiv.appendChild(header);
    settingsDiv.appendChild(body);
    document.body.appendChild(settingsDiv);
}

async function createCheckbox(index, filterConfig) {
    console.log('Creating checkbox for filter:', { index, filterConfig });
    
    const newCheckboxLi = document.createElement('li');
    newCheckboxLi.className = 'gs_inw';

    const checkboxLink = document.createElement('a');
    checkboxLink.className = 'gs_cb_gen gs_in_cb';
    checkboxLink.setAttribute('role', 'checkbox');

    // Get current query and active filters
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    console.log('Current query:', query);
    
    const activeFilters = await getActiveFilters(query);
    console.log('Active filters:', activeFilters);
    
    // Check if this filter is active
    const isActive = activeFilters.includes(index.toString());
    console.log('Is filter active:', isActive);

    // Set checkbox state
    checkboxLink.setAttribute('aria-checked', isActive.toString());
    if (isActive) {
        checkboxLink.classList.add('gs_sel');
    }
    checkboxLink.setAttribute('data-s', isActive ? '1' : '0');
    checkboxLink.setAttribute('data-filter-index', index.toString());

    // Create checkbox elements
    const labelSpan = document.createElement('span');
    labelSpan.className = 'gs_lbl';
    labelSpan.textContent = filterConfig.label;

    const checkSpan = document.createElement('span');
    checkSpan.className = 'gs_chk';
    
    const boxSpan = document.createElement('span');
    boxSpan.className = 'gs_cbx';

    // Assemble checkbox
    checkboxLink.appendChild(labelSpan);
    checkboxLink.appendChild(checkSpan);
    checkboxLink.appendChild(boxSpan);
    newCheckboxLi.appendChild(checkboxLink);

    // Handle click events
    checkboxLink.addEventListener('click', async function (e) {
        e.preventDefault();
        console.log('Checkbox clicked:', { index, filterConfig });

        const urlParams = new URLSearchParams(window.location.search);
        let query = urlParams.get('q') || '';
        
        // Remove existing filter string if present
        query = query.replace(/\(source:[^)]+\)\s+AND\s+\(site:[^)]+\)/g, '').trim();
        console.log('Query after removing existing filters:', query);

        let activeFilters = await getActiveFilters(query);
        console.log('Current active filters:', activeFilters);

        // Toggle filter state
        if (!isActive) {
            activeFilters.push(index.toString());
        } else {
            activeFilters = activeFilters.filter(f => f !== index.toString());
        }
        console.log('Updated active filters:', activeFilters);

        // Build and apply new filter string
        const filters = await getFilters();
        console.log('Retrieved filters:', filters);
        
        const filterString = buildFilterString(activeFilters, filters);
        console.log('Generated filter string:', filterString);

        // Update URL and redirect
        query = query ? `${query} ${filterString}` : filterString;
        urlParams.set('q', query);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        console.log('Redirecting to:', newUrl);
        window.location.href = newUrl;
    });

    return newCheckboxLi;
}