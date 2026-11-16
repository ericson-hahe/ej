document.addEventListener('DOMContentLoaded', () => {
    const memoryForm = document.getElementById('memory-form');
    const memoryGrid = document.getElementById('memory-grid');
    const heartsContainer = document.getElementById('hearts-container');
    const subtitleEl = document.querySelector('.subtitle');

    const STORAGE_KEY_MEMORIES = 'valentine_memories_v1';
    const STORAGE_KEY_SUBTITLE = 'valentine_subtitle_v1';

    // 1. Load Saved Subtitle on Page Load
    const savedSubtitle = localStorage.getItem(STORAGE_KEY_SUBTITLE);
    if (savedSubtitle) {
        subtitleEl.textContent = savedSubtitle;
    }

    // Save Subtitle Whenever User Edits It
    subtitleEl.addEventListener('input', () => {
        localStorage.setItem(STORAGE_KEY_SUBTITLE, subtitleEl.textContent);
    });

    // 2. Load Saved Memories on Page Load
    let memories = JSON.parse(localStorage.getItem(STORAGE_KEY_MEMORIES)) || [];
    
    // If there are saved memories, clear the default placeholder and render them
    if (memories.length > 0) {
        memoryGrid.innerHTML = '';
        memories.forEach(memory => renderMemoryCard(memory));
    }

    // Helper: Save current array to localStorage
    function saveMemoriesToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY_MEMORIES, JSON.stringify(memories));
        } catch (error) {
            alert('Storage limit reached! Try uploading a smaller image or removing an older memory.');
        }
    }

    // Helper: Build and display a memory card in the DOM
    function renderMemoryCard(memory, prepend = false) {
        const card = document.createElement('article');
        card.className = 'memory-card';
        card.dataset.id = memory.id;

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Remove memory';
        deleteBtn.onclick = () => {
            card.remove();
            memories = memories.filter(m => m.id !== memory.id);
            saveMemoriesToStorage();
        };
        card.appendChild(deleteBtn);

        // Media (Saved Base64 Image or Session Video)
        if (memory.mediaUrl) {
            if (memory.mediaType === 'image') {
                const img = document.createElement('img');
                img.src = memory.mediaUrl;
                img.alt = memory.title;
                img.className = 'memory-media';
                card.appendChild(img);
            } else if (memory.mediaType === 'video') {
                const video = document.createElement('video');
                video.src = memory.mediaUrl;
                video.controls = true;
                video.className = 'memory-media';
                card.appendChild(video);
            }
        }

        // Text Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content';

        const cardTitle = document.createElement('h3');
        cardTitle.textContent = memory.title;

        const cardText = document.createElement('p');
        cardText.textContent = memory.text;

        const cardDate = document.createElement('span');
        cardDate.className = 'card-date';
        cardDate.textContent = memory.date;

        contentDiv.appendChild(cardTitle);
        contentDiv.appendChild(cardText);
        contentDiv.appendChild(cardDate);
        card.appendChild(contentDiv);

        if (prepend) {
            memoryGrid.prepend(card);
        } else {
            memoryGrid.appendChild(card);
        }
    }

    // 3. Handle Form Submission
    memoryForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const title = document.getElementById('memory-title').value.trim();
        const text = document.getElementById('memory-text').value.trim();
        const fileInput = document.getElementById('memory-media');
        const file = fileInput.files[0];

        const currentDate = new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        const baseMemory = {
            id: Date.now().toString(),
            title,
            text,
            date: currentDate,
            mediaUrl: null,
            mediaType: null
        };

        // If user attached a file
        if (file) {
            if (file.type.startsWith('image/')) {
                // Convert image to Base64 so it can be stored in localStorage
                const reader = new FileReader();
                reader.onload = function(event) {
                    baseMemory.mediaUrl = event.target.result;
                    baseMemory.mediaType = 'image';

                    memories.unshift(baseMemory);
                    saveMemoriesToStorage();
                    renderMemoryCard(baseMemory, true);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                // Videos are too large for localStorage; render for current session only
                baseMemory.mediaUrl = URL.createObjectURL(file);
                baseMemory.mediaType = 'video';
                renderMemoryCard(baseMemory, true);
                alert('Note: Videos play during your current visit, but browsers only allow text and photos to be saved permanently across refreshes.');
            }
        } else {
            // Text-only memory
            memories.unshift(baseMemory);
            saveMemoriesToStorage();
            renderMemoryCard(baseMemory, true);
        }

        memoryForm.reset();
    });

    // 4. Ambient Floating Hearts Generator
    function createFloatingHeart() {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.innerHTML = '❤';
        
        heart.style.left = Math.random() * 100 + 'vw';
        heart.style.fontSize = (Math.random() * 20 + 12) + 'px';
        heart.style.animationDuration = (Math.random() * 5 + 6) + 's';

        heartsContainer.appendChild(heart);

        setTimeout(() => {
            heart.remove();
        }, 11000);
    }

    setInterval(createFloatingHeart, 600);
});