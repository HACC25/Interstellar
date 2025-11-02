from models import DegreePathways, UHCourses, UHCourse

with open("../data/manoa_degree_pathways_formatted.json", "r") as f:
    pathways_json = f.read()
pathways = DegreePathways.model_validate_json(pathways_json)

# with open("../data/manoa_degree_pathways_formatted.json", "w") as f:
#     f.write(pathways.model_dump_json(indent=2))

with open("../data/courses/manoa_formatted_2.json", "r") as f:
    courses_json = f.read()
courses = UHCourses.model_validate_json(courses_json)

# print("\n".join(c.model_dump_json(indent=2) for c in courses.root))

# print("\n".join(str(c.designations) + c.metadata for c in courses.root if len(c.designations) > 1))
# with open("../data/courses/manoa_formatted_2.json", "w") as f:
#     f.write(courses.model_dump_json(indent=2))

from db import get_pathway_db
pathway_db = get_pathway_db()

# table = db.create_table("courses", schema=DegreePathwayLance)
# table = db.open_table("pathways")
# print(pathways.root[0].to_lance())
# table.add([p.to_lance() for p in pathways.root])

# print(db.table_names())
print(pathway_db.get_similar_pathways("computer science but i like data"))