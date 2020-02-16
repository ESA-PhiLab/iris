from setuptools import setup, find_packages


setup(
    author="John Mrziglod, Alistair Francis",
    author_email="mrzo@gmx.de",
    url="https://github.com/ESA-philab/iris",
    name='iris',
    description="Tool for manual image annotation",
    packages=find_packages(),
    python_requires="~=3.6",
    include_package_data=True,
    entry_points={
        "console_scripts": "iris = iris:run_app",
    },
    install_requires=[
        'flask',
        'flask_compress',
        'flask-sqlalchemy',
        'numpy',
        'pyyaml',
        'lightgbm',
        'scipy',
        'scikit-image',
        'validate_email'
    ],
)
