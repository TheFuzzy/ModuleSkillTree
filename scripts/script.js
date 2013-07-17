// Global variable to store all global variables
var skillTree = {
	// Constants
	MODULE_TOP_SPACING: 35,
	MODULE_LEFT_SPACING: 20,
	MODULE_HORIZ_SPACING : 20,
	MODULE_VERT_SPACING : 84,
	MODULE_WIDTH : 200,
	MODULE_HEIGHT : 120,
	NOTIFICATIONS : { SUCCESS : "success", WARNING : "warning", ERROR : "error" },
	SHARE_LINKS : { TWITTER : "https://twitter.com/share", FACEBOOK : "https://www.facebook.com/sharer/sharer.php", GPLUS: "https://plus.google.com/share" },
	// Attributes
	semesters : [[]],
	modules : {},
	moduleCodes : [],
	assignedModules : {},
	removeModules : {},
	numOfPrereqGroups : 0, // Incrementer to prevent overlap of any prereq groups
	isModified: false,
	seachTimeout: null
};
// Test function
function testJSON(data) {
	$.ajax("/data/TestJSON", {
		type : "POST",
		data : { data : JSON.stringify(data) }
	})
}
// Helper function to create delayed function calls
function timeoutCall(fn, data, timeout) {
	setTimeout(function() {fn.call(null, data);}, timeout);
}
// Alert the user
function notify(message, type) {
	var notificationBox = $("#notification");
	var notificationBoxContent = $("#notification .content");
	for (var notificationType in skillTree.NOTIFICATIONS) {
		notificationBox.removeClass(skillTree.NOTIFICATIONS[notificationType]);
	}
	notificationBox.addClass(type);
	notificationBoxContent.text(message);
	if (notificationBox.is(":hidden")) notificationBox.slideDown({ duration : 500, queue : false });
	else notificationBox.addClass('flash', 100).removeClass('flash', 300);
}
// Hide the notification box
// Method is used by the box's close button.
function hideNotification() {
	$("#notification:visible").slideUp();
}
// Determines whether the current state can be stored safely in the server.
function stateIsInvalid() {
	// check whether any prerequisites are still unfulfilled
	for (var code in skillTree.assignedModules) {
		if (skillTree.assignedModules.hasOwnProperty(code)) {
			if (code.substring(0, 5) === 'GROUP') {
				return "One or more pre-requisites have not been fulfilled.";
			}
		}
	}
	return false;
}
// Share skill tree.
function shareLink() {
	var dialog = $("#shareModal");
	var pageUrl = window.location.href.split('?')[0];
	var linkUrl = pageUrl + "?id=" + skillTree.guid;
	// Generate a link for Twitter
	var twitterUrl = skillTree.SHARE_LINKS.TWITTER + '?url=' + encodeURIComponent(linkUrl) + "&text=" + encodeURIComponent("Check out my NUS skill tree!");
	// Generate a link for Facebook
	var facebookUrl = skillTree.SHARE_LINKS.FACEBOOK + '?u=' + encodeURIComponent(linkUrl);
	// Generate a link for Google+
	var gplusUrl = skillTree.SHARE_LINKS.GPLUS + '?url=' + encodeURIComponent(linkUrl);
	
	$("#shareUrl").val(linkUrl);
	dialog.find(".twitter-btn").attr("href", twitterUrl);
	dialog.find(".facebook-btn").attr("href", facebookUrl);
	dialog.find(".gplus-btn").attr("href", gplusUrl);
	
	dialog.modal("show");
}
// Save skill tree.
// If callback is supplied, it will be called.
function saveToServer(callback) {
	var error = stateIsInvalid();
	if (error) {
		notify(error, skillTree.NOTIFICATIONS.ERROR);
	} else if (skillTree.isModified) {
		var skillTreeData = {};
		skillTreeData.assignedModules = {};
		if (!skillTree.overwrite) skillTreeData.removeModules = skillTree.removeModules;
		for (var code in skillTree.assignedModules) {
			if (skillTree.assignedModules.hasOwnProperty(code)) {
				var assignedModule = getAssignedModule(code);
				var semesterIndex = skillTree.semesters[assignedModule.semester-1].indexOf(code);
				skillTreeData.assignedModules[code] = {
					module : code,
					semester : assignedModule.semester,
					semesterIndex : semesterIndex,
					exception : false
				}
				if (typeof assignedModule.prerequisites !== 'undefined') {
					skillTreeData.assignedModules[code].prerequisites = assignedModule.prerequisites;
				}
			}
		}
		var args = {
			guid : skillTree.guid,
			data : JSON.stringify(skillTreeData)
		}
		if (skillTree.overwrite) args["overwrite"] = true;
		$.ajaxQueue({
			url : "/data/SaveSkillTree",
			type : "POST",
			data : args
		}).done(function() {
			notify("Saved!", skillTree.NOTIFICATIONS.SUCCESS);
			skillTree.removeModules = {};
			for (var code in skillTree.assignedModules) {
				if (skillTree.assignedModules.hasOwnProperty(code)) {
					skillTree.removeModules[code] = false;
				}
			}
			setModified(false);
			delete skillTree.overwrite;
			if (typeof callback !== 'undefined') callback();
		}).fail(function(jqXHR, textStatus, errorThrown) {
			if (jqXHR.responseText) {
				notify(jqXHR.responseText, skillTree.NOTIFICATIONS.ERROR);
			} else {
				notify("Server error: " + errorThrown, skillTree.NOTIFICATIONS.ERROR);
			}
		});
	}
}
// Load skill tree. Should be called by embedded javascript in the HTML itself.
function loadFromServer(guid, ownGuid) {
	var editMode = true;
	if (typeof ownGuid !== 'undefined') {
		if (typeof ownGuid === 'string') {
			skillTree.overwrite = true;
			skillTree.guid = ownGuid;
			editMode = false;
		} else {
			skillTree.guid = guid;
			editMode = ownGuid;
		}
	} else {
		skillTree.guid = guid;
	}
	var backgroundProgressBox = $("#backgroundProgress").addClass("active").css("background-size", "0%");
	var hiddenOverlayBox = $("#hiddenOverlay").show();
	console.log("Loading skill tree with GUID " + guid);
	//$("#overlayBG").show();
	//$("#progress").text("0%");
	$.ajaxQueue({
		url : "/data/GetSkillTree",
		type : "POST",
		data : { guid : guid },
		progress: function(e) {
        //make sure we can compute the length
        if(e.lengthComputable) {
            //calculate the percentage loaded
            var percent = (e.loaded / e.total) * 100;
            //log percentage loaded
            console.log(percent);
			$("#backgroundProgress").css('background-size', percent + "%");
        }
        //this usually happens when Content-Length isn't set
        else {
            console.warn('Content Length not reported!');
        }
    }
	}).done(function (data, textStatus) {
		for (var code in data.assignedModules) {
			if (data.assignedModules.hasOwnProperty(code)) {
				var assignedModule  = data.assignedModules[code];
				skillTree.modules[code] = assignedModule.module;
				skillTree.assignedModules[code] = {
					module : assignedModule.module,
					semester : assignedModule.semester
				}
				if (skillTree.moduleCodes.indexOf(code) < 0) skillTree.moduleCodes.push(code);
				if (typeof assignedModule.prerequisites !== 'undefined') {
					skillTree.assignedModules[code].prerequisites = assignedModule.prerequisites;
				}
				skillTree.removeModules[code] = false;
				
				ensureSemester(assignedModule.semester);
				skillTree.semesters[assignedModule.semester-1][assignedModule.semesterIndex] = code;
				var newDivId = code + 'box';
				var moduleBox = $('<div id="'+newDivId+'">' +
									'<div class="moduleInfo">' +
										'<div class="moduleCode">'+code+'</div>' +
										'<div class="moduleTitle">'+skillTree.modules[code].name+'</div>' +
									'</div>' +
									'<div class="controlPanel">' +
										'<button class="settings mst-icon-settings" title="Settings" data-toggle="tooltip"></button>' +
										' <button class="remove mst-icon-close" title="Remove this module" data-toggle="tooltip"></button>' +
									'</div>' +
								'</div>');
				moduleBox.appendTo('#skillTree').moduleBox(assignedModule.module, editMode);
				// Hide the module code in the search list.
				$('.module').filter(function() {
					return $(this).data("code") == code;
				}).addClass('added');
				
				//var position = calculatePosition(assignedModule.semester-1, assignedModule.semesterIndex);
				
				//moduleBox.css('left', position.left + 'px');
				//moduleBox.css('top', position.top + 'px');
			}
		}
		for (var code in skillTree.assignedModules) {
			if (skillTree.assignedModules.hasOwnProperty(code)) {
				var assignedModule = skillTree.assignedModules[code];
				for (var i = 0; i < assignedModule.prerequisites.length; i++) {
					$('#' + code + 'box').connectTopTo(assignedModule.prerequisites[i] + 'box');
				}
			}
		}
		repositionModules(false);
		//$("#overlayBG").hide();
		backgroundProgressBox.removeClass("active");
		hiddenOverlayBox.hide();
	});
}

function setModified(isModified) {
	skillTree.isModified = isModified;
	if (isModified) {
		$("#control_panel .button_group").addClass("btn-group");
		$("#save_button").removeAttr("disabled");
		$("#share_button").val("& Share");
	} else {
		$("#control_panel .button_group").removeClass("btn-group");
		$("#save_button").attr("disabled", "disabled");
		$("#share_button").val("Share");
	}
}

function calculatePosition(row, col) {
	position = {
		left : skillTree.MODULE_LEFT_SPACING + (col * skillTree.MODULE_HORIZ_SPACING) + (col * skillTree.MODULE_WIDTH),
		top : skillTree.MODULE_TOP_SPACING + (row * skillTree.MODULE_VERT_SPACING) + (row * skillTree.MODULE_HEIGHT)
	}
	return position;
}

// Helper class to reposition all .moduleBox divs to proper positions, based only on the values in the global variable.
// animate=false will prevent any animations from running.
function repositionModules(animate) {
	animate = typeof animate !== 'undefined' ? animate : true;
	var numSemesters = skillTree.semesters.length;
	var skillTreeBox = $("#skillTreeView");
	for (var i = 0; i < numSemesters; i++) {
		var semester = skillTree.semesters[i];
		var numModules = semester.length;
		for (var j = 0; j < numModules; j++) {
			var assignedModule = getAssignedModule(semester[j]);
			var moduleBox;
			if (isPrereqGroup(assignedModule)) moduleBox = $('#' + assignedModule.id + 'box');
			else moduleBox = $('#' + assignedModule.module.code + 'box');
			moduleBox.stop(true);
			
			var position = calculatePosition(i, j);
			var topOffset = position.top;
			var leftOffset = position.left;
			
			//console.log(assignedModule.module.code + ": left=" + leftOffset + ",top=" + topOffset);
			// Check if a position was already set programmatically. If not, set a position outside the viewport.
			if (animate && moduleBox[0].style.left == "") {
				moduleBox.css('left', -500 + 'px');
				moduleBox.css('top', 50 + 'px');
			}
			
			var currLeft = moduleBox.css('left');
			var currTop = moduleBox.css('top');
			
			if ((currLeft !== leftOffset + 'px') || (currTop !== topOffset + 'px')) {			
				if (!animate) {
					moduleBox.css('left', leftOffset + 'px');
					moduleBox.css('top', topOffset + 'px');
				} else if (!moduleBox.is(':animated')) {
					/*jsPlumb.animate(
						el=moduleBox,
						properties={ left : leftOffset + 'px', top : topOffset + 'px' },
						options={
							duration: 1000
						}
					);*/
					moduleBox.animate(
						properties={ left : leftOffset + 'px', top : topOffset + 'px' },
						options={
							duration: 1000,
							progress: function () {
								jsPlumb.repaint(this);
								skillTreeBox.perfectScrollbar("update");
							},
							queue: false
						}
					);
				}
			}
		}
	}
	// Repaint the flowchart lines, in case the whole process wasn't animated.
	if (!animate) jsPlumb.repaintEverything();
	
}
// Gets the module instance from the global variable, given the module code
// code - String
function getModule(code) {
	/*for (i in skillTree.modules) {
		if (skillTree.modules[i].code === code) return skillTree.modules[i];
	};
	return null;*/
	return typeof skillTree.modules[code] !== 'undefined' ? skillTree.modules[code] : null;
}
// Gets the assigned module instance from the global variable, given the module code
// code - String
function getAssignedModule(code) {
	/*for (i in skillTree.assignedModules) {
		if (skillTree.assignedModules[i].module.code === code) return skillTree.assignedModules[i];
	};
	return null;*/
	return typeof skillTree.assignedModules[code] !== 'undefined' ? skillTree.assignedModules[code] : null;
}

function isPrereqGroup(assignedModule) {
	return typeof assignedModule.module === 'string';
}

function countModules(modules) {
	var count = 0;
	var i;

	for (i in modules) {
		if (modules.hasOwnProperty(i)) {
			count++;
		}
	}
	return count;
}

function isFullyLoaded(module) {
	return (module !== null) && ("description" in module);
}
// Returns the module DIVs based on the search text given.
function search(text)
{
	var searchText = text;
	var divs = new Array();
	for (var code in skillTree.modules) {
		if (skillTree.modules.hasOwnProperty(code)) {
			var module = skillTree.modules[code];
			var moduleName = module.name.toLowerCase();
			var moduleCode = code.toLowerCase();
			if (moduleCode.indexOf(searchText) > -1 || moduleName.indexOf(searchText) > -1) {
				var div_id = module.code.replace(/\s*\/\s*/gi, '_');
				divs.push(div_id);
			}
		}
	}
	return divs;
}
// Filters and hides modules in the list according to the input value and faculty selection.
function filter()
{
	// Clear any delayed search
	clearTimeout(skillTree.searchTimeout);
	var searchText = $('#module_search').val().replace('_', '').toLowerCase();	
	var fac = $('#faculty_filter').children(':selected').text();
	$('.module').massAddClass('hidden');
	if(fac === 'ALL FACULTIES')
	{
		if(searchText)
		{
			var divs = search(searchText);
			for (var i = 0; i < divs.length; i++) {
				$('#' + divs[i]).massRemoveClass('hidden');
			}
		}
		else
		{
			$('.module').massRemoveClass('hidden');
		}
	}
	else
	{	
		if(searchText)
		{
			var divs =search(searchText);
			for (var i = 0; i < divs.length; i++) {
				if($('#' + divs[i]).attr('data-faculty') === fac)
				{
					$('#' + divs[i]).massRemoveClass('hidden');
				}
			}
		}
		else
		{
			$.each($('#module_list div'),function(){
				if($(this).attr('data-faculty') === fac)
				{
					$(this).massRemoveClass('hidden');
				} 
			});
		}
	}

}

function ensureModuleDetails(module, options) {
	options = typeof options !== 'undefined' ? options : {}
	options.useModule = typeof options.useModule !== 'undefined' ? options.useModule : false;
	if (isFullyLoaded(module)) {
		if (typeof options.callback !== 'undefined') {
			if (typeof options.params !== 'undefined') {
				if (options.useModule) {
					options.params.module = module;
				}
				return options.callback.apply(params);
			} else {
				if (options.useModule) {
					options.callback(module);
				} else {
					options.callback();
				}
			}
		}
	} else {
		module.isLoading = true;
		$.getJSON("/data/GetModule?code=" + module.code)
		.done(function(json) {
			skillTree.modules[module.code] = json;
			console.log(module.code + " retrieved from server.");
			if (typeof options.callback !== 'undefined') {
				if (typeof params !== 'undefined') {
					if (options.useModule) {
						options.params.module = getModule(module.code);
					}
					options.callback.apply(options.params);
				} else {
					if (options.useModule) {
						module = getModule(module.code);
						options.callback(module);
					} else {
						options.callback();
					}
				}
			}
		})
		.fail(function() {
			console.log("Failed to retrieve " + module.code + " from server");
			notify("Server error: failed to retrieve module " +  module.code, skillTree.NOTIFICATIONS.ERROR);
			delete module.isLoading;
		});
	}
}


// Ensures that the .semester div representing the given number exists.
// semesterNum - int
function ensureSemester(semesterNum) {
	if ((semesterNum > 0) && (!skillTree.semesters[semesterNum-1])) {
		for (var i = skillTree.semesters.length; i < semesterNum; i++) {
			skillTree.semesters[i] = [];
			var semesterDiv = $('<div id="semester' + (i+1) + '">' +
									'<div class="semester_meta">' +
										'<span>Semester ' + (i+1) + '</span>' +
										'<input class="btn btn-small btn-link pull-right" type="button" value="NUSMods"/>' +
									'</div>' +
								'</div>');
			semesterDiv.appendTo("#skillTree").semester();
		}
	}
}
// Trims off any excess empty semesters at the end of the skill tree.
// Does not do anything if there's only 1 semester remaining.
function trimSemesters() {
	var numOfEmptySemesters = 0;
	var i = 0;
	for (i = skillTree.semesters.length-1; i >= 1; i--) {
		if (skillTree.semesters[i].length <= 0) numOfEmptySemesters++;
		else break;
	}
	if (numOfEmptySemesters > 0) {
		for (var semesterIndex = skillTree.semesters.length-1; semesterIndex > i; semesterIndex--) {
			$('#semester' + (semesterIndex+1)).remove();
		}
		skillTree.semesters.splice(i+1, numOfEmptySemesters);
	}
}
// Recursively shift modules. Returns the semester the module is assigned to (or left at).
function assignSemester(assignedModule, semesterNum) {
	if (semesterNum === assignedModule.semester) return semesterNum;
	var calculatedSemesterNum = semesterNum;
	//process prerequisites if module is being shifted backwards
	if (typeof assignedModule.semester === 'undefined' || semesterNum < assignedModule.semester) {
		// Iterate through all the prerequisites
		if (!isPrereqGroup(assignedModule)) {
			for (var i = 0; i < assignedModule.module.prerequisites.length; i++) {
				for (var j = 0; j < assignedModule.module.prerequisites[i].length; j++) {
					var prereqAssMod = getAssignedModule(assignedModule.module.prerequisites[i][j]);
					// If the prerequisite mod exists and is on a greater or same semester as the target, reassign it.
					if ((prereqAssMod !== null) && (prereqAssMod.semester >= semesterNum)) {
						if (typeof assignedModule.semester === 'undefined') {
							var givenSemesterNum = prereqAssMod.semester + 1;
							if (givenSemesterNum > semesterNum) semesterNum = givenSemesterNum;
						} else {
							semesterNum = assignSemester(prereqAssMod, semesterNum-1) + 1;
						}
					}
				}
			}
			if (typeof assignedModule.prereqGroups !== 'undefined') {
				for (var i = 0; i < assignedModule.prereqGroups.length; i++) {
					var prereqGroup = getAssignedModule(assignedModule.prereqGroups[i]);
					if (prereqGroup.semester >= semesterNum) {
						if (typeof assignedModule.semester === 'undefined') {
							semesterNum = prereqGroup.semester + 1;
						} else {
							semesterNum = assignSemester(prereqGroup, semesterNum-1) + 1;
						}
					}
				}
			}
		}
	}
	// If the earliest possible module in the prerequisite tree (the leaf) is being shifted to a semester before 1, warn the user, and keep it at semester 1
	if (semesterNum < 1) {
		var module_identifier= 'prerequisites group';
		if (!isPrereqGroup(assignedModule)) module_identifier = assignedModule.module.code;
		notify('Unable to shift module ' + module_identifier + ' before semester 1.', skillTree.NOTIFICATIONS.WARNING);
		semesterNum = 1;
	}
	//Process other modules that have it as a prerequisite if module is being shifted forwards.
	if (typeof assignedModule.semester === 'undefined' || semesterNum > assignedModule.semester) {
		// Iterate through all the assigned modules
		if (!isPrereqGroup(assignedModule)) {
			for (var i in skillTree.assignedModules) {
				if (skillTree.assignedModules.hasOwnProperty(i)) {
					// If the assigned module is different than the one we're assigning a semester to,
					// iterate through its prerequisites.
					if (i !== assignedModule.module.code) {
						var postreqMod = skillTree.assignedModules[i];
						if (!isPrereqGroup(postreqMod)) {
							for (var j = 0; j < postreqMod.module.prerequisites.length; j++) {
								// If the assigned mod requires our current module and is on a lesser or same semester as the target, reassign it.
								if ((postreqMod.module.prerequisites[j].indexOf(assignedModule.module.code) > -1) && (postreqMod.semester <= semesterNum)) {
									semesterNum = assignSemester(postreqMod, semesterNum+1) - 1;
								}
							}
						}
					}
				}
			}
		} else {
			var postreqMod = getAssignedModule(assignedModule.module);
			if (postreqMod.semester <= semesterNum) {
				semesterNum = assignSemester(postreqMod, semesterNum+1) - 1;
			}
		}
	}
	// Ensure that the semester exists before trying to assign to it.
	ensureSemester(semesterNum);
	var module_identifier;
	if (isPrereqGroup(assignedModule)) {
		module_identifier = assignedModule.id; 
	} else {
		module_identifier = assignedModule.module.code; 
	}
	if (assignedModule.semester && skillTree.semesters[assignedModule.semester-1]) {
		var assignedModuleIndex = skillTree.semesters[assignedModule.semester-1].indexOf(module_identifier);
		if (assignedModuleIndex !== -1) skillTree.semesters[assignedModule.semester-1].splice(assignedModuleIndex, 1);
	}
	skillTree.semesters[semesterNum-1].push(module_identifier);
	trimSemesters();
	
	if (assignedModule.semester != semesterNum) setModified(true);

	assignedModule.semester = semesterNum;
	return semesterNum;
}
// Returns the semester the module will be in.
function addModuleToTree(module) {
	// Verify that the module can be added to the tree without any conflicts.
	// Check that the module itself isn't already inserted.
	if (getAssignedModule(module.code)) {
		notify(module.code + " is already in the skill tree.", skillTree.NOTIFICATIONS.ERROR);
		return 0;
	}
	// Check that none of the module's preclusions are in the tree.
	for (var i = 0; i < module.preclusions.length; i++) {
		if (getAssignedModule(module.preclusions[i])) {
			notify(module.code + " is a preclusion of " + module.preclusions[i], skillTree.NOTIFICATIONS.ERROR);
			return 0;
		}
	}
	// Initialise an assigned module with no semester.
	var assignedModule = skillTree.assignedModules[module.code] = {
		module : module
	}
	// Count the number of prerequisites that need to be satisfied, if any.
	var numOfUnsatisfiedPrereqs = 0;
	// Generate and insert a .moduleBox for the module.
	var newDivId = module.code + 'box';
	var moduleBox = $('<div id="'+newDivId+'">' +
						'<div class="moduleInfo">' +
							'<div class="moduleCode">'+module.code+'</div>' +
							'<div class="moduleTitle">'+module.name+'</div>' +
						'</div>' +
						'<div class="controlPanel">' +
							'<button class="settings mst-icon-settings" title="Settings" data-toggle="tooltip"></button>' +
							' <button class="remove mst-icon-close" title="Remove this module" data-toggle="tooltip"></button>' +
						'</div>' +
					'</div>');
	moduleBox.appendTo('#skillTree').moduleBox(module);
	// Hide the module code in the search list.
	$('.module').filter(function() {
		return $(this).data("code") == module.code;
	}).addClass('added');
	
	// Remove the filter
	$("#module_search").val("");
	filter();
	
	setModified(true);
	
	deselectAllModuleBoxes();
	
	// Always try for first semester. If an exception happens, log it. This shouldn't happen, though.
	if (!assignSemester(assignedModule, 1)) {
		console.error("Warning, " + assignedModule.module.code + " could not be assigned a semester!");
	}
	
	// Connect the inserted module to any modules in the tree that requires it.
	// Only occurs during recursive addition of modules.
	console.log("Checking whether " + module.code + " is a prerequisite of any module already in the tree.");
	for (var i in skillTree.assignedModules) {
		if (skillTree.assignedModules.hasOwnProperty(i)) {
			var assMod = skillTree.assignedModules[i];
			// Ensure that the assignedModule isn't actually a moduleSelection
			if (isPrereqGroup(assMod)) {
				if (assMod.prerequisites.indexOf(module.code) > -1) {
					var parentAssMod = getAssignedModule(assMod.module);
					if (typeof parentAssMod.prerequisites === 'undefined') parentAssMod.prerequisites = [];
					parentAssMod.prerequisites.push(module.code);
					removeAssignedModule(assMod);
				}
			} else {
				console.log("Checking whether " + module.code + " is a prerequisite of " + i);
				for (var j = 0; j < assMod.module.prerequisites.length; j++) {
					var modIndex = assMod.module.prerequisites[j].indexOf(module.code);
					if ((assMod.module.code != module.code) && (modIndex > -1)) {
						console.log("Joining " + module.code + " to " + assMod.module.code);
						moduleBox.connectBottomTo(assMod.module.code + 'box');
						if (assMod.semester <= 1) {
							assignSemester(assMod, 2);
						}
					}
				}
			}
		}
	}
	// Iterate through all the prerequisites of the inserted module
	for (var i = 0; i < module.prerequisites.length; i++) {
		// Ignore if the prerequisite group is empty.
		var isInnerPrereqSatisfied = module.prerequisites[i].length == 0;
		if (module.prerequisites[i][0] == '-') isInnerPrereqSatisfied = true;
		var moduleExists = false;
		if (!isInnerPrereqSatisfied) {
			/*for (var j in skillTree.assignedModules) {
				if (skillTree.assignedModules.hasOwnProperty(j)) {
					var assMod = skillTree.assignedModules[j];
					// If there is a prerequisite already available in the skill tree (as an assigned module)
					if (assMod.module.code != module.code) {
						console.log("Checking whether " + assMod.module.code + " is a prerequisite of " + module.code);
						var modIndex = module.prerequisites[i].indexOf(assMod.module.code);
						if (modIndex > -1) {
							// The prerequisite is satisfied for this group of prerequisites.
							isInnerPrereqSatisfied = true;
							console.log("Prerequisite satisfied for " + module.code + ": " + assMod.module.code);
							// Connect the module to its prerequisite.
							moduleBox.connectTopTo(module.prerequisites[i][modIndex] + 'box');
							// Ensure the module is inserted after its prerequisite.
							targetSemester = assMod.semester+1;
						}
					}
				}
			}*/
			for (var j = 0; j < module.prerequisites[i].length; j++) {
				if (typeof skillTree.modules[module.prerequisites[i][j]] !== 'undefined') {
					moduleExists = true;
					var assMod = getAssignedModule(module.prerequisites[i][j]);
					// Ensure that the assignedModule isn't actually a prerequisite group (impossible)
					if (assMod != null && !isPrereqGroup(assMod)) {
						// The prerequisite is satisfied for this group of prerequisites.
						isInnerPrereqSatisfied = true;
						console.log("Prerequisite satisfied for " + module.code + ": " + assMod.module.code);
						// Connect the module to its prerequisite.
						moduleBox.connectTopTo(module.prerequisites[i][j] + 'box');
						// Store the prerequisite in our newly inserted assigned module.
						if (typeof assignedModule.prerequisites === 'undefined') assignedModule.prerequisites = [];
						assignedModule.prerequisites.push(module.prerequisites[i][j]);
					}
				}
			}
		}
		// If the prerequisite isn't satisfied for a prerequisite group
		if (!isInnerPrereqSatisfied && moduleExists) {
			// insert the first module in the group, and ensure that the currently inserted module is inserted after it.
			// needs to be altered to insert all modules in the group as suggestions.
			console.log("Inner prerequisite of " + module.code + " is not satisfied!");
			//
			
			if (module.prerequisites[i].length == 1) {
				ensureModuleDetails(getModule(module.prerequisites[i][0]), {
					callback  : addModuleToTree,
					useModule : true
				});
				if (typeof assignedModule.prerequisites === 'undefined') assignedModule.prerequisites = [];
				assignedModule.prerequisites.push(module.prerequisites[i][0]);
				//var altTargetSemester = addModuleToTree(getModule(module.prerequisites[i][0])) + 1;
				//if (targetSemester < altTargetSemester) targetSemester = altTargetSemester;
			} else {
				var prereqGroup = addPrereqGroupToTree(module.code, module.prerequisites[i]);
				if (typeof assignedModule.prereqGroups === 'undefined') assignedModule.prereqGroups = [];
				assignedModule.prereqGroups.push(prereqGroup);
				numOfUnsatisfiedPrereqs++;
			}
			
		}
	}
	
	if (typeof skillTree.removeModules[assignedModule.module.code] !== 'undefined') {
		skillTree.removeModules[module.code] = false;
	}
	
	if (numOfUnsatisfiedPrereqs == 1) {
		// Inform the user that at least one prerequisite group needs to be satisfied.
		notify(module.code + " is missing a pre-requisite. Please click the highlighted box to select your preferred modules.", skillTree.NOTIFICATIONS.WARNING);
	} else if (numOfUnsatisfiedPrereqs > 1) {
		// Inform the user that at least one prerequisite group needs to be satisfied.
		notify(module.code + " is missing " +  + " pre-requisites. Please click the highlighted boxes to select your preferred modules.", skillTree.NOTIFICATIONS.WARNING);
	}
	// Reposition the modules after successful addition, and return the semester in which the module was inserted into.
	repositionModules();
	return assignedModule.semester;
}

function addPrereqGroupToTree(code, prerequisites) {
	var prereqGroupId = "GROUP" + ++skillTree.numOfPrereqGroups;
	var prereqGroupBox = $('<div id="'+prereqGroupId+'box">' +
								'<div class="title">Pre-requisite Required</div>' +
								'<div class="message text-center">Click to select a module to resolve.</div>' +
							'</div>');
	prereqGroupBox.appendTo('#skillTree').prereqGroupBox();
	var prereqGroup = skillTree.assignedModules[prereqGroupId] = {
		id : prereqGroupId,
		module : code,
		prerequisites : prerequisites
	}
	prereqGroupBox.connectBottomTo(code + 'box');
	assignSemester(prereqGroup, 1);
	return prereqGroupId;
}

function removeAssignedModule(assignedModule) {
	var moduleBox = null;
	var semester = skillTree.semesters[assignedModule.semester-1];
	var semesterIndex = 0;
	if (isPrereqGroup(assignedModule)) {
		var parentAssignedModule = getAssignedModule(assignedModule.module);
		var prereqGroupIndex = parentAssignedModule.prereqGroups.indexOf(assignedModule.id);
		semesterIndex = semester.indexOf(assignedModule.id);
		moduleBox = $('#' + assignedModule.id + 'box');
		
		parentAssignedModule.prereqGroups.splice(prereqGroupIndex, 1);
		if (parentAssignedModule.prereqGroups.length == 0) delete parentAssignedModule.prereqGroups;
		delete skillTree.assignedModules[assignedModule.id];
	} else {
		var numOfInvalidModules = 0;
		semesterIndex = semester.indexOf(assignedModule.module.code);
		moduleBox = $('#' + assignedModule.module.code + 'box');
		
		for (var i in skillTree.assignedModules) {
			if (skillTree.assignedModules.hasOwnProperty(i)) {
				var otherAssMod = skillTree.assignedModules[i];
				// Ensure that the assignedModule isn't actually a moduleSelection
				if (!isPrereqGroup(otherAssMod)) {
					//console.log("Checking whether " + module.code + " is a prerequisite of " + i);
					var isInvalidModule = false;
					for (var j = 0; j < otherAssMod.module.prerequisites.length; j++) {
						var modIndex = otherAssMod.module.prerequisites[j].indexOf(assignedModule.module.code);
						if ((otherAssMod.module.code != assignedModule.module.code) && (modIndex > -1)) {
							//console.log("Joining " + module.code + " to " + assMod.module.code);
							if (otherAssMod.module.prerequisites[j].length == 1) {
								notify(assignedModule.module.code + " is the sole prerequisite of " + otherAssMod.module.code, skillTree.NOTIFICATIONS.ERROR);
								return;
							} else {
								var prereqGroup = addPrereqGroupToTree(otherAssMod.module.code, otherAssMod.module.prerequisites[j]);
								if (typeof otherAssMod.prereqGroups === 'undefined') otherAssMod.prereqGroups = [];
								otherAssMod.prereqGroups.push(prereqGroup);
								
								var prereqIndex = otherAssMod.prerequisites.indexOf(assignedModule.module.code);
								otherAssMod.prerequisites.splice(prereqIndex, 1);
								if (otherAssMod.prerequisites.length == 0) delete otherAssMod.prerequisites;
								isInvalidModule = true;
							}
						}
					}
					if (isInvalidModule) numOfInvalidModules++;
				}
			}
		}
		
		while (typeof assignedModule.prereqGroups !== 'undefined') {
			var prereqGroup = getAssignedModule(assignedModule.prereqGroups[0]);
			removeAssignedModule(prereqGroup);
		}
		
		if (numOfInvalidModules == 1) {
			// Inform the user that at least one prerequisite group needs to be satisfied.
			notify("A module now has a missing pre-requisite. Please click the highlighted box to select your preferred modules.", skillTree.NOTIFICATIONS.WARNING);
		} else if (numOfInvalidModules > 1) {
			// Inform the user that at least one prerequisite group needs to be satisfied.
			notify(numOfInvalidModules + " modules now have missing pre-requisites. Please click the highlighted boxes to select your preferred modules.", skillTree.NOTIFICATIONS.WARNING);
		}
		
		if (typeof skillTree.removeModules[assignedModule.module.code] !== 'undefined') {
			skillTree.removeModules[assignedModule.module.code] = true;
		}
		
		$('.module').filter(function() {
			return $(this).data("code") == assignedModule.module.code;
		}).removeClass('added');
		
		setModified(true);
		
		delete skillTree.assignedModules[assignedModule.module.code];
	}
	
	semester.splice(semesterIndex, 1);
	if (moduleBox !== null) moduleBox.removeModuleBox();
	trimSemesters();
	repositionModules();
}

// Initialize the page when jQuery is loaded
$(function(){
	$.extend($.fn.massAddClass = function(klass) {
		this.addClass(klass);
		return this;
		// lines below are disabled
		var timeout = 0;
		jQDiv = this;
		this.each(function() {
			timeout += 10;
			timeoutCall(function(data) { data.jQDiv.addClass(data.klass); }, { jQDiv : jQDiv, klass : klass }, timeout);
		});
	});
	$.extend($.fn.massRemoveClass = function(klass) {
		this.removeClass(klass);
		return this;
		// lines below are disabled
		var timeout = 0;
		jQDiv = this;
		this.each(function() {
			timeout += 10;
			timeoutCall(function(data) { data.jQDiv.removeClass(data.klass); }, { jQDiv : jQDiv, klass : klass }, timeout);
		});
	});
	// Initialise the nickname prompt
	$('#userBox .nickname').editable({
		type : 'text',
		url : '/private_data/SetName',
		title : 'Enter a new nickname',
		placement : 'bottom',
		pk : 1,
		name : 'nickname'
	}).tooltip({
		placement : 'left',
		title : 'Click to change your nickname.'
	});
	// Hide the alert box when the close button is clicked.
	$("#notification .close").click(hideNotification);
	
	// Filters the module list based on the input of the search box
	$('#module_search').val('').on('input',function(){
		clearTimeout(skillTree.searchTimeout);
		skillTree.searchTimeout = setTimeout(filter, 1000);
	});
	// Inserts a module when it is double clicked in the list.
	$('#module_list').on('dblclick','div',function(event){
		var module = getModule($(this).data("code"));
		// Retrieve the complete module from the server, and then add it to the tree.
		if (!module.isLoading) {
			ensureModuleDetails(module, {
				callback : addModuleToTree,
				useModule : true
			});
			// If the modules were being filtered via a prerequisite group, clear the filter.
			$('.module').removeClass('not_prerequisite');
		}
	})
	.slimScroll({
		position: 'right',
		height: '100%',
		distance: '2px',
		railVisible: true
	});
	// Saves the skill tree.
	$('#save_button').click(function() {
		saveToServer();
	});	
	// Assign modules a different semester if a .moduleBox is dropped onto a different semester.
	$("#skillTree").on('drop', '.semester', function(event, ui)  {
		var div_id = ui.draggable.attr('id');
		var module_code = div_id.substring(0, div_id.length-3);
		var semester_num = $(this).attr('id');
		// Forced cast from string to Number.
		semester_num = parseInt(semester_num.substr(semester_num.length-1));
		console.log(module_code + " assigned to " + semester_num);
		var assignedModule = getAssignedModule(module_code);
		assignSemester(assignedModule, semester_num);
		//repositionModules();
		//alert(module_code + " dropped into " + $(this).attr('id'));
	})
	// Reposition modules if a .moduleBox is dropped anywhere within the skillTree, including outside of a semester.
	.on('drop', function(event, ui) {
		repositionModules();
	})
	// Displays compatible prerequisites in the module list when a module selection box is selected
	.on('click', '.moduleBox.prereqGroup', function(event) {
		var div_id = $(this).attr('id');
		var moduleSelectId = div_id.substring(0, div_id.length-3);
		var moduleSelection = getAssignedModule(moduleSelectId);
		console.log('Filtering pre-requisites for ' + moduleSelection.module);
		
		$('.module').addClass('not_prerequisite');
		var divs = [];
		for (var code in skillTree.modules) {
			if (skillTree.modules.hasOwnProperty(code)) {
				if (moduleSelection.prerequisites.indexOf(code) > -1) {
					var div_id = code.replace(/\s*\/\s*/gi, '_');
					divs.push(div_id);
				}
			}
		}
		for (var i = 0; i < divs.length; i++) {
			$('#' + divs[i]).removeClass('not_prerequisite');
		}
	})
	// Removes a module when the remove button is clicked
	.on('click', '.moduleBox .remove', function(event) {
		var div_id = $(this).closest('.moduleBox').attr('id');
		var moduleCode = div_id.substring(0, div_id.length-3);
		var assignedModule = getAssignedModule(moduleCode);
		removeAssignedModule(assignedModule);
	})
	// Submit the semester to NUSMods for timetable planning.
	.on('click', '.semester .btn', function(event) {
		var div_id = $(this).closest('.semester').attr('id');
		var semester_num = div_id.substr(div_id.length-1);
		var modules = skillTree.semesters[semester_num-1];
		// NUSMods works if the modules are added using the following pattern:
		// #{module_code_1}=&{module_code_2}=&{module_code_3}...
		var url = "http://nusmods.com/#";
		var isValid = true;
		for (var i = 0; i < modules.length; i++) {
			if (modules[i].indexOf("GROUP") < 0) {
				if (i == 0) {
					url = url.concat(modules[i],"=");
				} else {
					url = url.concat("&", modules[i],"=");
				}
			} else {
				isValid = false;
			}
		}
		if (!isValid) {
				notify("Careful! You have an unfulfilled prerequisite group!", skillTree.NOTIFICATIONS.WARNING);
				setTimeout(function(){ window.open(url) },2000);
		} else {
			window.open(url);
		}
	})
	// Click handler for the skillTree itself.
	.on('click', function(event) {
		$('.module').removeClass('not_prerequisite');
	});
	// Load the modules from json.
	$.ajaxQueue({
		url : "/data/GetModuleList",
		type : "GET"
	}).done(function(json) {
		for (var moduleCode in json) {
			if (json.hasOwnProperty(moduleCode)) {
				if (!skillTree.modules.hasOwnProperty(moduleCode)) {
					skillTree.modules[moduleCode] = json[moduleCode];
					if (skillTree.moduleCodes.indexOf(moduleCode) < 0) skillTree.moduleCodes.push(moduleCode);
				}
			}
		}
		skillTree.moduleCodes.sort();
		for (var i = 0; i < skillTree.moduleCodes.length; i++) {
			var module_code = skillTree.moduleCodes[i];
			var div_id = module_code.replace(/\s*\/\s*/g, '_');
			var moduleBox = $("<div id=\"" + div_id + "\" class=\"module\" data-faculty=\"" + skillTree.modules[module_code].faculty +  "\" data-code=\"" + module_code + "\">" +
					skillTree.moduleCodes[i] +
				"</div>");
			//timeoutCall(function(moduleBoxArg) { moduleBoxArg.appendTo("#module_list").disableSelection(); }, moduleBox, 5*i);
			moduleBox.appendTo("#module_list").disableSelection();
		}
		console.log("Modules added!");
	});
	//Faculty Filter
	$('#faculty_filter').val(0).on('change', function(){	
		filter();
	});
	// Disable the save button on load
	$("#save_button").attr("disabled", "disabled");
	
	$("#shareUrl").add("#shareModal .copy-btn").click(function() { $("#shareUrl").select(); } );
	$("#share_button").click(function() {
		if (skillTree.isModified) {
			saveToServer(shareLink);
		} else {
			shareLink();
		}
	});
	// Initialize the edit skill tree button (for viewers)
	$("#edit_button").popover().click(function() {
		$("#view_panel").fadeOut(400).promise().done(function() {
			$("#edit_panel").fadeIn(400);
			enableEditMode();
			setModified(true);
		});
	});
	// Show the disclaimer modal (if there's one)
	$("#disclaimerModal").modal("show");
	
	
	// Resize elements to fit the screen
	$(window).resize(function() {
		moduleListHeight = $("body").innerHeight()
			- $("#top_panel").outerHeight()
			- $("#notification_panel").outerHeight()
			- ($("#edit_panel").innerHeight() - $("#edit_panel").height())
			- $("#module_search").outerHeight()
			- $("#faculty_filter").outerHeight()
			- $("#control_panel").outerHeight()
			- 100;
		$("#module_list_view").css("height", moduleListHeight + "px");
	});
	$(window).resize(); // Trigger the resize event
});
