# face_services.py - Logique de reconnaissance faciale
import face_recognition
import numpy as np
import cv2
import os
from typing import List, Optional, Tuple
import json

class FaceRecognitionService:
    def __init__(self):
        self.known_faces = []
        self.known_names = []
        self.load_known_faces()
    
    def load_known_faces(self):
        """Charge les visages connus depuis la base"""
        from database import get_all_encodings
        
        encodings = get_all_encodings()
        self.known_faces = []
        self.known_names = []
        
        for enc in encodings:
            self.known_faces.append(json.loads(enc['encoding']))
            self.known_names.append(enc['username'])
        
        print(f"📊 {len(self.known_faces)} visages chargés en mémoire")
    
    def extract_encoding(self, image_path: str) -> Optional[List[float]]:
        """
        Extrait l'empreinte faciale d'une image
        Retourne une liste de 128 nombres ou None
        """
        try:
            # Charger l'image
            image = face_recognition.load_image_file(image_path)
            
            # Détecter les visages
            face_locations = face_recognition.face_locations(image)
            
            if not face_locations:
                print("⚠️ Aucun visage détecté")
                return None
            
            # Extraire l'empreinte du premier visage
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            if not face_encodings:
                print("⚠️ Impossible d'extraire l'empreinte")
                return None
            
            return face_encodings[0].tolist()
            
        except Exception as e:
            print(f"❌ Erreur lors de l'extraction: {e}")
            return None
    
    def recognize_face(self, image_path: str, threshold: float = 0.6) -> Tuple[Optional[str], float]:
        """
        Reconnaît un visage dans une image
        Retourne (nom, confiance) ou (None, 0.0)
        """
        # Extraire l'empreinte
        encoding = self.extract_encoding(image_path)
        if encoding is None:
            return None, 0.0
        
        # Si pas de visages connus
        if not self.known_faces:
            return None, 0.0
        
        # Convertir en numpy array
        encoding_array = np.array(encoding)
        known_arrays = [np.array(face) for face in self.known_faces]
        
        # Calculer les distances
        distances = face_recognition.face_distance(known_arrays, encoding_array)
        
        # Trouver la meilleure correspondance
        best_match_index = np.argmin(distances)
        best_distance = distances[best_match_index]
        
        # Calculer la confiance (0-100%)
        confidence = max(0, 100 - (best_distance * 100))
        
        # Vérifier le seuil
        if best_distance < threshold:
            return self.known_names[best_match_index], confidence
        else:
            return None, confidence
    
    def verify_face(self, image_path1: str, image_path2: str, threshold: float = 0.6) -> Tuple[bool, float]:
        """Vérifie si deux images sont la même personne"""
        encoding1 = self.extract_encoding(image_path1)
        encoding2 = self.extract_encoding(image_path2)
        
        if encoding1 is None or encoding2 is None:
            return False, 0.0
        
        # Calculer la distance
        distance = face_recognition.face_distance(
            [np.array(encoding1)], 
            np.array(encoding2)
        )[0]
        
        # Calculer la confiance
        confidence = max(0, 100 - (distance * 100))
        
        return distance < threshold, confidence

# Instance globale
face_service = FaceRecognitionService()

# Fonctions utilitaires rapides
def quick_test():
    """Test rapide de la reconnaissance"""
    service = FaceRecognitionService()
    
    # Test avec une photo
    test_image = "static/test_face.jpg"
    if os.path.exists(test_image):
        name, confidence = service.recognize_face(test_image)
        if name:
            print(f"✅ Personne reconnue: {name} (confiance: {confidence:.1f}%)")
        else:
            print(f"❌ Personne non reconnue (confiance: {confidence:.1f}%)")
    else:
        print("⚠️ Image de test non trouvée")