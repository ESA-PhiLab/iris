from setuptools import setup

setup(
    name='iris',
    description="Tool for manual image annotation",
    packages=['iris'],
    package_data={
        "iris": [
            "demo/*", "demo/images/*", "demo/images/coast/*",
            "demo/images/mountain/*",
            "templates/*", "static/css/*",
            "static/icons/*", "static/javascripts/*",
            "admin/templates/*", "admin/static/css/*",
            "admin/static/icons/*", "admin/static/javascripts/*",
            "help/templates/*", "help/static/css/*",
            "help/static/icons/*", "help/static/javascripts/*",
            "segmentation/templates/*", "segmentation/static/css/*",
            "segmentation/static/icons/*", "segmentation/static/javascripts/*",
            "user/templates/*", "user/static/css/*",
            "user/static/icons/*", "user/static/javascripts/*"
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
