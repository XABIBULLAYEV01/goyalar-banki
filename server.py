import os
import sys
import re
import json
import secrets
import mimetypes
import webbrowser
import threading
import time
from datetime import datetime, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from database import get_db, hash_password, verify_password, init_db
from cefrbek_ai import cefrbek
from export_service import generate_ideas_excel

PORT = int(os.getenv("PORT", 8000))

if getattr(sys, 'frozen', False):
    BUNDLE_DIR = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
    EXEC_DIR = os.path.dirname(sys.executable)
    local_public = os.path.join(EXEC_DIR, "public")
    if os.path.exists(local_public):
        PUBLIC_DIR = local_public
    else:
        PUBLIC_DIR = os.path.join(BUNDLE_DIR, "public")
    UPLOADS_DIR = os.path.join(EXEC_DIR, "uploads")
    # If initial database doesn't exist in the executable's folder, copy it from bundle
    db_dest = os.path.join(EXEC_DIR, "goyalar_banki.db")
    db_src = os.path.join(BUNDLE_DIR, "goyalar_banki.db")
    if not os.path.exists(db_dest) and os.path.exists(db_src):
        import shutil
        try:
            shutil.copy2(db_src, db_dest)
        except Exception:
            pass
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    PUBLIC_DIR = os.path.join(BASE_DIR, "public")
    UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)

def generate_tracking_code():
    code_num = secrets.randbelow(9000) + 1000
    return f"GB-2026-{code_num}"

def log_activity(admin_id, action, details, ip_address="127.0.0.1"):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO activity_logs (admin_id, action, details, ip_address)
        VALUES (?, ?, ?, ?)
        """, (admin_id, action, details, ip_address))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging activity: {e}", flush=True)

class GoyalarBankiHandler(BaseHTTPRequestHandler):
    server_version = "GoyalarBanki/2.0"

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message, status=400):
        self.send_json({"error": message, "success": False}, status=status)

    def get_current_admin(self):
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return None

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        SELECT s.token, s.expires_at, a.id, a.username, a.full_name, a.role, a.category_id, a.is_active,
               c.name as category_name, c.slug as category_slug
        FROM sessions s
        JOIN admins a ON s.admin_id = a.id
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE s.token = ?
        """, (token,))
        row = cursor.fetchone()
        conn.close()

        if not row or not row['is_active']:
            return None

        try:
            expires = datetime.fromisoformat(row['expires_at'])
            if datetime.now() > expires:
                return None
        except Exception:
            return None

        return dict(row)

    def read_json_body(self):
        content_len = int(self.headers.get('Content-Length', 0))
        if content_len == 0:
            return {}
        body = self.rfile.read(content_len).decode('utf-8')
        return json.loads(body)

    # --- GET Requests Routing ---
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # 1. Public Categories
        if path == "/api/categories":
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT c.*, COUNT(i.id) as ideas_count
            FROM categories c
            LEFT JOIN ideas i ON c.id = i.category_id
            GROUP BY c.id
            ORDER BY c.id ASC
            """)
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json({"categories": rows, "success": True})

        # 2. Public Stats
        elif path == "/api/stats":
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total FROM ideas")
            total = cursor.fetchone()['total']
            cursor.execute("SELECT COUNT(*) as review FROM ideas WHERE status = 'Ko‘rib chiqilmoqda'")
            review = cursor.fetchone()['review']
            cursor.execute("SELECT COUNT(*) as approved FROM ideas WHERE status = 'Ma‘qullandi'")
            approved = cursor.fetchone()['approved']

            cursor.execute("""
            SELECT i.id, i.tracking_code, i.title, i.description, i.likes_count, i.created_at,
                   c.name as category_name, c.icon as category_icon, c.color as category_color
            FROM ideas i
            JOIN categories c ON i.category_id = c.id
            WHERE i.is_featured = 1 OR i.status = 'Ma‘qullandi'
            ORDER BY i.likes_count DESC, i.id DESC
            LIMIT 6
            """)
            featured = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json({
                "success": True,
                "total_ideas": total,
                "review_ideas": review,
                "approved_ideas": approved,
                "featured_ideas": featured
            })

        # 3. Public Ideas Catalog
        elif path == "/api/ideas/public":
            category_slug = query.get("category", [""])[0].strip()
            search = query.get("search", [""])[0].strip()

            conn = get_db()
            cursor = conn.cursor()
            sql = """
            SELECT i.id, i.tracking_code, i.title, i.problem, i.description, i.expected_result,
                   i.likes_count, i.created_at, i.status,
                   c.name as category_name, c.slug as category_slug, c.icon as category_icon, c.color as category_color
            FROM ideas i
            JOIN categories c ON i.category_id = c.id
            WHERE i.status = 'Ma‘qullandi'
            """
            params = []
            if category_slug and category_slug != 'all':
                sql += " AND c.slug = ?"
                params.append(category_slug)
            if search:
                sql += " AND (i.title LIKE ? OR i.description LIKE ? OR i.problem LIKE ?)"
                t = f"%{search}%"
                params.extend([t, t, t])

            sql += " ORDER BY i.likes_count DESC, i.id DESC"
            cursor.execute(sql, params)
            ideas = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json({"ideas": ideas, "success": True})

        # 4. Public Idea Tracking
        elif path.startswith("/api/ideas/track/"):
            code = path.split("/api/ideas/track/", 1)[1].strip()
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT i.tracking_code, i.title, i.status, i.created_at, i.updated_at,
                   c.name as category_name, c.icon as category_icon,
                   (SELECT comment FROM idea_comments WHERE idea_id = i.id ORDER BY id DESC LIMIT 1) as latest_comment,
                   (SELECT a.full_name FROM idea_comments ic JOIN admins a ON ic.admin_id = a.id WHERE ic.idea_id = i.id ORDER BY ic.id DESC LIMIT 1) as admin_name,
                   (SELECT a.role FROM idea_comments ic JOIN admins a ON ic.admin_id = a.id WHERE ic.idea_id = i.id ORDER BY ic.id DESC LIMIT 1) as admin_role
            FROM ideas i
            JOIN categories c ON i.category_id = c.id
            WHERE i.tracking_code = ? OR i.id = ?
            """, (code, code if code.isdigit() else -1))
            row = cursor.fetchone()
            conn.close()

            if not row:
                return self.send_error_json("Bunday ID raqamli g‘oya topilmadi", status=404)
            return self.send_json({"success": True, "idea": dict(row)})

        # 5. Cefrbek Welcome
        elif path in ("/api/cefrbek/welcome", "/api/seferbek/welcome"):
            return self.send_json({"success": True, **cefrbek.get_welcome_message()})

        # 6. Admin Me
        elif path == "/api/admin/me":
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Avtorizatsiyadan o'tilmagan", status=401)
            return self.send_json({"success": True, "user": admin})

        # 7. Admin Ideas (Strict RBAC Enforced)
        elif path == "/api/admin/ideas":
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q. Avval tizimga kiring!", status=401)

            status_filter = query.get("status", [""])[0].strip()
            category_id_param = query.get("category_id", [""])[0].strip()
            search = query.get("search", [""])[0].strip()

            conn = get_db()
            cursor = conn.cursor()
            sql = """
            SELECT i.id, i.tracking_code, i.title, i.problem, i.description, i.expected_result,
                   i.attachment_url, i.attachment_name, i.status, i.likes_count, i.is_featured,
                   i.created_at, i.updated_at,
                   s.first_name, s.last_name, s.school, s.class_name,
                   c.name as category_name, c.slug as category_slug, c.color as category_color,
                   (SELECT comment FROM idea_comments WHERE idea_id = i.id ORDER BY id DESC LIMIT 1) as latest_comment
            FROM ideas i
            JOIN students s ON i.student_id = s.id
            JOIN categories c ON i.category_id = c.id
            WHERE 1=1
            """
            params = []

            # STRICT RBAC: Coordinator ONLY sees their own category
            if admin['role'] == 'coordinator':
                sql += " AND i.category_id = ?"
                params.append(admin['category_id'])
            elif admin['role'] == 'super_admin' and category_id_param:
                sql += " AND i.category_id = ?"
                params.append(category_id_param)

            if status_filter and status_filter != 'all':
                sql += " AND i.status = ?"
                params.append(status_filter)

            if search:
                sql += " AND (i.title LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.school LIKE ? OR i.tracking_code LIKE ?)"
                term = f"%{search}%"
                params.extend([term, term, term, term, term])

            sql += " ORDER BY i.id DESC"
            cursor.execute(sql, params)
            ideas = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json({"success": True, "ideas": ideas})

        # 8. Admin Idea Detail (Strict RBAC Enforced)
        elif path.startswith("/api/admin/ideas/") and not path.endswith("/status"):
            idea_id = path.split("/api/admin/ideas/")[1].strip()
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q", status=401)

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT i.*, s.first_name, s.last_name, s.school, s.class_name,
                   c.name as category_name, c.slug as category_slug, c.color as category_color
            FROM ideas i
            JOIN students s ON i.student_id = s.id
            JOIN categories c ON i.category_id = c.id
            WHERE i.id = ?
            """, (idea_id,))
            idea = cursor.fetchone()

            if not idea:
                conn.close()
                return self.send_error_json("G‘oya topilmadi", status=404)

            # STRICT RBAC CHECK:
            if admin['role'] == 'coordinator' and idea['category_id'] != admin['category_id']:
                conn.close()
                return self.send_error_json("Ruxsat berilmagan: Siz faqat o‘z yo‘nalishingizdagi g‘oyalarni ko‘rishingiz mumkin!", status=403)

            cursor.execute("""
            SELECT ic.*, a.full_name as admin_name, a.role as admin_role
            FROM idea_comments ic
            JOIN admins a ON ic.admin_id = a.id
            WHERE ic.idea_id = ?
            ORDER BY ic.id ASC
            """, (idea_id,))
            comments = [dict(c) for c in cursor.fetchall()]
            conn.close()
            return self.send_json({"success": True, "idea": dict(idea), "comments": comments})

        # 9. Admin Excel Export
        elif path == "/api/admin/export/excel":
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q", status=401)

            category_id_param = query.get("category_id", [""])[0].strip()
            status_filter = query.get("status", [""])[0].strip()

            conn = get_db()
            cursor = conn.cursor()
            sql = """
            SELECT i.id, i.tracking_code, i.title, i.problem, i.description, i.expected_result,
                   i.status, i.created_at,
                   s.first_name, s.last_name, s.school, s.class_name,
                   c.name as category_name,
                   (SELECT comment FROM idea_comments WHERE idea_id = i.id ORDER BY id DESC LIMIT 1) as latest_comment
            FROM ideas i
            JOIN students s ON i.student_id = s.id
            JOIN categories c ON i.category_id = c.id
            WHERE 1=1
            """
            params = []
            if admin['role'] == 'coordinator':
                sql += " AND i.category_id = ?"
                params.append(admin['category_id'])
            elif admin['role'] == 'super_admin' and category_id_param:
                sql += " AND i.category_id = ?"
                params.append(category_id_param)

            if status_filter and status_filter != 'all':
                sql += " AND i.status = ?"
                params.append(status_filter)

            sql += " ORDER BY i.id DESC"
            cursor.execute(sql, params)
            ideas = [dict(r) for r in cursor.fetchall()]
            conn.close()

            sheet_title = admin.get('category_name', 'Goyalar')
            excel_stream = generate_ideas_excel(ideas, sheet_title)
            excel_bytes = excel_stream.getvalue()
            filename = f"Goyalar_Banki_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"

            self.send_response(200)
            self._set_cors_headers()
            self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(excel_bytes)))
            self.end_headers()
            self.wfile.write(excel_bytes)
            log_activity(admin['id'], "EXPORT_EXCEL", f"Excel hisoboti yuklab olindi ({len(ideas)} ta yozuv)", self.client_address[0])
            return

        # 10. Super Admin Coordinators
        elif path == "/api/super/coordinators":
            admin = self.get_current_admin()
            if not admin or admin['role'] != 'super_admin':
                return self.send_error_json("Faqat Bosh Administrator uchun ruxsat berilgan!", status=403)

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT a.id, a.username, a.full_name, a.role, a.is_active, a.created_at, a.last_login,
                   c.id as category_id, c.name as category_name, c.slug as category_slug
            FROM admins a
            LEFT JOIN categories c ON a.category_id = c.id
            ORDER BY a.role DESC, a.id ASC
            """)
            coordinators = [dict(c) for c in cursor.fetchall()]
            conn.close()
            return self.send_json({"success": True, "coordinators": coordinators})

        # 11. Super Admin Stats Overview
        elif path == "/api/super/stats":
            admin = self.get_current_admin()
            if not admin or admin['role'] != 'super_admin':
                return self.send_error_json("Ruxsat yo'q!", status=403)

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT c.id, c.name, c.slug, c.color, c.icon,
                   COUNT(i.id) as total_ideas,
                   SUM(CASE WHEN i.status = 'Ma‘qullandi' THEN 1 ELSE 0 END) as approved_ideas,
                   SUM(CASE WHEN i.status = 'Ko‘rib chiqilmoqda' THEN 1 ELSE 0 END) as pending_ideas,
                   SUM(CASE WHEN i.status = 'Rad etildi' THEN 1 ELSE 0 END) as rejected_ideas
            FROM categories c
            LEFT JOIN ideas i ON c.id = i.category_id
            GROUP BY c.id
            ORDER BY c.id ASC
            """)
            categories_stats = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return self.send_json({"success": True, "categories_stats": categories_stats})

        # 12. Super Admin Logs
        elif path == "/api/super/logs":
            admin = self.get_current_admin()
            if not admin or admin['role'] != 'super_admin':
                return self.send_error_json("Ruxsat yo'q!", status=403)

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT al.*, a.username, a.full_name
            FROM activity_logs al
            LEFT JOIN admins a ON al.admin_id = a.id
            ORDER BY al.id DESC
            LIMIT 100
            """)
            logs = [dict(l) for l in cursor.fetchall()]
            conn.close()
            return self.send_json({"success": True, "logs": logs})

        # 13. PWA Service Worker & Manifest
        elif path == "/sw.js":
            return self.serve_file(os.path.join(PUBLIC_DIR, "sw.js"), mime="application/javascript")

        elif path in ("/manifest.json", "/static/manifest.json"):
            return self.serve_file(os.path.join(PUBLIC_DIR, "manifest.json"), mime="application/manifest+json")

        # 14. Static files & uploads serving
        elif path.startswith("/static/"):
            rel_path = path[len("/static/"):].lstrip("/")
            file_path = os.path.join(PUBLIC_DIR, rel_path)
            return self.serve_file(file_path)

        elif path.startswith("/uploads/"):
            filename = os.path.basename(path)
            file_path = os.path.join(UPLOADS_DIR, filename)
            return self.serve_file(file_path)

        # Default fallback to index.html (SPA Single Page Application)
        else:
            index_path = os.path.join(PUBLIC_DIR, "index.html")
            return self.serve_file(index_path, mime="text/html")

    def serve_file(self, file_path, mime=None):
        if not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"File not found")
            return

        if not mime:
            mime, _ = mimetypes.guess_type(file_path)
            if not mime:
                mime = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self._set_cors_headers()
            if mime and ("javascript" in mime or "html" in mime or "json" in mime or "css" in mime):
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.send_header("Expires", "0")
            self.send_header("Content-Type", f"{mime}; charset=utf-8" if "text" in mime or "javascript" in mime else mime)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

    # --- POST & PATCH Requests Routing ---
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. Idea Submission
        if path == "/api/ideas/submit":
            try:
                data = self.read_json_body()
            except Exception:
                return self.send_error_json("Yaroqsiz ma'lumot")

            school = data.get("school", "").strip()
            class_name = data.get("class_name", "").strip()
            first_name = data.get("first_name", "").strip()
            last_name = data.get("last_name", "").strip()
            title = data.get("title", "").strip()
            category_id = data.get("category_id")
            problem = data.get("problem", "").strip()
            description = data.get("description", "").strip()
            expected_result = data.get("expected_result", "").strip()
            attachment_url = data.get("attachment_url", "").strip()
            attachment_name = data.get("attachment_name", "").strip()

            if not all([school, class_name, first_name, last_name, title, category_id, problem, description, expected_result]):
                return self.send_error_json("Iltimos, barcha majboriy maydonlarni to'liq to'ldiring!")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM categories WHERE id = ?", (category_id,))
            if not cursor.fetchone():
                conn.close()
                return self.send_error_json("Tanlangan yo‘nalish mavjud emas!")

            cursor.execute("""
            INSERT INTO students (first_name, last_name, school, class_name)
            VALUES (?, ?, ?, ?)
            """, (first_name, last_name, school, class_name))
            student_id = cursor.lastrowid

            tracking_code = generate_tracking_code()
            while True:
                cursor.execute("SELECT id FROM ideas WHERE tracking_code = ?", (tracking_code,))
                if not cursor.fetchone():
                    break
                tracking_code = generate_tracking_code()

            cursor.execute("""
            INSERT INTO ideas (
                tracking_code, student_id, category_id, title, problem, description,
                expected_result, attachment_url, attachment_name, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ko‘rib chiqilmoqda')
            """, (tracking_code, student_id, category_id, title, problem, description,
                  expected_result, attachment_url, attachment_name))
            idea_id = cursor.lastrowid
            conn.commit()
            conn.close()

            log_activity(None, "IDEA_SUBMITTED", f"Yangi g'oya: {tracking_code} - {title}", self.client_address[0])

            return self.send_json({
                "success": True,
                "tracking_code": tracking_code,
                "idea_id": idea_id,
                "message": "G‘OYANGIZ MUVAFFAQIYATLI YUBORILDI!\n\nSizning tashabbusingiz O‘quvchilar kengashi tomonidan ko‘rib chiqiladi.\n\nKelajakka qo‘shgan hissangiz uchun rahmat!"
            })

        # 2. Idea Like
        elif path.startswith("/api/ideas/") and path.endswith("/like"):
            idea_id = path.split("/api/ideas/")[1].split("/")[0]
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("UPDATE ideas SET likes_count = likes_count + 1 WHERE id = ?", (idea_id,))
            cursor.execute("SELECT likes_count FROM ideas WHERE id = ?", (idea_id,))
            row = cursor.fetchone()
            conn.commit()
            conn.close()

            if not row:
                return self.send_error_json("G‘oya topilmadi", status=404)
            return self.send_json({"success": True, "likes_count": row['likes_count']})

        # 3. Cefrbek AI Chat
        elif path in ("/api/cefrbek/chat", "/api/seferbek/chat"):
            data = self.read_json_body()
            message = data.get("message", "").strip()
            history = data.get("history", [])
            if not message:
                return self.send_error_json("Xabar bo'sh bo'lishi mumkin emas")
            res = cefrbek.analyze_and_respond(message, history)
            return self.send_json(res)

        # 4. Multipart File Upload
        elif path == "/api/upload":
            content_type = self.headers.get('Content-Type', '')
            if not content_type.startswith('multipart/form-data'):
                return self.send_error_json("Yaroqsiz fayl formati")

            boundary = content_type.split("boundary=")[1].encode()
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            parts = body.split(b"--" + boundary)
            saved_file = None
            orig_name = "fayl"

            for part in parts:
                if b'filename="' in part:
                    header_part, file_data = part.split(b"\r\n\r\n", 1)
                    file_data = file_data.rsplit(b"\r\n", 1)[0]
                    headers_str = header_part.decode('utf-8', errors='ignore')
                    
                    fn_match = re.search(r'filename="([^"]+)"', headers_str)
                    if fn_match:
                        orig_name = fn_match.group(1)
                        ext = os.path.splitext(orig_name)[1].lower()
                        allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".docx", ".doc", ".pptx", ".txt"]
                        if ext not in allowed:
                            return self.send_error_json("Faqat rasm yoki hujjat yuklash mumkin (JPG, PNG, PDF, DOCX, PPTX)")
                        safe_name = f"{secrets.token_hex(8)}{ext}"
                        with open(os.path.join(UPLOADS_DIR, safe_name), "wb") as f:
                            f.write(file_data)
                        saved_file = safe_name
                        break

            if saved_file:
                return self.send_json({
                    "success": True,
                    "url": f"/uploads/{saved_file}",
                    "filename": orig_name
                })
            return self.send_error_json("Fayl topilmadi")

        # 5. Admin Login
        elif path == "/api/admin/login":
            data = self.read_json_body()
            username = data.get("username", "").strip()
            password = data.get("password", "").strip()

            if not username or not password:
                return self.send_error_json("Foydalanuvchi nomi va parol kiritilishi shart!")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            SELECT a.*, c.name as category_name, c.slug as category_slug
            FROM admins a
            LEFT JOIN categories c ON a.category_id = c.id
            WHERE a.username = ?
            """, (username,))
            admin = cursor.fetchone()

            if not admin or not verify_password(password, admin['password_hash'], admin['salt']):
                conn.close()
                return self.send_error_json("Login yoki parol noto'g'ri!", status=401)

            if not admin['is_active']:
                conn.close()
                return self.send_error_json("Ushbu hisob faolsizlantirilgan. Administratorga murojaat qiling!", status=403)

            token = secrets.token_hex(32)
            expires_at = (datetime.now() + timedelta(days=7)).isoformat()
            cursor.execute("""
            INSERT INTO sessions (token, admin_id, expires_at)
            VALUES (?, ?, ?)
            """, (token, admin['id'], expires_at))

            cursor.execute("UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (admin['id'],))
            conn.commit()
            conn.close()

            log_activity(admin['id'], "ADMIN_LOGIN", f"{admin['username']} tizimga kirdi", self.client_address[0])

            user_info = {
                "id": admin['id'],
                "username": admin['username'],
                "full_name": admin['full_name'],
                "role": admin['role'],
                "category_id": admin['category_id'],
                "category_name": admin['category_name'],
                "category_slug": admin['category_slug']
            }
            return self.send_json({"success": True, "token": token, "user": user_info})

        # 6. Admin Logout
        elif path == "/api/admin/logout":
            admin = self.get_current_admin()
            if admin:
                token = self.headers.get("Authorization", "").split(" ", 1)[1].strip()
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
                conn.commit()
                conn.close()
                log_activity(admin['id'], "ADMIN_LOGOUT", f"{admin['username']} chiqdi", self.client_address[0])
            return self.send_json({"success": True})

        # 7. Add Comment to Idea (Strict RBAC Enforced)
        elif path.startswith("/api/admin/ideas/") and path.endswith("/comments"):
            idea_id = path.split("/api/admin/ideas/")[1].split("/")[0]
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q", status=401)

            data = self.read_json_body()
            comment = data.get("comment", "").strip()
            if not comment:
                return self.send_error_json("Izoh matni bo'sh bo'lishi mumkin emas")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT category_id, title FROM ideas WHERE id = ?", (idea_id,))
            idea = cursor.fetchone()

            if not idea:
                conn.close()
                return self.send_error_json("G‘oya topilmadi", status=404)

            # STRICT RBAC CHECK:
            if admin['role'] == 'coordinator' and idea['category_id'] != admin['category_id']:
                conn.close()
                return self.send_error_json("Ruxsat berilmagan: Siz faqat o‘z yo‘nalishingizdagi g‘oyalarga izoh yoza olasiz!", status=403)

            cursor.execute("""
            INSERT INTO idea_comments (idea_id, admin_id, comment)
            VALUES (?, ?, ?)
            """, (idea_id, admin['id'], comment))
            conn.commit()
            conn.close()

            log_activity(admin['id'], "ADD_COMMENT", f"G'oyaga (#{idea_id}) izoh qo'shildi", self.client_address[0])
            return self.send_json({"success": True})

        # 8. Super Admin: Create Coordinator / Admin
        elif path == "/api/super/coordinators":
            admin = self.get_current_admin()
            if not admin or admin['role'] != 'super_admin':
                return self.send_error_json("Ruxsat yo'q!", status=403)

            data = self.read_json_body()
            username = data.get("username", "").strip()
            password = data.get("password", "").strip()
            full_name = data.get("full_name", "").strip()
            category_id = data.get("category_id")
            role = data.get("role", "coordinator").strip()
            if role not in ('super_admin', 'coordinator'):
                role = 'coordinator'

            if not username or not password or not full_name:
                return self.send_error_json("Login, parol va F.I.SH kiritilishi shart!")

            if role == 'coordinator' and not category_id:
                return self.send_error_json("Koordinator uchun yo‘nalish tanlanishi shart!")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM admins WHERE username = ?", (username,))
            if cursor.fetchone():
                conn.close()
                return self.send_error_json("Bunday foydalanuvchi nomi / email allaqachon band!")

            pwd_hash, salt = hash_password(password)
            cursor.execute("""
            INSERT INTO admins (username, password_hash, salt, full_name, role, category_id, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            """, (username, pwd_hash, salt, full_name, role, category_id if role == 'coordinator' else None))
            new_id = cursor.lastrowid
            conn.commit()
            conn.close()

            log_activity(admin['id'], "CREATE_ADMIN", f"Yangi {role} yaratildi: {username} ({full_name})", self.client_address[0])
            return self.send_json({"success": True, "id": new_id})

        # 9. Delete Coordinator via POST fallback
        elif path.startswith("/api/super/coordinators/") and path.endswith("/delete"):
            coord_id = path.split("/api/super/coordinators/")[1].split("/")[0].strip()
            return self.handle_delete_coordinator(coord_id)

        # 10. Delete Idea via POST fallback
        elif path.startswith("/api/admin/ideas/") and path.endswith("/delete"):
            idea_id = path.split("/api/admin/ideas/")[1].split("/")[0].strip()
            return self.handle_delete_idea(idea_id)

        else:
            return self.send_error_json("Endpoint topilmadi", status=404)

    def do_PATCH(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # 1. Update Own Profile (Change Login / Email / Full Name)
        if path == "/api/admin/profile":
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q", status=401)

            data = self.read_json_body()
            new_username = data.get("username", "").strip()
            new_name = data.get("full_name", "").strip()

            if not new_username:
                return self.send_error_json("Foydalanuvchi nomi / email kiritilishi shart!")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM admins WHERE username = ? AND id != ?", (new_username, admin['id']))
            if cursor.fetchone():
                conn.close()
                return self.send_error_json("Ushbu foydalanuvchi nomi / email allaqachon band!")

            updated_name = new_name if new_name else admin['full_name']
            cursor.execute("UPDATE admins SET username = ?, full_name = ? WHERE id = ?", (new_username, updated_name, admin['id']))
            conn.commit()
            conn.close()

            log_activity(admin['id'], "UPDATE_PROFILE", f"Admin o'z loginini yangiladi: {new_username}", self.client_address[0])
            return self.send_json({
                "success": True,
                "username": new_username,
                "full_name": updated_name,
                "message": "Login muvaffaqiyatli almashtirildi!"
            })

        # 2. Change Own Password
        elif path == "/api/admin/change-password":
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q", status=401)

            data = self.read_json_body()
            current_pwd = data.get("current_password", "").strip()
            new_pwd = data.get("new_password", "").strip()

            if not current_pwd or not new_pwd:
                return self.send_error_json("Joriy parol va yangi parol kiritilishi shart!")

            if len(new_pwd) < 6:
                return self.send_error_json("Yangi parol kamida 6 belgidan iborat bo'lishi kerak!")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT password_hash, salt FROM admins WHERE id = ?", (admin['id'],))
            row = cursor.fetchone()

            if not row or not verify_password(current_pwd, row['password_hash'], row['salt']):
                conn.close()
                return self.send_error_json("Joriy parol noto'g'ri kiritildi!", status=400)

            new_hash, salt = hash_password(new_pwd)
            cursor.execute("UPDATE admins SET password_hash = ?, salt = ? WHERE id = ?", (new_hash, salt, admin['id']))
            conn.commit()
            conn.close()

            log_activity(admin['id'], "CHANGE_PASSWORD", "Admin o'z parolini muvaffaqiyatli almashtirdi", self.client_address[0])
            return self.send_json({"success": True, "message": "Parol muvaffaqiyatli yangilandi!"})

        # 3. Update Idea Status (Strict RBAC Enforced)
        elif path.startswith("/api/admin/ideas/") and path.endswith("/status"):
            idea_id = path.split("/api/admin/ideas/")[1].split("/")[0]
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q", status=401)

            data = self.read_json_body()
            new_status = data.get("status", "").strip()
            valid_statuses = ["Ko‘rib chiqilmoqda", "Ma‘qullandi", "Rad etildi"]
            if new_status not in valid_statuses:
                return self.send_error_json("Noto'g'ri holat qiymati")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT category_id, title, status FROM ideas WHERE id = ?", (idea_id,))
            idea = cursor.fetchone()

            if not idea:
                conn.close()
                return self.send_error_json("G‘oya topilmadi", status=404)

            # STRICT RBAC CHECK:
            if admin['role'] == 'coordinator' and idea['category_id'] != admin['category_id']:
                conn.close()
                return self.send_error_json("Ruxsat berilmagan: Siz faqat o‘z yo‘nalishingizdagi g‘oyalarni o‘zgartirishingiz mumkin!", status=403)

            cursor.execute("""
            UPDATE ideas SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            """, (new_status, idea_id))

            comment_text = data.get("comment", "").strip()
            if comment_text:
                cursor.execute("""
                INSERT INTO idea_comments (idea_id, admin_id, comment)
                VALUES (?, ?, ?)
                """, (idea_id, admin['id'], comment_text))

            conn.commit()
            conn.close()

            log_activity(admin['id'], "STATUS_CHANGE", f"G'oya #{idea_id} '{idea['title']}': {idea['status']} -> {new_status}", self.client_address[0])
            return self.send_json({"success": True, "status": new_status})

        # 4. Super Admin Update Coordinator / Admin (Block, Change Password, Change Login, Change Name)
        elif path.startswith("/api/super/coordinators/"):
            coord_id = path.split("/api/super/coordinators/")[1].strip()
            admin = self.get_current_admin()
            if not admin or admin['role'] != 'super_admin':
                return self.send_error_json("Ruxsat yo'q!", status=403)

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id, username, full_name, role FROM admins WHERE id = ?", (coord_id,))
            target = cursor.fetchone()

            if not target:
                conn.close()
                return self.send_error_json("Bunday admin yoki koordinator topilmadi!", status=404)

            # XAVFSIZLIK QOIDASI: Boshqa adminlar Katta Asosiy Admin huquqlarini o'zgartira olmaydi!
            is_target_primary = (target['username'] == 'azizbekxabibullayev419@gmail.com')
            is_caller_primary = (admin['username'] == 'azizbekxabibullayev419@gmail.com')

            if is_target_primary and not is_caller_primary:
                conn.close()
                return self.send_error_json("XAVFSIZLIK CHEKLOVI: Boshqa adminlar Katta Asosiy Admin (Azizbek Xabibullayev) hisobi va huquqlarini o‘zgartira olmaydi!", status=403)

            data = self.read_json_body()

            if "is_active" in data:
                is_active = 1 if data["is_active"] else 0
                cursor.execute("UPDATE admins SET is_active = ? WHERE id = ?", (is_active, coord_id))
                if not is_active:
                    # Immediately invalidate all sessions for blocked user
                    cursor.execute("DELETE FROM sessions WHERE admin_id = ?", (coord_id,))

            if "username" in data and data["username"].strip():
                new_u = data["username"].strip()
                cursor.execute("SELECT id FROM admins WHERE username = ? AND id != ?", (new_u, coord_id))
                if cursor.fetchone():
                    conn.close()
                    return self.send_error_json("Ushbu login / email allaqachon band!")
                cursor.execute("UPDATE admins SET username = ? WHERE id = ?", (new_u, coord_id))

            if "full_name" in data and data["full_name"].strip():
                cursor.execute("UPDATE admins SET full_name = ? WHERE id = ?", (data["full_name"].strip(), coord_id))

            if "password" in data and data["password"].strip():
                new_pwd = data["password"].strip()
                pwd_hash, salt = hash_password(new_pwd)
                cursor.execute("UPDATE admins SET password_hash = ?, salt = ? WHERE id = ?", (pwd_hash, salt, coord_id))
                cursor.execute("DELETE FROM sessions WHERE admin_id = ?", (coord_id,))

            conn.commit()
            conn.close()

            log_activity(admin['id'], "UPDATE_COORDINATOR", f"Foydalanuvchi ID {coord_id} ma'lumotlari yangilandi", self.client_address[0])
            return self.send_json({"success": True, "message": "Ma'lumotlar muvaffaqiyatli yangilandi!"})

        # 5. Admin: Update Student Info / Name ("Ismlarni o'zgartirish")
        elif path.startswith("/api/admin/students/"):
            student_id = path.split("/api/admin/students/")[1].strip()
            admin = self.get_current_admin()
            if not admin:
                return self.send_error_json("Ruxsat yo'q", status=401)

            data = self.read_json_body()
            first_name = data.get("first_name", "").strip()
            last_name = data.get("last_name", "").strip()
            school = data.get("school", "").strip()
            class_name = data.get("class_name", "").strip()

            if not first_name or not last_name:
                return self.send_error_json("Ism va familiya kiritilishi shart!")

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE students 
            SET first_name = ?, last_name = ?, 
                school = CASE WHEN ? != '' THEN ? ELSE school END,
                class_name = CASE WHEN ? != '' THEN ? ELSE class_name END
            WHERE id = ?
            """, (first_name, last_name, school, school, class_name, class_name, student_id))
            conn.commit()
            conn.close()

            log_activity(admin['id'], "UPDATE_STUDENT_INFO", f"O'quvchi ID {student_id} ismi yangilandi: {first_name} {last_name}", self.client_address[0])
            return self.send_json({"success": True, "message": "O‘quvchi ismi muvaffaqiyatli yangilandi!"})

        else:
            return self.send_error_json("Endpoint topilmadi", status=404)

    def handle_delete_coordinator(self, coord_id):
        admin = self.get_current_admin()
        if not admin or admin['role'] != 'super_admin':
            return self.send_error_json("Ruxsat berilmagan! Faqat Super Admin adminlarni olib tashlay oladi.", status=403)

        # Prevent deleting own account
        if str(admin['id']) == str(coord_id):
            return self.send_error_json("O‘z hisobingizni tizimdan olib tashlab bo‘lmaydi!", status=400)

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, full_name, role FROM admins WHERE id = ?", (coord_id,))
        target = cursor.fetchone()

        if not target:
            conn.close()
            return self.send_error_json("Bunday admin yoki koordinator topilmadi!", status=404)

        # XAVFSIZLIK CHEKLOVI: Katta Asosiy Adminni olib tashlash taqiqlanadi!
        if target['username'] == 'azizbekxabibullayev419@gmail.com':
            conn.close()
            return self.send_error_json("XAVFSIZLIK CHEKLOVI: Katta Asosiy Adminni (Azizbek Xabibullayev) tizimdan olib tashlash qat'iyan taqiqlanadi!", status=403)

        # Invalidate all active sessions for this admin
        cursor.execute("DELETE FROM sessions WHERE admin_id = ?", (coord_id,))
        # Reassign comments and audit logs to avoid foreign key errors
        cursor.execute("UPDATE idea_comments SET admin_id = ? WHERE admin_id = ?", (admin['id'], coord_id))
        cursor.execute("UPDATE activity_logs SET admin_id = ? WHERE admin_id = ?", (admin['id'], coord_id))
        # Delete admin record
        cursor.execute("DELETE FROM admins WHERE id = ?", (coord_id,))
        conn.commit()
        conn.close()

        log_activity(admin['id'], "DELETE_ADMIN", f"Admin tizimdan butunlay olib tashlandi: @{target['username']} ({target['full_name']})", self.client_address[0])
        return self.send_json({
            "success": True,
            "message": f"@{target['username']} ({target['full_name']}) tizimdan muvaffaqiyatli olib tashlandi!"
        })

    def handle_delete_idea(self, idea_id):
        admin = self.get_current_admin()
        if not admin:
            return self.send_error_json("Ruxsat yo'q!", status=401)

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, category_id, tracking_code FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()

        if not idea:
            conn.close()
            return self.send_error_json("G‘oya topilmadi!", status=404)

        # Strict RBAC: Coordinator can only delete ideas in their own category
        if admin['role'] == 'coordinator' and idea['category_id'] != admin['category_id']:
            conn.close()
            return self.send_error_json("Ruxsat berilmagan: Siz faqat o‘z yo‘nalishingizdagi g‘oyalarni o‘chira olasiz!", status=403)

        # Delete comments
        cursor.execute("DELETE FROM idea_comments WHERE idea_id = ?", (idea_id,))
        # Delete idea
        cursor.execute("DELETE FROM ideas WHERE id = ?", (idea_id,))
        conn.commit()
        conn.close()

        log_activity(admin['id'], "DELETE_IDEA", f"G'oya o'chirildi: {idea['tracking_code']} - {idea['title']}", self.client_address[0])
        return self.send_json({
            "success": True,
            "message": f"G‘oya ({idea['tracking_code']}) muvaffaqiyatli o‘chirildi!"
        })

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/super/coordinators/"):
            coord_id = path.split("/api/super/coordinators/")[1].strip()
            return self.handle_delete_coordinator(coord_id)
        elif path.startswith("/api/admin/ideas/"):
            idea_id = path.split("/api/admin/ideas/")[1].strip()
            return self.handle_delete_idea(idea_id)
        else:
            return self.send_error_json("Endpoint topilmadi", status=404)

def run_server():
    init_db()
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadingHTTPServer(server_address, GoyalarBankiHandler)
    print(f"===========================================================", flush=True)
    print(f"🚀 G‘OYALAR BANKI PLATFORMASI ISHGA TUSHDI!", flush=True)
    print(f"🌐 Veb-interfeys: http://localhost:{PORT}", flush=True)
    print(f"✦ Loyiha Muallifi: Azizbek Xabibullayev", flush=True)
    print(f"👑 Asosiy Admin / IT & AI: azizbekxabibullayev419@gmail.com / Azizbekkk12@", flush=True)
    print(f"👥 8 Yo‘nalish va Koordinator hisoblari tizimda faol", flush=True)
    print(f"===========================================================", flush=True)

    def open_browser():
        time.sleep(1.2)
        try:
            webbrowser.open(f"http://localhost:{PORT}")
        except Exception:
            pass

    threading.Thread(target=open_browser, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer to'xtatildi.", flush=True)
        httpd.server_close()

if __name__ == "__main__":
    run_server()
