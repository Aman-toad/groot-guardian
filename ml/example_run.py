from train_mlp import train_pipeline
from inference_mlp import DeforestationPredictor
import json

# Example Usage Script

# 1. Define paths
DATA_PATH = "data/processed/s1_alt_predictions_20260325184244.json"
OUTPUT_DIR = "./outputs"

def test_pipeline():
    print("=== 1. Starting Training Pipeline ===")
    
    # Train the model
    train_pipeline(
        data_path=DATA_PATH,
        output_dir=OUTPUT_DIR,
        epochs=10,  # Quick test
        batch_size=32,
        use_weights=True
    )
    
    print("\n=== 2. Starting Inference Pipeline ===")
    
    # Initialize Predictor (it loads the model and scaler automatically)
    predictor = DeforestationPredictor(model_dir=OUTPUT_DIR, threshold=0.5)
    
    # Load some data to test inference
    with open(DATA_PATH, 'r') as f:
        data = json.load(f)
        
    # Take the first 5 records as a dummy input
    sample_input = data[:5]
    
    # Run prediction
    predictions = predictor.predict(sample_input)
    
    print("\nInference Results:")
    for i, pred in enumerate(predictions):
        print(f"Record {i+1}:")
        print(f"  Lat/Lng: {pred.get('lat', 'N/A')}, {pred.get('lng', 'N/A')}")
        print(f"  Probability: {pred['probability']:.4f}")
        print(f"  Prediction class: {pred['prediction']}")
        
if __name__ == "__main__":
    test_pipeline()
