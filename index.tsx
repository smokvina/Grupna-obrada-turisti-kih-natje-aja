/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

const root = document.getElementById('root');

if (root) {
  const main = document.createElement('main');
  
  const title = document.createElement('h1');
  title.textContent = 'Grupna obrada natječaja';
  
  const description = document.createElement('p');
  description.textContent = 'Grupna obrada natječaja';
  
  main.appendChild(title);
  main.appendChild(description);

  const uploadContainer = document.createElement('div');
  uploadContainer.className = 'upload-container';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'pdf-upload';
  fileInput.multiple = true;
  fileInput.setAttribute('aria-hidden', 'true');
  fileInput.style.display = 'none';

  const uploadLabel = document.createElement('label');
  uploadLabel.htmlFor = 'pdf-upload';
  uploadLabel.className = 'upload-label';
  uploadLabel.textContent = 'Odaberite datoteke'; // Changed from 'Odaberite datoteke (PDF, TXT, DOCX)'
  uploadLabel.setAttribute('role', 'button');
  uploadLabel.setAttribute('tabindex', '0');

  const fileListContainer = document.createElement('div');
  fileListContainer.id = 'file-list';
  fileListContainer.className = 'file-list';
  fileListContainer.setAttribute('aria-live', 'polite');
  
  const summaryOptionsContainer = document.createElement('div');
  summaryOptionsContainer.className = 'summary-options-container';

  const summaryLabel = document.createElement('label');
  summaryLabel.htmlFor = 'summary-detail';
  summaryLabel.className = 'summary-label';
  summaryLabel.textContent = 'Razina detalja sažetka:';

  const summarySelect = document.createElement('select');
  summarySelect.id = 'summary-detail';
  summarySelect.className = 'summary-select';

  const options = [
    { value: 'kratak', text: 'Kratak' },
    { value: 'srednji', text: 'Srednji' },
    { value: 'detaljan', text: 'Detaljan' }
  ];

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    if (opt.value === 'srednji') {
      option.selected = true;
    }
    summarySelect.appendChild(option);
  });
  
  summaryOptionsContainer.appendChild(summaryLabel);
  summaryOptionsContainer.appendChild(summarySelect);

  const processButton = document.createElement('button');
  processButton.className = 'process-button';
  processButton.textContent = 'Obradi datoteke';
  processButton.disabled = true;

  const consolidateSummaryButton = document.createElement('button');
  consolidateSummaryButton.className = 'process-button consolidate-button'; // Reusing process-button style
  consolidateSummaryButton.textContent = 'Objedini sažetke';
  consolidateSummaryButton.disabled = true;

  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.style.display = 'none';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-label', 'Overall processing status');

  uploadContainer.appendChild(fileInput);
  uploadContainer.appendChild(uploadLabel);
  uploadContainer.appendChild(fileListContainer);
  uploadContainer.appendChild(summaryOptionsContainer);
  uploadContainer.appendChild(processButton);
  uploadContainer.appendChild(consolidateSummaryButton); // Add the new button
  uploadContainer.appendChild(loader);
  
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'results-container';
  
  main.appendChild(uploadContainer);
  main.appendChild(resultsContainer);
  
  root.appendChild(main);

  let allSummaries: { fileName: string; summary: string }[] = [];

  const updateConsolidateButtonState = () => {
    consolidateSummaryButton.disabled = allSummaries.length === 0;
  };

  const processFiles = async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }

    loader.style.display = 'block';
    processButton.disabled = true;
    consolidateSummaryButton.disabled = true; // Disable consolidate button during processing
    uploadLabel.style.pointerEvents = 'none';
    uploadLabel.style.opacity = '0.6';
    resultsContainer.innerHTML = '';
    allSummaries = []; // Clear previous summaries
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const model = 'gemini-2.5-flash';
      
      const detailLevel = summarySelect.value;
      let promptText;
      const basePrompt = "Odgovori na hrvatskom jeziku. Napravi detaljan Logistički plan sa maksimalnim detaljima. budi stručnjak u logistici, organiziaciji putovanja, turistički djelatnike, agencijski djelatnik, prijevoznik, vozač, iskusni vodič, vlasnik hotela, vlasnik restorana, voditelj restorana, lokalni vodič, vodič i domačin u mjestima koja posječujemo kao što su parkovi i muzeji. ";
      switch(detailLevel) {
        case 'kratak':
          promptText = basePrompt + "Analiziraj i pruži kratak sažetak u jednom odlomku za sljedeći dokument vezan uz natječajnu prijavu:";
          break;
        case 'detaljan':
          promptText = basePrompt + "Analiziraj i pruži detaljan sažetak u više odlomaka, ističući ključne točke, zahtjeve i rokove iz sljedećeg dokumenta vezanog uz natječajnu prijavu:";
          break;
        case 'srednji':
        default:
          promptText = basePrompt + "Analiziraj i pruži sažet sažetak sljedećeg dokumenta vezanog uz natječajnu prijavu:";
          break;
      }

      // FIX: The 'files' variable was not defined. It should be created from 'fileInput.files'.
      const files = Array.from(fileInput.files);
      for (const file of files) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        const resultTitle = document.createElement('h3');
        resultTitle.textContent = file.name;

        const statusWrapper = document.createElement('div');
        statusWrapper.className = 'status-wrapper';
        statusWrapper.setAttribute('aria-live', 'polite');

        const resultText = document.createElement('p');
        resultText.textContent = 'Obrađuje se...';

        const itemLoader = document.createElement('div');
        itemLoader.className = 'loader loader-small';
        itemLoader.setAttribute('role', 'status');
        itemLoader.setAttribute('aria-label', `Processing ${file.name}`);
        itemLoader.style.display = 'block'; // Show loader initially

        statusWrapper.appendChild(resultText);
        statusWrapper.appendChild(itemLoader);
        
        resultItem.appendChild(resultTitle);
        resultItem.appendChild(statusWrapper);
        resultsContainer.appendChild(resultItem);

        try {
          let contentPart;

          if (file.type === 'text/plain') {
            const text = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = (err) => reject(err);
              reader.readAsText(file);
            });
            contentPart = { text: text };
          } else {
            const base64EncodedData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = (err) => reject(err);
              reader.readAsDataURL(file);
            });
            contentPart = {
              inlineData: {
                data: base64EncodedData,
                mimeType: file.type
              }
            };
          }

          const response = await ai.models.generateContent({
            model: model,
            contents: {
              parts: [
                { text: promptText },
                contentPart
              ]
            }
          });
          
          const summary = response.text;
          resultText.textContent = summary;
          itemLoader.style.display = 'none'; // Hide loader on success
          allSummaries.push({ fileName: file.name, summary: summary }); // Store summary

          const downloadButton = document.createElement('button');
          downloadButton.className = 'download-button';
          downloadButton.textContent = 'Preuzmi sažetak';
          downloadButton.onclick = () => {
            const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sazetak-${file.name}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          };
          resultItem.appendChild(downloadButton);

        } catch (error) {
           resultText.textContent = 'Greška pri obradi ove datoteke.';
           resultItem.classList.add('error'); // Add error class to item
           itemLoader.style.display = 'none'; // Hide loader on error
           console.error(`Error processing ${file.name}:`, error);
        }
      }

    } catch (error) {
      console.error('Error during file processing:', error);
      const errorItem = document.createElement('div');
      errorItem.className = 'result-item error';
      errorItem.textContent = 'Došlo je do neočekivane greške prilikom obrade datoteka. Molimo pokušajte ponovo.';
      resultsContainer.appendChild(errorItem);
    } finally {
      loader.style.display = 'none';
      processButton.disabled = false;
      uploadLabel.style.pointerEvents = 'auto';
      uploadLabel.style.opacity = '1';
      updateConsolidateButtonState(); // Update consolidate button state after all processing
    }
  };

  const handleFileSelection = () => {
    fileListContainer.innerHTML = '';
    resultsContainer.innerHTML = '';
    allSummaries = []; // Clear summaries on new file selection
    updateConsolidateButtonState(); // Update button state
    if (fileInput.files && fileInput.files.length > 0) {
      const list = document.createElement('ul');
      const files = Array.from(fileInput.files);
      files.forEach(file => {
        const listItem = document.createElement('li');
        
        const icon = document.createElement('span');
        icon.className = 'file-icon';
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const mimeType = file.type;
        
        // Extended file type icons
        if (mimeType.startsWith('image/')) {
          icon.textContent = '🖼️';
          icon.setAttribute('aria-label', 'Slika datoteka');
        } else if (mimeType.startsWith('video/')) {
          icon.textContent = '🎬';
          icon.setAttribute('aria-label', 'Video datoteka');
        } else if (mimeType.startsWith('audio/')) {
          icon.textContent = '🎧';
          icon.setAttribute('aria-label', 'Audio datoteka');
        } else {
          switch (fileExtension) {
            case 'pdf':
              icon.textContent = '📄';
              icon.setAttribute('aria-label', 'PDF datoteka');
              break;
            case 'docx':
            case 'doc':
              icon.textContent = '📝';
              icon.setAttribute('aria-label', 'DOCX datoteka');
              break;
            case 'txt':
              icon.textContent = '🗒️';
              icon.setAttribute('aria-label', 'TXT datoteka');
              break;
            case 'zip':
            case 'rar':
            case '7z':
            case 'tar':
            case 'gz':
              icon.textContent = '🗜️';
              icon.setAttribute('aria-label', 'Arhivska datoteka');
              break;
            case 'json':
            case 'xml':
            case 'html':
            case 'css':
            case 'js':
            case 'ts':
            case 'jsx':
            case 'tsx':
            case 'py':
            case 'java':
            case 'c':
            case 'cpp':
            case 'h':
            case 'hpp':
              icon.textContent = '👨‍💻';
              icon.setAttribute('aria-label', 'Kod datoteka');
              break;
            case 'csv':
            case 'xlsx':
            case 'xls':
            case 'ods':
              icon.textContent = '📊';
              icon.setAttribute('aria-label', 'Tablična datoteka');
              break;
            case 'ppt':
            case 'pptx':
              icon.textContent = ' presentation '; // Using a space to represent a presentation icon for now, as no good emoji exists.
              icon.setAttribute('aria-label', 'Prezentacijska datoteka');
              break;
            default:
              icon.textContent = '📁';
              icon.setAttribute('aria-label', 'Nepoznata datoteka');
              break;
          }
        }
        
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
  
        listItem.appendChild(icon);
        listItem.appendChild(fileName);
        list.appendChild(listItem);
      });
      fileListContainer.appendChild(list);
      processButton.disabled = false;
    } else {
      processButton.disabled = true;
    }
  };

  const handleConsolidateSummaries = () => {
    if (allSummaries.length === 0) {
      return;
    }

    const combinedSummaryText = allSummaries.map(item => 
      `--- Sažetak za: ${item.fileName} ---\n\n${item.summary}\n\n`
    ).join('');

    const blob = new Blob([combinedSummaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `objedinjeni-sazetci.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  fileInput.addEventListener('change', handleFileSelection);
  processButton.addEventListener('click', processFiles);
  consolidateSummaryButton.addEventListener('click', handleConsolidateSummaries); // Add click listener for new button

  uploadLabel.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      fileInput.click();
    }
  });

  uploadContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.add('drag-over');
  });

  uploadContainer.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.remove('drag-over');
  });

  uploadContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadContainer.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      fileInput.files = files;
      handleFileSelection();
    }
  });
}
