"""เปิดเว็บ CMMS ในเครื่องนี้และให้เครื่องอื่นในวง LAN เปิดได้

รัน: python serve.py [พอร์ต]   (ค่าเริ่มต้น 8000)
"""
import http.server
import os
import socket
import socketserver
import sys
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))

# Windows บางเครื่องตั้ง .js เป็น text/plain ใน registry ทำให้ ES module โหลดไม่ขึ้น จึงกำหนดเอง
TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        return TYPES.get(os.path.splitext(path)[1].lower(), super().guess_type(path))

    def end_headers(self):
        # ไม่ให้เบราว์เซอร์จำไฟล์เก่า แก้โค้ดแล้วรีเฟรชเห็นทันที
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    try:
        httpd = Server(('0.0.0.0', PORT), Handler)
    except OSError:
        print(f'พอร์ต {PORT} ถูกใช้อยู่ ลองปิดหน้าต่างเซิร์ฟเวอร์เดิม หรือรัน python serve.py 8080')
        sys.exit(1)
    print(f'เครื่องนี้:      http://localhost:{PORT}')
    print(f'เครื่องอื่นใน LAN: http://{lan_ip()}:{PORT}')
    print('ปิดหน้าต่างนี้หรือกด Ctrl+C เพื่อหยุด')
    webbrowser.open(f'http://localhost:{PORT}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
