"""
pdf_service.py
--------------
Professional, vector-based A4 medical assessment report generation using ReportLab.
Produces sharp, selectable-text, high-resolution clinical reports with:
- Exact A4 dimensions (210mm x 297mm)
- Dynamic "Page X of Y" pagination via two-pass NumberedCanvas
- Vector-rendered CareTrack AI branding & logo
- Canonical exact website link: https://theneerajgrover.github.io/CareTrackAI/
- Structured patient vitals & demographics
- Clinical symptoms summary
- Ranked probabilistic condition predictions with risk classification
- Doctor / specialty routing, clinical warnings, and supportive remedies
- Official healthcare triage notice & medical disclaimer
"""

import io
import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Dict, Any, List, Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, PolyLine, String, Group

from gemini_service import get_doctor_specialty

# -- Canonical Configuration ----------------------------------------------------
CANONICAL_WEBSITE_URL = "https://theneerajgrover.github.io/CareTrackAI/"
IST_TIMEZONE = ZoneInfo("Asia/Kolkata")


def sanitize_report_filename(patient_name: Optional[str]) -> str:
    """
    Format: patient_name_caretrack_report.pdf
    Lowercase, alphanumeric and underscores only, normalized underscores, no UUIDs.
    Fallback: patient_caretrack_report.pdf
    """
    if not patient_name:
        return "patient_caretrack_report.pdf"
    clean = re.sub(r"[^a-zA-Z0-9]+", "_", str(patient_name).strip().lower())
    clean = re.sub(r"_+", "_", clean).strip("_")
    return f"{clean}_caretrack_report.pdf" if clean else "patient_caretrack_report.pdf"


def format_assessment_datetime(raw_date: Any) -> str:
    """
    Interprets the persisted assessment timestamp from Supabase PostgreSQL (UTC)
    and converts it accurately to Asia/Kolkata (IST).
    Display format: '23 November 2026 | 01:57 PM'
    Never uses current server or download time.
    Returns 'Assessment time unavailable' if missing or unparseable.
    """
    if not raw_date:
        return "Assessment time unavailable"

    dt: Optional[datetime] = None

    if isinstance(raw_date, datetime):
        dt = raw_date
    elif isinstance(raw_date, str):
        cleaned = raw_date.strip()
        if not cleaned:
            return "Assessment time unavailable"
        try:
            iso_str = cleaned.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso_str)
        except Exception:
            for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
                try:
                    dt = datetime.strptime(cleaned, fmt)
                    break
                except Exception:
                    pass

    if dt is None:
        return "Assessment time unavailable"

    # Supabase PostgreSQL TIMESTAMP without time zone stores UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    # Convert to Asia/Kolkata
    dt_ist = dt.astimezone(IST_TIMEZONE)
    return dt_ist.strftime("%d %B %Y | %I:%M %p")

# Colors
COLOR_PRIMARY = HexColor("#4338CA")       # Indigo accent
COLOR_PRIMARY_DARK = HexColor("#3730A3")  # Deep indigo
COLOR_PRIMARY_LIGHT = HexColor("#EEF2FF") # Light indigo tint
COLOR_PRIMARY_BORDER = HexColor("#C7D2FE")
COLOR_TEXT_MAIN = HexColor("#0F172A")     # Slate 900
COLOR_TEXT_MUTED = HexColor("#475569")    # Slate 600
COLOR_TEXT_LIGHT = HexColor("#64748B")    # Slate 500
COLOR_BG_CARD = HexColor("#F8FAFC")       # Slate 50
COLOR_BORDER = HexColor("#E2E8F0")        # Slate 200
COLOR_BORDER_STRONG = HexColor("#CBD5E1") # Slate 300

# Risk level colors
RISK_COLORS = {
    "critical": {
        "bg": HexColor("#FEF2F2"),
        "border": HexColor("#F87171"),
        "text": HexColor("#991B1B"),
        "label": "Critical Risk",
    },
    "high": {
        "bg": HexColor("#FFF1F2"),
        "border": HexColor("#FB7185"),
        "text": HexColor("#9F1239"),
        "label": "High Risk",
    },
    "moderate": {
        "bg": HexColor("#FFFBEB"),
        "border": HexColor("#FBBF24"),
        "text": HexColor("#92400E"),
        "label": "Moderate Risk",
    },
    "medium": {
        "bg": HexColor("#FFFBEB"),
        "border": HexColor("#FBBF24"),
        "text": HexColor("#92400E"),
        "label": "Moderate Risk",
    },
    "low": {
        "bg": HexColor("#ECFDF5"),
        "border": HexColor("#34D399"),
        "text": HexColor("#065F46"),
        "label": "Low Risk",
    },
}


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that dynamically calculates total page count
    and renders consistent running footers with clickable canonical website URL.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states: List[Dict[str, Any]] = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, total_pages: int):
        self.saveState()
        page_w, page_h = A4
        margin_x = 36.0
        footer_y = 20.0

        # Separator rule
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.6)
        self.line(margin_x, footer_y + 14.0, page_w - margin_x, footer_y + 14.0)

        # 1. LEFT SECTION: © CareTrackAI
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(COLOR_TEXT_MAIN)
        self.drawString(margin_x, footer_y, "© CareTrackAI")

        # 2. CENTER SECTION: Exact canonical website link
        url_text = CANONICAL_WEBSITE_URL
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(COLOR_PRIMARY)
        url_width = self.stringWidth(url_text, "Helvetica-Bold", 7.5)
        url_x = (page_w - url_width) / 2.0
        self.drawString(url_x, footer_y, url_text)

        # 3. RIGHT SECTION: Page X of Y
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(COLOR_TEXT_MUTED)
        self.drawRightString(page_w - margin_x, footer_y, page_str)

        self.restoreState()


def create_vector_logo(width: float = 175.0, height: float = 34.0) -> Drawing:
    """
    Renders the official CareTrack AI brand logo as pure vector shapes.
    Completely crisp at any zoom level with zero raster pixelation.
    """
    d = Drawing(width, height)

    # 1. Rounded square container with brand indigo gradient simulation
    d.add(Rect(0, 2, 30, 30, rx=7, ry=7, fillColor=COLOR_PRIMARY, strokeColor=None))

    # 2. White Activity lifeline / EKG heartbeat polyline
    # Coordinates aligned inside 30x30 box (centered at y=17)
    points = [4, 17, 8, 17, 12, 25, 17, 8, 21, 17, 26, 17]
    d.add(PolyLine(points, strokeColor=HexColor("#FFFFFF"), strokeWidth=2.2, strokeLineJoin=1, strokeLineCap=1))

    # 3. Typography: CareTrack AI
    d.add(String(38, 18, "CareTrack", fontName="Helvetica-Bold", fontSize=15, fillColor=COLOR_TEXT_MAIN))
    d.add(String(118, 18, "AI", fontName="Helvetica-Bold", fontSize=15, fillColor=COLOR_PRIMARY))
    d.add(String(38, 7, "CLINICAL HEALTH ASSESSMENT", fontName="Helvetica-Bold", fontSize=6.5, fillColor=COLOR_PRIMARY_DARK))

    return d


def generate_medical_report_pdf(report_data: Dict[str, Any]) -> bytes:
    """
    Generates a professional, print-ready, high-resolution A4 PDF report.

    Expects report_data to contain:
    - id: str (prediction ID)
    - created_at: str or datetime
    - patient: dict with name, age, gender, dob, blood_group, height, weight
    - symptoms: list of dicts with label/key, or list of strings
    - results: list of prediction finding dicts (rank, disease, confidence, risk_level, doctor, remedies, warning)
    """
    buf = io.BytesIO()

    # A4: 595.28 pt x 841.89 pt. 36 pt = 0.5 in margins. Printable width = 523.28 pt.
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=36.0,
        rightMargin=36.0,
        topMargin=32.0,
        bottomMargin=42.0,
    )

    printable_width = A4[0] - 72.0

    # Styles
    base_styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        "ReportTitle",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=COLOR_TEXT_MAIN,
    )
    style_subtitle = ParagraphStyle(
        "ReportSubtitle",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=COLOR_TEXT_MUTED,
    )
    style_sec_header = ParagraphStyle(
        "SectionHeader",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=COLOR_PRIMARY,
        spaceAfter=4,
    )
    style_label = ParagraphStyle(
        "FieldLabel",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.0,
        leading=10,
        textColor=COLOR_TEXT_LIGHT,
    )
    style_val = ParagraphStyle(
        "FieldValue",
        parent=base_styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.0,
        leading=11,
        textColor=COLOR_TEXT_MAIN,
    )
    style_body = ParagraphStyle(
        "BodyDark",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=COLOR_TEXT_MAIN,
    )
    style_warning = ParagraphStyle(
        "WarningBody",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11.5,
        textColor=HexColor("#991B1B"),
    )
    style_disclaimer = ParagraphStyle(
        "DisclaimerText",
        parent=base_styles["Normal"],
        fontName="Helvetica",
        fontSize=7.2,
        leading=9.5,
        textColor=COLOR_TEXT_LIGHT,
    )

    story = []

    # ── 1. Document Header & Reference Meta ──────────────────────────────────────
    logo_drawing = create_vector_logo(width=175.0, height=34.0)

    # Date formatting: actual assessment time in Asia/Kolkata
    raw_date = report_data.get("created_at")
    date_str = format_assessment_datetime(raw_date)

    pred_id = str(report_data.get("id") or report_data.get("prediction_id") or "UNKNOWN")
    short_ref = pred_id[:8].upper()

    meta_content = [
        Paragraph(f"<b>REPORT REF:</b> CTR-{short_ref}", style_label),
        Paragraph(f"<b>ASSESSMENT DATE &amp; TIME:</b> {date_str}", style_label),
        Paragraph("<b>ENGINE:</b> Gaussian Naive Bayes (v1.0)", style_label),
    ]

    header_table = Table(
        [[logo_drawing, meta_content]],
        colWidths=[printable_width * 0.44, printable_width * 0.56],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))

    # Decorative header divider
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_PRIMARY, spaceBefore=0, spaceAfter=10))

    # ── 2. Patient Demographics & Vitals Profile ──────────────────────────────────
    patient = report_data.get("patient") or {}
    patient_name = patient.get("name") or "Anonymous Patient"
    patient_age = f"{patient.get('age')} Years" if patient.get("age") else "Not specified"
    patient_gender = str(patient.get("gender") or "Not specified").capitalize()
    patient_blood = str(patient.get("blood_group") or patient.get("bloodGroup") or "Not specified")
    patient_height = f"{patient.get('height')} cm" if patient.get("height") else "Not specified"
    patient_weight = f"{patient.get('weight')} kg" if patient.get("weight") else "Not specified"
    patient_dob = str(patient.get("dob") or "Not specified")

    story.append(Paragraph("PATIENT VITALS & PROFILE", style_sec_header))

    vitals_data = [
        [
            Paragraph("FULL NAME", style_label),
            Paragraph("AGE & GENDER", style_label),
            Paragraph("BLOOD GROUP", style_label),
        ],
        [
            Paragraph(patient_name, style_val),
            Paragraph(f"{patient_age} · {patient_gender}", style_val),
            Paragraph(patient_blood, style_val),
        ],
        [
            Paragraph("HEIGHT & WEIGHT", style_label),
            Paragraph("DATE OF BIRTH", style_label),
            Paragraph("IDENTIFICATION", style_label),
        ],
        [
            Paragraph(f"{patient_height} · {patient_weight}", style_val),
            Paragraph(patient_dob, style_val),
            Paragraph(f"CTR-{short_ref}", style_val),
        ],
    ]

    col_w = printable_width / 3.0
    vitals_table = Table(vitals_data, colWidths=[col_w, col_w, col_w])
    vitals_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.8, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(vitals_table)
    story.append(Spacer(1, 10))

    # ── 3. Reported Symptoms Section ──────────────────────────────────────────────
    symptoms = report_data.get("symptoms") or []
    symptom_labels = []
    for s in symptoms:
        if isinstance(s, dict):
            symptom_labels.append(s.get("label") or s.get("key") or str(s))
        else:
            symptom_labels.append(str(s).replace("_", " ").title())

    symptom_count = len(symptom_labels)
    story.append(Paragraph(f"REPORTED SYMPTOMS ({symptom_count} Reported)", style_sec_header))

    if symptom_labels:
        # Group symptoms into 3 columns for balanced A4 presentation
        num_cols = 3
        rows = []
        for i in range(0, len(symptom_labels), num_cols):
            chunk = symptom_labels[i:i + num_cols]
            row_cells = []
            for item in chunk:
                cell_p = Paragraph(f"• <b>{item}</b>", style_body)
                row_cells.append(cell_p)
            while len(row_cells) < num_cols:
                row_cells.append(Paragraph("", style_body))
            rows.append(row_cells)

        sym_table = Table(rows, colWidths=[col_w, col_w, col_w])
        sym_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
            ("BOX", (0, 0), (-1, -1), 0.8, COLOR_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(sym_table)
    else:
        story.append(Paragraph("<i>No specific symptoms recorded on file.</i>", style_body))

    story.append(Spacer(1, 10))

    # ── 4. High Clinical Risk Warning Banner (if applicable) ───────────────────────
    results = report_data.get("results") or report_data.get("predictions") or []
    has_high_risk = any(
        str(r.get("risk_level", "")).lower() in ["critical", "high"] for r in results
    )

    if has_high_risk:
        alert_content = [
            Paragraph("<b>ELEVATED CLINICAL SEVERITY DETECTED</b>", ParagraphStyle(
                "AlertTitle", parent=style_label, textColor=HexColor("#991B1B"), fontSize=8.5, leading=10
            )),
            Paragraph(
                "One or more differential conditions identified below carries significant clinical risk. "
                "Share this report promptly with a qualified physician or present to an urgent care / emergency facility for formal evaluation.",
                style_warning,
            ),
        ]
        alert_table = Table([[alert_content]], colWidths=[printable_width])
        alert_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#FEF2F2")),
            ("BOX", (0, 0), (-1, -1), 1.0, HexColor("#F87171")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ]))
        story.append(alert_table)
        story.append(Spacer(1, 10))

    # ── 5. Diagnostic Findings & Probabilistic Matches ────────────────────────────
    story.append(Paragraph("DIAGNOSTIC FINDINGS & PROBABILISTIC MATCHES", style_sec_header))

    if results:
        for idx, res in enumerate(results):
            rank = res.get("rank", idx + 1)
            disease = str(res.get("disease") or res.get("disease_name") or "Undetermined").title()
            conf = float(res.get("confidence") or res.get("confidence_pct") or 0.0)
            risk = str(res.get("risk_level") or "low").lower()
            risk_info = RISK_COLORS.get(risk, RISK_COLORS["low"])
            doctor = res.get("doctor") or get_doctor_specialty(disease)

            warning_text = res.get("warning") or res.get("warning_text")
            remedies_text = res.get("remedies") or res.get("remedies_text")

            # Condition Header Table: [Rank | Disease & Doctor | Match % | Risk Badge]
            header_row = [
                Paragraph(f"<b>#{rank}</b>", ParagraphStyle(
                    "RankPill", parent=style_val, fontName="Helvetica-Bold", fontSize=12, textColor=COLOR_PRIMARY
                )),
                [
                    Paragraph(f"<b>{disease}</b>", ParagraphStyle("DisTitle", parent=style_val, fontSize=11, leading=13)),
                    Paragraph(f"Recommended Specialist: <b>{doctor}</b>", ParagraphStyle("DocTitle", parent=style_label, fontSize=7.5, textColor=COLOR_TEXT_MUTED)),
                ],
                Paragraph(f"<b>{conf:.1f}%</b><br/><font size=6.5 color='#64748B'>Match</font>", ParagraphStyle(
                    "ConfVal", parent=style_val, fontName="Helvetica-Bold", fontSize=11, leading=12, alignment=1
                )),
                Paragraph(f"<b>{risk_info['label'].upper()}</b>", ParagraphStyle(
                    "RiskBadge", parent=style_val, fontName="Helvetica-Bold", fontSize=7.5, textColor=risk_info["text"], alignment=1
                )),
            ]

            card_table = Table(
                [header_row],
                colWidths=[32.0, printable_width - 172.0, 60.0, 80.0],
            )
            card_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
                ("BOX", (0, 0), (-1, -1), 0.8, COLOR_BORDER_STRONG),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("BACKGROUND", (3, 0), (3, 0), risk_info["bg"]),
            ]))

            condition_elements = [card_table]

            # Optional Clinical Warning Sub-Box
            if warning_text:
                warn_box = Table(
                    [[
                        Paragraph(f"<b>CLINICAL ADVISORY:</b> {warning_text}", style_warning)
                    ]],
                    colWidths=[printable_width],
                )
                warn_box.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#FEF2F2")),
                    ("BOX", (0, 0), (-1, -1), 0.6, HexColor("#FCA5A5")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]))
                condition_elements.append(Spacer(1, 2))
                condition_elements.append(warn_box)

            # Optional Supportive Care Remedies Sub-Box
            if remedies_text:
                clean_remedies = remedies_text.replace("\n", "<br/>")
                remedies_box = Table(
                    [[
                        Paragraph(
                            f"<b>SUPPORTIVE CARE & HOME GUIDANCE:</b><br/>{clean_remedies}",
                            ParagraphStyle("RemText", parent=style_body, fontSize=8.0, leading=10.5, textColor=COLOR_TEXT_MAIN)
                        )
                    ]],
                    colWidths=[printable_width],
                )
                remedies_box.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]))
                condition_elements.append(Spacer(1, 2))
                condition_elements.append(remedies_box)

            condition_elements.append(Spacer(1, 6))

            # Keep individual condition card elements together to avoid awkward mid-card breaks
            story.append(KeepTogether(condition_elements))
    else:
        story.append(Paragraph("<i>No diagnostic matches were produced for the recorded symptoms.</i>", style_body))

    story.append(Spacer(1, 8))

    # ── 6. Legal & Clinical Healthcare Disclaimer ─────────────────────────────────
    disclaimer_p = Paragraph(
        "<b>LEGAL & CLINICAL PRACTICE NOTICE:</b> This health assessment summary was generated by CareTrack AI's automated "
        "Gaussian Naive Bayes inference engine calibrated across 713 clinical disease classes. It is provided exclusively for "
        "personal health awareness, triage guidance, and informed discussion with a physician. This document does not constitute a "
        "definitive medical diagnosis, clinical prognosis, or certified prescription. Always seek the advice of a qualified, licensed "
        "healthcare provider regarding any acute symptoms or ongoing medical conditions.",
        style_disclaimer,
    )
    disc_table = Table([[disclaimer_p]], colWidths=[printable_width])
    disc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.6, COLOR_BORDER_STRONG),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether([disc_table]))

    # Build the document using NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)

    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes
