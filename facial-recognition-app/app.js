const API_URL = "http://localhost:8000";

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const usernameInput = document.getElementById('username');
const personsList = document.getElementById('persons-list');
const notificationArea = document.getElementById('notification-area');
const scanOverlay = document.getElementById('scan-overlay');
const currentTimeEl = document.getElementById('current-time');
const feedbackEl = document.getElementById('recognition-feedback');

// Stats Elements
const statPersons = document.getElementById('stat-persons');
const statRate = document.getElementById('stat-rate');
const statTotal = document.getElementById('stat-total');

// State
let currentMode = 'camera';
let uploadedFile = null;

/**
 * UTILS
 */

// Show Notification
function notify(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `glass p-4 rounded-2xl flex items-center gap-3 mb-3 border-l-4 transition-all transform translate-x-full duration-300 ${type === 'error' ? 'border-red-500' : type === 'success' ? 'border-emerald-500' : 'border-indigo-500'
        }`;

    toast.innerHTML = `
        <div class="text-xl">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</div>
        <div class="text-sm font-medium">${message}</div>
    `;

    notificationArea.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);

    // Remove after 5s
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Text to Speech
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
}

// Update Clock
function updateClock() {
    const now = new Date();
    currentTimeEl.textContent = now.toLocaleTimeString('fr-FR');
}
setInterval(updateClock, 1000);
updateClock();

/**
 * CORE CAMERA
 */

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            }
        });
        video.srcObject = stream;
        video.classList.remove('hidden');
        canvas.classList.add('hidden');
        currentMode = 'camera';
        notify("Caméra activée", "info");
    } catch (err) {
        notify("Erreur caméra: " + err.message, "error");
    }
}

// Handle File Upload
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        uploadedFile = file;
        currentMode = 'file';

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                video.classList.add('hidden');
                canvas.classList.remove('hidden');
                canvas.className = "w-full h-full object-contain";
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
        notify("Image chargée depuis le fichier", "info");
    }
});

async function getImageBlob() {
    if (currentMode === 'file' && uploadedFile) {
        return uploadedFile;
    } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
    }
}

/**
 * API ACTIONS
 */

// REGISTER
async function registerFace() {
    const name = usernameInput.value.trim();
    if (!name) return notify("Veuillez entrer un nom", "error");

    scanOverlay.classList.remove('hidden');
    notify("Enregistrement en cours...", "info");

    try {
        const blob = await getImageBlob();
        const formData = new FormData();
        formData.append('name', name);
        formData.append('file', blob, 'register.jpg');

        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            notify(`Inscription réussie : ${data.name}`, "success");
            speak(`Bienvenue dans le système, ${data.name}`);
            usernameInput.value = "";
            loadData();
            if (currentMode === 'file') {
                setTimeout(() => {
                    currentMode = 'camera';
                    video.classList.remove('hidden');
                    canvas.classList.add('hidden');
                    fileInput.value = "";
                }, 3000);
            }
        } else {
            notify(data.detail || "Erreur d'inscription", "error");
        }
    } catch (err) {
        notify("Erreur de connexion au serveur", "error");
    } finally {
        scanOverlay.classList.add('hidden');
    }
}

// RECOGNIZE
async function recognizeFace() {
    scanOverlay.classList.remove('hidden');
    feedbackEl.style.opacity = "1";
    feedbackEl.innerHTML = `<div class="flex items-center gap-3"><div class="animate-spin">🔄</div><span>Analyse biométrique en cours...</span></div>`;

    try {
        const blob = await getImageBlob();
        const formData = new FormData();
        formData.append('file', blob, 'check.jpg');

        const res = await fetch(`${API_URL}/recognize`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            if (data.recognized) {
                notify(`Reconnu : ${data.name}`, "success");
                speak(`Accès autorisé. Bonjour ${data.name}`);

                feedbackEl.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-xs text-indigo-400 uppercase font-bold tracking-widest">Membre Identifié</div>
                            <div class="text-2xl font-bold">${data.name}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-gray-400 uppercase font-bold tracking-widest">Confiance</div>
                            <div class="text-2xl font-bold text-emerald-400">${data.confidence}%</div>
                        </div>
                    </div>
                `;
                feedbackEl.classList.add('border-emerald-500/40');
            } else {
                notify("Sujet non identifié", "error");
                speak("Identité non reconnue.");

                feedbackEl.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-xs text-red-400 uppercase font-bold tracking-widest">Alerte</div>
                            <div class="text-xl font-bold">Identité Inconnue</div>
                        </div>
                        <div class="text-sm bg-red-500/20 px-3 py-1 rounded-full text-red-300">Confiance: ${data.confidence}%</div>
                    </div>
                `;
                feedbackEl.classList.add('border-red-500/40');

                // Focalise sur l'input pour inscription
                usernameInput.focus();
            }
            loadData();
        } else {
            notify(data.detail || "Erreur d'analyse", "error");
        }
    } catch (err) {
        notify("Erreur de connexion au serveur", "error");
    } finally {
        scanOverlay.classList.add('hidden');
        setTimeout(() => feedbackEl.style.opacity = "0", 6000);
    }
}

/**
 * DATA LOADING
 */

async function loadData() {
    try {
        // Load Stats
        const statsRes = await fetch(`${API_URL}/stats`);
        const stats = await statsRes.json();

        statPersons.textContent = stats.persons;
        statRate.textContent = Math.round(stats.success_rate) + "%";
        statTotal.textContent = stats.recognitions + stats.unknown_faces;

        // Load Persons
        const personsRes = await fetch(`${API_URL}/persons`);
        const personsData = await personsRes.json();

        personsList.innerHTML = personsData.persons.map(p => `
            <div class="glass-dark p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all group">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                        ${p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="font-bold group-hover:text-indigo-400 transition-colors">${p.name}</div>
                        <div class="text-[10px] text-gray-500 uppercase tracking-tighter">Inscrit le ${new Date(p.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-lg">
                    ${p.recognition_count} scans
                </div>
            </div>
        `).join('') || '<div class="text-gray-500 italic text-center py-10">Aucun membre enregistré</div>';

    } catch (err) {
        console.error("Erreur chargement données", err);
    }
}

// Initialize
startCamera();
loadData();
setInterval(loadData, 30000); // Auto-refresh every 30s
