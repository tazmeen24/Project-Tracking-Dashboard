#!/usr/bin/env python3
"""
Backend Bundling Script
Converts FastAPI backend to standalone executable using PyInstaller
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

# =============================================================================
# CONFIGURATION
# =============================================================================

BACKEND_DIR = Path(__file__).parent
MAIN_FILE = "main.py"  # Your FastAPI main file
OUTPUT_DIR = BACKEND_DIR / "backend-dist"
APP_NAME = "finance-backend"

# Files to include with the backend
ADDITIONAL_FILES = [
    # Add any additional files your backend needs
    # Example: ("config.json", "."),
    # Example: ("templates/", "templates/"),
]

# Hidden imports (packages PyInstaller might miss)
HIDDEN_IMPORTS = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "sqlalchemy.sql.default_comparator",
    "passlib.handlers.bcrypt",
]

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"\n{'='*70}")
    print(f"🔧 {description}")
    print(f"{'='*70}")
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            capture_output=True,
            text=True
        )
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        print(f"Output: {e.output}")
        return False

def clean_build_dirs(include_output=False):
    """Clean previous build directories"""
    dirs_to_clean = ['build', 'dist', '__pycache__']
    
    # Only clean output dir if explicitly requested (before build)
    if include_output:
        dirs_to_clean.append(OUTPUT_DIR)
    
    for dir_name in dirs_to_clean:
        dir_path = BACKEND_DIR / dir_name
        if dir_path.exists():
            print(f"🧹 Cleaning {dir_name}/")
            shutil.rmtree(dir_path)

def check_dependencies():
    """Check if required dependencies are installed"""
    print("\n📦 Checking dependencies...")
    
    try:
        import PyInstaller
        print("✅ PyInstaller is installed")
        return True
    except ImportError:
        print("❌ PyInstaller not found!")
        print("\n💡 Install it with: pip install pyinstaller")
        return False

def create_spec_file():
    """Create PyInstaller spec file with custom configuration"""
    
    # Build hidden imports string
    hidden_imports_str = ",\n        ".join([f"'{imp}'" for imp in HIDDEN_IMPORTS])
    
    # Build additional files (datas)
    datas_str = ",\n        ".join([f"('{src}', '{dst}')" for src, dst in ADDITIONAL_FILES])
    
    spec_content = f"""# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['{MAIN_FILE}'],
    pathex=[],
    binaries=[],
    datas=[
        {datas_str if ADDITIONAL_FILES else ""}
    ],
    hiddenimports=[
        {hidden_imports_str}
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='{APP_NAME}',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Set to False to hide console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
"""
    
    spec_file = BACKEND_DIR / f"{APP_NAME}.spec"
    with open(spec_file, 'w') as f:
        f.write(spec_content)
    
    print(f"✅ Created spec file: {spec_file}")
    return spec_file

# =============================================================================
# MAIN BUILD PROCESS
# =============================================================================

def build_backend():
    """Main build process"""
    
    print("\n" + "="*70)
    print("🚀 BUILDING BACKEND EXECUTABLE")
    print("="*70)
    
    # Step 1: Check dependencies
    if not check_dependencies():
        return False
    
    # Step 2: Clean previous builds
    clean_build_dirs(include_output=True)
    
    # Step 3: Create spec file
    spec_file = create_spec_file()
    
    # Step 4: Run PyInstaller
    build_command = f'pyinstaller "{spec_file}" --clean --noconfirm'
    if not run_command(build_command, "Building executable with PyInstaller"):
        return False
    
    # Step 5: Move output to backend-dist
    dist_dir = BACKEND_DIR / "dist"
    if not dist_dir.exists():
        print("❌ Build failed: dist directory not found")
        return False
    
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    # Move all files from dist to backend-dist
    for item in dist_dir.iterdir():
        dest = OUTPUT_DIR / item.name
        if dest.exists():
            if dest.is_dir():
                shutil.rmtree(dest)
            else:
                dest.unlink()
        shutil.move(str(item), str(dest))
    
    print(f"✅ Backend executable created in: {OUTPUT_DIR}")
    
    # Step 6: Test the executable
    print("\n🧪 Testing executable...")
    exe_path = OUTPUT_DIR / f"{APP_NAME}.exe" if sys.platform == "win32" else OUTPUT_DIR / APP_NAME
    
    if exe_path.exists():
        print(f"✅ Executable found: {exe_path}")
        print(f"📦 Size: {exe_path.stat().st_size / (1024*1024):.2f} MB")
    else:
        print(f"❌ Executable not found at: {exe_path}")
        return False
    
    # Step 7: Clean up build artifacts (but keep backend-dist!)
    print("\n🧹 Cleaning up build artifacts...")
    clean_build_dirs(include_output=False)  # Don't delete backend-dist!
    
    # Remove spec file
    if spec_file.exists():
        spec_file.unlink()
    
    print("\n" + "="*70)
    print("✅ BUILD COMPLETE!")
    print("="*70)
    print(f"\n📦 Backend executable: {exe_path}")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("\n💡 Next steps:")
    print("   1. Test the executable manually")
    print("   2. Copy backend-dist/ to your Electron project")
    print("   3. Build the desktop app with: npm run electron-build")
    
    return True

# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    # Change to backend directory
    os.chdir(BACKEND_DIR)
    
    # Check if main file exists
    if not (BACKEND_DIR / MAIN_FILE).exists():
        print(f"❌ Error: {MAIN_FILE} not found in {BACKEND_DIR}")
        print(f"💡 Update MAIN_FILE in this script to match your FastAPI entry point")
        sys.exit(1)
    
    # Run build
    success = build_backend()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)