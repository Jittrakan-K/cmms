import http.server
import socket
import socketserver
import os
import sys
import json
import time
import webbrowser
from urllib.parse import urlparse

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'maintenance_db.json')
last_modified_timestamp = 0

def get_local_ip():
    """Find the local LAN IP address of this machine."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        try:
            IP = socket.gethostbyname(socket.gethostname())
        except Exception:
            IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class MaintenanceRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching so client updates are immediate
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        global last_modified_timestamp
        parsed = urlparse(self.path)

        if parsed.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            status_data = {
                'status': 'ok',
                'server_ip': get_local_ip(),
                'port': PORT,
                'lastModified': last_modified_timestamp,
                'dbExists': os.path.exists(DB_FILE)
            }
            self.wfile.write(json.dumps(status_data).encode('utf-8'))
            return

        elif parsed.path == '/api/data':
            if os.path.exists(DB_FILE):
                try:
                    with open(DB_FILE, 'r', encoding='utf-8') as f:
                        data = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(data.encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
                    return
            else:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'empty', 'lastModified': 0}).encode('utf-8'))
                return

        # Default: Serve static files
        super().do_GET()

    def do_POST(self):
        global last_modified_timestamp
        parsed = urlparse(self.path)

        if parsed.path == '/api/data':
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)
            
            try:
                # Validate that body is valid JSON
                data = json.loads(post_body.decode('utf-8'))
                
                # Update timestamp
                last_modified_timestamp = int(time.time() * 1000)
                data['serverLastModified'] = last_modified_timestamp

                # Write atomically to maintenance_db.json
                temp_file = DB_FILE + '.tmp'
                with open(temp_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                # Atomic replace on Windows
                if os.path.exists(DB_FILE):
                    os.replace(temp_file, DB_FILE)
                else:
                    os.rename(temp_file, DB_FILE)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                response = {
                    'status': 'ok',
                    'lastModified': last_modified_timestamp,
                    'message': 'Data saved successfully to host machine'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

def run():
    # Set working directory to the folder containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    local_ip = get_local_ip()
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), MaintenanceRequestHandler) as httpd:
        print("=" * 70)
        print("      PTN ORBRAY MAINTENANCE - HOST SERVER (เครื่องแม่)")
        print("=" * 70)
        print(f"\n [OK] เซิร์ฟเวอร์เริ่มทำงานแล้วบนพอร์ต {PORT} พร้อมระบบ Auto-Sync!\n")
        print(" 💻 1. เข้าใช้งานจากเครื่องนี้ (Host PC):")
        print(f"       http://localhost:{PORT}/")
        print(f"       http://localhost:{PORT}/PTN%20ORBRAY%20MAINTENANCE.html")
        print("\n 📱 2. ให้คนอื่นใช้งานจากเครื่องอื่นในวง Wi-Fi / สาย LAN เดียวกัน:")
        print(f"       http://{local_ip}:{PORT}/")
        print(f"       http://{local_ip}:{PORT}/PTN%20ORBRAY%20MAINTENANCE.html")
        print("\n 💾 3. การบันทึกข้อมูล:")
        print(f"       ข้อมูลจากทุกเครื่องจะถูกส่งมาบันทึกที่: {os.path.basename(DB_FILE)}")
        print("       ทุกคนจะเห็นข้อมูลอัปเดตตรงกันแบบ Real-time โดยอัตโนมัติ")
        print("\n (กด Ctrl + C ที่หน้าต่างนี้ เพื่อหยุดการทำงานของ Host Server)")
        print("=" * 70 + "\n")
        
        try:
            # Auto-open host browser
            webbrowser.open(f"http://localhost:{PORT}/PTN%20ORBRAY%20MAINTENANCE.html")
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down host server...")
            httpd.server_close()
            print("Server stopped cleanly.")

if __name__ == '__main__':
    run()
