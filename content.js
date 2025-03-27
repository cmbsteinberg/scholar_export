// Function to initialize checkboxes
async function initializeCheckboxes(containerElement) {
  console.log('Initializing checkboxes in container:', containerElement);
  try {
    const filters = await getFilters();
    console.log('Retrieved filters for checkboxes:', filters);
    
    // Create all checkboxes sequentially
    for (let i = 0; i < filters.filters.length; i++) {
      const filter = filters.filters[i];
      console.log('Creating checkbox for filter:', filter);
      const checkbox = await createCheckbox(i, filter);
      containerElement.appendChild(checkbox);
    }
    
    console.log('Finished initializing checkboxes');
  } catch (err) {
    console.error('Error initializing checkboxes:', err);
  }
}

async function initializeUI() {
  console.log('Starting UI initialization');
  try {
    let filters = await getFilters();
    console.log('Initial filters check:', filters);

    if (!filters || !filters.filters || filters.filters.length === 0) {
      console.log('No filters found, initializing with defaults');
      filters = DEFAULT_FILTERS;
      try {
        await chrome.storage.sync.set({ scholarSearches: DEFAULT_FILTERS });
        console.log('Successfully initialized default filters');
      } catch (err) {
        console.error('Failed to initialize default filters:', err);
      }
    }

    addSettingsButton();
    await createSettingsUI();

    const observer = new MutationObserver(async (mutations, obs) => {
      const sidebarContainer = document.querySelector('#gs_bdy_sb_in');
      if (sidebarContainer) {
        console.log('Sidebar container found');
        obs.disconnect();
        try {
          const createAlertSection = document.querySelector('#gs_bdy_sb_ca');
          if (!createAlertSection) {
            console.log('Create Alert section not found');
            return;
          }

          const sectionParent = createAlertSection.closest('.gs_bdy_sb_sec');
          if (!sectionParent) {
            console.log('Parent section not found');
            return;
          }

          const newSection = document.createElement('ul');
          newSection.className = 'gs_bdy_sb_sec';
          await initializeCheckboxes(newSection);
          sectionParent.parentNode.insertBefore(newSection, sectionParent);
        } catch (err) {
          console.error('Error initializing checkboxes:', err);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    // Check immediately
    const sidebarContainer = document.querySelector('#gs_bdy_sb_in');
    if (sidebarContainer) {
      observer.disconnect();
      const createAlertSection = document.querySelector('#gs_bdy_sb_ca');
      if (createAlertSection) {
        const sectionParent = createAlertSection.closest('.gs_bdy_sb_sec');
        if (sectionParent) {
          const newSection = document.createElement('ul');
          newSection.className = 'gs_bdy_sb_sec';
          await initializeCheckboxes(newSection);
          sectionParent.parentNode.insertBefore(newSection, sectionParent);
        }
      }
    }
  } catch (err) {
    console.error('Error during UI initialization:', err);
  }
}


// Add event listener for page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeUI().catch(err => {
      console.error('Error during UI initialization:', err);
    });
  }, { passive: true });
} else {
  initializeUI().catch(err => {
    console.error('Error during UI initialization:', err);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addButton") {
    addSaveButton();
  }
  return true; // Keep the message channel open for async operations
});

addSaveButton();