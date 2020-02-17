from os.path import dirname, join
from setuptools import setup, find_packages

requirements_file = join(dirname(__file__), 'requirements.txt')
with open(requirements_file, 'r') as stream:
    requirements = stream.read().split('\n')
    if not requirements[-1]:
        del requirements[-1]

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
    install_requires=requirements,
)
