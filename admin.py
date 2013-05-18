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
from google.appengine.api import memcache

# import datetime
import time
import json
import urllib
import urllib2
from datatypes import Student, Module, AssignedModule

class AdminHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write('Hello world!')
        
class IndexModules(webapp2.RequestHandler):
    MODULE_SEARCH_URL = 'https://ivle.nus.edu.sg/api/Lapi.svc/Modules_Search'
    API_KEY = 'wvGXXnp25lmkyO5x8Q6I4'
    
    def req_modules(self, year, semester):
        params = urllib.urlencode({
            "APIKey" : self.API_KEY,
            "AcadYear" : year,
            "Semester" : semester,
            "IncludeAllInfo" : "true",
            })
        url_string = self.MODULE_SEARCH_URL + '?' + params
        req = urllib2.Request(url_string)
        res = urllib2.urlopen(req)
        return res.read()
    
    def parse_preclusions(self, preclusion_string):
        return [ u"preclusions" ] #returns array of string
    
    def parse_prerequisites(self, prerequisite_string):
        return [ u"pre-req" ] #returns array of string
    
    def add_modules(self, json_modules):
        for json_module in json_modules:
            desc = None
            preclusions = []
            prerequisites = []
            for description in json_module["Descriptions"]:
                if description["Title"] == "Aims & Objectives":
                    desc = description["Description"]
                elif description["Title"] == "Preclusions":
                    preclusions = self.parse_preclusions(description["Description"])
                elif description["Title"] == "Prerequisites":
                    prerequisites = self.parse_prerequisites(description["Description"])
                    
            
            
            mod = Module(
                code = json_module["CourseCode"],
                name = json_module["CourseName"].title(),
                description = desc,
                mc = int(json_module["CourseMC"]),
                preclusions = preclusions,
                prerequisites = prerequisites
                )
            mod.put()

    def get(self):
        #if (self.request.headers.get('X-Appengine-Cron') == 'true'):
        self.response.write("Retrieving modules...")
        start_time = time.time()
        
        # Attempt to retrieve any past request made on the same date from the memcache, as the request takes FUCKING FOREVER
        # date = datetime.datetime.now().strftime("%d-%m-%Y")
        # json_modules = memcache.get('search%s' % date)
        # if json_modules is None:
            # if not memcache.add('search%s' % date, json_modules, 86400):
                # logging.error('Failed to store module request in memcache')
        modules_string = self.req_modules("2012/2013", "Semester 1")
        json_modules = json.loads(modules_string)["Results"]
        self.add_modules(json_modules)
        
        elapsed_time = time.time() - start_time
        self.response.write("Successful! Operation took %g seconds!" % elapsed_time)

app = webapp2.WSGIApplication([
    ('/admin/', AdminHandler),
    ('/admin/IndexModules', IndexModules)
], debug=True)
