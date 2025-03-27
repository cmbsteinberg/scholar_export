function addSaveButton() {
    const toolbar = document.getElementById('gs_ab_btns');
    const url = window.location.href;
    let buttonId, buttonText, buttonAction;
    if (url.startsWith('https://scholar.google.com/scholar?hl')) {
      buttonId = 'gs_paper_save_btn';
      buttonText = 'Save All Papers';
      buttonAction = savePapers;
    } else if (url.startsWith('https://scholar.google.com/scholar?scilib')) {
      buttonId = 'gs_paper_delete_btn';
      buttonText = 'Delete Saves';
      buttonAction = deleteSaves;
    } else {
      return; // Don't add a button on other pages
    }
  
    const existingButton = document.getElementById(buttonId);
    if (existingButton) {
      return; // Button already exists, no need to add another
    }
  
    const button = document.createElement('a');
    button.id = buttonId;
    button.href = '#';
    button.className = 'gs_btnDWL gs_in_ib gs_in_gray gs_nph gs_nta';
  
    const iconSpan = document.createElement('span');
    iconSpan.className = 'gs_ico';
  
    const labelSpan = document.createElement('span');
    labelSpan.className = 'gs_lbl';
    labelSpan.textContent = buttonText;
  
    button.appendChild(iconSpan);
    button.appendChild(labelSpan);
  
    button.addEventListener('click', (e) => {
      e.preventDefault();
      buttonAction();
    });
  
    toolbar.appendChild(button);
  }