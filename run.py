import os
import sys
import subprocess

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")

    try:
        # If user calls with system python, automatically switch to virtual environment python
        if os.path.exists(venv_python) and sys.executable.lower() != os.path.abspath(venv_python).lower():
            subprocess.run([venv_python, "run.py"], cwd=backend_dir)
        else:
            sys.path.insert(0, backend_dir)
            os.chdir(backend_dir)
            import run
    except KeyboardInterrupt:
        print("\n[STOPPED] MediVerify AI Backend server stopped cleanly.")
        sys.exit(0)
