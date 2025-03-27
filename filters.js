// Default filters configuration
const DEFAULT_FILTERS = {
  filters: [{
    label: 'Top 5 Economics',
    sources: [
      'Quarterly Journal of Economics',
      'Journal of Political Economy',
      'Econometrica', 
      'American Economic Review',
      'Review of Economic Studies'
    ],
    sites: ['oup.com']
  }]
};

async function getActiveFilters(query) {
  console.log('Getting active filters for query:', query);
  
  try {
    const filtersData = await getFilters();
    console.log('Retrieved filters data:', filtersData);
    
    const activeFilters = filtersData.filters.map((filter, index) => {
      console.log('Checking filter:', index, filter);
      const hasActiveSource = filter.sources.some(source => 
        query.includes(`source:"${source}"`));
      console.log('Has active source:', hasActiveSource);
      return hasActiveSource ? index.toString() : null;
    }).filter(index => index !== null);
    
    console.log('Active filters found:', activeFilters);
    return activeFilters;
  } catch (err) {
    console.error('Error getting active filters:', err);
    return [];
  }
}

function parseSearch(searchText) {
  console.log('Parsing search text:', searchText);
  const filters = {
    sources: [],
    sites: [],
    term: []
  };

  const parts = searchText.split(' ');
  console.log('Search parts:', parts);

  parts.forEach(part => {
    if (part.startsWith('source:')) {
      const source = part.replace('source:', '');
      console.log('Found source:', source);
      filters.sources.push(source);
    } else if (part.includes('site:')) {
      const site = part.replace('site:', '');
      console.log('Found site:', site);
      filters.sites.push(site);
    } else {
      console.log('Found search term:', part);
      filters.term.push(part);
    }
  });

  const searchName = filters.term[0] || 'untitled-search';
  console.log('Generated search name:', searchName);

  const parsedSearch = {
    filters: [{
      label: searchName,
      sources: filters.sources,
      sites: filters.sites,
      term: filters.term
    }]
  };
  
  console.log('Final parsed search:', parsedSearch);
  return parsedSearch;
}

function saveSearch(searchData) {
  console.log('Attempting to save search data:', searchData);
  return new Promise((resolve, reject) => {
    if (!chrome?.storage?.sync) {
      console.warn('Chrome sync storage not available, falling back to localStorage');
      try {
        let savedSearches = JSON.parse(localStorage.getItem('scholarSearches') || JSON.stringify(DEFAULT_FILTERS));
        savedSearches.filters = [...savedSearches.filters, ...searchData.filters];
        localStorage.setItem('scholarSearches', JSON.stringify(savedSearches));
        console.log('Successfully saved to localStorage:', savedSearches);
        resolve(savedSearches);
      } catch (err) {
        console.error('localStorage save error:', err);
        reject(new Error('Failed to save to localStorage: ' + err.message));
      }
      return;
    }

    chrome.storage.sync.get(['scholarSearches'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Chrome storage get error:', chrome.runtime.lastError);
        reject(new Error('Failed to get existing searches: ' + chrome.runtime.lastError.message));
        return;
      }

      console.log('Retrieved existing searches:', result);
      const savedSearches = result.scholarSearches || DEFAULT_FILTERS;
      const updatedSearches = {
        filters: [...savedSearches.filters, ...searchData.filters]
      };

      console.log('Saving updated searches:', updatedSearches);
      chrome.storage.sync.set({ scholarSearches: updatedSearches }, () => {
        if (chrome.runtime.lastError) {
          console.error('Chrome storage set error:', chrome.runtime.lastError);
          reject(new Error('Failed to save searches: ' + chrome.runtime.lastError.message));
          return;
        }
        console.log('Successfully saved to chrome.storage.sync');
        resolve(updatedSearches);
      });
    });
  });
}

async function getFilters() {
  console.log('Attempting to retrieve filters');
  try {
    const result = await chrome.storage.sync.get();
    console.log('All sync storage contents:', result);
    
    if (!result.scholarSearches) {
      console.log('No saved filters found, saving DEFAULT_FILTERS');
      await chrome.storage.sync.set({ scholarSearches: DEFAULT_FILTERS });
      return DEFAULT_FILTERS;
    }
    
    return result.scholarSearches;
  } catch (err) {
    console.error('Storage access error:', err);
    return DEFAULT_FILTERS;
  }
}

function buildFilterString(activeFilters, filters) {
  console.log('Building filter string for:', { activeFilters, filters });
  
  if (activeFilters.length === 0) {
    console.log('No active filters, returning empty string');
    return '';
  }

  const allSources = activeFilters.flatMap(filterName => 
    filters.filters[filterName]?.sources || []);
  const allSites = activeFilters.flatMap(filterName => 
    filters.filters[filterName]?.sites || []);

  console.log('Collected sources and sites:', { allSources, allSites });

  const uniqueSources = [...new Set(allSources)];
  const uniqueSites = [...new Set(allSites)];

  console.log('Unique sources and sites:', { uniqueSources, uniqueSites });

  const sourceString = uniqueSources.length 
    ? uniqueSources.map(source => `source:"${source}"`).join(' OR ') 
    : '';
  const siteString = uniqueSites.length 
    ? uniqueSites.map(site => `site:${site}`).join(' OR ') 
    : '';

  console.log('Generated strings:', { sourceString, siteString });

  if (!sourceString && !siteString) return '';
  if (!sourceString) return `(${siteString})`;
  if (!siteString) return `(${sourceString})`;
  return `(${sourceString}) AND (${siteString})`;
}

async function initializeCheckboxes(containerElement) {
  console.log('Initializing checkboxes in container:', containerElement);
  const filters = await getFilters();
  console.log('Retrieved filters for checkboxes:', filters);
  
  filters.filters.forEach((filter, index) => {
    console.log('Creating checkbox for filter:', filter);
    const checkbox = createCheckbox(index, filter);
    containerElement.appendChild(checkbox);
  });
  
  console.log('Finished initializing checkboxes');
}