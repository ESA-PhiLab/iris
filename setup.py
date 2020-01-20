from setuptools import setup

setup(
    name='iris',
    packages=['iris'],
    include_package_data=True,
    install_requires=[
        'flask',
        'numpy',
    ],
)
