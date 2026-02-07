#!/usr/bin/env python3
"""
Quick test script to verify backend and model loading
"""
import os
import sys

def test_imports():
    """Test if all required imports work"""
    print("Testing imports...")
    try:
        import torch
        print(f"✓ PyTorch {torch.__version__}")
    except ImportError as e:
        print(f"✗ PyTorch not installed: {e}")
        return False
    
    try:
        import cv2
        print(f"✓ OpenCV {cv2.__version__}")
    except ImportError as e:
        print(f"✗ OpenCV not installed: {e}")
        return False
    
    try:
        import numpy
        print(f"✓ NumPy {numpy.__version__}")
    except ImportError as e:
        print(f"✗ NumPy not installed: {e}")
        return False
    
    try:
        from flask import Flask
        print(f"✓ Flask installed")
    except ImportError as e:
        print(f"✗ Flask not installed: {e}")
        return False
    
    try:
        from flask_cors import CORS
        print(f"✓ Flask-CORS installed")
    except ImportError as e:
        print(f"✗ Flask-CORS not installed: {e}")
        return False
    
    return True

def test_model_path():
    """Test if model file exists"""
    print("\nTesting model file location...")
    
    model_paths = [
        os.path.join(os.path.dirname(__file__), 'best.pt'),
        os.path.join(os.path.dirname(__file__), 'best (1).pt'),
    ]
    
    for path in model_paths:
        if os.path.exists(path):
            size_mb = os.path.getsize(path) / (1024 * 1024)
            print(f"✓ Found model at: {path} ({size_mb:.1f} MB)")
            return path
    
    print(f"✗ Model not found. Checked:")
    for path in model_paths:
        print(f"  - {path}")
    return None

def test_device():
    """Test PyTorch device"""
    print("\nTesting device...")
    try:
        import torch
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        if torch.cuda.is_available():
            print(f"✓ GPU available: {torch.cuda.get_device_name(0)}")
        else:
            print(f"✓ Using CPU (GPU not available)")
        return True
    except Exception as e:
        print(f"✗ Device check failed: {e}")
        return False

def main():
    print("=" * 50)
    print("RoadGuard AI Backend Test")
    print("=" * 50)
    
    all_good = True
    
    if not test_imports():
        all_good = False
        print("\n❌ Missing dependencies. Install with:")
        print("   pip install -r requirements.txt")
    
    model_path = test_model_path()
    if model_path is None:
        all_good = False
    
    if not test_device():
        all_good = False
    
    print("\n" + "=" * 50)
    if all_good:
        print("✓ All checks passed! Run: python app.py")
    else:
        print("✗ Some checks failed. See above for details.")
    print("=" * 50)
    
    return 0 if all_good else 1

if __name__ == '__main__':
    sys.exit(main())
