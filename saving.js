function savePapers() {
  const saveButtons = document.querySelectorAll('.gs_or_sav.gs_or_btn');
  let index = 0;
  const globalData = document.getElementById('gs_res_glb').dataset;
  function saveNext() {
    if (index < saveButtons.length) {
      const button = saveButtons[index];

      // Find the parent element that contains the necessary data
      const paperElement = button.closest('.gs_r.gs_or.gs_scl');
      if (paperElement) {
        // Extract the paper ID from the parent element
        const paperId = paperElement.dataset.cid;
        if (paperId) {
          // Construct the save URL using the data from the hidden div
          let saveUrl = globalData.sval;

          // Replace {id} placeholder with the actual paper ID
          saveUrl = saveUrl.replace(/{id}/g, paperId);

          // Make the GET request
          const xhr = new XMLHttpRequest();
          xhr.open('GET', saveUrl, true);
          xhr.withCredentials = true; // To include cookies for authentication
          xhr.onload = function () {
            if (xhr.status === 200) {
              console.log('Save successful for paper ID:', paperId);
              // Update button state to indicate it's saved
              button.classList.remove('gs_or_sav');
              button.classList.add('gs_or_sav_add');
              // Move to the next item
              index++;
              saveNext();
            } else {
              console.error('Save failed', xhr.status);
              index++;
              saveNext();
            }
          };
          xhr.onerror = function () {
            console.error('Request failed');
            index++;
            saveNext();
          };
          xhr.send();
        } else {
          console.error('Could not find paper ID');
          index++;
          saveNext();
        }
      } else {
        console.error('Could not find parent element');
        index++;
        saveNext();
      }
    }
  }

  saveNext();
}

function getHiddenInputValue(name) {
  // Function to get the value of a hidden input field by name
  const input = document.querySelector(`input[type="hidden"][name="${name}"]`);
  return input ? input.value : null;
}

function deleteSaves() {
  // Get the list of elements with class 'gs_r gs_or gs_scl'
  const elements = document.querySelectorAll('.gs_r.gs_or.gs_scl');
  // Get the values of xsrf, scioq, and hl from hidden input fields
  const xsrf = getHiddenInputValue('xsrf');
  const scioq = getHiddenInputValue('scioq') || '';
  const hl = getHiddenInputValue('hl') || 'en';

  // Construct the URL for the POST request
  const post_url = `https://scholar.google.com/citations?view_op=search_library&citilm=1&hl=${hl}&scioq=${encodeURIComponent(scioq)}&oi=lib`;


  // Construct the continue URL
  const continue_var = `/scholar?scilib=1&scioq=${encodeURIComponent(scioq)}&hl=${hl}&as_sdt=0,5`;

  // Loop through each element and send a POST request to delete the item
  let index = 0;
  function deleteNext() {
    if (index >= elements.length) {
      console.log("All items processed.");
      return;
    }

    const element = elements[index];
    const s_id = element.getAttribute('data-aid');

    if (!s_id) {
      console.error(`No data-aid attribute found for element at index ${index}`);
      index++;
      deleteNext();
      return;
    }

    const body = `xsrf=${encodeURIComponent(xsrf)}&continue=${encodeURIComponent(continue_var)}&s=${encodeURIComponent(s_id)}&trash_btn=`;
    fetch(post_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
      credentials: 'include',
    })
      .then(response => {
        if (response.ok || response.status === 302) {
          console.log(`Deleted item with ID: ${s_id}`);
        } else {
          console.error(`Error deleting item with ID: ${s_id}`, response.status);
        }
      })
      .catch(error => {
        console.error(`Network error while deleting item with ID: ${s_id}`, error);
      })
      .finally(() => {
        index++;
        const randomDelay = Math.random() * 1000 + 300;
        setTimeout(deleteNext, randomDelay); // Add a randomised ~1-second delay between requests
      });
  }

  deleteNext();
}

