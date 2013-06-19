import os
import logging
from google.appengine.api import files, memcache
from google.appengine.ext import blobstore, db

from django.utils import simplejson as json
import urllib2
from datetime import date, datetime

import datatypes

class Sources:
    NUSMODS = 'nusmods'
    NUS_BULLETIN = 'nusbulletin'
    TEST = 'test'

SOURCE = Sources.TEST

def retrieve_modules(acad_year, semester):
    modules = None
    must_cache_modules = False
    if is_cached(acad_year, semester, SOURCE):
        logging.debug("Modules in %s, %d are cached." % (acad_year, semester))
        modules = get_cached_modules(acad_year, semester, SOURCE)
    else:
        #must_cache_modules = True
        logging.debug("Modules in %s, %d are not cached." % (acad_year, semester))
        logging.debug("Scraping from source: %s" % SOURCE)
        if SOURCE == Sources.TEST:
            modules = scrape_test(acad_year, semester)
        elif SOURCE == Sources.NUSMODS:
            modules = scrape_nusmods(acad_year, semester)
        logging.debug("Modules restored")
    logging.debug("Filling prerequisite groups with missing preclusions")
    fill_prerequisite_groups(modules)
    logging.debug("Storing modules in datastore")
    store_modules(acad_year, semester, modules)
    logging.debug("Modules completely stored")
    #if must_cache_modules:
    #    logging.debug("Caching modules retrieved")
    #    cache_modules(acad_year, semester, SOURCE, modules)
    logging.debug("Groups filled")
    generate_module_list(modules)

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
    cached_module_file = datatypes.CachedModuleRepo(
        data=blobstore.BlobInfo.get(blob_key),
        date_retrieved=date.today(),
        acad_year=acad_year,
        semester=semester
        )
    cached_module_file.put()
    logging.debug('Cached module record added to database')

# Generates a simplified module list containing only the code and name of each module, and stores it in the blobstore and memcache
def generate_module_list(modules):
    json_modules = {}
    for module_code, module in modules.iteritems():
        json_modules[module_code] = {
            "code" : module["code"],
            "name" : module["name"]
        }
    file_name = files.blobstore.create(mime_type="application/json")
    logging.debug('Generating simple module list for %d modules' % len(modules))
    json_modules_string = json.dumps(json_modules, sort_keys=True)
    logging.debug('List generated')
    logging.debug('Storing list in blobstore')
    with files.open(file_name, 'a') as file:
        file.write(json_modules_string)
    logging.debug('List stored')
    files.finalize(file_name)
    logging.debug('List file finalized')
    blob_key = files.blobstore.get_blob_key(file_name)
    module_list = datatypes.ModuleList(data=blobstore.BlobInfo.get(blob_key))
    module_list.put()
    logging.debug('List file record added to database')
    cache_module_list(json_modules_string) # Cache only after the blob file is inserted and recorded in the datastore

# Stores the simplified module list in the memcache
def cache_module_list(json_modules_string):
    client = memcache.Client()
    logging.debug('Caching module list')
    curr_json_string = client.get(key=datatypes.MEMCACHE_MODULELIST_KEY)
    if curr_json_string is None:
        logging.debug('Creating new key in cache')
        client.add(key=datatypes.MEMCACHE_MODULELIST_KEY, value=json_modules_string)
    else:
        # Infinite loop to ensure race conditions are verified and prevented
        while True:
            logging.debug('Updating key in cache')
            curr_json_string = client.gets(key=datatypes.MEMCACHE_MODULELIST_KEY)
            if client.cas(key=datatypes.MEMCACHE_MODULELIST_KEY, value=json_modules_string):
                break
    logging.debug('Successful')

#@db.transactional(xg=True)
def store_modules(acad_year, semester, modules):
    for module_code, module in modules.iteritems():
        logging.debug("Storing module %s" % module_code)
        code_list = []
        stored_module = datatypes.Module(
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
            code_list = module["preclusions"][:]
        
        code_list.append(module_code)
        stored_module.represented_codes = code_list
        
        stored_module.put()
        logging.debug("datatypes.Module stored")
        
        if "prerequisites" in module:
            for group in module["prerequisites"]:
                store_prerequisite_group(group, module=stored_module)

#@db.transactional(xg=True, propagation=db.INDEPENDENT)
#def store_module(stored_module):

# Recursively stores nested prerequisite groups
#@db.transactional(propagation=db.INDEPENDENT)
def store_prerequisite_group(group, module):
    logging.debug("Storing prerequsite group")
    prereq_group = datatypes.ModulePrerequisiteGroup(
        module = module,
        prerequisites = group
    )
    #if module is not None:
    #    prereq_group.module = module
    #if parent is not None:
    #    prereq_group.parent_group = parent
    #if group["modules"]:
    #    prereq_group.prerequisites = group["modules"]
    
    prereq_group.put()
    logging.debug("Group inserted into datastore")
    
    #if "groups" in group:
    #    for child_group in group["groups"]:
    #        store_prerequisite_group(child_group, parent=prereq_group)
    
    #if parent is None:
    #    logging.debug("Prerequisite groups stored")
# Ensures that there are no missing preclusions from any prerequisite group.
#db.transactional(xg=True)
def fill_prerequisite_groups(modules):
    for module in modules.itervalues():
        for index, group in enumerate(module["prerequisites"]):
            code_list = group[:]
            for module_code in group:
                code_list.extend(modules[module_code]["preclusions"])
            updated_group = list(set(code_list))
            module["prerequisites"][index] = updated_group
    
#    for group in datatypes.ModulePrerequisiteGroup.all():
#        code_list = group.prerequisites[:]
#        logging.debug("Old prerequisites = %s" % code_list)
#        for module_code in group.prerequisites:
#            logging.debug("Retrieving %s" % module_code)
#            module = datatypes.Module.all().filter("code =", module_code).get()
#            if module is not None and module.preclusions is not None:
#                logging.debug("Preclusions = %s" % module.preclusions)
#                code_list.extend(module.preclusions)
#            elif module is None:
#                logging.debug("There is no module")
#            else:
#                logging.debug("There are no preclusions associated with the module")
#        prerequisites = list(set(code_list))
#        logging.debug("New prerequisites = %s" % prerequisites)
#        group.prerequisites = prerequisites
#        group.put()

#@db.transactional(xg=True)        
#def fill_prerequisite_group(group):
    

#@db.transactional(propagation=db.INDEPENDENT)
#def get_module(module_code):
    
# datatypes.Modules scraped must be filtered to adhere to the datatype defined (to reduce space)
#
# Follow this data format:
# {
#   "{module code}" : {
#       "code" : {module code}
#       "name" : {name}
#       "description" : {desc}
#       "mc" : {mc}
#       "preclusions" : [ {module codes as strings} ]
#       "prerequisites" : { 2-D array of module codes as strings }
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
        # TODO: Parse the preclusions and pre-requisite group(s)
    return modules

# Unit test scraper
def scrape_test(acad_year, semester):
    modules = {
        "AA1000" : {
            "code" : "AA1000",
            "name" : "Test Module 1000",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : ["AA1001"],
            "prerequisites" : []
        },
        "AA1001" : {
            "code" : "AA1001",
            "name" : "Test Module 1001",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : ["AA1000"],
            "prerequisites" : []
        },
        "AA1010" : {
            "code" : "AA1010",
            "name" : "Test Module 1010",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : [],
            "prerequisites" : []
        },
        "AA2000" : {
            "code" : "AA2000",
            "name" : "Test Module 2000",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : [ "AA2001", "AA2002", "AA2003" ],
            "prerequisites" : [
                [ "AA1000", "AA1001" ],
                [ "AA1010" ]
            ]
        },
        "AA2001" : {
            "code" : "AA2001",
            "name" : "Test Module 2001",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : [ "AA2000", "AA2002", "AA2003" ],
            "prerequisites" : [
                [ "AA1001" ],
                [ "AA1010" ]
            ]
        },
        "AA2002" : {
            "code" : "AA2002",
            "name" : "Test Module 2002",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : [ "AA2000", "AA2001", "AA2003" ],
            "prerequisites" : [
                [ "AA1000" ],
                [ "AA1010" ]
            ]
        },
        "AA2003" : {
            "code" : "AA2003",
            "name" : "Test Module 2003",
            "description" : "This is a test module",
            "mc" : 4,
            "preclusions" : [ "AA2000", "AA2001", "AA2002" ],
            "prerequisites" : [
                [ "AA1000" ],
                [ "AA1010" ]
            ]
        }
    }
    
    return modules
