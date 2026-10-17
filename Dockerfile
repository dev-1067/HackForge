FROM python:3.12-slim

WORKDIR /app
COPY requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt

COPY engine engine
COPY sim sim
COPY api api
COPY docs/sample docs/sample

ENV PYTHONUNBUFFERED=1 DATABASE_URL=sqlite:///data/trustjuggler.db
EXPOSE 8000
CMD ["uvicorn", "api.asgi:app", "--host", "0.0.0.0", "--port", "8000"]
