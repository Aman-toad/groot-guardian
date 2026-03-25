import os
import joblib
import numpy as np
import tensorflow as tf

# Exact required feature order
FEATURE_ORDER = [
    "VV_baseline",
    "VH_baseline",
    "VV_current",
    "VH_current",
    "VV_delta",
    "VH_delta",
    "VVVH_ratio",
    "VV_norm",
    "VH_norm",
    "delta_mag"
]

class DeforestationPredictor:
    def __init__(self, model_dir="./outputs", threshold=0.5):
        """
        Initialize the predictor by loading the saved model and scaler.
        """
        self.threshold = threshold
        
        model_path = os.path.join(model_dir, "mlp_deforestation.keras")
        scaler_path = os.path.join(model_dir, "scaler.pkl")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}.")
        if not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Scaler not found at {scaler_path}.")
            
        print("Loading Model...")
        self.model = tf.keras.models.load_model(model_path)
        
        print("Loading Scaler...")
        self.scaler = joblib.load(scaler_path)

    def predict(self, input_data):
        """
        Predict deforestation probabilities and classes for a list of records.
        
        Args:
            input_data (list or dict): Single dictionary of features, or list of dictionaries.
            
        Returns:
            list of dicts containing lat, lng, probability, and prediction.
        """
        if isinstance(input_data, dict):
            input_data = [input_data]
            
        feature_matrix = []
        valid_indices = []
        
        for i, record in enumerate(input_data):
            try:
                # Extract features with exact order
                features = [record[feat] for feat in FEATURE_ORDER]
                
                # Check for missing/NaN values
                if any(v is None or np.isnan(v) for v in features):
                    print(f"Warning: Record {i} contains missing feature values. Skipping.")
                    continue
                    
                feature_matrix.append(features)
                valid_indices.append(i)
            except KeyError as e:
                print(f"Warning: Record {i} is missing feature {e}. Skipping.")
                continue

        if not feature_matrix:
            return []

        # Convert to numpy array
        X = np.array(feature_matrix)
        
        # Apply standard scaler
        X_scaled = self.scaler.transform(X)
        
        # Predict probability
        y_pred_probs = self.model.predict(X_scaled, verbose=0).flatten()
        
        # Format output
        results = []
        for prob, idx in zip(y_pred_probs, valid_indices):
            original_record = input_data[idx]
            
            result = {
                "probability": float(prob),
                "prediction": int(prob >= self.threshold)
            }
            
            # Pass through coordinates if they exist
            if "lat" in original_record:
                result["lat"] = original_record["lat"]
            if "lng" in original_record:
                result["lng"] = original_record["lng"]
                
            results.append(result)
            
        return results

if __name__ == "__main__":
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description="Inference for Deforestation Classification")
    parser.add_argument("--model_dir", type=str, default="./outputs", help="Directory containing model and scaler")
    parser.add_argument("--input", type=str, required=True, help="Path to input JSON data")
    parser.add_argument("--threshold", type=float, default=0.5, help="Classification threshold")
    
    args = parser.parse_args()
    
    predictor = DeforestationPredictor(model_dir=args.model_dir, threshold=args.threshold)
    
    with open(args.input, 'r') as f:
        data = json.load(f)
        
    predictions = predictor.predict(data)
    
    print("\nSample Predictions:")
    for p in predictions[:5]:
        print(p)
