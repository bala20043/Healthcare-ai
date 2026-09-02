import os
import sys
import subprocess

if __name__ == "__main__":
    # Auto-activate project virtual environment if executed via system python
    venv_python = os.path.join(os.path.dirname(__file__), "venv", "Scripts", "python.exe")
    if os.path.exists(venv_python) and sys.executable.lower() != os.path.abspath(venv_python).lower():
        subprocess.run([venv_python, "run.py"])
    else:
        import uvicorn
        from app.config import settings
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
