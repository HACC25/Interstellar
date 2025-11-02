from typing import List, Literal, Optional, Annotated
from pydantic import BaseModel, Field, ConfigDict, computed_field, RootModel, field_validator, model_validator
import re

# ==========================
# UH campus course model
# ==========================

NonNegInt = Annotated[int, Field(ge=0, description="Non-negative integer")]

NonNegInt = Annotated[int, Field(ge=0)]
SemesterName = Literal["fall", "spring", "summer"]

class CreditsRange(BaseModel):
    """Normalized credits as a closed range [min, max]."""
    model_config = ConfigDict(extra="forbid")

    min: Annotated[float, Field(ge=0)]
    max: Annotated[float, Field(ge=0)]

    @model_validator(mode="after")
    def _check_order(self):
        if self.max < self.min:
            raise ValueError(f"credits range invalid: min {self.min} > max {self.max}")
        return self

class UHCourse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    course_prefix: str
    course_number: str
    course_title: str
    course_desc: str
    # Structured credits: {min: float, max: float}
    num_units: CreditsRange
    dept_name: str
    inst_ipeds: int
    metadata: Optional[str] = None

    @field_validator("num_units", mode="before")
    @classmethod
    def _parse_num_units(cls, v):
        """
        Accepts:
          - dict {"min": ..., "max": ...}
          - "V"/"var"/"variable"  -> {1.0, 4.0}
          - "3", 3, 1.5           -> {x, x}
          - "1-3", "1 – 3", "1 to 3", "0.5-3" -> {min, max}
        Rejects:
          - None/blank (you’ll drop these rows upstream)
        """
        if isinstance(v, dict):
            return v
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ValueError("num_units missing (MVP: drop this row)")

        s = str(v).strip()

        # Variable → 1–4
        if s.lower() in {"v", "var", "variable"}:
            return {"min": 1.0, "max": 4.0}

        # Normalize ranges
        s_norm = re.sub(r"\s*(–|—|to)\s*", "-", s, flags=re.IGNORECASE)
        s_norm = re.sub(r"\s*-\s*", "-", s_norm)

        m = re.fullmatch(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)", s_norm)
        if m:
            lo, hi = float(m.group(1)), float(m.group(2))
            return {"min": lo, "max": hi}

        # Fixed number
        if re.fullmatch(r"\d+(?:\.\d+)?", s_norm):
            x = float(s_norm)
            return {"min": x, "max": x}

        raise ValueError(f"Unrecognized num_units: {v!r}")

from typing import List
from pydantic import RootModel, ConfigDict, model_validator

class UHCourses(RootModel[List[UHCourse]]):
    @model_validator(mode="before")
    @classmethod
    def _drop_rows_with_missing_num_units(cls, v):
        """
        MVP rule: drop any rows where num_units is None/blank *before* building UHCourse.
        Works when called via .model_validate_json(...) or .model_validate(...).
        """
        if isinstance(v, list):
            return [r for r in v if not (
                    isinstance(r, dict) and r.get("num_units") in (None, "", " ")
            )]
        return v

# ==========================
# Mānoa degree pathways
# ==========================

class PathwayCourse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    credits: NonNegInt


SemesterName = Literal["fall", "spring", "summer"]

class SemesterPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semester_name: SemesterName
    credits: NonNegInt
    courses: List[PathwayCourse]

    @field_validator("semester_name", mode="before")
    @classmethod
    def normalize_semester_name(cls, v: str):
        if not isinstance(v, str):
            return v
        s = v.strip().lower().replace("-", " ").replace("_", " ")
        s = " ".join(s.split())  # collapse whitespace

        # tokens present in the string
        tokens = set(re.findall(r"\b(fall|spring|summer)\b", s))

        # MVP rule: if both summer and fall are present, default to fall
        if "fall" in tokens and "summer" in tokens:
            return "fall"

        # simple canonical mappings
        mapping = {
            "fall": "fall", "fall semester": "fall",
            "spring": "spring", "spring semester": "spring",
            "summer": "summer", "summer semester": "summer",
        }
        return mapping.get(s, s)  # unknowns will fail Literal validation (good)


class YearPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    year_number: int
    semesters: List[SemesterPlan]


class DegreePathway(BaseModel):
    model_config = ConfigDict(extra="forbid")

    program_name: str
    institution: Literal["Manoa"] = "Manoa"
    total_credits: NonNegInt
    years: List[YearPlan]

    @field_validator("institution", mode="before")
    @classmethod
    def force_manoa(cls, _):
        # MVP: ignore whatever comes in and just set "Manoa"
        return "Manoa"

class DegreePathways(RootModel[List[DegreePathway]]):
    pass