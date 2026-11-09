"""Servidor local para probar la app: python serve.py  ->  http://localhost:8765"""
import functools
import http.server
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = 8765

class NoCache(http.server.SimpleHTTPRequestHandler):
    """Sin caché: al probar, el navegador siempre carga la última versión de los archivos."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


Handler = functools.partial(NoCache, directory=str(ROOT))
Handler.func.extensions_map[".webmanifest"] = "application/manifest+json"
Handler.func.extensions_map[".js"] = "text/javascript"

if __name__ == "__main__":
    print(f"Sirviendo {ROOT} en http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
