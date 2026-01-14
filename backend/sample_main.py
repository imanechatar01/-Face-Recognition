# simple_main.py - API la plus simple possible
from fastapi import FastAPI, File, UploadFile
import uvicorn
import shutil
import os

app = FastAPI(title="DROGING Face Recognition")

# Créer un dossier pour les uploads
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.get("/")
def home():
    return {
        "project": "DROGING Face Recognition",
        "status": "online",
        "message": "API fonctionnelle!"
    }

@app.post("/upload-test")
async def upload_test(file: UploadFile = File(...)):
    """
    Test simple d'upload de fichier
    """
    # Sauvegarder le fichier
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "success": True,
        "filename": file.filename,
        "path": file_path,
        "message": "Fichier reçu avec succès"
    }

@app.get("/test-db")
def test_database():
    """
    Test simple de base de données SQLite
    """
    import sqlite3
    
    # Créer une base simple
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    
    # Créer une table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Insérer un test
    cursor.execute("INSERT INTO users (name) VALUES ('Test User')")
    
    # Compter
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    
    return {
        "database": "SQLite",
        "status": "working",
        "users_count": count,
        "message": "Base de données fonctionnelle"
    }

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 DROGING FACE RECOGNITION - API SIMPLE")
    print("=" * 60)
    print("📍 Accueil: http://localhost:8000")
    print("📚 Documentation: http://localhost:8000/docs")
    print("📁 Test upload: POST /upload-test")
    print("🗃️  Test DB: GET /test-db")
    print("=" * 60)
    
    uvicorn.run("sample_main:app", host="0.0.0.0", port=8000, reload=True)