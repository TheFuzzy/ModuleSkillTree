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
from google.appengine.api import files, taskqueue
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers

from datetime import date, datetime
import logging
from django.utils import simplejson as json
import urllib
import urllib2
import datatypes

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"),
    extensions=['jinja2.ext.autoescape'], autoescape=True)

class AdminHandler(webapp2.RequestHandler):
    def get(self):
        self.response.write('Hello world!')
        
class IndexModules(webapp2.RequestHandler):
    def get(self):
        self.response.write('Unfinished')
    # MODULE_SEARCH_URL = 'https://ivle.nus.edu.sg/api/Lapi.svc/Modules_Search'
    # API_KEY = 'wvGXXnp25lmkyO5x8Q6I4'
    
    # def req_modules(self, year, semester):
        # params = urllib.urlencode({
            # "APIKey" : self.API_KEY,
            # "AcadYear" : year,
            # "Semester" : semester,
            # "IncludeAllInfo" : "true",
            # })
        # url_string = self.MODULE_SEARCH_URL + '?' + params
        # req = urllib2.Request(url_string)
        # res = urllib2.urlopen(req)
        # return res.read()
    
    # def parse_preclusions(self, preclusion_string):
        # return [ u"preclusions" ] #returns array of string
    
    # def parse_prerequisites(self, prerequisite_string):
        # return [ u"pre-req" ] #returns array of string
    
    # def add_modules(self, json_modules):
        # for json_module in json_modules:
            # desc = None
            # preclusions = []
            # prerequisites = []
            # for description in json_module["Descriptions"]:
                # if description["Title"] == "Aims & Objectives":
                    # desc = description["Description"]
                # elif description["Title"] == "Preclusions":
                    # preclusions = self.parse_preclusions(description["Description"])
                # elif description["Title"] == "Prerequisites":
                    # prerequisites = self.parse_prerequisites(description["Description"])
                    
            
            
            # mod = Module(
                # code = json_module["CourseCode"],
                # name = json_module["CourseName"].title(),
                # description = desc,
                # mc = int(json_module["CourseMC"]),
                # preclusions = preclusions,
                # prerequisites = prerequisites
                # )
            # mod.put()

    # def get(self):
        # #if (self.request.headers.get('X-Appengine-Cron') == 'true'):
        # start_time = datetime.now()
        
        # # Attempt to retrieve any past request made on the same date from the blobstore, as the request takes FUCKING FOREVER
        # json_modules = None
        # query = CachedModuleRepo.all().filter('date_retrieved =', date.today())
        # cached_module_file = query.get()
        # if cached_module_file != None:
            # logging.info('Loading JSON from blobstore')
            # reader = cached_module_file.data.open()
            # json_modules = json.load(reader)
        # else:
            # logging.info('Loading JSON from service')
            # modules_string = self.req_modules("2012/2013", "Semester 1")
            # logging.info('JSON retrieved')
            # json_modules = json.loads(modules_string)["Results"]
            # file_name = files.blobstore.create(mime_type="application/json")
            # logging.info('Dumping file into blobstore')
            # with files.open(file_name, 'a') as file:
                # json.dump(json_modules, file)
            # logging.info('File dumped successful')
            # files.finalize(file_name)
            # logging.info('File finalized')
            # blob_key = files.blobstore.get_blob_key(file_name)
            # cached_module_file = CachedModuleRepo(data=BlobInfo.get(blob_key), date_retrieved=date.today())
            # cached_module_file.put()
            # logging.info('Cached module record added to database')
        # logging.info('Adding modules from JSON')
        # self.add_modules(json_modules)
        
        # elapsed_time = datetime.now() - start_time
        # self.response.write("%g" % elapsed_time)

class IndexModulesAsync(webapp2.RequestHandler):
    def get(self):
        # Attempt to retrieve any past request made on the same date from the memcache, as the request takes FUCKING FOREVER
        template = JINJA_ENVIRONMENT.get_template('IndexModulesAsync.html')
        #rpc = memcache.get('indexModulesOp')
        #if rpc is None:
            #rpc = taskqueue.create_rpc()
            #taskqueue.add_async(url="/admin/IndexModules/", rpc=rpc)
            #if not memcache.add('indexModulesOp', 'running', 86400):
                #logging.error('Failed to store module index RPC in memcache')
                #self.response.write(template.render({ 'label' : 'Failed, please reload' }))
            #else
                #logging.info('Module operation added to memcache')
        self.response.write(template.render({ 'label' : 'Loading...','async_op' : 'IndexModules', }))
        
class UploadJsonHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
        logging.debug("File uploaded.")
        self.response.headers['Content-Type'] = 'text/plain'
        try:
            upload_files = self.get_uploads('file')
            acad_year = self.request.get("acad_year")
            semester = int(self.request.get("semester"))
            blob_info = upload_files[0]
            module_repo = datatypes.CachedModuleRepo(
                data_k = blob_info.key(),
                acad_year = acad_year,
                semester = semester
            )
            module_repo.put()
            logging.debug("Module repository registered.")
            self.response.write("Repository uploaded!")
        except ValueError:
            self.error(400)
            logging.debug("ValueError occured")
            self.response.write("ValueError occured!")
        #except:
        #    self.error(400)
        #    logging.debug("Unknown error occured")
        #    self.response.write("Error occured!")
            
class UploadPageHandler(webapp2.RequestHandler):
    def get(self):
        template = JINJA_ENVIRONMENT.get_template('UploadPage.html')
        upload_url = blobstore.create_upload_url('/admin/UploadJson')
        logging.debug("Upload URL: %s" % upload_url)
        self.response.write(template.render({ "upload_url" : upload_url }))

# class IndexModulesFinished(webapp2.RequestHandler):
    # def post(self):
        # status = memcache.get('indexModulesOp')
        # if status is None:
            # self.response.write("does not exist")
        # else:
            # while status == "running"
            # if status == "complete"
                # self.response.write("complete")
            # else:
                # self.response.write("error")
            # memcache.delete("indexmodulesOp")
                # logging.info('Module operation removed from memcache')
        #TODO taskqueue

app = webapp2.WSGIApplication([
    ('/admin/', AdminHandler),
    ('/admin/IndexModules', IndexModules),
    ('/admin/IndexModulesAsync', IndexModulesAsync),
    ('/admin/UploadJson', UploadJsonHandler),
    ('/admin/UploadPage', UploadPageHandler)
    #('/admin/IndexModulesFinished', IndexModulesFinished)
], debug=True)
