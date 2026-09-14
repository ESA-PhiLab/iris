#!/bin/bash

# IRIS Installation Script
# This script installs IRIS using UV for dependency management

set -e  # Exit on any error

echo "IRIS Installation Script"
echo "=========================="

# Check if UV is installed
if ! command -v uv &> /dev/null; then
    echo "UV not found. Installing UV..."
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "Please install UV manually on Windows:"
        echo "powershell -ExecutionPolicy ByPass -c \"irm https://astral.sh/uv/install.ps1 | iex\""
        exit 1
    else
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.cargo/bin:$PATH"
    fi
fi

echo "[OK] UV is available"

# Check for system dependencies
echo "Checking system dependencies..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
        # Install required dependencies
        if ! command -v cmake &> /dev/null; then
            echo "WARNING: CMake not found. Installing via Homebrew..."
            brew install cmake
        fi
        # Install OpenMP for LightGBM
        if ! brew list libomp &> /dev/null; then
            echo "Installing OpenMP for LightGBM compatibility..."
            brew install libomp
        fi
    else
        echo "ERROR: Homebrew not found. Please install required dependencies manually:"
        echo "   brew install cmake libomp"
        echo "   or download from: https://cmake.org/download/"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if ! command -v cmake &> /dev/null; then
        echo "WARNING: CMake not found. Please install it:"
        echo "   Ubuntu/Debian: sudo apt-get install cmake build-essential"
        echo "   CentOS/RHEL: sudo yum install cmake gcc-c++"
        exit 1
    fi
fi

# Check Python version
echo "Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 -c "import sys; print('.'.join(map(str, sys.version_info[:2])))")
    echo "Found Python $PYTHON_VERSION"
    
    # Check if version is >= 3.8
    if python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
        echo "[OK] Python version is compatible"
    else
        echo "ERROR: Python 3.8+ required. Installing Python 3.9 with UV..."
        uv python install 3.9
    fi
else
    echo "ERROR: Python not found. Installing Python 3.9 with UV..."
    uv python install 3.9
fi

# Install IRIS using UV sync (creates venv and installs dependencies)
echo "Installing IRIS and dependencies with UV sync..."
uv sync

echo ""
echo "Verifying installation..."
if uv run python environment_scripts/verify_installation.py; then
    echo ""
    echo "SUCCESS: Installation complete and verified!"
    echo ""
    echo "To get started:"
    echo "  source .venv/bin/activate    # Activate the virtual environment"
    echo "  iris demo                    # Run the demo"
    echo "  iris label <config-file>     # Run with your own config"
    echo ""
    echo "Or use UV to run commands directly:"
    echo "  uv run iris demo             # Run demo with UV"
    echo ""
    echo "For help:"
    echo "  uv run iris --help"
else
    echo ""
    echo "WARNING: Installation completed but verification failed."
    echo "Please check the error messages above."
    exit 1
fi