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
import jinja2
import os
import logging
import urllib
import urlparse
from google.appengine.api import users

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"),
    extensions=['jinja2.ext.autoescape'])

class Providers:
    GOOGLE = "google" # Will be ignored anyway
    YAHOO = "yahoo"
    MYOPENID = "myopenid"
    NUS = "nus"
    URLS = {
        "google" : "www.google.com/accounts/o8/id",
        "yahoo" : "yahoo.com",
        "nus" : "openid.nus.edu.sg",
        "myopenid" : "myopenid.com"
    }

class OpenIdLoginHandler(webapp2.RequestHandler):
    def get(self):
        embed = self.request.get('embed', default_value='0')
        user = users.get_current_user()
        query = self.request.get('query')
        redirect_uri = urllib.unquote_plus(self.request.get('continue', default_value='/'))
        logging.debug("Loaded login script")
        
        if query == '1':
            self.response.headers['Content-Type'] = 'text/plain'
            try:
                # Test whether we can perform a federated login
                users.create_login_url(dest_url=redirect_uri, federated_identity=Providers.URLS[Providers.YAHOO])
            except:
                self.response.write('no')
            else:
                self.response.write('yes')
                self.response.write(users.create_login_url(dest_url=redirect_uri, federated_identity=Providers.URLS[Providers.YAHOO]))
            return
        
        if user:
            # TODO: You are already logged in!
            #self.response.headers['Content-Type'] = 'text/plain'
            #self.response.write('Hello, ' + user.nickname() + '\n')
            #self.response.write(users.create_logout_url(redirect_uri))
            logging.info("Logged in user %s somehow reached OpenID login page." % user.nickname())
            self.redirect('/')
        else:
            try:
                # Test whether we can perform a federated login
                users.create_login_url(dest_url=redirect_uri, federated_identity=Providers.URLS[Providers.YAHOO])
            except:
                logging.error("Unknown error!")
                login_url = users.create_login_url(dest_url=redirect_uri)
                self.redirect(login_url)
            else:
                provider = urllib.unquote_plus(self.request.get('provider', default_value=''))
                if provider != '':
                    logging.debug("Provider: %s" % provider)
                    if provider == Providers.GOOGLE:
                        login_url = users.create_login_url(dest_url=redirect_uri)
                    else:
                        login_url = users.create_login_url(dest_url=redirect_uri, federated_identity=Providers.URLS[provider])
                    self.redirect(login_url)
                else:
                    # TODO: Render login page
                    args = {}
                    args['providers'] = [Providers.NUS, Providers.GOOGLE, Providers.YAHOO, Providers.MYOPENID]
                    if embed == '1':
                        args['embed'] = True
                    args['redirect'] = redirect_uri
                    template = JINJA_ENVIRONMENT.get_template('OpenID.html')
                    self.response.write(template.render(args))
        
    def post(self):
        return get(self)

def create_login_url(dest_url):
    url_object = urlparse.urlsplit(users.create_login_url(dest_url=dest_url))
    abs_dest_url = urlparse.parse_qs(url_object.query)["continue"][0]
    logging.debug("URL %s formed from URL %s" % (abs_dest_url, dest_url))
    return '/login?' + urllib.urlencode({ 'continue' : abs_dest_url })

app = webapp2.WSGIApplication([
    ('/_ah/login_required', OpenIdLoginHandler),
    ('/login', OpenIdLoginHandler)
    #('/_ah/login_required', OpenId_LoginHandler)
], debug=True)
