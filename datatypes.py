from google.appengine.ext import db, blobstore

# Student model
class Student(db.Model):
    user = db.UserProperty("User")
    admin_no = db.StringProperty("Admin No.") # optional property?

class Module(db.Model):
    code = db.StringProperty("Code")
    name = db.StringProperty("Name")
    description = db.TextProperty("Description")
    mc = db.IntegerProperty("MCs")
    preclusions = db.StringListProperty("Preclusions") # List of module codes as Strings
    prerequisites = db.StringListProperty("Pre-requisites") # List of module codes as Strings

class AssignedModule(db.Model):
    module = db.ReferenceProperty(Module, "Module")
    student = db.ReferenceProperty(Student, "Student")
    semester = db.IntegerProperty("Semester") # Which semester the student wishes to take the module in the skill tree
    prerequisites = db.StringListProperty("Prerequisites") # List of module codes as Strings, may amend to be keys instead
    is_exception = db.BooleanProperty("Is an exceptional case") # Whether the client should ignore pre-requisites as a "special case"

class CachedModuleRepo(db.Model):
    data = blobstore.BlobReferenceProperty("Blob Info")
    date_retrieved = db.DateProperty("Date Retrieved")