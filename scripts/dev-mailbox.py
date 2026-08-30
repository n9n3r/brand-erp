#!/usr/bin/env python3
"""Dev mailbox: local SMTP sink + web UI, so verification/reset emails work
in a sandbox with no email provider configured.

- SMTP sink  : 127.0.0.1:2525  (point the app at it: SMTP_HOST=127.0.0.1 SMTP_PORT=2525)
- Web UI     : 0.0.0.0:8025    (open it in a browser / preview to read mail)

Mail is stored in /tmp/brandos-mailbox.jsonl. The UI rewrites
http://localhost:3000 links to the app's preview origin, so links clicked
from the UI work in your own browser (same preview host, app's port prefix).

Requires: aiosmtpd  (python3 -m venv /tmp/smtpvenv && /tmp/smtpvenv/bin/pip install aiosmtpd)
Run     : /tmp/smtpvenv/bin/python scripts/dev-mailbox.py
"""
import asyncio
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from aiosmtpd.controller import Controller

MAILBOX = os.environ.get("MAILBOX_FILE", "/tmp/brandos-mailbox.jsonl")
SMTP_PORT = int(os.environ.get("MAILBOX_SMTP_PORT", "2525"))
UI_PORT = int(os.environ.get("MAILBOX_UI_PORT", "8025"))
APP_PREFIX = re.compile(r"^(https?://[^/]*?3000|http://localhost:3000|http://127\.0\.0\.1:3000)")


def append_mail(rec):
    with open(MAILBOX, "a") as f:
        f.write(json.dumps(rec) + "\n")


def read_mail():
    if not os.path.exists(MAILBOX):
        return []
    out = []
    with open(MAILBOX) as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return list(reversed(out))


class Handler:
    async def handle_DATA(self, server, session, envelope):
        raw = envelope.content.decode("utf-8", "replace")
        subject = "undecoded"
        m = re.search(r"^Subject:\s*(.*)$", raw, re.M)
        if m:
            subject = m.group(1).strip()
        append_mail({
            "from": envelope.mail_from,
            "to": envelope.rcpt_tos,
            "subject": subject,
            "raw": raw,
            "when": time.strftime("%Y-%m-%d %H:%M:%S"),
        })
        print(f"[mailbox] accepted from={envelope.mail_from} to={envelope.rcpt_tos} subject={subject!r}", flush=True)
        return "250 OK Message accepted for delivery"


def smtp_loop():
    controller = Controller(Handler(), hostname="127.0.0.1", port=SMTP_PORT)
    controller.start()
    print(f"[mailbox] SMTP sink listening on 127.0.0.1:{SMTP_PORT}", flush=True)
    while True:
        threading.Event().wait(3600)


INDEX = """<!doctype html><html><head><meta charset="utf-8">
<title>MyBrand dev mailbox</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;background:#f6f7f9;color:#111}
  header{background:#111;color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px}
  header b{font-size:16px} header .sub{opacity:.7;font-size:13px}
  .wrap{display:flex;min-height:calc(100vh - 52px)}
  #list{width:340px;min-width:260px;border-right:1px solid #ddd;overflow-y:auto}
  .item{padding:12px 16px;border-bottom:1px solid #e5e5e5;cursor:pointer}
  .item:hover{background:#eef1f5} .item.sel{background:#e2e8f0}
  .item .to{font-size:12px;color:#555} .item .sub{font-weight:600;font-size:14px;margin-top:2px}
  .item .when{font-size:11px;color:#888;margin-top:2px}
  #mail{flex:1;padding:20px;overflow:auto}
  #mail .meta{font-size:13px;color:#555;margin-bottom:14px;line-height:1.6}
  #mail .meta b{color:#111}
  pre{background:#1e1e1e;color:#ddd;padding:14px;border-radius:8px;overflow:auto;font-size:12px;line-height:1.5}
  .hint{color:#777;font-size:13px;padding:16px;text-align:center}
  a{color:#2563eb}
</style></head><body>
<header><b>MyBrand dev mailbox</b><span class="sub">local SMTP sink — emails land here instead of a real provider</span></header>
<div class="wrap">
  <div id="list"></div>
  <div id="mail"><div class="hint">Select an email on the left.</div></div>
</div>
<script>
// Links in mail use the app's localhost origin; rewrite them to this preview's
// host with the app's port prefix so they work when clicked from here.
// (preview hosts are "{port}-{sandboxId}.e2b.app" — same sandboxId for every port)
function appUrl(u){
  try{
    const x = new URL(u, location.origin);
    if (x.hostname === 'localhost' || x.hostname === '127.0.0.1') {
      const sandboxHost = location.hostname.split('-').slice(1).join('-');
      const portPart = x.port && x.port !== '80' ? x.port + '-' : '';
      return location.protocol + '//' + portPart + sandboxHost + x.pathname + x.search;
    }
  }catch(e){}
  return u;
}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function rewriteLinks(html){
  return html.replace(/href="([^"]+)"/g, (m, u) => 'href="' + esc(appUrl(u)) + '"');
}
async function load(){
  const r = await fetch('/api/mail'); const items = await r.json();
  const list = document.getElementById('list');
  if (!items.length){ list.innerHTML = '<div class="hint">No mail yet.<br>Sign up in the app or hit "Resend link" on the dashboard banner.</div>'; return; }
  list.innerHTML = items.map((it, i) =>
    `<div class="item" data-i="${i}" onclick="show(${i})">
       <div class="to">${esc(it.to)}</div><div class="sub">${esc(it.subject)}</div>
       <div class="when">${esc(it.when)}</div>
     </div>`).join('');
  window._items = items;
}
async function show(i){
  document.querySelectorAll('.item').forEach(el => el.classList.toggle('sel', +el.dataset.i === i));
  const it = window._items[i];
  const rawHtml = it.html && it.html !== 'null';
  document.getElementById('mail').innerHTML =
    `<div class="meta"><b>From:</b> ${esc(it.from)}<br><b>To:</b> ${esc(it.to)}<br><b>Subject:</b> ${esc(it.subject)}<br><b>Received:</b> ${esc(it.when)}</div>` +
    (rawHtml ? `<div>${rewriteLinks(it.html)}</div>` : `<pre>${esc(it.raw)}</pre>`);
}
load(); setInterval(load, 5000);
</script></body></html>"""


class UI(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype):
        data = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._send(200, INDEX, "text/html; charset=utf-8")
        elif self.path == "/api/mail":
            import email as emaillib
            items = []
            for rec in read_mail():
                msg = emaillib.message_from_string(rec["raw"])
                html = None
                for part in msg.walk():
                    if part.get_content_type() == "text/html":
                        html = part.get_payload(decode=True).decode("utf-8", "replace")
                        break
                plain = msg.get_payload(decode=True)
                plain = plain.decode("utf-8", "replace") if plain else rec["raw"]
                items.append({
                    "from": rec["from"],
                    "to": ", ".join(rec["to"]),
                    "subject": msg.get("Subject", rec["subject"]) or rec["subject"],
                    "when": rec.get("when", ""),
                    "raw": plain,
                    "html": html,
                })
            self._send(200, json.dumps(items), "application/json")
        else:
            self._send(404, "not found", "text/plain")


def main():
    threading.Thread(target=smtp_loop, daemon=True).start()
    httpd = ThreadingHTTPServer(("0.0.0.0", UI_PORT), UI)
    print(f"[mailbox] Web UI on http://0.0.0.0:{UI_PORT} (store: {MAILBOX})", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
