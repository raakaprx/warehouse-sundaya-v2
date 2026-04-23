from __future__ import annotations

from pathlib import Path

from lxml import etree


def _para_text(p: etree._Element, w_ns: str) -> str:
    parts: list[str] = []
    for t in p.findall(f".//{{{w_ns}}}t"):
        if t.text:
            parts.append(t.text)
    return "".join(parts).strip()


def main() -> None:
    base = Path(__file__).resolve().parent / "manual_source_extracted" / "word"
    doc_path = base / "document.xml"
    rels_path = base / "_rels" / "document.xml.rels"

    if not doc_path.exists() or not rels_path.exists():
        raise SystemExit(
            f"Expected extracted docx at {base}. Run the unzip step first."
        )

    rels_tree = etree.parse(str(rels_path))
    rels_map: dict[str, str] = {}
    for rel in rels_tree.findall(
        ".//{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"
    ):
        rid = rel.get("Id")
        target = rel.get("Target") or ""
        if rid and target.startswith("media/"):
            rels_map[rid] = target.split("/")[-1]

    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    a_ns = "http://schemas.openxmlformats.org/drawingml/2006/main"
    r_ns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

    doc_tree = etree.parse(str(doc_path))
    paras = doc_tree.findall(f".//{{{w_ns}}}p")
    texts = [_para_text(p, w_ns) for p in paras]

    records: list[dict[str, object]] = []
    for idx, p in enumerate(paras):
        blips = p.findall(f".//{{{a_ns}}}blip")
        if not blips:
            continue

        for b in blips:
            rid = b.get(f"{{{r_ns}}}embed")
            if not rid:
                continue

            img = rels_map.get(rid)
            if not img:
                continue

            # Context: nearest previous non-empty texts
            prev: list[str] = []
            j = idx - 1
            while j >= 0 and len(prev) < 4:
                if texts[j]:
                    prev.append(texts[j])
                j -= 1

            # Context: nearest next non-empty texts
            nxt: list[str] = []
            j = idx + 1
            while j < len(texts) and len(nxt) < 3:
                if texts[j]:
                    nxt.append(texts[j])
                j += 1

            records.append(
                {
                    "para_index": idx,
                    "image": img,
                    "para_text": texts[idx],
                    "prev": list(reversed(prev)),
                    "next": nxt,
                }
            )

    out = Path(__file__).resolve().parent / "manual_images_context.txt"
    with out.open("w", encoding="utf-8") as f:
        f.write(f"Total images referenced in document.xml: {len(records)}\n\n")
        for k, rec in enumerate(records, 1):
            f.write(
                f"[{k:02d}] {rec['image']} (paragraph #{rec['para_index']})\n"
            )
            if rec["para_text"]:
                f.write(f"  Para: {rec['para_text']}\n")
            prev_lines = rec["prev"] or []
            if prev_lines:
                f.write("  Prev:\n")
                for line in prev_lines:
                    f.write(f"    - {line}\n")
            next_lines = rec["next"] or []
            if next_lines:
                f.write("  Next:\n")
                for line in next_lines:
                    f.write(f"    - {line}\n")
            f.write("\n")

    print(f"Wrote {out}")


if __name__ == "__main__":
    main()

