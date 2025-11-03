from backend.api.models import CourseQuery, PathwayCourse
from models import DegreePathways, UHCourses, UHCourse
#
# with open("../data/manoa_degree_pathways_formatted.json", "r") as f:
#     pathways_json = f.read()
# pathways = DegreePathways.model_validate_json(pathways_json)

# with open("../data/manoa_degree_pathways_formatted.json", "w") as f:
#     f.write(pathways.model_dump_json(indent=2))

with open("../data/courses/manoa_formatted_3.json", "r") as f:
    courses_json = f.read()
courses = UHCourses.model_validate_json(courses_json)


def yes(course: UHCourse):
    return len(course.subject_code) == 2

print("\n".join(c.model_dump_json(indent=2) for c in courses.root if yes(c)))

# print("\n".join(str(c.designations) + c.metadata for c in courses.root if c.designations and len(c.designations[0]) == 1))
# with open("../data/courses/manoa_formatted_3.json", "w") as f:
#     f.write(courses.model_dump_json(indent=2))

from db import get_pathway_db, get_course_db

pathway_db = get_pathway_db()
course_db = get_course_db()

# count = 0
# pathway = pathway_db.get_similar_pathways("I like computers")[0]
# for y in pathway.years:
#     for s in y.semesters:
#         for c in s.courses:
#             count += 1
# print(count)

# co = course_db.query(query="i like computers", pathway_course=PathwayCourse(name="ICS 300+", credits=4))
# q = CourseQuery(subject_code='CINE', course_number=255, course_number_gte=None, course_suffix=None, designations=['DH'], query='i like computers', credits=3, k=10, n=1)
# print(*[c.model_dump_json(indent=2) for c in co])