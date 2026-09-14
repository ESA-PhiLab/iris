FROM python:3.9-slim-bullseye

ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update --fix-missing && \
    apt-get update && \
    apt-get install -y gdal-bin libgdal-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Install UV
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:$PATH"

# Copy project files
COPY . /app/
WORKDIR /app

# Install IRIS using UV with lock file for reproducible builds
RUN uv sync --frozen

ENTRYPOINT ["iris"]