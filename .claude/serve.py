"""Servidor estático mínimo para previsualizar la home sin build step.

Manda `Cache-Control: no-store` en todo: durante la revisión es habitual editar
CSS o JS y recargar, y el caché del navegador hace perder tiempo mostrando la
versión anterior.
"""
import functools
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, keyword, value):
        # SimpleHTTPRequestHandler manda Last-Modified, que habilita el 304.
        if keyword == "Last-Modified":
            return
        super().send_header(keyword, value)


Handler = functools.partial(NoCacheHandler, directory=ROOT)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 4173), Handler) as httpd:
    print(f"serving {ROOT} on http://127.0.0.1:4173")
    httpd.serve_forever()
