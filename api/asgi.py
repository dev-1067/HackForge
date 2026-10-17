"""``uvicorn api.asgi:app``"""
from .main import create_app

app = create_app()
