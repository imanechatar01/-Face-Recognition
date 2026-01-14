# database.py - Gestion de la base de données
import sqlite3
import json
from contextlib import contextmanager

DATABASE_PATH = "backend/face_recognition.db"

@contextmanager
def get_db_connection():
    """Contexte pour gestion automatique de la connexion DB"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Pour accéder aux colonnes par nom
    try:
        yield conn
    finally:
        conn.close()

def init_database():
    """Initialise la base de données avec le schéma"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Lire le schéma SQL
        with open("schema.sql", "r") as f:
            schema = f.read()
        
        # Exécuter le schéma
        cursor.executescript(schema)
        conn.commit()
        print("✅ Base de données initialisée")

# Fonctions utilitaires
def add_user(username: str, email: str, password_hash: str) -> int:
    """Ajoute un nouvel utilisateur"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username, email, password_hash)
        )
        conn.commit()
        return cursor.lastrowid

def add_face_encoding(user_id: int, encoding: list, image_path: str = None):
    """Ajoute une empreinte faciale"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO face_encodings (user_id, encoding, image_path) VALUES (?, ?, ?)",
            (user_id, json.dumps(encoding), image_path)
        )
        conn.commit()

def get_all_encodings():
    """Récupère toutes les empreintes"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT fe.*, u.username 
            FROM face_encodings fe
            JOIN users u ON fe.user_id = u.id
        """)
        return [dict(row) for row in cursor.fetchall()]

# Initialiser la DB au démarrage
init_database()