# api_final.py - API finale ultra simple
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import shutil
import uuid
from pathlib import Path

# Notre système simple
from face_system import UltraSimpleFaceSystem

# Initialisation
app = FastAPI(title="DROGING Face Recognition")
face_system = UltraSimpleFaceSystem()

# Répertoire de base
BASE_DIR = Path(__file__).parent.absolute()
UPLOADS_DIR = BASE_DIR / "uploads"
REGISTERED_FACES_DIR = BASE_DIR / "registered_faces"

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dossiers nécessaires
UPLOADS_DIR.mkdir(exist_ok=True)
REGISTERED_FACES_DIR.mkdir(exist_ok=True)


@app.get("/")
def home():
    stats = face_system.get_stats()
    return {
        "project": "DROGING Face Recognition",
        "status": "online",
        "version": "1.0",
        "stats": stats,
        "endpoints": [
            {"method": "POST", "path": "/register", "desc": "Enregistrer une personne"},
            {"method": "POST", "path": "/recognize", "desc": "Reconnaître une personne"},
            {"method": "GET", "path": "/persons", "desc": "Liste des personnes"},
            {"method": "GET", "path": "/stats", "desc": "Statistiques"},
            {"method": "GET", "path": "/docs", "desc": "Documentation Swagger"}
        ]
    }

@app.post("/register")
async def register(
    name: str = Form(...),
    file: UploadFile = File(...)
):
    """Enregistre une nouvelle personne"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "Le fichier doit être une image")
    
    # Sauvegarder
    ext = os.path.splitext(file.filename)[1] or '.jpg'
    filename = f"{name}_{uuid.uuid4()}{ext}"
    filepath = str(UPLOADS_DIR / filename)
    
    try:
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        success, message = face_system.register_person(name, filepath)
        
        if success:
            return {
                "success": True,
                "name": name,
                "message": message,
                "file": filename
            }
        else:
            os.remove(filepath)
            raise HTTPException(400, message)
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(500, str(e))

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    """Reconnaît une personne"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "Le fichier doit être une image")
    
    temp_file = str(UPLOADS_DIR / f"temp_{uuid.uuid4()}.jpg")
    
    try:
        with open(temp_file, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        name, confidence = face_system.recognize_person(temp_file)
        
        os.remove(temp_file)
        
        if name:
            return {
                "recognized": True,
                "name": name,
                "confidence": round(confidence, 2),
                "message": f"Bienvenue {name}!"
            }
        else:
            return {
                "recognized": False,
                "confidence": round(confidence, 2),
                "message": "Personne non reconnue"
            }
    except Exception as e:
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise HTTPException(500, str(e))

@app.get("/persons")
def get_persons():
    """Liste toutes les personnes enregistrées"""
    persons = face_system.list_persons()
    return {"count": len(persons), "persons": persons}

@app.get("/stats")
def get_stats():
    """Retourne les statistiques"""
    return face_system.get_stats()

@app.delete("/person/{name}")
async def delete_person(name: str):
    """Supprime une personne"""
    success, message = face_system.delete_person(name)
    if success:
        return {"success": True, "message": message}
    else:
        raise HTTPException(status_code=404, detail=message)

@app.get("/test")
def test():
    """Endpoint de test"""
    return {"message": "API fonctionnelle", "test": "ok"}

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 DROGING FACE RECOGNITION - API FINALE")
    print("=" * 60)
    print("📌 Cette version utilise uniquement OpenCV (pas de DeepFace)")
    print("🌐 Accueil: http://localhost:8000")
    print("📚 Docs: http://localhost:8000/docs")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)