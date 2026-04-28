FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --default-timeout=100 -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver_plus", "0.0.0.0:8000", "--cert-file", "certs/cert.pem", "--key-file", "certs/key.pem"]
