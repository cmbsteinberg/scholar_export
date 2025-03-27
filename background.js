chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, {action: "addButton"});
});

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with default filters if none exist
  chrome.storage.local.get(['scholarSearches'], (result) => {
    if (!result.scholarSearches) {
      chrome.storage.local.set({
        scholarSearches: {
          "test": {
            "label": "test",
            "sources": [],
            "sites": [],
            "term": ["test"]
          }
        }
      }, () => {
        console.log('Storage initialized with default filters');
      });
    }
  });
});

// Optional: Listen for changes to storage
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.scholarSearches) {
    console.log('scholarSearches changed:', changes.scholarSearches);
  }
});

