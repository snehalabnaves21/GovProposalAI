"""
Export service for generating professional DOCX and PDF files from proposal content.
Produces polished, government-ready documents with tables, matrices, and proper formatting.
"""

import base64
import io
import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from html import unescape as html_unescape

from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph as RLParagraph,
    Spacer,
    Table as RLTable,
    TableStyle,
    PageBreak,
    KeepTogether,
)

logger = logging.getLogger(__name__)

# Color palette
NAVY = RGBColor(0x1B, 0x2A, 0x4A)
NAVY_HEX = "1B2A4A"
ACCENT = RGBColor(0x10, 0xB9, 0x81)
ACCENT_HEX = "10B981"
DARK_TEXT = RGBColor(0x37, 0x41, 0x51)
GRAY_TEXT = RGBColor(0x6B, 0x72, 0x80)
LIGHT_BG = "F0FDF4"
HEADER_BG = "1B2A4A"
SUB_HEADER_BG = "059669"
LIGHT_GRAY_BG = "F3F4F6"
BORDER_COLOR = RGBColor(0xD1, 0xD5, 0xDB)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)


def _set_cell_shading(cell, color_hex: str):
    """Set cell background color."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def _set_cell_borders(cell, color="D1D5DB", size="4"):
    """Set cell borders."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="{size}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="single" w:sz="{size}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="{size}" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="single" w:sz="{size}" w:space="0" w:color="{color}"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)


def _add_formatted_paragraph(doc, text: str, size=11, color=DARK_TEXT, bold=False,
                              italic=False, alignment=None, space_before=0, space_after=6,
                              font_name="Calibri"):
    """Add a paragraph with specific formatting."""
    para = doc.add_paragraph()
    if alignment:
        para.alignment = alignment
    para.paragraph_format.space_before = Pt(space_before)
    para.paragraph_format.space_after = Pt(space_after)

    # Handle markdown bold within text
    parts = re.split(r'(\*\*.*?\*\*)', text)
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            run = para.add_run(part[2:-2])
            run.bold = True
        else:
            run = para.add_run(part)
            run.bold = bold

    for run in para.runs:
        run.font.size = Pt(size)
        run.font.color.rgb = color
        run.font.name = font_name
        if italic:
            run.italic = True
    return para


def _strip_leading_title(content: str, section_title: str) -> str:
    """Remove duplicate section title from the start of content.
    AI often generates: <h2>EXECUTIVE SUMMARY</h2><p>Executive Summary text...</p>
    We need to strip both the heading AND the inline title text."""
    if not content or not section_title:
        return content
    title_lower = section_title.lower().strip()

    # Step 1: Remove heading tags that contain the section title
    # Matches: <h1>Executive Summary</h1>, <h2>EXECUTIVE SUMMARY</h2>, etc.
    heading_pattern = rf'\s*<h[1-6][^>]*>\s*{re.escape(title_lower)}\s*</h[1-6]>\s*'
    content = re.sub(heading_pattern, '', content, count=1, flags=re.IGNORECASE).strip()

    # Step 2: Remove the title text if it appears at the very start of remaining content
    # E.g., <p>Executive Summary TalentTalk...</p> → <p>TalentTalk...</p>
    # Or: <p><strong>Company Profile</strong> TalentTalk...</p> → <p>TalentTalk...</p>
    # First extract text-only version to check
    text_only = re.sub(r'<[^>]+>', '', content[:200]).strip()
    if text_only.lower().startswith(title_lower):
        # Remove title from inside the first tag or at the start
        # Pattern: optional tags, then the title text
        inner_pattern = rf'(<p[^>]*>(?:\s*<(?:strong|b|em|i)[^>]*>)?\s*){re.escape(title_lower)}(\s*(?:</(?:strong|b|em|i)>)?\s*)'
        cleaned = re.sub(inner_pattern, r'\1', content, count=1, flags=re.IGNORECASE)
        if cleaned != content:
            # Clean up empty tags like <p><strong></strong> </p>
            cleaned = re.sub(r'<p[^>]*>\s*(?:<(?:strong|b|em|i)[^>]*>\s*</(?:strong|b|em|i)>\s*)*</p>\s*', '', cleaned)
            content = cleaned.strip()

    return content


def _add_styled_table(doc, headers: List[str], rows: List[List[str]],
                       header_bg=HEADER_BG, alt_row_bg=LIGHT_GRAY_BG):
    """Add a professionally styled table."""
    if not headers or not rows:
        return None

    num_cols = len(headers)
    table = doc.add_table(rows=1 + len(rows), cols=num_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Header row
    for i, header_text in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(header_text)
        run.bold = True
        run.font.size = Pt(10)
        run.font.color.rgb = WHITE
        run.font.name = "Calibri"
        _set_cell_shading(cell, header_bg)
        _set_cell_borders(cell, NAVY_HEX)

    # Data rows
    for row_idx, row_data in enumerate(rows):
        for col_idx in range(num_cols):
            cell = table.rows[row_idx + 1].cells[col_idx]
            cell_text = row_data[col_idx] if col_idx < len(row_data) else ""
            cell.text = ""
            p = cell.paragraphs[0]
            run = p.add_run(cell_text)
            run.font.size = Pt(10)
            run.font.color.rgb = DARK_TEXT
            run.font.name = "Calibri"
            _set_cell_borders(cell)
            if row_idx % 2 == 1:
                _set_cell_shading(cell, alt_row_bg)

    return table


def _add_html_table_to_docx(doc, headers: List[str], rows: List[Dict],
                             header_bg=HEADER_BG, alt_row_bg=LIGHT_GRAY_BG, summary_bg=SUB_HEADER_BG):
    """Render an HTML table (with summary row support) as a professional DOCX table."""
    if not headers and not rows:
        return None

    num_cols = len(headers) if headers else (len(rows[0]['cells']) if rows else 0)
    if num_cols == 0:
        return None

    total_rows = (1 if headers else 0) + len(rows)
    table = doc.add_table(rows=total_rows, cols=num_cols)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    row_offset = 0
    if headers:
        for i, header_text in enumerate(headers):
            cell = table.rows[0].cells[i]
            cell.text = ""
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(header_text)
            run.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = WHITE
            run.font.name = "Calibri"
            _set_cell_shading(cell, header_bg)
            _set_cell_borders(cell, NAVY_HEX)
        row_offset = 1

    for row_idx, row_data in enumerate(rows):
        cells_data = row_data.get('cells', [])
        is_summary = row_data.get('is_summary', False)
        for col_idx in range(num_cols):
            cell = table.rows[row_offset + row_idx].cells[col_idx]
            cell_text = cells_data[col_idx] if col_idx < len(cells_data) else ""
            cell.text = ""
            p = cell.paragraphs[0]
            # Right-align currency/number columns (last columns typically)
            if cell_text.startswith('$') or (col_idx >= num_cols - 2 and re.match(r'^[\d,.$]+$', cell_text.strip())):
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            run = p.add_run(cell_text)
            run.font.size = Pt(10)
            run.font.name = "Calibri"
            _set_cell_borders(cell)

            if is_summary:
                run.bold = True
                run.font.color.rgb = NAVY
                _set_cell_shading(cell, "E8F5E9")
            else:
                run.font.color.rgb = DARK_TEXT
                if row_idx % 2 == 1:
                    _set_cell_shading(cell, alt_row_bg)

    return table


def _detect_table_content(lines: List[str]) -> Optional[Tuple[List[str], List[List[str]]]]:
    """Detect if a block of lines contains table-like data (pipe-separated or consistent delimiters)."""
    # Check for pipe-separated tables: | Header1 | Header2 |
    pipe_lines = [l for l in lines if '|' in l and l.count('|') >= 2]
    if len(pipe_lines) >= 2:
        headers = []
        rows = []
        for i, line in enumerate(pipe_lines):
            cells = [c.strip() for c in line.strip('|').split('|')]
            cells = [c for c in cells if c and not re.match(r'^[-:]+$', c)]
            if not cells:
                continue
            if not headers:
                headers = cells
            else:
                rows.append(cells)
        if headers and rows:
            return headers, rows

    # Check for colon-separated key-value pairs (3+ consecutive)
    kv_lines = []
    for line in lines:
        if ':' in line and not line.startswith('#'):
            parts = line.split(':', 1)
            if len(parts) == 2 and len(parts[0].strip()) > 1 and len(parts[1].strip()) > 1:
                kv_lines.append((parts[0].strip(), parts[1].strip()))
    if len(kv_lines) >= 3:
        return ["Item", "Details"], [[k, v] for k, v in kv_lines]

    return None


def _detect_risk_register(text: str) -> Optional[Tuple[List[str], List[List[str]]]]:
    """Detect risk register format: Risk: X | Probability: Y | Impact: Z"""
    pattern = r'(?:Risk|Issue)\s*:\s*(.+?)\s*\|\s*(?:Probability|Likelihood)\s*:\s*(\w+)\s*\|\s*Impact\s*:\s*(\w+)\s*\|\s*Mitigation\s*:\s*(.+?)(?:\s*\|\s*Contingency\s*:\s*(.+?))?(?:\n|$)'
    matches = re.findall(pattern, text, re.IGNORECASE)
    if matches:
        headers = ["Risk", "Probability", "Impact", "Mitigation"]
        if any(m[4] for m in matches):
            headers.append("Contingency")
        rows = []
        for m in matches:
            row = [m[0].strip(), m[1].strip(), m[2].strip(), m[3].strip()]
            if len(headers) == 5:
                row.append(m[4].strip() if m[4] else "")
            rows.append(row)
        return headers, rows
    return None


def generate_docx(proposal: Dict) -> io.BytesIO:
    """Generate a professional Word document from proposal sections."""
    try:
        doc = Document()

        # --- Document styles ---
        style = doc.styles["Normal"]
        style.font.name = "Calibri"
        style.font.size = Pt(11)
        style.paragraph_format.space_after = Pt(6)

        proposal_title = proposal.get("proposal_title", "Government Proposal")
        vendor_name = proposal.get("vendor_name", "")
        sections = proposal.get("sections", {})

        # Extended metadata for structured cover page
        meta = proposal.get("metadata", {})
        proposal_type = meta.get("proposal_type", "Government Contract Proposal")
        agency = meta.get("agency", "")
        contracting_office = meta.get("contracting_office", "")
        solicitation_number = meta.get("solicitation_number", "")
        submission_date = meta.get("submission_date", "")
        cage_code = meta.get("cage_code", "")
        duns_number = meta.get("duns_number", "")
        naics_codes = meta.get("naics_codes", [])
        poc_name = meta.get("poc_name", "")
        poc_title_str = meta.get("poc_title", "")
        poc_email = meta.get("poc_email", "")
        poc_phone = meta.get("poc_phone", "")
        display_date = submission_date if submission_date else datetime.now().strftime('%B %d, %Y')

        # ============================================================
        # DOCUMENT FOOTER — Logo (left), Page Number (center), CONFIDENTIAL (right)
        # ============================================================
        company_logo = proposal.get("company_logo", "")
        section = doc.sections[0]
        footer = section.footer
        footer.is_linked_to_previous = False
        footer_para = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        footer_para.clear()

        # Create a 3-column table in the footer for layout
        footer_table = footer.add_table(rows=1, cols=3, width=Inches(7))
        footer_table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Left cell — Company logo (small)
        left_cell = footer_table.rows[0].cells[0]
        left_cell.text = ""
        left_cell.width = Inches(2.3)
        lp = left_cell.paragraphs[0]
        lp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        lp.paragraph_format.space_before = Pt(0)
        lp.paragraph_format.space_after = Pt(0)
        if company_logo and company_logo.startswith("data:image"):
            try:
                _, b64data = company_logo.split(",", 1)
                logo_bytes = base64.b64decode(b64data)
                logo_stream = io.BytesIO(logo_bytes)
                from PIL import Image as PILImage
                _pil_img = PILImage.open(io.BytesIO(logo_bytes))
                _iw, _ih = _pil_img.size
                _max_w, _max_h = 0.8, 0.35  # footer: small
                _scale = min(_max_w / (_iw / 96.0), _max_h / (_ih / 96.0), 1.0)
                _fit_w = (_iw / 96.0) * _scale
                _fit_h = (_ih / 96.0) * _scale
                lr = lp.add_run()
                lr.add_picture(logo_stream, width=Inches(_fit_w), height=Inches(_fit_h))
            except Exception:
                lr = lp.add_run(vendor_name or "")
                lr.font.size = Pt(7)
                lr.font.color.rgb = GRAY_TEXT
                lr.font.name = "Calibri"
        else:
            lr = lp.add_run(vendor_name or "")
            lr.font.size = Pt(7)
            lr.font.color.rgb = GRAY_TEXT
            lr.font.name = "Calibri"

        # Center cell — Page number (auto-updating field)
        center_cell = footer_table.rows[0].cells[1]
        center_cell.text = ""
        center_cell.width = Inches(2.4)
        cp = center_cell.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.paragraph_format.space_before = Pt(0)
        cp.paragraph_format.space_after = Pt(0)
        cr = cp.add_run("Page ")
        cr.font.size = Pt(8)
        cr.font.color.rgb = GRAY_TEXT
        cr.font.name = "Calibri"
        # Add PAGE field
        fldChar1 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
        cr2_elem = parse_xml(f'<w:r {nsdecls("w")}><w:rPr><w:sz w:val="16"/><w:color w:val="6B7280"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>')
        instrText = parse_xml(f'<w:r {nsdecls("w")}><w:rPr><w:sz w:val="16"/><w:color w:val="6B7280"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>')
        fldChar2 = parse_xml(f'<w:r {nsdecls("w")}><w:rPr><w:sz w:val="16"/><w:color w:val="6B7280"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>')
        cp._p.append(cr2_elem)
        cp._p.append(instrText)
        cp._p.append(fldChar2)

        # Right cell — CONFIDENTIAL
        right_cell = footer_table.rows[0].cells[2]
        right_cell.text = ""
        right_cell.width = Inches(2.3)
        rp = right_cell.paragraphs[0]
        rp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        rp.paragraph_format.space_before = Pt(0)
        rp.paragraph_format.space_after = Pt(0)
        rr = rp.add_run(f"Confidential  |  {vendor_name or ''}")
        rr.font.size = Pt(7)
        rr.font.color.rgb = RGBColor(0x6B, 0x72, 0x80)
        rr.font.bold = False
        rr.font.name = "Calibri"

        # Remove borders from footer table
        for row in footer_table.rows:
            for cell in row.cells:
                tc = cell._tc
                tcPr = tc.get_or_add_tcPr()
                tcBorders = parse_xml(
                    f'<w:tcBorders {nsdecls("w")}>'
                    f'  <w:top w:val="none" w:sz="0" w:space="0"/>'
                    f'  <w:left w:val="none" w:sz="0" w:space="0"/>'
                    f'  <w:bottom w:val="none" w:sz="0" w:space="0"/>'
                    f'  <w:right w:val="none" w:sz="0" w:space="0"/>'
                    f'</w:tcBorders>'
                )
                tcPr.append(tcBorders)

        # ============================================================
        # COVER PAGE — Professional government proposal layout
        # ============================================================

        # --- Top Navy Banner ---
        banner = doc.add_table(rows=1, cols=1)
        banner.alignment = WD_TABLE_ALIGNMENT.CENTER
        bc = banner.rows[0].cells[0]
        bc.text = ""
        _set_cell_shading(bc, NAVY_HEX)
        bc.width = Inches(7)
        bp = bc.paragraphs[0]
        bp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        bp.paragraph_format.space_before = Pt(24)
        bp.paragraph_format.space_after = Pt(24)
        # Title in white on navy
        tr = bp.add_run(proposal_title.upper())
        tr.bold = True
        tr.font.size = Pt(24)
        tr.font.color.rgb = WHITE
        tr.font.name = "Calibri"

        # --- Green accent bar ---
        accent_bar = doc.add_table(rows=1, cols=1)
        accent_bar.alignment = WD_TABLE_ALIGNMENT.CENTER
        ac = accent_bar.rows[0].cells[0]
        ac.text = ""
        _set_cell_shading(ac, ACCENT_HEX)
        ac.width = Inches(7)
        ap = ac.paragraphs[0]
        ap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        ap.paragraph_format.space_before = Pt(6)
        ap.paragraph_format.space_after = Pt(6)
        ar = ap.add_run(proposal_type)
        ar.font.size = Pt(13)
        ar.font.color.rgb = WHITE
        ar.font.name = "Calibri"
        ar.bold = True

        doc.add_paragraph("")

        # --- Company logo ---
        company_logo = proposal.get("company_logo", "")
        if company_logo and company_logo.startswith("data:image"):
            try:
                # Parse base64 data URL: data:image/png;base64,AAAA...
                header, b64data = company_logo.split(",", 1)
                logo_bytes = base64.b64decode(b64data)
                logo_stream = io.BytesIO(logo_bytes)
                # Get actual image dimensions to preserve aspect ratio
                from PIL import Image as PILImage
                _pil_img = PILImage.open(io.BytesIO(logo_bytes))
                _iw, _ih = _pil_img.size
                _max_w, _max_h = 2.0, 1.0  # max inches
                _scale = min(_max_w / (_iw / 96.0), _max_h / (_ih / 96.0), 1.0)
                _fit_w = (_iw / 96.0) * _scale
                _fit_h = (_ih / 96.0) * _scale
                logo_para = doc.add_paragraph()
                logo_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                logo_para.paragraph_format.space_after = Pt(8)
                run = logo_para.add_run()
                run.add_picture(logo_stream, width=Inches(_fit_w), height=Inches(_fit_h))
            except Exception as logo_err:
                logger.warning("Failed to embed logo in DOCX: %s", logo_err)
                logo_para = doc.add_paragraph()
                logo_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                lr = logo_para.add_run("[Company Logo]")
                lr.font.size = Pt(10)
                lr.font.color.rgb = GRAY_TEXT
                lr.italic = True
        else:
            logo_para = doc.add_paragraph()
            logo_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            logo_para.paragraph_format.space_after = Pt(4)
            lr = logo_para.add_run("[Upload logo in Business Profile]")
            lr.font.size = Pt(10)
            lr.font.color.rgb = GRAY_TEXT
            lr.italic = True
            lr.font.name = "Calibri"

        doc.add_paragraph("")

        # --- Main info table (2 columns: labels on left, values on right) ---
        info_table = doc.add_table(rows=0, cols=2)
        info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
        info_table.columns[0].width = Inches(2.2)
        info_table.columns[1].width = Inches(4.3)

        def _add_info_row(label, value, value_bold=False, value_size=11):
            row = info_table.add_row()
            # Label cell
            lc = row.cells[0]
            lc.text = ""
            lp = lc.paragraphs[0]
            lp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            lp.paragraph_format.space_before = Pt(4)
            lp.paragraph_format.space_after = Pt(4)
            lrun = lp.add_run(label)
            lrun.font.size = Pt(10)
            lrun.font.color.rgb = GRAY_TEXT
            lrun.font.name = "Calibri"
            lrun.bold = True
            # Value cell
            vc = row.cells[1]
            vc.text = ""
            vp = vc.paragraphs[0]
            vp.paragraph_format.space_before = Pt(4)
            vp.paragraph_format.space_after = Pt(4)
            vrun = vp.add_run(value)
            vrun.font.size = Pt(value_size)
            vrun.font.color.rgb = NAVY if value_bold else DARK_TEXT
            vrun.font.name = "Calibri"
            vrun.bold = value_bold

        # Fill rows
        if agency:
            submitted_to = agency
            if contracting_office:
                submitted_to += f"\n{contracting_office}"
            _add_info_row("Submitted To:", submitted_to, value_bold=True, value_size=12)

        if solicitation_number:
            _add_info_row("Solicitation No:", solicitation_number)

        if vendor_name:
            _add_info_row("Submitted By:", vendor_name, value_bold=True, value_size=12)

        if cage_code:
            _add_info_row("CAGE Code:", cage_code)
        if duns_number:
            _add_info_row("UEI / DUNS:", duns_number)
        if naics_codes:
            codes_str = ", ".join(naics_codes) if isinstance(naics_codes, list) else str(naics_codes)
            _add_info_row("NAICS Codes:", codes_str)

        _add_info_row("Submission Date:", display_date)

        if poc_name:
            poc_value = poc_name
            if poc_title_str:
                poc_value += f"\n{poc_title_str}"
            poc_details = []
            if poc_email:
                poc_details.append(poc_email)
            if poc_phone:
                poc_details.append(poc_phone)
            if poc_details:
                poc_value += f"\n{' | '.join(poc_details)}"
            _add_info_row("Point of Contact:", poc_value, value_bold=True)

        # Style the info table — light borders, alternating subtle bg
        for row_idx, row in enumerate(info_table.rows):
            for cell in row.cells:
                _set_cell_borders(cell, "E5E7EB", "2")
                if row_idx % 2 == 0:
                    _set_cell_shading(cell, "F9FAFB")

        doc.add_paragraph("")

        # --- Bottom accent line ---
        bottom_line = doc.add_table(rows=1, cols=1)
        bottom_line.alignment = WD_TABLE_ALIGNMENT.CENTER
        blc = bottom_line.rows[0].cells[0]
        blc.text = ""
        _set_cell_shading(blc, ACCENT_HEX)
        blc.width = Inches(7)
        blp = blc.paragraphs[0]
        blp.paragraph_format.space_before = Pt(0)
        blp.paragraph_format.space_after = Pt(0)
        blr = blp.add_run(" ")
        blr.font.size = Pt(2)

        doc.add_paragraph("")

        # Professional footer note
        _add_formatted_paragraph(
            doc, f"Confidential  |  {vendor_name or 'Company Name'}  |  Prepared {display_date}",
            size=9, color=RGBColor(0x6B, 0x72, 0x80), italic=False,
            alignment=WD_ALIGN_PARAGRAPH.CENTER
        )

        doc.add_page_break()

        # ============================================================
        # TABLE OF CONTENTS — with Volume grouping + page numbers
        # ============================================================
        toc_heading = doc.add_heading("Table of Contents", level=1)
        for run in toc_heading.runs:
            run.font.color.rgb = NAVY
            run.font.name = "Calibri"

        # Green accent line under heading
        accent_table = doc.add_table(rows=1, cols=1)
        accent_table.alignment = WD_TABLE_ALIGNMENT.LEFT
        ac = accent_table.rows[0].cells[0]
        ac.text = ""
        ac.paragraphs[0].paragraph_format.space_before = Pt(0)
        ac.paragraphs[0].paragraph_format.space_after = Pt(0)
        _set_cell_shading(ac, ACCENT_HEX)
        ac.width = Inches(6.5)
        # Make the row very thin
        tr_el = accent_table.rows[0]._tr
        trPr = tr_el.get_or_add_trPr()
        trHeight = parse_xml(f'<w:trHeight {nsdecls("w")} w:val="40" w:hRule="exact"/>')
        trPr.append(trHeight)

        doc.add_paragraph("")

        # Volume grouping for sections — dynamic or auto-fallback
        section_list = list(sections.items())
        total_sections = len(section_list)
        section_keys = [k for k, _ in section_list]
        volume_assignments = proposal.get("volume_assignments", {})

        # Build ordered volumes list: [(vol_label, [(section_key, section_data), ...])]
        if volume_assignments:
            # User-defined volume grouping
            assigned_keys = set()
            volumes = []
            for vol_label, vol_section_keys in volume_assignments.items():
                vol_items = []
                for sk in vol_section_keys:
                    if sk in sections:
                        vol_items.append((sk, sections[sk]))
                        assigned_keys.add(sk)
                if vol_items:
                    volumes.append((vol_label, vol_items))
            # Any unassigned sections go into "Other"
            unassigned = [(k, v) for k, v in section_list if k not in assigned_keys]
            if unassigned:
                volumes.append(("Other Sections", unassigned))
        else:
            # Auto-fallback: split into 3 volumes
            vol1_end = min(3, total_sections)
            vol2_end = min(vol1_end + max((total_sections - vol1_end) // 2, 3), total_sections)
            volumes = [
                ("Volume I \u2014 Administrative", section_list[0:vol1_end]),
                ("Volume II \u2014 Technical", section_list[vol1_end:vol2_end]),
                ("Volume III \u2014 Management & Compliance", section_list[vol2_end:]),
            ]

        # Estimate page numbers: cover=1, TOC=2, content starts page 3
        page_num = 3
        global_idx = 0

        for vol_label, vol_items in volumes:
            if not vol_items:
                continue

            # Volume header row
            vol_para = doc.add_paragraph()
            vol_para.paragraph_format.space_before = Pt(12)
            vol_para.paragraph_format.space_after = Pt(4)
            vr = vol_para.add_run(vol_label)
            vr.font.size = Pt(12)
            vr.font.bold = True
            vr.font.color.rgb = NAVY
            vr.font.name = "Calibri"

            # Table for this volume's sections: No. | Title | Page
            toc_table = doc.add_table(rows=len(vol_items), cols=3)
            toc_table.alignment = WD_TABLE_ALIGNMENT.LEFT

            # Set column widths
            for row in toc_table.rows:
                row.cells[0].width = Inches(0.4)
                row.cells[1].width = Inches(5.2)
                row.cells[2].width = Inches(0.9)

            for local_idx, (section_key, section_data) in enumerate(vol_items):
                section_title = section_data.get("title", section_key.replace("_", " ").title())

                # Number cell — tight width
                num_cell = toc_table.rows[local_idx].cells[0]
                num_cell.text = ""
                p = num_cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(3)
                p.paragraph_format.space_after = Pt(3)
                run = p.add_run(f"{global_idx + 1}.")
                run.font.size = Pt(10)
                run.font.color.rgb = ACCENT
                run.font.bold = True
                run.font.name = "Calibri"

                # Title cell — closer to number
                title_cell = toc_table.rows[local_idx].cells[1]
                title_cell.text = ""
                p = title_cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(3)
                p.paragraph_format.space_after = Pt(3)
                run = p.add_run(section_title)
                run.font.size = Pt(10)
                run.font.color.rgb = DARK_TEXT
                run.font.name = "Calibri"

                # Page number cell — right aligned
                page_cell = toc_table.rows[local_idx].cells[2]
                page_cell.text = ""
                p = page_cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                p.paragraph_format.space_before = Pt(3)
                p.paragraph_format.space_after = Pt(3)
                run = p.add_run(str(page_num))
                run.font.size = Pt(10)
                run.font.color.rgb = GRAY_TEXT
                run.font.name = "Calibri"

                # Alternating row shading
                if local_idx % 2 == 0:
                    _set_cell_shading(num_cell, LIGHT_GRAY_BG)
                    _set_cell_shading(title_cell, LIGHT_GRAY_BG)
                    _set_cell_shading(page_cell, LIGHT_GRAY_BG)

                page_num += 1
                global_idx += 1

        doc.add_page_break()

        # ============================================================
        # CONTENT SECTIONS (skip cover_page — already rendered as page 1)
        # ============================================================
        content_sections = [(k, v) for k, v in sections.items() if k != "cover_page"]
        for idx, (section_key, section_data) in enumerate(content_sections, start=1):
            section_title = section_data.get("title", section_key.replace("_", " ").title())
            content = section_data.get("content", "")

            if idx > 1:
                doc.add_page_break()

            # Section number badge + title
            heading_para = doc.add_paragraph()
            heading_para.paragraph_format.space_before = Pt(0)
            heading_para.paragraph_format.space_after = Pt(2)

            num_run = heading_para.add_run(f"  {idx}  ")
            num_run.bold = True
            num_run.font.size = Pt(12)
            num_run.font.color.rgb = WHITE
            num_run.font.name = "Calibri"
            # We can't easily add a background to a run in python-docx,
            # so we use a different visual approach

            # Section heading with accent underline
            section_heading = doc.add_heading(f"{idx}. {section_title}", level=1)
            for run in section_heading.runs:
                run.font.color.rgb = NAVY
                run.font.name = "Calibri"
            # Remove the auto-generated empty paragraph
            heading_para._element.getparent().remove(heading_para._element)

            # Accent underline
            line_table = doc.add_table(rows=1, cols=1)
            line_table.alignment = WD_TABLE_ALIGNMENT.LEFT
            cell = line_table.rows[0].cells[0]
            cell.text = ""
            _set_cell_shading(cell, ACCENT_HEX)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(" ")
            run.font.size = Pt(1)

            doc.add_paragraph("")

            # Check for risk register format in the full content
            risk_data = _detect_risk_register(content)
            if risk_data and section_key in ('risk_mitigation', 'risk_register'):
                # Render narrative text before the table
                pre_table_lines = []
                for line in content.split('\n'):
                    if re.search(r'(?:Risk|Issue)\s*:', line, re.IGNORECASE) and '|' in line:
                        break
                    pre_table_lines.append(line)
                if pre_table_lines:
                    _render_content_lines(doc, '\n'.join(pre_table_lines))
                _add_styled_table(doc, risk_data[0], risk_data[1])
                continue

            # Strip duplicate section title from content start
            # AI often generates content that begins with the section title
            content = _strip_leading_title(content, section_title)

            # Parse and render content
            _render_content_lines(doc, content, section_key)

        # ============================================================
        # FOOTER - Generated notice
        # ============================================================
        doc.add_paragraph("")
        _add_formatted_paragraph(
            doc,
            f"Generated by GovProposal AI on {datetime.now().strftime('%B %d, %Y')}",
            size=8, color=GRAY_TEXT, italic=True,
            alignment=WD_ALIGN_PARAGRAPH.CENTER
        )

        # Save to buffer
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer

    except Exception as exc:
        logger.error("Failed to generate DOCX: %s", exc)
        raise RuntimeError(f"DOCX generation failed: {exc}")


def _render_content_lines(doc, content: str, section_key: str = ""):
    """Render content with smart detection of tables, lists, and structured data."""
    parsed = _html_to_paragraphs(content)

    # Collect consecutive lines to detect table blocks
    i = 0
    while i < len(parsed):
        para = parsed[i]
        ptype = para['type']
        ptext = para['text']

        if ptype == 'spacer':
            doc.add_paragraph("")
            i += 1
            continue

        # Render HTML tables extracted from content
        if ptype == 'html_table':
            td = para.get('table_data', {})
            headers = td.get('headers', [])
            data_rows = td.get('rows', [])
            if headers or data_rows:
                _add_html_table_to_docx(doc, headers, data_rows)
                doc.add_paragraph("")
            i += 1
            continue

        # Check if this starts a table-like block (pipe-separated lines)
        if '|' in ptext and ptext.count('|') >= 2:
            table_lines = [ptext]
            j = i + 1
            while j < len(parsed) and ('|' in parsed[j]['text'] and parsed[j]['text'].count('|') >= 2 or re.match(r'^[-|:]+$', parsed[j]['text'].strip())):
                table_lines.append(parsed[j]['text'])
                j += 1
            if len(table_lines) >= 2:
                table_data = _detect_table_content(table_lines)
                if table_data:
                    _add_styled_table(doc, table_data[0], table_data[1])
                    doc.add_paragraph("")
                    i = j
                    continue

        # Regular content rendering
        if ptype in ('h1', 'h2'):
            heading = doc.add_heading(_strip_markdown_bold(ptext), level=2)
            for run in heading.runs:
                run.font.color.rgb = RGBColor(0x05, 0x96, 0x69)
                run.font.name = "Calibri"
        elif ptype == 'h3':
            heading = doc.add_heading(_strip_markdown_bold(ptext), level=3)
            for run in heading.runs:
                run.font.color.rgb = DARK_TEXT
                run.font.name = "Calibri"
        elif ptype == 'bullet':
            clean = _strip_markdown_bold(ptext)
            if clean:
                bp = doc.add_paragraph(style="List Bullet")
                # Handle bold parts within bullet
                parts = re.split(r'(\*\*.*?\*\*)', ptext)
                for part in parts:
                    if part.startswith('**') and part.endswith('**'):
                        run = bp.add_run(part[2:-2])
                        run.bold = True
                    else:
                        run = bp.add_run(part)
                    run.font.size = Pt(11)
                    run.font.color.rgb = DARK_TEXT
                    run.font.name = "Calibri"
        elif ptype == 'numbered':
            clean = _strip_markdown_bold(ptext)
            if clean:
                np = doc.add_paragraph(style="List Number")
                run = np.add_run(clean)
                run.font.size = Pt(11)
                run.font.color.rgb = DARK_TEXT
                run.font.name = "Calibri"
        else:
            clean = ptext.strip()
            if clean:
                _add_formatted_paragraph(doc, clean, size=11, color=DARK_TEXT)

        i += 1


# ============================================================
# PDF Export
# ============================================================

def generate_pdf(proposal: Dict) -> io.BytesIO:
    """Generate a professional PDF document from proposal sections."""
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75 * inch,
            leftMargin=0.75 * inch,
            topMargin=0.75 * inch,
            bottomMargin=0.85 * inch,
        )

        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            name="ProposalTitle", parent=styles["Title"],
            fontSize=26, textColor=colors.HexColor("#1B2A4A"),
            spaceAfter=12, alignment=1, fontName="Helvetica-Bold",
        ))
        styles.add(ParagraphStyle(
            name="ProposalSubtitle", parent=styles["Normal"],
            fontSize=14, textColor=colors.HexColor("#10B981"),
            spaceAfter=8, alignment=1, fontName="Helvetica",
        ))
        styles.add(ParagraphStyle(
            name="SectionHeading", parent=styles["Heading1"],
            fontSize=16, textColor=colors.HexColor("#1B2A4A"),
            spaceBefore=20, spaceAfter=10, fontName="Helvetica-Bold",
        ))
        styles.add(ParagraphStyle(
            name="SubHeading", parent=styles["Heading2"],
            fontSize=13, textColor=colors.HexColor("#059669"),
            spaceBefore=12, spaceAfter=6, fontName="Helvetica-Bold",
        ))
        styles.add(ParagraphStyle(
            name="ProposalBody", parent=styles["Normal"],
            fontSize=10.5, leading=14, spaceAfter=6,
            fontName="Helvetica", textColor=colors.HexColor("#374151"),
        ))
        styles.add(ParagraphStyle(
            name="ProposalBullet", parent=styles["Normal"],
            fontSize=10.5, leading=14, spaceAfter=4,
            leftIndent=20, bulletIndent=10,
            fontName="Helvetica", textColor=colors.HexColor("#374151"),
        ))
        styles.add(ParagraphStyle(
            name="Confidential", parent=styles["Normal"],
            fontSize=9, textColor=colors.HexColor("#990000"),
            alignment=1, fontName="Helvetica-Oblique",
        ))
        styles.add(ParagraphStyle(
            name="TableHeader", parent=styles["Normal"],
            fontSize=9, textColor=colors.white,
            fontName="Helvetica-Bold", alignment=1,
        ))
        styles.add(ParagraphStyle(
            name="TableCell", parent=styles["Normal"],
            fontSize=9, textColor=colors.HexColor("#374151"),
            fontName="Helvetica", leading=12,
        ))

        story = []
        proposal_title = proposal.get("proposal_title", "Government Proposal")
        vendor_name = proposal.get("vendor_name", "")
        sections = proposal.get("sections", {})

        # Extended metadata for structured cover page
        meta = proposal.get("metadata") or {}
        proposal_type = meta.get("proposal_type", "Government Contract Proposal")
        agency = meta.get("agency", "")
        contracting_office = meta.get("contracting_office", "")
        solicitation_number = meta.get("solicitation_number", "")
        submission_date = meta.get("submission_date", "")
        cage_code = meta.get("cage_code", "")
        duns_number = meta.get("duns_number", "")
        naics_codes = meta.get("naics_codes", [])
        poc_name = meta.get("poc_name", "")
        poc_title_str = meta.get("poc_title", "")
        poc_email = meta.get("poc_email", "")
        poc_phone = meta.get("poc_phone", "")
        display_date = submission_date if submission_date else datetime.now().strftime('%B %d, %Y')

        # Helper styles for cover page
        label_style = ParagraphStyle(
            "CoverLabel", parent=styles["Normal"],
            fontSize=10, textColor=colors.HexColor("#6B7280"),
            alignment=1, fontName="Helvetica",
        )
        info_style = ParagraphStyle(
            "CoverInfo", parent=styles["Normal"],
            fontSize=11, textColor=colors.HexColor("#374151"),
            alignment=1, fontName="Helvetica",
        )
        info_bold_style = ParagraphStyle(
            "CoverInfoBold", parent=styles["Normal"],
            fontSize=13, textColor=colors.HexColor("#1B2A4A"),
            alignment=1, fontName="Helvetica-Bold",
        )
        vendor_style = ParagraphStyle(
            "VendorName", parent=styles["Normal"],
            fontSize=14, textColor=colors.HexColor("#1B2A4A"),
            alignment=1, fontName="Helvetica-Bold",
        )
        date_style = ParagraphStyle(
            "DateLine", parent=styles["Normal"],
            fontSize=11, textColor=colors.HexColor("#374151"),
            alignment=1, fontName="Helvetica",
        )

        # --- Cover Page — Professional layout ---

        # Navy banner with title
        banner_data = [[RLParagraph(
            f"<b>{_escape_xml(proposal_title.upper())}</b>",
            ParagraphStyle("BannerTitle", parent=styles["Normal"],
                           fontSize=22, textColor=colors.white, alignment=1,
                           fontName="Helvetica-Bold", leading=28)
        )]]
        banner = RLTable(banner_data, colWidths=[7 * inch], rowHeights=[0.8 * inch])
        banner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1B2A4A")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 16),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ]))
        story.append(banner)

        # Green accent bar with proposal type
        accent_data = [[RLParagraph(
            f"<b>{_escape_xml(proposal_type)}</b>",
            ParagraphStyle("AccentBar", parent=styles["Normal"],
                           fontSize=12, textColor=colors.white, alignment=1,
                           fontName="Helvetica-Bold")
        )]]
        accent_bar = RLTable(accent_data, colWidths=[7 * inch], rowHeights=[0.4 * inch])
        accent_bar.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#10B981")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(accent_bar)

        story.append(Spacer(1, 0.3 * inch))

        # Company logo
        company_logo = proposal.get("company_logo", "")
        if company_logo and company_logo.startswith("data:image"):
            try:
                from reportlab.platypus import Image as RLImage
                header, b64data = company_logo.split(",", 1)
                logo_bytes = base64.b64decode(b64data)
                logo_stream = io.BytesIO(logo_bytes)
                # Preserve aspect ratio
                from PIL import Image as PILImage
                _pil_img = PILImage.open(io.BytesIO(logo_bytes))
                _iw, _ih = _pil_img.size
                _max_w, _max_h = 2.0, 1.0  # max inches
                _scale = min(_max_w / (_iw / 96.0), _max_h / (_ih / 96.0), 1.0)
                _fit_w = (_iw / 96.0) * _scale
                _fit_h = (_ih / 96.0) * _scale
                logo_img = RLImage(logo_stream, width=_fit_w * inch, height=_fit_h * inch)
                logo_img.hAlign = "CENTER"
                story.append(logo_img)
            except Exception as logo_err:
                logger.warning("Failed to embed logo in PDF: %s", logo_err)
                story.append(RLParagraph("[Company Logo]", label_style))
        else:
            story.append(RLParagraph("[Upload logo in Business Profile]", label_style))

        story.append(Spacer(1, 0.3 * inch))

        # Info table (label | value)
        info_rows = []
        if agency:
            agency_text = _escape_xml(agency)
            if contracting_office:
                agency_text += f"<br/>{_escape_xml(contracting_office)}"
            info_rows.append(["Submitted To:", agency_text, True])
        if solicitation_number:
            info_rows.append(["Solicitation No:", _escape_xml(solicitation_number), False])
        if vendor_name:
            info_rows.append(["Submitted By:", _escape_xml(vendor_name), True])
        if cage_code:
            info_rows.append(["CAGE Code:", _escape_xml(cage_code), False])
        if duns_number:
            info_rows.append(["UEI / DUNS:", _escape_xml(duns_number), False])
        if naics_codes:
            codes_str = ", ".join(naics_codes) if isinstance(naics_codes, list) else str(naics_codes)
            info_rows.append(["NAICS Codes:", _escape_xml(codes_str), False])
        info_rows.append(["Submission Date:", _escape_xml(display_date), False])
        if poc_name:
            poc_val = f"<b>{_escape_xml(poc_name)}</b>"
            if poc_title_str:
                poc_val += f"<br/>{_escape_xml(poc_title_str)}"
            poc_parts = []
            if poc_email:
                poc_parts.append(_escape_xml(poc_email))
            if poc_phone:
                poc_parts.append(_escape_xml(poc_phone))
            if poc_parts:
                poc_val += f"<br/>{' | '.join(poc_parts)}"
            info_rows.append(["Point of Contact:", poc_val, False])

        if info_rows:
            table_data = []
            for lbl, val, val_bold in info_rows:
                lbl_para = RLParagraph(f"<b>{_escape_xml(lbl)}</b>", ParagraphStyle(
                    "InfoLabel", parent=styles["Normal"], fontSize=9.5,
                    textColor=colors.HexColor("#6B7280"), alignment=2, fontName="Helvetica-Bold"))
                val_text = f"<b>{val}</b>" if val_bold else val
                val_para = RLParagraph(val_text, ParagraphStyle(
                    "InfoValue", parent=styles["Normal"], fontSize=10.5,
                    textColor=colors.HexColor("#1B2A4A") if val_bold else colors.HexColor("#374151"),
                    fontName="Helvetica-Bold" if val_bold else "Helvetica", leading=14))
                table_data.append([lbl_para, val_para])

            info_tbl = RLTable(table_data, colWidths=[1.8 * inch, 4.5 * inch])
            tbl_style = [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (0, -1), 12),
                ("RIGHTPADDING", (0, 0), (0, -1), 8),
                ("LEFTPADDING", (1, 0), (1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E5E7EB")),
            ]
            for i in range(0, len(table_data), 2):
                tbl_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F9FAFB")))
            info_tbl.setStyle(TableStyle(tbl_style))
            story.append(info_tbl)

        story.append(Spacer(1, 0.4 * inch))

        # Bottom accent line
        bottom = RLTable([[""]], colWidths=[7 * inch], rowHeights=[3])
        bottom.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#10B981")),
        ]))
        story.append(bottom)

        story.append(Spacer(1, 0.2 * inch))
        # Professional footer note (no CONFIDENTIAL marking)
        story.append(RLParagraph(
            f"Confidential  |  {_escape_xml(vendor_name or 'Company Name')}  |  Prepared {_escape_xml(display_date)}",
            ParagraphStyle("CoverFooterNote", parent=styles["Normal"],
                           fontSize=9, textColor=colors.HexColor("#6B7280"),
                           alignment=1, fontName="Helvetica")))
        story.append(PageBreak())

        # --- Table of Contents with Volume grouping + page numbers ---
        story.append(RLParagraph("Table of Contents", styles["SectionHeading"]))

        # Accent line under TOC heading
        toc_line = RLTable([[""]], colWidths=[6.5 * inch], rowHeights=[2])
        toc_line.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#10B981")),
        ]))
        story.append(toc_line)
        story.append(Spacer(1, 0.15 * inch))

        # Volume grouping — dynamic or auto-fallback
        section_list = list(sections.items())
        total_sections = len(section_list)
        volume_assignments = proposal.get("volume_assignments", {})

        if volume_assignments:
            assigned_keys = set()
            pdf_vol_list = []
            for vol_label, vol_section_keys in volume_assignments.items():
                vol_items = []
                for sk in vol_section_keys:
                    if sk in sections:
                        vol_items.append((sk, sections[sk]))
                        assigned_keys.add(sk)
                if vol_items:
                    pdf_vol_list.append((vol_label, vol_items))
            unassigned = [(k, v) for k, v in section_list if k not in assigned_keys]
            if unassigned:
                pdf_vol_list.append(("Other Sections", unassigned))
        else:
            vol1_end = min(3, total_sections)
            vol2_end = min(vol1_end + max((total_sections - vol1_end) // 2, 3), total_sections)
            pdf_vol_list = [
                ("Volume I \u2014 Administrative", section_list[0:vol1_end]),
                ("Volume II \u2014 Technical", section_list[vol1_end:vol2_end]),
                ("Volume III \u2014 Management & Compliance", section_list[vol2_end:]),
            ]

        vol_heading_style = ParagraphStyle(
            "VolHeading", parent=styles["Normal"],
            fontSize=11, textColor=colors.HexColor("#1B2A4A"),
            fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4,
        )
        page_style = ParagraphStyle(
            "PageNum", parent=styles["TableCell"],
            alignment=2,  # RIGHT
            textColor=colors.HexColor("#6B7280"),
        )

        page_num = 3
        global_idx = 0
        for vol_label, vol_items in pdf_vol_list:
            if not vol_items:
                continue

            story.append(RLParagraph(_escape_xml(vol_label), vol_heading_style))

            toc_data = []
            for local_idx, (section_key, section_data) in enumerate(vol_items):
                section_title = section_data.get("title", section_key.replace("_", " ").title())
                toc_data.append([
                    RLParagraph(f"<b>{global_idx + 1}.</b>", styles["TableCell"]),
                    RLParagraph(_escape_xml(section_title), styles["TableCell"]),
                    RLParagraph(str(page_num), page_style),
                ])
                page_num += 1
                global_idx += 1

            if toc_data:
                toc_table = RLTable(toc_data, colWidths=[0.35 * inch, 5.35 * inch, 0.8 * inch])
                toc_style = [
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
                for i in range(0, len(toc_data), 2):
                    toc_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F3F4F6")))
                toc_table.setStyle(TableStyle(toc_style))
                story.append(toc_table)

        story.append(PageBreak())

        # --- Content Sections (skip cover_page — already rendered as page 1) ---
        pdf_content_sections = [(k, v) for k, v in sections.items() if k != "cover_page"]
        for idx, (section_key, section_data) in enumerate(pdf_content_sections, start=1):
            section_title = section_data.get("title", section_key.replace("_", " ").title())
            content = section_data.get("content", "")

            if idx > 1:
                story.append(PageBreak())

            # Section heading
            story.append(RLParagraph(
                f"{idx}. {_escape_xml(section_title)}",
                styles["SectionHeading"],
            ))

            # Accent line under heading
            line = RLTable([[""]], colWidths=[6.5 * inch], rowHeights=[2])
            line.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#10B981")),
            ]))
            story.append(line)
            story.append(Spacer(1, 0.15 * inch))

            # Strip duplicate section title from content start
            content = _strip_leading_title(content, section_title)

            # Parse and render content
            parsed = _html_to_paragraphs(content)
            _render_pdf_content(story, parsed, styles, section_key)
            story.append(Spacer(1, 0.3 * inch))

        # Footer
        story.append(Spacer(1, 0.5 * inch))
        footer_style = ParagraphStyle(
            "Footer", parent=styles["Normal"],
            fontSize=8, textColor=colors.HexColor("#6B7280"),
            alignment=1, fontName="Helvetica-Oblique",
        )
        story.append(RLParagraph(
            f"Generated by GovProposal AI on {datetime.now().strftime('%B %d, %Y')}",
            footer_style
        ))

        # Footer callback — draws on every page
        company_logo = proposal.get("company_logo", "")
        _pdf_logo_bytes = None
        if company_logo and company_logo.startswith("data:image"):
            try:
                _, b64data = company_logo.split(",", 1)
                _pdf_logo_bytes = base64.b64decode(b64data)
            except Exception:
                pass

        def _draw_footer(canvas, doc_obj):
            canvas.saveState()
            page_w, page_h = letter
            footer_y = 0.4 * inch

            # Left: company logo or name
            if _pdf_logo_bytes:
                try:
                    from PIL import Image as PILImage
                    from reportlab.lib.utils import ImageReader
                    _pil = PILImage.open(io.BytesIO(_pdf_logo_bytes))
                    _iw, _ih = _pil.size
                    _max_w, _max_h = 0.8, 0.3  # inches
                    _scale = min(_max_w / (_iw / 96.0), _max_h / (_ih / 96.0), 1.0)
                    _fw = (_iw / 96.0) * _scale * inch
                    _fh = (_ih / 96.0) * _scale * inch
                    img_reader = ImageReader(io.BytesIO(_pdf_logo_bytes))
                    canvas.drawImage(img_reader, 0.75 * inch, footer_y - _fh / 2, width=_fw, height=_fh)
                except Exception:
                    canvas.setFont("Helvetica", 7)
                    canvas.setFillColor(colors.HexColor("#6B7280"))
                    canvas.drawString(0.75 * inch, footer_y, vendor_name or "")
            else:
                canvas.setFont("Helvetica", 7)
                canvas.setFillColor(colors.HexColor("#6B7280"))
                canvas.drawString(0.75 * inch, footer_y, vendor_name or "")

            # Center: page number
            canvas.setFont("Helvetica", 8)
            canvas.setFillColor(colors.HexColor("#6B7280"))
            canvas.drawCentredString(page_w / 2, footer_y, f"Page {canvas.getPageNumber()}")

            # Right: Confidential + page total
            canvas.setFont("Helvetica", 7)
            canvas.setFillColor(colors.HexColor("#6B7280"))
            canvas.drawRightString(page_w - 0.75 * inch, footer_y, f"Confidential  |  {vendor_name or ''}")

            canvas.restoreState()

        doc.build(story, onFirstPage=_draw_footer, onLaterPages=_draw_footer)
        buffer.seek(0)
        return buffer

    except Exception as exc:
        logger.error("Failed to generate PDF: %s", exc)
        raise RuntimeError(f"PDF generation failed: {exc}")


def _render_pdf_content(story, parsed, styles, section_key=""):
    """Render parsed content for PDF with smart table detection."""
    i = 0
    while i < len(parsed):
        para = parsed[i]
        ptype = para['type']
        ptext = para['text']

        if ptype == 'spacer':
            story.append(Spacer(1, 4))
            i += 1
            continue

        # Render HTML tables extracted from content
        if ptype == 'html_table':
            td = para.get('table_data', {})
            headers = td.get('headers', [])
            data_rows = td.get('rows', [])
            if headers or data_rows:
                _add_html_table_to_pdf(story, headers, data_rows, styles)
                story.append(Spacer(1, 8))
            i += 1
            continue

        # Detect table blocks
        if '|' in ptext and ptext.count('|') >= 2:
            table_lines = [ptext]
            j = i + 1
            while j < len(parsed) and ('|' in parsed[j]['text'] and parsed[j]['text'].count('|') >= 2 or re.match(r'^[-|:]+$', parsed[j]['text'].strip())):
                table_lines.append(parsed[j]['text'])
                j += 1
            if len(table_lines) >= 2:
                table_data = _detect_table_content(table_lines)
                if table_data:
                    _add_pdf_table(story, table_data[0], table_data[1], styles)
                    story.append(Spacer(1, 8))
                    i = j
                    continue

        if ptype in ('h1', 'h2'):
            story.append(RLParagraph(_escape_xml(ptext), styles["SubHeading"]))
        elif ptype == 'h3':
            story.append(RLParagraph(f"<b>{_escape_xml(ptext)}</b>", styles["ProposalBody"]))
        elif ptype == 'bullet':
            bullet_text = _markdown_bold_to_reportlab(ptext)
            story.append(RLParagraph(f"\u2022  {bullet_text}", styles["ProposalBullet"]))
        else:
            formatted = _markdown_bold_to_reportlab(ptext)
            if formatted.strip():
                story.append(RLParagraph(formatted, styles["ProposalBody"]))

        i += 1


def _add_pdf_table(story, headers, rows, styles):
    """Add a styled table to PDF story."""
    # Build table data with styled paragraphs
    header_row = [RLParagraph(f"<b>{_escape_xml(h)}</b>", styles["TableHeader"]) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([RLParagraph(_escape_xml(str(c)), styles["TableCell"]) for c in row])

    num_cols = len(headers)
    available_width = 6.5 * inch
    col_width = available_width / num_cols

    table = RLTable(data, colWidths=[col_width] * num_cols)
    table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B2A4A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    # Alternating row colors
    for i in range(1, len(data)):
        if i % 2 == 0:
            table_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F3F4F6")))

    table.setStyle(TableStyle(table_style))
    story.append(table)


def _add_html_table_to_pdf(story, headers: List[str], rows: List[Dict], styles):
    """Render an HTML table (with summary row support) as a styled PDF table."""
    if not headers and not rows:
        return

    num_cols = len(headers) if headers else (len(rows[0]['cells']) if rows else 0)
    if num_cols == 0:
        return

    data = []
    summary_row_indices = []

    if headers:
        header_row = [RLParagraph(f"<b>{_escape_xml(h)}</b>", styles["TableHeader"]) for h in headers]
        data.append(header_row)

    for row_idx, row_data in enumerate(rows):
        cells_data = row_data.get('cells', [])
        is_summary = row_data.get('is_summary', False)
        actual_row_idx = len(data)

        cell_style = styles["TableCell"]
        row_cells = []
        for col_idx in range(num_cols):
            cell_text = cells_data[col_idx] if col_idx < len(cells_data) else ""
            if is_summary:
                row_cells.append(RLParagraph(f"<b>{_escape_xml(cell_text)}</b>", cell_style))
            else:
                row_cells.append(RLParagraph(_escape_xml(cell_text), cell_style))
        data.append(row_cells)

        if is_summary:
            summary_row_indices.append(actual_row_idx)

    available_width = 6.5 * inch
    col_width = available_width / num_cols

    table = RLTable(data, colWidths=[col_width] * num_cols)
    table_style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]

    if headers:
        table_style.extend([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B2A4A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ])

    # Alternating row colors (skip header and summary rows)
    for i in range(1 if headers else 0, len(data)):
        if i in summary_row_indices:
            table_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#E8F5E9")))
        elif i % 2 == 0:
            table_style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F3F4F6")))

    table.setStyle(TableStyle(table_style))
    story.append(table)


# ============================================================
# Utility functions
# ============================================================

def _escape_xml(text: str) -> str:
    """Escape special XML characters for ReportLab Paragraph."""
    text = text.replace("&", "&amp;")
    text = text.replace("<", "&lt;")
    text = text.replace(">", "&gt;")
    text = text.replace('"', "&quot;")
    return text


def _strip_markdown_bold(text: str) -> str:
    """Remove markdown bold markers (**text**) for DOCX output."""
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text)


def _markdown_bold_to_reportlab(text: str) -> str:
    """Convert markdown bold (**text**) to ReportLab <b>text</b> tags."""
    text = _escape_xml(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return text


def _parse_html_tables(html_content: str) -> List[Dict]:
    """Extract HTML tables from content, returning list of {headers, rows, is_subtotal_row}."""
    tables = []
    table_pattern = re.compile(r'<table[^>]*>(.*?)</table>', re.DOTALL | re.IGNORECASE)

    for table_match in table_pattern.finditer(html_content):
        table_html = table_match.group(1)
        headers = []
        rows = []

        # Extract header cells from <th> tags
        th_pattern = re.compile(r'<th[^>]*>(.*?)</th>', re.DOTALL | re.IGNORECASE)
        header_row_match = re.search(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL | re.IGNORECASE)
        if header_row_match:
            ths = th_pattern.findall(header_row_match.group(1))
            if ths:
                headers = [re.sub(r'<[^>]+>', '', h).strip() for h in ths]

        # Extract data rows
        tr_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
        td_pattern = re.compile(r'<td[^>]*>(.*?)</td>', re.DOTALL | re.IGNORECASE)

        for i, tr_match in enumerate(tr_pattern.finditer(table_html)):
            row_html = tr_match.group(1)
            # Skip the header row
            if i == 0 and th_pattern.search(row_html):
                continue
            cells = td_pattern.findall(row_html)
            if cells:
                cleaned = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
                # Detect subtotal/total rows (have colspan or bold styling)
                is_summary = bool(re.search(r'colspan|font-weight:\s*bold', tr_match.group(0), re.IGNORECASE))
                rows.append({'cells': cleaned, 'is_summary': is_summary})

        if headers or rows:
            tables.append({'headers': headers, 'rows': rows})

    return tables


def _html_to_paragraphs(html_content: str) -> list:
    """Convert HTML content into structured paragraph dicts, preserving HTML tables."""
    if not html_content:
        return []

    paragraphs = []

    # First, extract and replace HTML tables with placeholders
    tables = _parse_html_tables(html_content)
    text = html_content
    table_idx = 0
    table_pattern = re.compile(r'<table[^>]*>.*?</table>', re.DOTALL | re.IGNORECASE)
    for match in table_pattern.finditer(html_content):
        text = text.replace(match.group(0), f'\n__HTML_TABLE_{table_idx}__\n', 1)
        table_idx += 1

    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<(?:strong|b)>(.*?)</(?:strong|b)>', r'**\1**', text, flags=re.DOTALL)
    text = re.sub(r'<(?:em|i)>(.*?)</(?:em|i)>', r'_\1_', text, flags=re.DOTALL)
    text = re.sub(r'<li>(.*?)</li>', r'\n- \1\n', text, flags=re.DOTALL)

    for level in range(1, 4):
        text = re.sub(
            rf'<h{level}[^>]*>(.*?)</h{level}>',
            lambda m, l=level: f'\n{"#" * l} {m.group(1).strip()}\n',
            text, flags=re.DOTALL,
        )

    text = re.sub(r'<[^>]+>', '', text)
    text = html_unescape(text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    for line in text.split('\n'):
        line = line.strip()
        if not line:
            paragraphs.append({'type': 'spacer', 'text': ''})
        elif re.match(r'^__HTML_TABLE_(\d+)__$', line):
            idx = int(re.match(r'^__HTML_TABLE_(\d+)__$', line).group(1))
            if idx < len(tables):
                paragraphs.append({'type': 'html_table', 'text': '', 'table_data': tables[idx]})
        elif line.startswith('### '):
            paragraphs.append({'type': 'h3', 'text': line[4:].strip()})
        elif line.startswith('## '):
            paragraphs.append({'type': 'h2', 'text': line[3:].strip()})
        elif line.startswith('# '):
            paragraphs.append({'type': 'h1', 'text': line[2:].strip()})
        elif line.startswith('- ') or line.startswith('* ') or line.startswith('\u2022 '):
            prefix_len = 2
            if line.startswith('\u2022 '):
                prefix_len = 2
            paragraphs.append({'type': 'bullet', 'text': line[prefix_len:].strip()})
        elif re.match(r'^\d+\.\s', line):
            paragraphs.append({'type': 'numbered', 'text': re.sub(r'^\d+\.\s*', '', line).strip()})
        else:
            paragraphs.append({'type': 'text', 'text': line})

    return paragraphs
