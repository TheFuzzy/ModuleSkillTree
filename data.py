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
from google.appengine.ext import blobstore, db
from google.appengine.ext.webapp import blobstore_handlers

from datetime import date, datetime
import logging
import urllib
from django.utils import simplejson as json
import datatypes

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"),
    extensions=['jinja2.ext.autoescape'])

# Web hook to cache the module list from the blobstore. Expects the "key" param to be set to "local", so that external
# users cannot use this handler. Intended for use with the internal TaskQueue.
class CacheModuleListHandler(webapp2.RequestHandler):
    def post(self):
        key = self.request.get("key")
        if key == "local":
            module_list = datatypes.ModuleList.all().order('-time_generated').get()
            if module_list is not None:
                blobInfo = blobstore.get(module_list.data.key())
                if blobInfo is not None:
                    with blobInfo.open() as file:
                        json_module_list = file.read()
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
                else:
                    self.response.write("Blob is missing")
                    self.error(404)
            else:
                self.response.write("No module list to retrieve")
                self.error(404)
        else:
            self.redirect("/not_found.html")

class GetModuleListHandler(blobstore_handlers.BlobstoreDownloadHandler):
    def get(self):
        json_module_list = memcache.get(datatypes.MEMCACHE_MODULELIST_KEY)
        if json_module_list is None:
            logging.debug("Module list is not cached")
            module_list = datatypes.ModuleList.all().order('-time_generated').get()
            if module_list is not None and blobstore.get(module_list.data.key()) is not None:
                logging.debug("Retrieved module list (size: %d bytes)" % module_list.data.size)
                self.send_blob(module_list.data.key())
                taskqueue.add(url="/data/CacheModuleList", params={ 'key' : 'local' })
            else:
                if module_list is None:
                    logging.debug("No module list to retrieve")
                elif blobstore.get(module_list.data.key()) is None:
                    logging.debug("Blob is missing")
                self.error(404)
        else:
            logging.debug("Writing module list from cache")
            self.response.headers['Content-Type'] = 'application/json'
            self.response.write(json_module_list)
    
class GetModuleHandler(webapp2.RequestHandler):
    def get(self):
        module_code = urllib.unquote_plus(self.request.get('code', default_value=''))
        if module_code != '':
            module = datatypes.Module.all().filter('code =', module_code).get()
            prerequisites = []
            for prerequisite_group in module.prerequisite_groups:
                prerequisites.append(prerequisite_group.prerequisites)
            json_module = {
                "code" : module.code,
                "name" : module.name,
                "description" : module.description,
                "mc" : module.mc,
                "preclusions" : module.preclusions,
                "prerequisites" : prerequisites
            }
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
            skill_tree = datatypes.SkillTree.all().filter('guid =', guid).get()
            if skill_tree is None:
                self.response.headers['Content-Type'] = 'text/plain'
                self.error(400)
                self.response.write("No skill tree with that GUID exists")
            else:
                try:
                    skill_tree_user = skill_tree.student.user
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
                for assigned_module in skill_tree.assigned_modules:
                    prerequisites = []
                    for prerequisite_group in assigned_module.module.prerequisite_groups:
                        prerequisites.append(prerequisite_group.prerequisites)
                    json_module = {
                        "code" : assigned_module.module.code,
                        "name" : assigned_module.module.name,
                        "description" : assigned_module.module.description,
                        "mc" : assigned_module.module.mc,
                        "preclusions" : assigned_module.module.preclusions,
                        "prerequisites" : prerequisites
                    }
                    json_assigned_module = {
                        "module" : json_module,
                        "semester" : assigned_module.semester,
                        "semesterIndex" : assigned_module.semester_index
                    }
                    if hasattr(assigned_module, 'prerequisites'):
                        json_assigned_module["prerequisites"] = assigned_module.prerequisites
                    json_assigned_modules[assigned_module.module.code] = json_assigned_module
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
            skill_tree = datatypes.SkillTree.all().filter('guid =', guid).get()
            if skill_tree is None:
                self.response.headers['Content-Type'] = 'text/plain'
                self.error(400)
                self.response.write("No skill tree with that GUID exists")
            else:
                try:
                    skill_tree_user = skill_tree.student.user
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
                    module = datatypes.Module.all().filter('code =', json_assigned_module["module"]).get(keys_only=True)
                    # Get any existing assigned module associated with the same module
                    assigned_module = datatypes.AssignedModule.all().filter('module =', module).filter('skill_tree =', skill_tree).get()
                    if assigned_module is None:
                        logging.debug("Does not exist, initializing new entity")
                        assigned_module = datatypes.AssignedModule(
                            skill_tree = skill_tree,
                            module = module,
                            parent = skill_tree,
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
                        module = datatypes.Module.all().filter('code =', code).get(keys_only=True)
                        assigned_module = datatypes.AssignedModule.all().filter('module =', module).get(keys_only=True)
                        db.delete(assigned_module)
                        logging.debug("%s deleted." % code)
                self.response.headers['Content-Type'] = 'text/plain'
                self.response.write("SUCCESS")
    #def addOrUpdateModule(self, module, json_assigned_module):
        
        

class SetNameHandler(webapp2.RequestHandler):
    def post(self):
        name = urllib.unquote_plus(self.request.get('name', default_value=''))
        value = urllib.unquote_plus(self.request.get('value', default_value=''))
        user = users.get_current_user()
        if name == 'nickname':
            student = datatypes.Student.all().filter('user =', user).get()
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
