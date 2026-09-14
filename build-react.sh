#!/bin/bash

# Build React components for IRIS
echo "Building React components..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the React components
npm run build

echo "React build complete! Files are in iris/static/dist/"