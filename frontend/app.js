const API_URL = "http://localhost:8000";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const usernameInput = document.getElementById('username');
const resultArea = document.getElementById('result-area');
const statsArea = document.getElementById('stats-area');
const personsList = document.getElementById('persons-list');
const statusBar = document.getElementById('status-bar');

const fileInput = document.getElementById('file-input');
let currentMode = 'camera'; // 'camera' or 'file'
let uploadedFile = null;

// Start Webcam
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.classList.remove('hidden');
        canvas.classList.add('hidden');
        currentMode = 'camera';
    } catch (err) {
        showStatus("Erreur caméra: " + err.message, "error");
    }
}

// Handle File Upload
function handleFileUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        uploadedFile = file;
        currentMode = 'file';

        // Show preview
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);

                // Switch view
                video.classList.add('hidden');
                canvas.classList.remove('hidden');
                // Fit canvas to container via CSS (already handled by w-full h-full object-cover on video, apply to canvas too)
                canvas.className = "w-full h-full object-contain";
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);

        showStatus("Image chargée via upload", "info");
    }
}

// Get Image (from Camera or Upload)
async function getImageBlob() {
    if (currentMode === 'file' && uploadedFile) {
        return uploadedFile;
    } else {
        // Capture from video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg');
        });
    }
}

// Reset to Camera
function resetToCamera() {
    fileInput.value = '';
    uploadedFile = null;
    startCamera();
}

// Helper to show status
function showStatus(msg, type = "info") {
    statusBar.textContent = msg;
    statusBar.className = `mb-8 p-4 rounded-xl text-center font-bold ${type === 'error' ? 'bg-red-500/20 text-red-200 border border-red-500/50' :
        type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/50' :
            'bg-blue-500/20 text-blue-200 border border-blue-500/50'
        }`;
    statusBar.classList.remove('hidden');
    setTimeout(() => statusBar.classList.add('hidden'), 5000);
}

// Helper to update result
function showResult(title, content, type = "neutral") {
    const colorClass = type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400';
    resultArea.innerHTML = `
        <h2 class="text-3xl font-bold mb-2 ${colorClass}">${title}</h2>
        <p class="text-xl">${content}</p>
    `;
}

// REGISTER
async function registerFace() {
    const name = usernameInput.value.trim();
    if (!name) return showStatus("Veuillez entrer un nom", "error");

    showStatus("Enregistrement en cours...", "info");
    const blob = await getImageBlob();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', blob, 'capture.jpg');

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            showStatus("Succès!", "success");
            showResult("Enregistré!", `Bienvenue ${data.name}`, "success");
            usernameInput.value = "";
            loadData(); // Refresh lists
            if (currentMode === 'file') setTimeout(resetToCamera, 2000); // Auto reset
        } else {
            throw new Error(data.detail || "Erreur inconnue");
        }
    } catch (err) {
        showStatus(err.message, "error");
        showResult("Erreur", err.message, "error");
    }
}

// Helper for Text-to-Speech
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
}

// RECOGNIZE
async function recognizeFace() {
    showStatus("Analyse en cours...", "info");
    const blob = await getImageBlob();

    const formData = new FormData();
    formData.append('file', blob, 'capture.jpg');

    try {
        const res = await fetch(`${API_URL}/recognize`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            if (data.recognized) {
                showStatus("Identifié!", "success");
                showResult(data.name, `Confiance: ${data.confidence}`, "success");
                speak(`Bonjour ${data.name}. Accès autorisé.`);
            } else {
                showStatus("Inconnu", "error");
                showResult(
                    "Personne non reconnue",
                    `Confiance: ${data.confidence}<br><br>👉 <b>Veuillez vous inscrire ci-contre</b>`,
                    "error"
                );
                speak("Personne non reconnue. Veuillez entrer votre nom et cliquer sur Inscription.");

                // Highlight input
                usernameInput.focus();
                usernameInput.classList.add('ring-4', 'ring-red-500');
                setTimeout(() => usernameInput.classList.remove('ring-4', 'ring-red-500'), 2000);
            }
        } else {
            throw new Error(data.detail || "Erreur inconnue");
        }
    } catch (err) {
        showStatus(err.message, "error");
        speak("Une erreur est survenue.");
    }
}

// LOAD STATS & USERS
async function loadData() {
    try {
        // Stats
        const statsRes = await fetch(`${API_URL}/stats`);
        const stats = await statsRes.json();
        statsArea.innerHTML = `
            <div class="flex justify-between border-b border-white/10 pb-2">
                <span>Total Utilisateurs:</span>
                <span class="font-bold">${stats.persons}</span>
            </div>
            <div class="flex justify-between pt-2">
                <span>Dernière activité:</span>
                <span class="text-sm text-gray-400">${stats.last_activity || 'Aucune'}</span>
            </div>
        `;

        // Users
        const personsRes = await fetch(`${API_URL}/persons`);
        const personsData = await personsRes.json();
        personsList.innerHTML = personsData.persons.map(p => `
            <div class="p-3 bg-white/5 rounded-lg flex justify-between items-center hover:bg-white/10 transition">
                <span class="font-semibold">${p.name}</span>
                <span class="text-xs text-gray-500">Enregistré</span>
            </div>
        `).join('') || '<div class="text-gray-500 italic">Personne enregistrée</div>';

    } catch (err) {
        console.error("Erreur chargement données", err);
    }
}

// Init
startCamera();
loadData();
