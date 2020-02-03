from setuptools import setup

setup(
    name='iris',
    description="Tool for manual image segmentation and classification",
    packages=['iris'],
    package_data={
        "iris": [
            "templates/*", "static/css/*",
            "static/icons/*", "static/javascripts/*"
        ],
    },
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
    ],
)
