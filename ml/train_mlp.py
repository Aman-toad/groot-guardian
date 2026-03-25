import argparse
import json
import os
import glob
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix
import joblib

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Input

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

def load_data(data_path):
    """
    Load JSON data from a file or folder of files.
    """
    records = []
    
    if os.path.isdir(data_path):
        json_files = glob.glob(os.path.join(data_path, "*.json"))
        for file in json_files:
            with open(file, 'r') as f:
                records.extend(json.load(f))
    else:
        with open(data_path, 'r') as f:
            records.extend(json.load(f))
            
    df = pd.DataFrame(records)
    
    # Ensure all required features are present
    for feature in FEATURE_ORDER:
        if feature not in df.columns:
            raise ValueError(f"Missing required feature in data: {feature}")
            
    if "deforestation" not in df.columns:
        raise ValueError("Missing 'deforestation' label in data.")
        
    # Extract features, labels, and optionally confidence
    X = df[FEATURE_ORDER].values
    y = df["deforestation"].values
    
    # Clean data: drop rows with NaNs in features or labels
    mask = ~np.isnan(X).any(axis=1) & ~np.isnan(y)
    X = X[mask]
    y = y[mask]
    
    sample_weights = None
    if "confidence" in df.columns:
        sample_weights = df["confidence"].values[mask]
        
    return X, y, sample_weights

def build_model(input_dim):
    """
    Build the MLP model architecture.
    """
    model = Sequential([
        Input(shape=(input_dim,)),
        Dense(32, activation='relu'),
        Dense(16, activation='relu'),
        Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=[
            'accuracy',
            tf.keras.metrics.Precision(name='precision'),
            tf.keras.metrics.Recall(name='recall')
        ]
    )
    return model

def train_pipeline(data_path, output_dir, epochs=30, batch_size=32, use_weights=True):
    """
    Full training pipeline execution.
    """
    print(f"Loading data from {data_path}...")
    X, y, sample_weights = load_data(data_path)
    print(f"Loaded {len(X)} samples.")
    
    # 3. Train/Test Split (80% training, 20% testing, fixed seed)
    if use_weights and sample_weights is not None:
        X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
            X, y, sample_weights, test_size=0.2, random_state=42
        )
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        w_train = None
    
    # 4. Feature Normalization
    print("Normalizing features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 5. Model Architecture
    model = build_model(input_dim=len(FEATURE_ORDER))
    model.summary()
    
    # 6. Training
    print("\nStarting training...")
    history = model.fit(
        X_train_scaled, y_train,
        sample_weight=w_train,
        validation_data=(X_test_scaled, y_test),
        epochs=epochs,
        batch_size=batch_size,
        verbose=1
    )
    
    # 7. Evaluation
    print("\nEvaluating model on test set...")
    y_pred_probs = model.predict(X_test_scaled)
    y_pred = (y_pred_probs >= 0.5).astype(int).flatten()
    
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred)
    
    print("-" * 30)
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print("Confusion Matrix:")
    print(cm)
    print("-" * 30)
    
    # 8. Save model and scaler
    os.makedirs(output_dir, exist_ok=True)
    
    model_path = os.path.join(output_dir, "mlp_deforestation.keras")
    model.save(model_path)
    
    scaler_path = os.path.join(output_dir, "scaler.pkl")
    joblib.dump(scaler, scaler_path)
    
    print(f"\nModel saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train MLP for Deforestation Classification")
    parser.add_argument("--data", type=str, required=True, help="Path to JSON dataset file or directory")
    parser.add_argument("--out", type=str, default="./outputs", help="Directory to save model and scaler")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--no_weights", action="store_true", help="Disable sample weights even if confidence is available")
    
    args = parser.parse_args()
    
    train_pipeline(
        data_path=args.data,
        output_dir=args.out,
        epochs=args.epochs,
        batch_size=args.batch_size,
        use_weights=not args.no_weights
    )
