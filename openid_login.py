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
from google.appengine.api import users

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"),
    extensions=['jinja2.ext.autoescape'])

class Providers:
    GOOGLE = "google" # Will be ignored anyway
    YAHOO = "yahoo="
    MYOPENID = "myopenid"
    NUS = "nus"
    URLS = {
        Providers.GOOGLE : "www.google.com/accounts/o8/id",
        Providers.YAHOO : "yahoo.com",
        Providers.NUS : "openid.nus.edu.sg",
        Providers.MYOPENID : "myopenid.com"
    }

class OpenIdLoginHandler(webapp2.RequestHandler):
    def get(self):
        mode = self.request.get('mode', default_value=None)
        user = users.get_current_user()
        
        if user:
            # TODO: You are already logged in!
            #self.response.headers['Content-Type'] = 'text/plain'
            #self.response.write('Hello, ' + user.nickname() + '\n')
            #self.response.write(users.create_logout_url('/'))
            logging.info("Logged in user %s somehow reached OpenID login page." % user.nickname())
            self.redirect("/")
        else:
            provider = urllib.unquote_plus(self.request.get('provider', default_value=''))
            redirect_uri = urllib.unquote_plus(self.request.get('redirect', default_value='/'))
            if provider != '':
                if provider == Providers.GOOGLE:
                    login_url = users.create_login_url(dest_url=redirect_uri)
                else:
                    login_url = users.create_login_url(dest_url=redirect_uri, federated_identity=Providers.URLS[provider])
                self.redirect(login_url)
            else:
                # TODO: Render login page
                args = { 'mode' : mode }
                template = JINJA_ENVIRONMENT.get_template('OpenID.html')
                self.response.write(template.render(args))
                

app = webapp2.WSGIApplication([
    ('/_ah/login_required', OpenIdLoginHandler)
    #('/_ah/login_required', OpenId_LoginHandler)
], debug=True)
