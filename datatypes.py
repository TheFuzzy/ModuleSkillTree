from google.appengine.ext import db

# Student model
class Student(db.Model):
    user = db.UserProperty()
    admin_no = db.StringProperty() # optional property?
    modules = db.ListProperty(db.Key) # Refers to a list of keys of the Module model only

class Module(db.Model):
    code = db.StringProperty()
    name = db.StringProperty()
    description = db.TextProperty()
    mc = db.IntegerProperty()
    preclusions = db.StringListProperty() # List of module codes as Strings
    prerequisites = db.StringListProperty() # List of module codes as Strings

class AssignedModule(db.Model):
    module = db.ReferenceProperty(Module)
    semester = db.IntegerProperty() # Which semester the student wishes to take the module in the skill tree
    prerequisites = db.StringListProperty() # List of module codes as Strings, may amend to be keys instead
    is_exception = db.BooleanProperty() # Whether the client should ignore pre-requisites as a "special case"
    