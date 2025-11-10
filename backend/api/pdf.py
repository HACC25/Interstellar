from datetime import datetime
from io import BytesIO
import unicodedata
from textwrap import fill

from fpdf import FPDF

from backend.api.models import CompleteDegreePathway, UHCourse, UHCoursePlan

# Color palette tuned for white backgrounds
PRIMARY_BLUE = (30, 64, 175)
SECONDARY_BLUE = (3, 105, 161)
ACCENT_BLUE = (37, 99, 235)
TEXT_PRIMARY = (15, 23, 42)
TEXT_SECONDARY = (71, 85, 105)
TEXT_MUTED = (100, 116, 139)


class PathwayPDF(FPDF):
    """Small helper to keep PDF-specific configuration in one place."""

    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*PRIMARY_BLUE)
        self.cell(0, 10, "Degree Pathway Plan", ln=True, align="C")
        self.ln(2)
        self.set_draw_color(*PRIMARY_BLUE)
        self.set_line_width(0.6)
        self.line(10, 22, 200, 22)
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*TEXT_MUTED)
        self.cell(0, 10, f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}", align="L")
        self.cell(0, 10, f"Page {self.page_no()}", align="R")


def _sanitize_text(text: str) -> str:
    if not text:
        return ""

    replacements = {
        "ʻ": "'",
        "’": "'",
        "‘": "'",
        "–": "-",
        "—": "-",
        "·": "-",
        "•": "-",
        "…": "...",
    }
    for original, replacement in replacements.items():
        text = text.replace(original, replacement)

    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return ascii_text


def _line_breaks(text: str, width: int = 90) -> str:
    """Ensure long tokens wrap nicely inside PDF columns."""
    cleaned = _sanitize_text(text)
    if not cleaned:
        return ""

    wrapped_lines = []
    for raw_line in cleaned.splitlines():
        stripped = raw_line.strip()
        if not stripped:
            wrapped_lines.append("")
            continue
        wrapped_lines.append(fill(stripped, width=width))
    return "\n".join(wrapped_lines)


def _add_semester(pdf: PathwayPDF, semester_name: str, credits: int) -> None:
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*SECONDARY_BLUE)
    pdf.cell(0, 8, _sanitize_text(f"{semester_name.title()} - {credits} credits"), ln=True)
    pdf.ln(2)


def _add_course(pdf: PathwayPDF, course: UHCourse | UHCoursePlan) -> None:
    code = f"{course.subject_code} {course.course_number}"
    if course.course_suffix:
        code = f"{code} {course.course_suffix}"

    credits_range = course.num_units
    credits = (
        f"{credits_range.min}"
        if credits_range.min == credits_range.max
        else f"{credits_range.min}-{credits_range.max}"
    )

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*TEXT_PRIMARY)
    pdf.cell(0, 6, _sanitize_text(f"{code} - {course.course_title}"), ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT_SECONDARY)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 5, _line_breaks(course.course_desc))

    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*TEXT_MUTED)
    meta_parts = [
        f"Credits: {credits}",
        f"Department: {course.dept_name}",
    ]
    if course.designations:
        meta_parts.append("Designations: " + ", ".join(course.designations))
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 4, _sanitize_text(" - ".join(meta_parts)))
    pdf.ln(2)

    if isinstance(course, UHCoursePlan) and course.candidates:
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*ACCENT_BLUE)
        pdf.cell(0, 5, "Candidate Courses:", ln=True)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*TEXT_SECONDARY)
        for candidate in course.candidates:
            candidate_code = f"{candidate.subject_code} {candidate.course_number}"
            if candidate.course_suffix:
                candidate_code = f"{candidate_code} {candidate.course_suffix}"
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(
                0,
                4,
                _sanitize_text(f"- {candidate_code} - {candidate.course_title}"),
            )
        pdf.ln(1)


def build_pathway_pdf(plan: CompleteDegreePathway) -> bytes:
    """Render a pathway plan into a PDF and return the raw bytes."""
    pdf = PathwayPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*TEXT_PRIMARY)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 8, _line_breaks(plan.program_name))
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*TEXT_SECONDARY)
    pdf.cell(
        0,
        6,
        _sanitize_text(f"{plan.institution} - {plan.total_credits} credits total"),
        ln=True,
    )
    pdf.ln(5)

    if plan.summary:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*ACCENT_BLUE)
        pdf.cell(0, 6, "Plan Summary", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*TEXT_SECONDARY)
        pdf.multi_cell(0, 5, _line_breaks(plan.summary))
        pdf.ln(4)

    if plan.candidates:
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*ACCENT_BLUE)
        pdf.cell(0, 6, "Similar Pathways:", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*TEXT_SECONDARY)
        for candidate in plan.candidates:
            pdf.set_x(pdf.l_margin)
            pdf.multi_cell(0, 5, _sanitize_text(f"- {candidate.name}"))
        pdf.ln(4)

    for year in plan.years:
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(*PRIMARY_BLUE)
        pdf.cell(0, 7, _sanitize_text(f"Year {year.year_number}"), ln=True)
        pdf.ln(1)

        for semester in year.semesters:
            _add_semester(pdf, semester.semester_name, semester.credits)
            for course in semester.courses:
                _add_course(pdf, course)
            pdf.ln(2)

        pdf.ln(2)

    output = BytesIO()
    pdf.output(output)
    return output.getvalue()
