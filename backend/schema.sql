-- schema.sql - Version SQLite
-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS [users] (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des visages (empreintes faciales)
CREATE TABLE IF NOT EXISTS [face_encodings] (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    encoding TEXT NOT NULL,
    image_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des logs de reconnaissance
CREATE TABLE IF NOT EXISTS [recognition_logs] (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    recognition_result BOOLEAN,
    confidence REAL,
    image_path TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY user_id REFERENCES users(id)
);