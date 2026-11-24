"""Tiny dependency-free PDF writer (text pages, Helvetica). Enough for datasheets."""
import zlib

def _esc(s):
    return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")

def write_pdf(path, title, lines, font_size=10, leading=14, margin=54, page_h=792, page_w=612):
    # Build one or more pages of monospace-ish left-aligned text.
    per_page = int((page_h - 2 * margin) // leading)
    pages = [lines[i:i + per_page] for i in range(0, max(1, len(lines)), per_page)] or [[]]

    objs = []  # list of raw object body bytes (without "N 0 obj")
    # 1: Catalog, 2: Pages, 3: Font, then page objs + content objs
    font_obj = 3
    page_obj_ids = []
    content_obj_ids = []
    next_id = 4
    for pg in pages:
        page_obj_ids.append(next_id); next_id += 1
        content_obj_ids.append(next_id); next_id += 1

    kids = " ".join("%d 0 R" % pid for pid in page_obj_ids)
    catalog = b"<< /Type /Catalog /Pages 2 0 R >>"
    pages_obj = ("<< /Type /Pages /Count %d /Kids [%s] >>" % (len(page_obj_ids), kids)).encode()
    font = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"

    body_objs = {1: catalog, 2: pages_obj, font_obj: font}
    for idx, pg in enumerate(pages):
        pid = page_obj_ids[idx]; cid = content_obj_ids[idx]
        stream = ["BT", "/F1 %d Tf" % font_size, "%d TL" % leading, "%d %d Td" % (margin, page_h - margin)]
        first = True
        for ln in pg:
            if first:
                stream.append("(%s) Tj" % _esc(ln)); first = False
            else:
                stream.append("T* (%s) Tj" % _esc(ln))
        stream.append("ET")
        content = ("\n".join(stream)).encode("latin-1", "replace")
        body_objs[cid] = (b"<< /Length %d >>\nstream\n" % len(content)) + content + b"\nendstream"
        body_objs[pid] = ("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %d %d] "
                          "/Resources << /Font << /F1 %d 0 R >> >> /Contents %d 0 R >>"
                          % (page_w, page_h, font_obj, cid)).encode()

    # Serialize with xref.
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = {}
    for oid in sorted(body_objs):
        offsets[oid] = len(out)
        out += ("%d 0 obj\n" % oid).encode() + body_objs[oid] + b"\nendobj\n"
    xref_pos = len(out)
    n = max(body_objs) + 1
    out += ("xref\n0 %d\n" % n).encode()
    out += b"0000000000 65535 f \n"
    for oid in range(1, n):
        if oid in offsets:
            out += ("%010d 00000 n \n" % offsets[oid]).encode()
        else:
            out += b"0000000000 65535 f \n"
    out += ("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (n, xref_pos)).encode()
    with open(path, "wb") as f:
        f.write(out)
    return len(out)
