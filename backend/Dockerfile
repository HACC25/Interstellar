# syntax=docker/dockerfile:1.7

ARG PYTHON_VERSION=3.14

FROM ghcr.io/astral-sh/uv:python${PYTHON_VERSION}-bookworm AS builder
WORKDIR /app/backend

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON=${PYTHON_VERSION}

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY . .
RUN uv sync --frozen

FROM python:${PYTHON_VERSION}-slim AS runner

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:${PATH}" \
    PYTHONPATH=/app

WORKDIR /app/backend

COPY --from=builder /app/backend/.venv /app/.venv
COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
