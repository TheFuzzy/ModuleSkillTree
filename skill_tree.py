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

from google.appengine.api import users
import logging
import urllib
import datatypes

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__) + "/templates"),
    extensions=['jinja2.ext.autoescape'])

class SkillTreeHandler(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        template = JINJA_ENVIRONMENT.get_template('SkillTree.html')
        args = {}
        skill_tree = None
        
        guid = urllib.unquote_plus(self.request.get('id', default_value=''))
        
        args['loginurl'] = users.create_login_url(self.request.uri)
        
        if guid != '':
            logging.debug("GUID %s retrieved from URL" % guid)
            skill_tree = datatypes.SkillTree.query(datatypes.SkillTree.guid == guid).get()
        
        if user:
            # Gets the associated student if it exists, otherwise, create a new one
            student = datatypes.Student.query(datatypes.Student.user == user).get()
            
            if student is None:
                student = datatypes.Student(
                    id = user.nickname(),
                    user = user,
                    name = user.nickname()
                )
                student.put()
                args['isNewUser'] = True
            
            if skill_tree is None:
                skill_tree = student.skill_trees.get()
                if skill_tree is None:
                    skill_tree = datatypes.SkillTree.with_guid(
                        parent = student.key,
                        student_k = student.key,
                        name = "Main Skill Tree",
                        first_year = "2013/2014",
                        first_semester = 1
                    )
                    skill_tree.put()
                args['isownskilltree'] = True
            else:
                own_skill_tree = student.skill_trees.get()
                if own_skill_tree is None:
                    own_skill_tree = datatypes.SkillTree.with_guid(
                        parent = student.key,
                        student_k = student.key,
                        name = "Main Skill Tree",
                        first_year = "2013/2014",
                        first_semester = 1
                    )
                    own_skill_tree.put()
                args['isownskilltree'] = skill_tree.guid == own_skill_tree.guid
                if not args['isownskilltree']:
                    args['ownskilltree'] = own_skill_tree                            
                    if hasattr(skill_tree, 'student_k'):
                        skill_tree_owner = skill_tree.student_k.get()
                        args['skilltreeowner'] = skill_tree_owner.name
                    else:
                        args['skilltreeowner'] = 'Anonymous'
            
            args['student'] = student
            args['loginurl'] = users.create_logout_url('/')
            args['skilltree'] = skill_tree
        
        elif skill_tree is not None:
            args['skilltree'] = skill_tree            
            if hasattr(skill_tree, 'student_k'):
                skill_tree_owner = skill_tree.student_k.get()
                args['skilltreeowner'] = skill_tree_owner.name
            else:
                args['skilltreeowner'] = 'Anonymous'
        else:
            self.redirect(args['loginurl'])
        
        self.response.headers["Cache-Control"]="no-cache, no-store, must-revalidate"
        self.response.headers["Pragma"]="no-cache"
        self.response.headers["Expires"]="0"
        self.response.write(template.render(args))


app = webapp2.WSGIApplication([
    ('/skilltree', SkillTreeHandler)
], debug=True)
