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


class UHCoursePlan(UHCourse):
    candidates: list[UHCourse] = []

# -----------------------------
# Mānoa degree pathways
# -----------------------------

SemesterName = Literal["fall", "spring", "summer"]

from typing import List, Generic, TypeVar
from pydantic import BaseModel, Field, ConfigDict
import uuid

CourseT = TypeVar("CourseT", bound=BaseModel)

class PathwayCourse(BaseModel):
    name: str
    credits: int = Field(ge=0)

class SemesterPlan(BaseModel, Generic[CourseT]):
    model_config = ConfigDict(extra="forbid")

    semester_name: SemesterName
    credits: int = Field(ge=0)
    courses: List[CourseT]


class YearPlan(BaseModel, Generic[CourseT]):
    year_number: int
    semesters: List[SemesterPlan[CourseT]]


class DegreePathwayBase(BaseModel, Generic[CourseT]):
    model_config = ConfigDict(extra="forbid")

    pathway_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    program_name: str
    institution: str
    total_credits: int = Field(ge=0)
    years: List[YearPlan[CourseT]]

DegreePathway = DegreePathwayBase[PathwayCourse]

class CompleteDegreePathway(DegreePathwayBase[UHCoursePlan]):
    summary: str
    candidates: list[str]

class DegreePathways(RootModel[List[DegreePathway]]):
    pass

class CourseQueryBase(BaseModel):
    subject_code: str | None = None
    course_number: int | None = None
    course_number_gte: int | None = None
    course_suffix: str | None = None
    designations: list[str] | None = None

class CourseQuery(CourseQueryBase):
    query: str | None = None
    credits: int | None = None
    k: int | None = None
    n: int | None = None

