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
from google.appengine.ext.remote_api import handler
from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app

import logging
import re


MY_SECRET_KEY = 'mst-sikret-kii'


cookie_re = re.compile('^([^:]+):.*$')


class ApiCallHandler(handler.ApiCallHandler):
  def CheckIsAdmin(self):
    login_cookie = self.request.cookies.get('dev_appserver_login', '')
    match = cookie_re.search(login_cookie)
    if (match and match.group(1) == MY_SECRET_KEY
        and 'X-appcfg-api-version' in self.request.headers):
      logging.info("Authenticated 'admin' for remote API")
      return True
    else:
      self.redirect('/_ah/login')
      return False


app = webapp.WSGIApplication([('.*', ApiCallHandler)])