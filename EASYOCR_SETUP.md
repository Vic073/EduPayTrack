# EasyOCR Setup Guide for EduPayTrack

EasyOCR is the **fallback OCR engine** used when Groq's vision API is unavailable or fails to extract receipt data.

---

## What is EasyOCR?

EasyOCR is an open-source Python library that reads text from images. It works locally on your computer (no internet required) and supports English plus 80+ other languages.

In EduPayTrack, it serves as a **backup** when:
- Groq API key is not configured
- Groq API is down or rate-limited
- Receipt format isn't recognized by Groq

---

## Prerequisites

Before installing EasyOCR, you need:

1. **Python 3.8 or higher** installed
2. **pip** (Python package manager)
3. **Working internet connection** (for downloading models)

### Check Python Version

Open your terminal/command prompt and run:

```bash
python --version
```

If you see `Python 3.8.x` or higher, you're good to go. If not, download Python from [python.org](https://python.org).

---

## Installation Steps

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install EasyOCR

```bash
pip install easyocr
```

This downloads and installs EasyOCR plus its dependencies.

### Step 3: Download OCR Models (First Time Only)

EasyOCR needs to download AI models (~100MB) before it can read text. Run this once:

```bash
python -c "import easyocr; reader = easyocr.Reader(['en'])"
```

You'll see progress bars downloading the models. This takes 2-5 minutes depending on your internet speed.

> **Note:** The models are saved to your computer, so you only need to do this once.

---

## Verify Installation

Test that EasyOCR works by running:

```bash
python -c "
import easyocr
reader = easyocr.Reader(['en'], verbose=False)
print('EasyOCR is ready!')
"
```

If you see `EasyOCR is ready!`, the installation was successful.

---

## Test with EduPayTrack

The OCR engine is located at:

```
backend/src/utils/ocr_engine.py
```

You can test it manually with any receipt image:

```bash
cd backend
python src/utils/ocr_engine.py "path/to/your/receipt.jpg"
```

You should see JSON output with extracted text:

```json
{"rawText": "National Bank of Malawi Amount: MWK 50,000 Reference: TXN123456"}
```

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'easyocr'"

**Fix:** Install EasyOCR in the correct Python environment

```bash
# Try with python3 explicitly
python3 -m pip install easyocr

# Or check which pip matches your python
python -m pip install easyocr
```

### Issue: Download freezes or is very slow

**Fix:** The model download might be timing out. Try:

```bash
# Download with longer timeout
pip install --default-timeout=1000 easyocr

# Then run the model download
python -c "import easyocr; easyocr.Reader(['en'])"
```

### Issue: "torch" installation fails on Windows

**Fix:** EasyOCR depends on PyTorch. On Windows, install it separately:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install easyocr
```

### Issue: Out of memory error

**Fix:** EasyOCR uses significant RAM. If you have less than 4GB RAM:

```python
# In ocr_engine.py, you can limit batch size
reader = easyocr.Reader(['en'], gpu=False, verbose=False)
```

### Issue: Unicode errors on Windows

**Fix:** The `ocr_engine.py` script already handles this, but if you see encoding errors:

```python
# Add at the very top of your Python script
import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf-8', buffering=1)
```

---

## Optional: GPU Acceleration (Advanced)

If you have an NVIDIA GPU, EasyOCR can run faster:

```bash
# Install GPU-enabled PyTorch first
pip install torch torchvision

# Then install easyocr
pip install easyocr
```

Then modify `ocr_engine.py`:

```python
reader = easyocr.Reader(['en'], gpu=True, verbose=False)
```

> **Note:** GPU setup is complex and usually not necessary for the low volume of receipts in EduPayTrack.

---

## How It Works in EduPayTrack

```
Student uploads receipt
        ↓
System tries Groq Vision API first
        ↓
If Groq fails or returns incomplete data
        ↓
System falls back to Python EasyOCR
        ↓
EasyOCR extracts raw text from image
        ↓
Receipt parser extracts amount, reference, date
        ↓
Data shown to student for confirmation
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pip install easyocr` | Install EasyOCR |
| `python -c "import easyocr; easyocr.Reader(['en'])"` | Download models |
| `python src/utils/ocr_engine.py "image.jpg"` | Test with image |

---

## Need Help?

If you continue to have issues:

1. Check Python is properly installed: `python --version`
2. Check pip is working: `pip --version`
3. Try installing in a virtual environment (recommended for production)
4. See [EasyOCR GitHub](https://github.com/JaidedAI/EasyOCR) for detailed docs

---

**That's it!** Once EasyOCR is installed, EduPayTrack will automatically use it as a fallback when needed.
