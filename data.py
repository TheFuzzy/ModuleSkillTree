#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import webapp2
import os
import jinja2
from google.appengine.api import users, memcache, taskqueue
from google.appengine.ext import blobstore, ndb
from google.appengine.ext.webapp import blobstore_handlers

from datetime import date, datetime
import logging
import urllib
from django.utils import simplejson as json
import datatypes

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"),
    extensions=['jinja2.ext.autoescape'])

# Wrapper class for commonly-used queries
class Data():
    @staticmethod
    def get_latest_module(module_code):
        return datatypes.Module.query(datatypes.Module.code == module_code).order(-datatypes.Module.acad_year).get()
    
    @staticmethod
    def get_latest_list():
        return datatypes.ModuleList.query().order(-datatypes.ModuleList.time_generated).get()
    
    @staticmethod
    def get_skill_tree(guid):
        return datatypes.SkillTree.query(datatypes.SkillTree.guid == guid).get()
    
    @staticmethod
    def get_student(user):
        return datatypes.Student.query(datatypes.Student.user == user).get()

# Web hook to cache the module list from the blobstore. Expects the "key" param to be set to "local", so that external
# users cannot use this handler. Intended for use with the internal TaskQueue.
class CacheModuleListHandler(webapp2.RequestHandler):
    def post(self):
        key = self.request.get("key")
        if key == "local":
            module_list = Data.get_latest_list()
            if module_list is not None and module_list.data is not None:
                json_module_list = json.dumps(module_list.data, sort_keys=True)
                client = memcache.Client()
                logging.debug('Caching module list')
                curr_json_string = client.get(key=datatypes.MEMCACHE_MODULELIST_KEY)
                if curr_json_string is None:
                    logging.debug('Creating new key in cache')
                    client.add(key=datatypes.MEMCACHE_MODULELIST_KEY, value=json_module_list)
                else:
                    while True:
                        logging.debug('Updating key in cache')
                        curr_json_string = client.gets(key=datatypes.MEMCACHE_MODULELIST_KEY)
                        if client.cas(key=datatypes.MEMCACHE_MODULELIST_KEY, value=json_module_list):
                            break
                self.response.write('Successful')
                #else:
                #    self.response.write("Blob is missing")
                #    self.error(404)
            else:
                self.response.write("No module list to retrieve")
                self.error(404)
        else:
            self.redirect("/not_found.html")

class GetModuleListHandler(webapp2.RequestHandler):
    def get(self):
        json_module_list = memcache.get(datatypes.MEMCACHE_MODULELIST_KEY)
        if json_module_list is None:
            logging.debug("Module list is not cached")
            module_list = Data.get_latest_list()
            if module_list is not None and module_list.data is not None:
                logging.debug("Retrieved module list")
                self.response.headers['Content-Type'] = 'application/json'
                self.response.write(json.dumps(module_list.data, sort_keys=True))
                taskqueue.add(url="/data/CacheModuleList", params={ 'key' : 'local' })
            else:
                if module_list is None:
                    logging.debug("No module list to retrieve")
                elif module_list.data is None:
                    logging.debug("Blob data is missing")
                self.error(404)
        else:
            logging.debug("Writing module list from cache")
            self.response.headers['Content-Type'] = 'application/json'
            self.response.write(json_module_list)
    
class GetModuleHandler(webapp2.RequestHandler):
    def get(self):
        module_code = urllib.unquote_plus(self.request.get('code', default_value=''))
        logging.debug("Attempting to retrieve module code: %s" % module_code)
        if module_code != '':
            module = Data.get_latest_module(module_code)
            prerequisites = []
            for prerequisite_group in module.prerequisite_groups:
                prerequisites.append(prerequisite_group.prerequisites)
            json_module = {
                "code" : module.code,
                "name" : module.name,
                "description" : module.description,
                "mc" : module.mc,
                "faculty" : module.faculty,
                "prerequisites_string" : module.prerequisites_string,
                "prerequisites" : prerequisites,
                "preclusions_string" : module.preclusions_string
            }
            if hasattr(module, 'preclusions'):
                json_module["preclusions"] = module.preclusions
            if hasattr(module, 'workload'):
                json_module["workload"] = module.workload
            self.response.headers['Content-Type'] = 'application/json'
            self.response.write(json.dumps(json_module))

class GetSkillTreeHandler(webapp2.RequestHandler):
    def post(self):
        guid = urllib.unquote_plus(self.request.get('guid', default_value=''))
        logging.debug("GUID: %s" % guid)
        if guid == '':
            self.response.headers['Content-Type'] = 'text/plain'
            self.error(400)
            self.response.write("Invalid GUID")
        else:
            skill_tree = Data.get_skill_tree(guid)
            if skill_tree is None:
                self.response.headers['Content-Type'] = 'text/plain'
                self.error(400)
                self.response.write("No skill tree with that GUID exists")
            else:
                try:
                    student = skill_tree.student_k.get()
                    skill_tree_user = student.user
                    logging.debug("Authenticating user")
                    user = users.get_current_user()
                    if user is None:
                        self.response.headers['Content-Type'] = 'text/plain'
                        self.error(400)
                        self.response.write("Not logged in.")
                        return
                    elif skill_tree_user != user:
                        self.response.headers['Content-Type'] = 'text/plain'
                        self.error(400)
                        self.response.write("Wrong user!")
                        return
                # No student associated with the skill tree, so it's fine.
                except AttributeError:
                    pass
                logging.debug("Retrieved skill tree")
                json_assigned_modules = {}
                for assigned_module in skill_tree.assigned_modules.iter():
                    module_code = assigned_module.module_code
                    module = Data.get_latest_module(module_code)
                    prerequisites = []
                    for prerequisite_group in module.prerequisite_groups:
                        prerequisites.append(prerequisite_group.prerequisites)
                    json_module = {
                        "code" : module.code,
                        "name" : module.name,
                        "description" : module.description,
                        "mc" : module.mc,
                        "prerequisites" : prerequisites
                    }
                    if hasattr(module, 'preclusions'):
                        json_module["preclusions"] = module.preclusions
                    json_assigned_module = {
                        "module" : json_module,
                        "semester" : assigned_module.semester,
                        "semesterIndex" : assigned_module.semester_index
                    }
                    if hasattr(assigned_module, 'prerequisites'):
                        json_assigned_module["prerequisites"] = assigned_module.prerequisites
                    json_assigned_modules[module.code] = json_assigned_module
                self.response.headers['Content-Type'] = 'application/json'
                self.response.write(json.dumps({
                    "guid" : guid,
                    "assignedModules" : json_assigned_modules
                }))


class SaveSkillTreeHandler(webapp2.RequestHandler):
    def post(self):
        guid = urllib.unquote_plus(self.request.get('guid', default_value=''))
        logging.debug("GUID: %s" % guid)
        data_string = self.request.get('data', default_value='')
        if data_string == '':
            self.response.headers['Content-Type'] = 'text/plain'
            self.error(400)
            self.response.write("No data provided.")
        if guid == '':
            # Save a new skill tree. Invalid atm
            self.response.headers['Content-Type'] = 'text/plain'
            self.error(400)
            self.response.write("Invalid GUID")
        else:
            skill_tree = Data.get_skill_tree(guid)
            if skill_tree is None:
                self.response.headers['Content-Type'] = 'text/plain'
                self.error(400)
                self.response.write("No skill tree with that GUID exists")
            else:
                try:
                    student = skill_tree.student_k.get()
                    skill_tree_user = student.user
                    logging.debug("Authenticating user")
                    user = users.get_current_user()
                    if user is None:
                        self.response.headers['Content-Type'] = 'text/plain'
                        self.error(400)
                        self.response.write("Not logged in.")
                        return
                    elif skill_tree_user != user:
                        self.response.headers['Content-Type'] = 'text/plain'
                        self.error(400)
                        self.response.write("Wrong user!")
                        return
                # No student associated with the skill tree, so it's fine.
                except AttributeError:
                    pass
                logging.debug("Retrieved skill tree")
                data = json.loads(data_string)
                json_assigned_modules = data["assignedModules"]
                json_remove_modules = data["removeModules"]
                logging.debug("Parsed JSON data")
                for json_assigned_module in json_assigned_modules.itervalues():
                    logging.debug("Inserting/updating module %s" % json_assigned_module["module"])
                    logging.debug(json_assigned_module)
                    module_code = json_assigned_module["module"]
                    #module_k = datatypes.Module.query(datatypes.Module.code == json_assigned_module["module"]).get(keys_only=True)
                    # Get any existing assigned module associated with the same module
                    assigned_module = datatypes.AssignedModule.query(ndb.AND(datatypes.AssignedModule.module_code == module_code,
                                                                             datatypes.AssignedModule.skill_tree_k == skill_tree.key)).get()
                    if assigned_module is None:
                        logging.debug("Does not exist, initializing new entity")
                        assigned_module = datatypes.AssignedModule(
                            skill_tree_k = skill_tree.key,
                            module_code = module_code,
                            parent = skill_tree.key,
                            semester = json_assigned_module["semester"],
                            semester_index = json_assigned_module["semesterIndex"],
                            is_exception = json_assigned_module["exception"]
                        )
                    else:
                        assigned_module.semester = json_assigned_module["semester"]
                        assigned_module.semester_index = json_assigned_module["semesterIndex"]
                        assigned_module.is_exception = json_assigned_module["exception"]
                    if "prerequisites" in json_assigned_module:
                        assigned_module.prerequisites = json_assigned_module["prerequisites"]
                    assigned_module.put()
                    logging.debug("Inserted successfully")
                for code, remove_module in json_remove_modules.iteritems():
                    if remove_module:
                        #module_k = datatypes.Module.query(datatypes.Module.code == code).get(keys_only=True)
                        assigned_module_k = datatypes.AssignedModule.query(datatypes.AssignedModule.module_code == code).get(keys_only=True)
                        assigned_module_k.delete()
                        logging.debug("%s deleted." % code)
                self.response.headers['Content-Type'] = 'text/plain'
                self.response.write("SUCCESS")
    #def addOrUpdateModule(self, module, json_assigned_module):
        
        

# Sets the name of the given user
class SetNameHandler(webapp2.RequestHandler):
    def post(self):
        name = urllib.unquote_plus(self.request.get('name', default_value=''))
        value = urllib.unquote_plus(self.request.get('value', default_value=''))
        user = users.get_current_user()
        if name == 'nickname':
            student = Data.get_student(user)
            logging.debug("Changing student name from %s to %s." % (student.name, value))
            student.name = value
            student.put()
        else:
            logging.debug("Error, name is %s." % (name))
            self.error(400)

class TestJSONHandler(webapp2.RequestHandler):
    def post(self):
        try:
            b = json.loads(self.request.get('data', default_value=''))
            self.response.write(b)
        except ValueError:
            self.error(403)
            
class GetTestModuleHandler(webapp2.RequestHandler):
    def get(self):        
        json_module = {
            "code" : "MOD1020",
            "name" : "Test Module",
            "description" : "Test Description",
            "mc" : 4,
            "preclusions" : [ "MOD1021" ],
            "prerequisites" : [[ "MOD1010", "MOD1015" ], ["MOD1101", "MOD1105"]]
        }
        self.response.headers['Content-Type'] = 'application/json'
        self.response.write(json.dumps(json_module))

app = webapp2.WSGIApplication([
    ('/data/CacheModuleList', CacheModuleListHandler),
    ('/data/GetModuleList', GetModuleListHandler),
    ('/data/GetModule', GetModuleHandler),
    ('/data/GetTestModule', GetTestModuleHandler),
    ('/data/GetSkillTree', GetSkillTreeHandler),
    ('/data/SaveSkillTree', SaveSkillTreeHandler),
    ('/data/TestJSON', TestJSONHandler),
    ('/private_data/SetName', SetNameHandler)
], debug=True)
