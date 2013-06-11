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
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers

from datetime import date, datetime
import logging
import urllib
from django.utils import simplejson as json
from datatypes import Student, Module, AssignedModule, CachedModuleRepo, ModuleList

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"),
    extensions=['jinja2.ext.autoescape'])

class GetModuleList(blobstore_handlers.BlobstoreDownloadHandler):
    def get(self):
        module_list = ModuleList.all().order('-time_generated').get()
        if module_list is not None and blobstore.get(module_list.data.key()) is not None:
            logging.debug("Retrieved module list (size: %d bytes)" % module_list.data.size)
            self.send_blob(module_list.data.key())
        else:
            self.error(404)
    
class GetModule(webapp2.RequestHandler):
    def get(self):
        module_code = urllib.unquote_plus(self.request.get('Code', default_value=''))
        if module_code is not '':
            module = Module.all().filter('code =', module_code).get()
            json_module = {
                "code" : module.code,
                "name" : module.name,
                "description" : module.description,
                "mc" : module.mc,
                "preclusions" : module.preclusions
                }
            self.response.headers['Content-Type'] = 'application/json'
            self.response.write(json.dumps(json_module))

app = webapp2.WSGIApplication([
    ('/data/GetModuleList', GetModuleList),
    ('/data/GetModule', GetModule),
    #('/private_data/GetUsers', GetUsers)
], debug=True)
