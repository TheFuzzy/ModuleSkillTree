from google.appengine.ext import ndb, blobstore
import uuid

MEMCACHE_MODULELIST_KEY = "moduleList"

# Student model
class Student(ndb.Model):
    user = ndb.UserProperty(verbose_name="User", required=True)
    name = ndb.StringProperty(verbose_name="Name", required=True)
    admin_no = ndb.StringProperty(verbose_name="Admin No.") # optional property?
    
    @property
    def skill_trees(self):
        return SkillTree.query(SkillTree.student_k == self.key)
    
# Skill tree model, to allow one user to save several skill trees.
class SkillTree(ndb.Model):
    student_k = ndb.KeyProperty(kind='Student', verbose_name="Student Key") # Not required; may be anonymous
    name = ndb.StringProperty(verbose_name="Name", required=True)
    guid = ndb.StringProperty(verbose_name="GUID")
    first_year = ndb.StringProperty(verbose_name="First Academic Year", required=True) # The year in which the first semester falls into
    first_semester = ndb.IntegerProperty(verbose_name="First Semester", required=True) # The semester in which the first semester of the skill tree occurs in
    
    @property
    def assigned_modules(self):
        return AssignedModule.query(AssignedModule.skill_tree_k == self.key)
    
    # Factory method to generate a GUID for the skill tree
    @classmethod
    def with_guid(cls, **kwargs):
        guid = uuid.uuid1().hex
        self = SkillTree(
            student_k = kwargs.get("student_k"),
            name = kwargs.get("name"),
            guid = guid,
            first_year = kwargs.get("first_year"),
            first_semester = kwargs.get("first_semester")
        )
        return self
    
class ModulePrerequisiteGroup(ndb.Model):
    #module_k = ndb.KeyProperty(kind='Module', verbose_name="Module", required=True)
    prerequisites = ndb.StringProperty(verbose_name="Pre-requisites", repeated=True)
    #type = ndb.StringProperty(
    #    verbose_name="Type",
    #    choices=["and", "or"],  # There may be other types of conditions
    #    required=True
    #    ) # Whether it is an AND condition, OR condition, etc.
    #is_nested = ndb.BooleanProperty(verbose_name="Is nested pre-requisite group", required=True) # Whether the group is within another group

class Module(ndb.Model):
    code = ndb.StringProperty(verbose_name="Code", required=True)
    acad_year = ndb.StringProperty(verbose_name="Academic Year", required=True)
    semester = ndb.IntegerProperty(verbose_name="Semester", required=True)
    name = ndb.StringProperty(verbose_name="Name", required=True)
    description = ndb.TextProperty(verbose_name="Description", required=True)
    mc = ndb.IntegerProperty(verbose_name="MCs", required=True)
    preclusions = ndb.StringProperty(verbose_name="Preclusions", repeated=True) # List of module codes as Strings
    represented_codes = ndb.StringProperty(verbose_name="Represented Codes", repeated=True) # List preclusions and the module code itself as Strings, used for searching
    prerequisite_groups = ndb.LocalStructuredProperty(ModulePrerequisiteGroup, verbose_name="Prerequisite Groups", repeated=True)
    
    #@property
    #def prerequisite_groups(self):
    #    return ModulePrerequisiteGroup.query(ModulePrerequisiteGroup.module == self.key)
    
class AssignedModule(ndb.Model):
    module_k = ndb.KeyProperty(kind=Module, verbose_name="Module Key", required=True)
    skill_tree_k = ndb.KeyProperty(kind=SkillTree, verbose_name="Skill Tree Key", required=True)
    semester = ndb.IntegerProperty(verbose_name="Semester", required=True) # Which semester the student wishes to take the module in the skill tree
    semester_index = ndb.IntegerProperty(verbose_name="Semester Index", required=True) # The location of the module within the semester 
    prerequisites = ndb.StringProperty(verbose_name="Prerequisites", repeated=True) # List of module codes as Strings, may amend to be keys instead
    is_exception = ndb.BooleanProperty(verbose_name="Is an exceptional case", required=True) # Whether the client should ignore pre-requisites as a "special case"

class ModuleList(ndb.Model):
    data = ndb.JsonProperty(verbose_name="Data", required=True, indexed=False) # Stripped list of modules as a simply Python dict.
    time_generated = ndb.DateTimeProperty(verbose_name="Date Retrieved", auto_now_add=True)

class CachedModuleRepo(ndb.Model):
    data_k = ndb.BlobKeyProperty(verbose_name="Blob Key", required=True)
    date_retrieved = ndb.DateProperty(verbose_name="Date Retrieved", auto_now_add=True)
    acad_year = ndb.StringProperty(verbose_name="Academic Year", required=True)
    semester = ndb.IntegerProperty(verbose_name="Semester", required=True)