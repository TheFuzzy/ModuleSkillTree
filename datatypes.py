from google.appengine.ext import db, blobstore

# Student model
class Student(db.Model):
    user = db.UserProperty(verbose_name="User", required=True)
    admin_no = db.StringProperty(verbose_name="Admin No.") # optional property?
    
# Skill tree model, to allow one user to save several skill trees.
class SkillTree(db.Model):
    student = db.ReferenceProperty(reference_class=Student, verbose_name="Student", collection_name="skill_trees", required=True)
    first_year = db.StringProperty(verbose_name="First Academic Year", required=True) # The year in which the first semester falls into
    first_semester = db.IntegerProperty(verbose_name="First Semester", required=True) # The semester in which the first semester of the skill tree occurs in

class Module(db.Model):
    code = db.StringProperty(verbose_name="Code", required=True)
    acad_year = db.StringProperty(verbose_name="Academic Year", required=True)
    semester = db.IntegerProperty(verbose_name="Semester", required=True)
    name = db.StringProperty(verbose_name="Name", required=True)
    description = db.TextProperty(verbose_name="Description", required=True)
    mc = db.IntegerProperty(verbose_name="MCs", required=True)
    preclusions = db.StringListProperty(verbose_name="Preclusions", required=True) # List of module codes as Strings

class ModulePrerequisiteGroup(db.Model):
    module = db.ReferenceProperty(reference_class=Module, verbose_name="Module", collection_name="prerequisite_groups")
    parent_group = db.SelfReferenceProperty(verbose_name="Parent group", collection_name="groups")
    prerequisites = db.StringListProperty(verbose_name="Pre-requisites")
    type = db.StringProperty(
        verbose_name="Type",
        choices=["and", "or"],  
        required=True
        ) # Whether it is an AND condition, OR condition, etc.
    is_nested = db.BooleanProperty(verbose_name="Is nested pre-requisite group", required=True) # Whether the group is within another group
    
class AssignedModule(db.Model):
    module = db.ReferenceProperty(reference_class=Module, verbose_name="Module", required=True)
    skill_tree = db.ReferenceProperty(reference_class=SkillTree, verbose_name="Skill Tree", collection_name="assigned_modules", required=True)
    semester = db.IntegerProperty(verbose_name="Semester", required=True) # Which semester the student wishes to take the module in the skill tree
    prerequisites = db.StringListProperty(verbose_name="Prerequisites") # List of module codes as Strings, may amend to be keys instead
    is_exception = db.BooleanProperty(verbose_name="Is an exceptional case", required=True) # Whether the client should ignore pre-requisites as a "special case"

class CachedModuleRepo(db.Model):
    data = blobstore.BlobReferenceProperty(verbose_name="Blob Info", required=True)
    date_retrieved = db.DateProperty(verbose_name="Date Retrieved", required=True)
    acad_year = db.StringProperty(verbose_name="Academic Year", required=True)
    semester = db.IntegerProperty(verbose_name="Semester", required=True)