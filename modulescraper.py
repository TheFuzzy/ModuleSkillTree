import os
import logging
from google.appengine.api import files, taskqueue
from google.appengine.ext.blobstore import BlobInfo

from django.utils import simplejson as json
import urllib
import urllib2
from datetime import date, datetime

from datatypes import Module, ModulePrerequisiteGroup, CachedModuleRepo

class Sources:
    NUSMODS = 'nusmods'
    NUS_BULLETIN = 'nusbulletin'
    TEST = 'test'

SOURCE = Sources.NUSMODS

def retrieve_modules(acad_year, semester):
    modules = None
    must_cache_modules = False
    if is_cached(acad_year, semester, SOURCE):
        logging.debug("Modules in %s, %d are cached." % (acad_year, semester))
        modules = get_cached_modules(acad_year, semester, SOURCE)
    else:
        must_cache_modules = True
        logging.debug("Modules in %s, %d are not cached." % (acad_year, semester))
        logging.debug("Scraping from source: %s" % SOURCE)
        if SOURCE == Sources.TEST:
            modules = scrape_test(acad_year, semester)
        elif SOURCE == Sources.NUSMODS:
            modules = scrape_nusmods(acad_year, semester)
    logging.debug("Modules retrieved, storing in datastore")
    store_modules(acad_year, semester, modules)
    logging.debug("Modules completely stored")
    if must_cache_modules:
        logging.debug("Caching modules retrieved")
        cache_modules(acad_year, semester, SOURCE, modules)

def retrieve_modules_from_cache(acad_year, semester):
    modules = None
    if is_cached(acad_year, semester, SOURCE):
        modules = get_cached_modules(acad_year, semester, SOURCE)
        store_modules(acad_year, semester, modules)
    else:
        logging.error("No module repository cached for %s, %d" % (acad_year, semester))
    
def is_cached(acad_year, semester, source):
    return False
    
def get_cached_modules(acad_year, semester, source):
    return None
    
def cache_modules(acad_year, semester, source, modules):
    file_name = files.blobstore.create(mime_type="application/json")
    logging.debug('Dumping file into blobstore')
    with files.open(file_name, 'a') as file:
        json.dump(modules, file)
    logging.debug('File dump successful')
    files.finalize(file_name)
    logging.debug('File finalized')
    blob_key = files.blobstore.get_blob_key(file_name)
    cached_module_file = CachedModuleRepo(
        data=BlobInfo.get(blob_key),
        date_retrieved=date.today(),
        acad_year=acad_year,
        semester=semester
        )
    cached_module_file.put()
    logging.debug('Cached module record added to database')
    
def store_modules(acad_year, semester, modules):
    for module_code, module in modules.iteritems():
        logging.debug("Storing module %s" % module_code)
        stored_module = Module(
            key_name = "%s_%s_%d" % (module_code, acad_year, semester),
            code = module_code,
            acad_year = acad_year,
            semester = semester,
            name = module["name"],
            description = module["description"],
            mc = module["mc"]
            )
        if "preclusions" in module:
            stored_module.preclusions = module["preclusions"]
        stored_module.put()
        logging.debug("Module stored")
        
        if "prerequisites" in module:
            for group in module["prerequisites"]:
                store_prerequisite_group(group, module=stored_module)

# Recursively stores nested prerequisite groups
def store_prerequisite_group(group, module=None, parent=None):
    logging.debug("Storing prerequsite group")
    prereq_group = ModulePrerequisiteGroup(
        type=group["type"],
        is_nested=(parent is not None)
        )
    if module is not None:
        prereq_group.module = module
    if parent is not None:
        prereq_group.parent_group = parent
    if group["modules"]:
        prereq_group.prerequisites = group["modules"]
    
    prereq_group.put()
    logging.debug("Group inserted into datastore")
    
    if "groups" in group:
        for child_group in group["groups"]:
            store_prerequisite_group(child_group, parent=prereq_group)
    
    if parent is None:
        logging.debug("Prerequisite groups stored")

# Modules scraped must be filtered to adhere to the datatype defined (to reduce space)
#
# Follow this data format:
# {
#   "{module code}" : {
#       "code" : {module code}
#       "name" : {name}
#       "description" : {desc}
#       "mc" : {mc}
#       "preclusions" : [ {module codes as strings} ]
#       "prerequisites" : ?
#   },
#   ...
# }
#

# Scraper for NUSMods
def scrape_nusmods(acad_year, semester):
    NUSMODS_JSON_URL = 'http://nusmods.com/json/mod_info.json'
    url_string = NUSMODS_JSON_URL
    req = urllib2.Request(url_string)
    res = urllib2.urlopen(req)
    nusmods_modules = json.loads(res.read())["cors"]
    modules = {}
    for nusmods_module in nusmods_modules.itervalues():
        description = "No description"
        if "description" in nusmods_module:
            description = nusmods_module["description"]
        modules[nusmods_module["label"]] = {
            "code" : nusmods_module["label"],
            "name" : nusmods_module["title"],
            "description" : description,
            "mc" : int(nusmods_module["mcs"])
            }
    return modules

# Unit test scraper
def scrape_test(acad_year, semester):
    module = {
        "TE57" : {
            "code" : "TE57",
            "name" : "Test Module",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : ["TE58", "TE59"],
            "prerequisites" : [
                {   "type" : "or",
                    "modules" : [ "TE55", "TE56", "TES57" ]
                    }
                ]
            }
        }
    return module
