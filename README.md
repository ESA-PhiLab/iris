# IRIS - Intelligently Reinforced Image Segmentation<sup>1</sup>
<sup>1</sup>Yes, it is a <a href="https://en.wikipedia.org/wiki/Backronym">backronym</a>.


[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/gt-sse-center/iris/ci.yml?logo=githubA)](https://github.com/gt-sse-center/iris/actions?query=workflow%3ACI)
[![codecov](https://codecov.io/gh/loriab/iris/graph/badge.svg)](https://codecov.io/gh/loriab/iris)
[![Docs Config](https://img.shields.io/badge/Docs-configuration_file-lightblue)](https://github.com/gt-sse-center/iris/blob/master/docs/config.md)
![python](https://img.shields.io/badge/python-3.9+-blue.svg)
![License](https://img.shields.io/github/license/gt-sse-center/iris)
<!--[![Documentation
Status](https://img.shields.io/github/actions/workflow/status/MolSSI/QCManyBody/ci.yml?label=docs&logo=readthedocs&logoColor=white)](https://molssi.github.io/QCManyBody/)-->
<!--[![Conda (channel
only)](https://img.shields.io/conda/vn/conda-forge/qcmanybody?color=blue&logo=anaconda&logoColor=white)](https://anaconda.org/conda-forge/qcmanybody)-->


<img src="preview/segmentation.png" />

Tool for manual image segmentation of satellite imagery (or images in general). It was designed to accelerate the creation of machine learning training datasets for Earth Observation. This application is a flask app which can be run locally. Special highlights:
* Support by AI (gradient boosted decision tree) when doing image segmentation
* Multiple and configurable views for multispectral imagery
* Simple setup with pip and one configuration file
* Platform independent app (runs on Linux, Windows and Mac OS)
* Multi-user support: work in a team on your dataset and merge the results

## Installation

### Prerequisites

IRIS requires Python 3.9 or higher and Node.js 18+ for the admin interface. We recommend using [UV](https://docs.astral.sh/uv/) for Python and dependency management.

#### Install UV

**macOS and Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows:**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Alternative (using pip):**
```bash
pip install uv
```

#### Install Node.js

IRIS admin interface requires Node.js 18 or higher for the React frontend.

**Using Node Version Manager (recommended):**
```bash
# Install nvm (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18
```

**Direct installation:**
- Download from [nodejs.org](https://nodejs.org/)
- Or use your system package manager (brew, apt, etc.)

### Install IRIS

#### Quick Installation (Recommended)

1. **Clone the repository:**
```bash
# true upstream
# git clone git@github.com:ESA-PhiLab/iris.git
# pseudo-upstream for GT CSSE collaboration
git clone https://github.com/gt-sse-center/iris
cd iris
```

2. **Run the installation script:**
```bash
# This script will install UV (if needed) and set up IRIS
./install.sh
```

3. **Build the frontend:**
```bash
# Install Node.js dependencies and build React admin interface
npm install
npm run build
```

#### Manual Installation

1. **Clone the repository:**
```bash
git clone https://github.com/gt-sse-center/iris
cd iris
```

2. **Install IRIS using UV:**
```bash
# This will automatically create a virtual environment and install all dependencies
uv sync
```

3. **Build the frontend:**
```bash
# Install Node.js dependencies and build React admin interface
npm install
npm run build
```

4. **Run commands with UV (recommended):**
```bash
# UV automatically manages the environment - use 'uv run' for commands
uv run iris demo

# Or activate the environment manually if preferred
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate     # On Windows
```

### Verify Installation

After installation, you can verify everything is working correctly:

```bash
# Run the installation test
uv run python environment_scripts/verify_installation.py

# Verify frontend build
ls iris/static/dist/adminApp.js  # Should exist

# Run the test suite
uv run pytest iris/tests/

# Or try the demo directly
uv run iris demo
```


## Usage

Once installed, you can run the demo version of IRIS

```bash
uv run iris demo
```

If you run IRIS from within a test runner (for example when running pytest) or other tooling that passes its own CLI flags, you can separate IRIS-specific arguments using `--`. Everything after `--` will be treated as IRIS arguments. Example:

```
pytest -v ... -- demo
```

Having run the demo, you can then create a personalised config file, based on _demo/cloud-segmentation.json_. With your own config file, you can then instantiate your own custom project. <a href="https://github.com/ESA-PhiLab/iris/blob/master/docs/config.md">Here is a guide</a> on how to write your own config file.

```bash
uv run iris label <your-config-file>
```

### Project Management Commands

IRIS provides convenient commands for creating and managing projects:

```bash
# launch a project (or create it if it doesn't exist yet)
uv run iris launch <project-name>

# Remove a project (with confirmation prompt)
uv run iris rm <project-name>
```

The `launch` command will:
- Create a new project from the demo template if the folder doesn't exist
- Launch an existing project by finding `cloud-segmentation.json` or any `.json` config file
- Provide clear error messages if no suitable config is found

The `rm` command safely removes project folders with confirmation and prevents accidental deletion of the demo folder.

It is recommended to use a keyboard and mouse with scrollwheel for IRIS. Currently, control via trackpad is limited and awkward.

### Admin Interface

IRIS includes a modern React-based admin interface for managing users, viewing progress, and monitoring annotation quality:

```bash
# Access the admin interface at http://localhost:5000/admin
# First user becomes admin automatically
```

**Admin Features:**
- **User Management**: View all users, manage admin privileges, track annotation progress
- **Image Progress**: Monitor which images have been annotated and by whom  
- **Quality Metrics**: View annotation scores, difficulty ratings, and time spent
- **Modern UI**: React Single Page Application with fast navigation

### Docker

You can also use Docker to deploy IRIS. The Docker image uses the modern pyproject.toml configuration for reliable dependency management.

```bash
# Build the image
docker build --tag iris .

# Run with port forwarding and volume mount
docker run -p 80:80 -v <dataset_path>:/dataset/ --rm -it iris label /dataset/cloud-segmentation.json
```

Note: Port forwarding is needed (here we use port 80 as an example, but the port number can be set in your IRIS config file) and the directory to your project needs to be given as a volume to docker.

### Run on Github Codespaces
To run in a [Github codespace](https://docs.github.com/en/codespaces/overview) fork this repository, then in the Github UI select `Code/Codespaces/Open in codespace`. Run `pip install -e .` and then `iris demo`. You will see a popup that there is an app on port 5000, click the link to open a new window showing Iris!


## Development and Testing

### Frontend Development

IRIS includes a modern React/TypeScript admin interface. For frontend development:

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Development with hot reload (optional)
npm run dev  # Runs Vite dev server on port 3000
```

The admin interface features:
- **Modern React SPA** with client-side routing
- **TypeScript** for type safety and better development experience  
- **Hybrid architecture** supporting both React and legacy Flask content
- **Incremental migration** path from Flask templates to React components

### Running Tests

IRIS includes a comprehensive test suite using pytest. The tests are located in `iris/tests/` and include fixtures for Flask app testing and project state management.

```bash
# Run all tests (includes frontend build verification)
uv run pytest iris/tests/

# Run tests with verbose output
uv run pytest iris/tests/ -v

# Run specific test file
uv run pytest iris/tests/test_models_user.py -v

# Frontend-specific checks
npx tsc --noEmit  # TypeScript type checking
```

The test suite includes:
- CLI argument parsing tests
- User model and authentication tests  
- Project configuration and utility tests
- Image processing and band expression validation
- Deep dictionary merging utilities
- Frontend build and type checking (in CI)

### E2E Testing with Cypress

IRIS includes end-to-end tests for the React-based UI using Cypress. These tests verify user workflows like opening the preferences modal, editing settings, and saving configurations.

```bash
# Run Cypress tests in headless mode (requires IRIS server running)
npm run cypress:headless

# Open Cypress interactive test runner
npm run cypress

```

**Note:** Cypress tests require the IRIS server to be running. Start it with `uv run iris demo` in a separate terminal before running tests.

**Visit the official iris Github page:  https://github.com/ESA-PhiLab/iris**
