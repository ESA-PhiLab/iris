#!/usr/bin/env python3
"""
Simple test script to verify IRIS installation is working correctly.
Run this after installation to check if all dependencies are properly installed.
"""

import importlib
import sys


def test_import(module_name, description=""):
    """Test if a module can be imported successfully."""
    try:
        importlib.import_module(module_name)
        print(f"[OK] {module_name} {description}")
        return True
    except ImportError as e:
        print(f"[FAIL] {module_name} {description} - ImportError: {e}")
        return False
    except OSError as e:
        if "libomp" in str(e):
            print(f"[FAIL] {module_name} {description} - Missing OpenMP library. On macOS, install with: brew install libomp")
        else:
            print(f"[FAIL] {module_name} {description} - OSError: {e}")
        return False

def main():
    print("Testing IRIS Installation")
    print("=" * 40)

    # Test core dependencies
    modules_to_test = [
        ("iris", "- IRIS main module"),
        ("flask", "- Web framework"),
        ("numpy", "- Numerical computing"),
        ("rasterio", "- Geospatial raster I/O"),
        ("lightgbm", "- Machine learning framework"),
        ("skimage", "- Image processing"),
        ("matplotlib", "- Plotting library"),
        ("sqlalchemy", "- Database ORM"),
        ("yaml", "- YAML parser"),
        ("gevent", "- WSGI server"),
    ]

    failed_imports = []

    for module, description in modules_to_test:
        if not test_import(module, description):
            failed_imports.append(module)

    print("\n" + "=" * 40)

    if not failed_imports:
        print("SUCCESS: All tests passed! IRIS is ready to use.")
        print("\nTry running:")
        print("  iris demo")
        return 0
    else:
        print(f"FAILED: {len(failed_imports)} module(s) failed to import:")
        for module in failed_imports:
            print(f"   - {module}")
        print("\nPlease check your installation and try again.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
