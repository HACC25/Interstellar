from typing import List, Literal
from pydantic import BaseModel, Field, ConfigDict, RootModel, model_validator, field_validator
import uuid
import re

# -----------------------------
# Credits range
# -----------------------------

class CreditsRange(BaseModel):
    """Normalized credits as a closed range [min, max]."""
    model_config = ConfigDict(extra="forbid")

    min: float = Field(ge=0)
    max: float = Field(ge=0)

    @model_validator(mode="after")
    def _check_order(self):
        if self.max < self.min:
            raise ValueError("credits range invalid: max < min")
        return self


# -----------------------------
# UH courses
# -----------------------------

class CreditsRange(BaseModel):
    min: float
    max: float

import uuid
import re
from typing import Optional

class UHCourse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    course_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject_code: str = Field(alias="course_prefix")
    course_number: int
    course_suffix: Optional[str] = None
    course_title: str
    course_desc: str
    num_units: CreditsRange
    dept_name: str
    inst_ipeds: int
    metadata: str
    designations: list[str]

class UHCourses(RootModel[List[UHCourse]]):
    pass


# -----------------------------
# Mānoa degree pathways
# -----------------------------

SemesterName = Literal["fall", "spring", "summer"]

class PathwayCourse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    credits: int = Field(ge=0)

class SemesterPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semester_name: SemesterName
    credits: int = Field(ge=0)
    courses: List[PathwayCourse]

class YearPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")

    year_number: int
    semesters: List[SemesterPlan]

class DegreePathway(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pathway_id: str = Field(default_factory=lambda : str(uuid.uuid4()))
    program_name: str
    institution: Literal["Manoa"] = "Manoa"
    total_credits: int = Field(ge=0)
    years: List[YearPlan]

class DegreePathways(RootModel[List[DegreePathway]]):
    pass

