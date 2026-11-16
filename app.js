document.addEventListener('DOMContentLoaded', async () => {
    const memoryForm = document.getElementById('memory-form');
    const memoryGrid = document.getElementById('memory-grid');
    const draftsSection = document.getElementById('drafts-section');
    const draftsGrid = document.getElementById('drafts-grid');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const togglePreviewBtn = document.getElementById('toggle-preview-btn');
    const exportShareBtn = document.getElementById('export-share-btn');
    const testLockBtn = document.getElementById('test-lock-btn');

    const mainTitleEl = document.getElementById('main-title');
    const mainSubtitleEl = document.getElementById('main-subtitle');
    const heartsContainer = document.getElementById('hearts-container');

    // Music & Lock Elements
    const musicUpload = document.getElementById('music-upload');
    const musicStatus = document.getElementById('music-status');
    const removeMusicBtn = document.getElementById('remove-music-btn');
    const musicPill = document.getElementById('music-player-pill');
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    const musicTrackName = document.getElementById('music-track-name');
    const bgAudio = document.getElementById('bg-audio');

    const secretPasswordInput = document.getElementById('secret-password');
    const passwordHintInput = document.getElementById('password-hint');
    const lockScreen = document.getElementById('lock-screen');
    const lockHintDisplay = document.getElementById('lock-hint-display');
    const unlockInput = document.getElementById('unlock-input');
    const unlockBtn = document.getElementById('unlock-btn');
    const lockError = document.getElementById('lock-error');

    let editingDraftId = null;
    let existingMediaData = null;
    let existingMediaType = null;

    // ==========================================
    // 1. INDEXEDDB SETUP (Memories + Settings Store)
    // ==========================================
    const DB_NAME = 'LovingYouEternallyDB_v2';
    const DB_VERSION = 1;

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('memories')) {
                    db.createObjectStore('memories', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    const db = await openDB();

    function dbGetAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function dbGet(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function dbPut(storeName, value) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).put(value);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    function dbDelete(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==========================================
    // 2. LOAD SAVED SETTINGS (Title, Music, Passcode)
    // ==========================================
    const savedTitle = localStorage.getItem('lye_main_title');
    const savedSubtitle = localStorage.getItem('lye_main_subtitle');
    if (savedTitle) mainTitleEl.textContent = savedTitle;
    if (savedSubtitle) mainSubtitleEl.textContent = savedSubtitle;

    mainTitleEl.addEventListener('input', () => localStorage.setItem('lye_main_title', mainTitleEl.textContent));
    mainSubtitleEl.addEventListener('input', () => localStorage.setItem('lye_main_subtitle', mainSubtitleEl.textContent));

    // Load Passcode & Hint
    secretPasswordInput.value = localStorage.getItem('lye_passcode') || '';
    passwordHintInput.value = localStorage.getItem('lye_passhint') || '';

    secretPasswordInput.addEventListener('input', () => {
        localStorage.setItem('lye_passcode', secretPasswordInput.value.trim());
    });
    passwordHintInput.addEventListener('input', () => {
        localStorage.setItem('lye_passhint', passwordHintInput.value.trim());
    });

    // Load Saved Background Music
    async function loadSavedMusic() {
        const musicRecord = await dbGet('settings', 'bg_music');
        if (musicRecord && musicRecord.dataUrl) {
            bgAudio.src = musicRecord.dataUrl;
            musicTrackName.textContent = musicRecord.fileName;
            musicStatus.textContent = `Loaded: ${musicRecord.fileName}`; musicPill.classList.remove('hidden'); removeMusicBtn.classList.remove('hidden'); } else { bgAudio.pause(); bgAudio.removeAttribute('src'); musicStatus.textContent = 'No song uploaded yet.'; musicPill.classList.add('hidden'); removeMusicBtn.classList.add('hidden'); } }  musicUpload.addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; const dataUrl = await fileToDataURL(file); await dbPut('settings', { key: 'bg_music', fileName: file.name, dataUrl }); await loadSavedMusic(); });  removeMusicBtn.addEventListener('click', async () => { await dbDelete('settings', 'bg_music'); musicUpload.value = ''; await loadSavedMusic(); });  musicToggleBtn.addEventListener('click', () => { if (bgAudio.paused) { bgAudio.play(); musicPill.classList.add('playing'); musicToggleBtn.textContent = '⏸️'; } else { bgAudio.pause(); musicPill.classList.remove('playing'); musicToggleBtn.textContent = '🎵'; } });  // ========================================== // 3. TEST LOCK SCREEN LOGIC // ========================================== function showLockScreen() { const pass = secretPasswordInput.value.trim(); if (!pass) { alert('Type a secret passcode first in the "Music & Secret Passcode" box to test the lock screen!'); return; } const hint = passwordHintInput.value.trim(); lockHintDisplay.textContent = hint ? `Hint: ${hint}` : 'Enter our secret passcode to unlock my heart.';
        unlockInput.value = '';
        lockError.classList.add('hidden');
        lockScreen.classList.remove('hidden');
    }

    function attemptUnlock() {
        const correctPass = secretPasswordInput.value.trim();
        if (unlockInput.value.trim() === correctPass) {
            lockScreen.classList.add('hidden');
            if (bgAudio.src) {
                bgAudio.play().then(() => {
                    musicPill.classList.add('playing');
                    musicToggleBtn.textContent = '⏸️';
                }).catch(() => {});
            }
        } else {
            lockError.classList.remove('hidden');
        }
    }

    testLockBtn.addEventListener('click', showLockScreen);
    unlockBtn.addEventListener('click', attemptUnlock);
    unlockInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptUnlock();
    });

    // ==========================================
    // 4. RENDER MEMORIES & DRAFTS
    // ==========================================
    async function renderBoard() {
        const items = await dbGetAll('memories');
        const published = items
            .filter(item => item.status === 'published')
            .sort((a, b) => (a.pinned === b.pinned ? b.timestamp - a.timestamp : a.pinned ? -1 : 1));

        const drafts = items
            .filter(item => item.status === 'draft')
            .sort((a, b) => b.timestamp - a.timestamp);

        draftsGrid.innerHTML = '';
        if (drafts.length > 0) {
            draftsSection.classList.remove('hidden');
            drafts.forEach(draft => draftsGrid.appendChild(createCardElement(draft)));
        } else {
            draftsSection.classList.add('hidden');
        }

        memoryGrid.innerHTML = '';
        if (published.length === 0) {
            memoryGrid.innerHTML = `
                <article class="memory-card">
                    <div class="card-content">
                        <h3>Where It All Began</h3>
                        <p>Every moment with you feels like a favorite song on repeat. Add your photos, videos, and notes above!</p>
                        <span class="card-date">Forever & Always</span>
                    </div>
                </article>`;
        } else {
            published.forEach(item => memoryGrid.appendChild(createCardElement(item)));
        }
    }

    function createCardElement(item) {
        const card = document.createElement('article');
        card.className = `memory-card ${item.pinned ? 'is-pinned' : ''}`;

        if (item.pinned && item.status === 'published') {
            const pinBadge = document.createElement('span');
            pinBadge.className = 'pin-badge';
            pinBadge.textContent = '📌 Pinned Memory';
            card.appendChild(pinBadge);
        }

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        if (item.status === 'published') {
            const pinBtn = document.createElement('button');
            pinBtn.className = 'icon-btn';
            pinBtn.title = item.pinned ? 'Unpin' : 'Pin to top';
            pinBtn.textContent = item.pinned ? '📍' : '📌';
            pinBtn.onclick = async () => {
                item.pinned = !item.pinned;
                await dbPut('memories', item);
                renderBoard();
            };
            actions.appendChild(pinBtn);
        }

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'Edit';
        editBtn.textContent = '✏️';
        editBtn.onclick = () => {
            editingDraftId = item.id;
            existingMediaData = item.mediaData;
            existingMediaType = item.mediaType;
            document.getElementById('memory-title').value = item.title;
            document.getElementById('memory-text').value = item.text;
            document.getElementById('pin-on-create').checked = item.pinned;
            document.getElementById('file-status').textContent = item.mediaData ? 'Current photo/video kept.' : '';
            document.getElementById('creator-section').scrollIntoView({ behavior: 'smooth' });
        };
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.title = 'Delete';
        delBtn.textContent = '🗑️';
        delBtn.onclick = async () => {
            await dbDelete('memories', item.id);
            renderBoard();
        };
        actions.appendChild(delBtn);
        card.appendChild(actions);

        if (item.mediaData) {
            if (item.mediaType === 'image') {
                const img = document.createElement('img');
                img.src = item.mediaData;
                img.className = 'memory-media';
                card.appendChild(img);
            } else if (item.mediaType === 'video') {
                const video = document.createElement('video');
                video.src = item.mediaData;
                video.controls = true;
                video.className = 'memory-media';
                card.appendChild(video);
            }
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content';

        const titleEl = document.createElement('h3');
        titleEl.textContent = item.title;

        const textEl = document.createElement('p');
        textEl.textContent = item.text;

        const footerDiv = document.createElement('div');
        footerDiv.className = 'card-footer';

        const dateEl = document.createElement('span');
        dateEl.className = 'card-date';
        dateEl.textContent = item.date;
        footerDiv.appendChild(dateEl);

        if (item.status === 'draft') {
            const pubBtn = document.createElement('button');
            pubBtn.className = 'btn-publish-draft';
            pubBtn.textContent = 'Publish Now ❤️';
            pubBtn.onclick = async () => {
                item.status = 'published';
                await dbPut('memories', item);
                renderBoard();
            };
            footerDiv.appendChild(pubBtn);
        }

        contentDiv.appendChild(titleEl);
        contentDiv.appendChild(textEl);
        contentDiv.appendChild(footerDiv);
        card.appendChild(contentDiv);

        return card;
    }

    async function handleFormSave(status) {
        const title = document.getElementById('memory-title').value.trim();
        const text = document.getElementById('memory-text').value.trim();
        const pinned = document.getElementById('pin-on-create').checked;
        const file = document.getElementById('memory-media').files[0];

        if (!title && !text) {
            alert('Please write a title or a love note first!');
            return;
        }

        let mediaData = existingMediaData;
        let mediaType = existingMediaType;

        if (file) {
            mediaData = await fileToDataURL(file);
            mediaType = file.type.startsWith('video/') ? 'video' : 'image';
        }

        await dbPut('memories', {
            id: editingDraftId || Date.now().toString(),
            title: title || 'Untitled Note',
            text,
            pinned,
            status,
            mediaData,
            mediaType,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        });

        editingDraftId = null;
        existingMediaData = null;
        existingMediaType = null;
        document.getElementById('file-status').textContent = '';
        memoryForm.reset();
        renderBoard();
    }

    memoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFormSave('published');
    });

    saveDraftBtn.addEventListener('click', () => handleFormSave('draft'));

    // ==========================================
    // 5. PREVIEW RECIPIENT MODE
    // ==========================================
    togglePreviewBtn.addEventListener('click', () => {
        document.body.classList.toggle('reader-mode');
        const isReader = document.body.classList.contains('reader-mode');
        togglePreviewBtn.textContent = isReader ? '✏️ Back to Editor Mode' : '👁️ Preview Recipient View';
        mainTitleEl.contentEditable = !isReader;
        mainSubtitleEl.contentEditable = !isReader;
    });

    // ==========================================
    // 6. EXPORT & SHARE WITH LOCK SCREEN + MUSIC
    // ==========================================
    exportShareBtn.addEventListener('click', async () => {
        const items = await dbGetAll('memories');
        const published = items
            .filter(item => item.status === 'published')
            .sort((a, b) => (a.pinned === b.pinned ? b.timestamp - a.timestamp : a.pinned ? -1 : 1));

        if (published.length === 0) {
            alert('Publish at least one memory or love note first before sharing!');
            return;
        }

        const titleText = mainTitleEl.textContent;
        const subtitleText = mainSubtitleEl.textContent;
        const passcode = secretPasswordInput.value.trim();
        const passHint = passwordHintInput.value.trim();
        const musicRecord = await dbGet('settings', 'bg_music');

        const cardsHTML = published.map(item => {
            let mediaHTML = '';
            if (item.mediaData && item.mediaType === 'image') {
                mediaHTML = `<img src="${item.mediaData}" class="memory-media" alt="Memory">`;
            } else if (item.mediaData && item.mediaType === 'video') {
                mediaHTML = `<video src="${item.mediaData}" controls class="memory-media"></video>`;
            }
            return `
            <article class="memory-card ${item.pinned ? 'is-pinned' : ''}">
                ${item.pinned ? '<span class="pin-badge">📌 Pinned Memory</span>' : ''}
                ${mediaHTML}
                <div class="card-content">
                    <h3>${escapeHTML(item.title)}</h3>
                    <p>${escapeHTML(item.text)}</p>
                    <div class="card-footer"><span class="card-date">${escapeHTML(item.date)}</span></div>
                </div>
            </article>`;
        }).join('');

        const styles = Array.from(document.styleSheets)
            .map(sheet => {
                try { return Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); }
                catch (e) { return ''; }
            }).join('\n');

        const lockHTML = passcode ? `
        <div id="lock-screen" class="lock-overlay">
            <div class="lock-box">
                <div class="lock-icon">🔒❤️</div>
                <h2 class="script-font lock-title">For Your Eyes Only</h2>
                <p class="lock-hint">${passHint ? 'Hint: ' + escapeHTML(passHint) : 'Enter our secret passcode to unlock my heart.'}</p>
                <input type="password" id="unlock-input" placeholder="Enter secret passcode...">
                <p id="lock-error" class="lock-error hidden">Incorrect passcode, try again my love 💕</p>
                <button type="button" id="unlock-btn" class="btn-love">Unlock Memories 🗝️</button>
            </div>
        </div>` : '';

        const musicHTML = (musicRecord && musicRecord.dataUrl) ? `
        <div id="music-player-pill" class="music-pill">
            <button type="button" id="music-toggle-btn" class="music-btn">🎵</button>
            <span class="music-label">${escapeHTML(musicRecord.fileName)}</span>
            <audio id="bg-audio" src="${musicRecord.dataUrl}" loop></audio>
        </div>` : '';

        const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(titleText)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    <style>${styles}</style>
</head>
<body class="reader-mode">
    <div id="hearts-container"></div>
    ${lockHTML}${musicHTML}
    <header class="hero">
        <h1 class="script-font">${escapeHTML(titleText)}</h1>
        <p class="subtitle">${escapeHTML(subtitleText)}</p>
    </header>
    <main class="container">
        <section class="gallery-section">
            <h2 class="section-title">Our Cherished Moments</h2>
            <div class="memory-grid">${cardsHTML}</div>
        </section>
    </main>
    <footer><p>Made with ❤️ — ${escapeHTML(titleText)}</p></footer>
    <script>
        const PASSCODE = ${JSON.stringify(passcode)};
        const lockScreen = document.getElementById('lock-screen');
        const unlockBtn = document.getElementById('unlock-btn');
        const unlockInput = document.getElementById('unlock-input');
        const lockError = document.getElementById('lock-error');
        const audio = document.getElementById('bg-audio');
        const pill = document.getElementById('music-player-pill');
        const toggleBtn = document.getElementById('music-toggle-btn');

        function playMusic() {
            if (!audio) return;
            audio.play().then(() => {
                pill.classList.add('playing');
                toggleBtn.textContent = '⏸️';
            }).catch(() => {});
        }

        if (toggleBtn && audio) {
            toggleBtn.addEventListener('click', () => {
                if (audio.paused) { playMusic(); }
                else { audio.pause(); pill.classList.remove('playing'); toggleBtn.textContent = '🎵'; }
            });
        }

        if (unlockBtn) {
            function checkPass() {
                if (unlockInput.value.trim() === PASSCODE) {
                    lockScreen.classList.add('hidden');
                    playMusic();
                } else {
                    lockError.classList.remove('hidden');
                }
            }
            unlockBtn.addEventListener('click', checkPass);
            unlockInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPass(); });
        } else {
            document.body.addEventListener('click', playMusic, { once: true });
        }

        const container = document.getElementById('hearts-container');
        setInterval(() => {
            const h = document.createElement('div');
            h.className = 'floating-heart';
            h.innerHTML = '❤';
            h.style.left = Math.random() * 100 + 'vw';
            h.style.fontSize = (Math.random() *