FROM python:3.8-slim-buster

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update --fix-missing 

RUN apt-get update && apt-get install -y gdal-bin libgdal-dev 

RUN python -m pip install --upgrade pip

COPY requirements.txt /requirements.txt

RUN pip install --no-cache-dir -r /requirements.txt

COPY . /app/

RUN cd /app/ && python setup.py install

ENTRYPOINT ["iris"]