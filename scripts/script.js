// Global variable to store all global variables
var skillTree = {
	MODULE_HORIZ_SPACING : 20,
	MODULE_VERT_SPACING : 50,
	MODULE_WIDTH : 200,
	MODULE_HEIGHT : 120,
	NOTIFICATIONS : { SUCCESS : "success", WARNING : "warning", ERROR : "error" },
	semesters : [[]],
	modules : {},
	assignedModules : {},
	numOfPrereqGroups : 0
};
// Test function
function testJSON(data) {
	$.ajax("/data/TestJSON", {
		type : "POST",
		data : { data : JSON.stringify(data) }
	})
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
	return "";
}
// Save skill tree.
function saveToServer() {
	var error = stateIsInvalid();
	if (error) {
		notify(error, skillTree.NOTIFICATIONS.ERROR);
	} else {
		// TODO: server saving
		notify("Saved!", skillTree.NOTIFICATIONS.SUCCESS);
	}
}
// Load skill tree. Should be called by embedded javascript in the HTML itself.
function loadFromServer() {
	// TODO: server loading
}


// Helper class to reposition all .moduleBox divs to proper positions, based only on the values in the global variable.
// animate=false will prevent any animations from running.
function repositionModules(animate) {
	animate = typeof animate !== 'undefined' ? a : true;
	var numSemesters = skillTree.semesters.length;
	for (var i = 0; i < numSemesters; i++) {
		var semester = skillTree.semesters[i];
		var numModules = semester.length;
		for (var j = 0; j < numModules; j++) {
			var assignedModule = getAssignedModule(semester[j]);
			var moduleBox;
			if (isPrereqGroup(assignedModule)) moduleBox = $('#' + assignedModule.id + 'box');
			else moduleBox = $('#' + assignedModule.module.code + 'box');
			moduleBox.stop(true);
			
			
			var topOffset = parseInt(i);
			var leftOffset = parseInt(j);
			
			topOffset = ((topOffset+1) * skillTree.MODULE_VERT_SPACING) + (topOffset * skillTree.MODULE_HEIGHT);
			leftOffset = ((leftOffset+1) * skillTree.MODULE_HORIZ_SPACING) + (leftOffset * skillTree.MODULE_WIDTH);
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
		});
	}
}


// Ensures that the .semester div representing the given number exists.
// semesterNum - int
function ensureSemester(semesterNum) {
	if ((semesterNum > 0) && (!skillTree.semesters[semesterNum-1])) {
		skillTree.semesters[semesterNum-1] = [];
		var semesterDiv = $('<div id="semester' + semesterNum + '">' +
								'<div class="semester_meta">' +
									'<span>Semester ' + semesterNum + '</span>' +
									'<input class="btn btn-small btn-link pull-right" type="button" value="NUSMods"/>' +
								'</div>' +
							'</div>');
		semesterDiv.appendTo("#skillTree").semester();
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
	if (semesterNum > assignedModule.semester) {
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
			semesterNum = assignSemester(postreqMod, semesterNum+1) - 1;
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
							'<div class="moduleTitle">'+module.name.toUpperCase()+'</div>' +
						'</div>' +
						'<div class="controlPanel">' +
							'<button class="settings mst-icon-settings" title="Settings" data-toggle="tooltip"></button>' +
							' <button class="remove mst-icon-close" title="Remove this module" data-toggle="tooltip"></button>' +
						'</div>' +
					'</div>');
	moduleBox.appendTo('#skillTree').moduleBox();
	// Hide the module code in the search list.
	$('.module').filter(function() {
		return $(this).text() == module.code;
	}).addClass('added');
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
				var assMod = getAssignedModule(module.prerequisites[i][j]);
				// Ensure that the assignedModule isn't actually a prerequisite group (impossible)
				if (assMod != null && !isPrereqGroup(assMod)) {
					// The prerequisite is satisfied for this group of prerequisites.
					isInnerPrereqSatisfied = true;
					console.log("Prerequisite satisfied for " + module.code + ": " + assMod.module.code);
					// Connect the module to its prerequisite.
					moduleBox.connectTopTo(module.prerequisites[i][j] + 'box');
					// Ensure the module is inserted after its prerequisite.
				}
			}
		}
		// If the prerequisite isn't satisfied for a prerequisite group
		if (!isInnerPrereqSatisfied) {
			// insert the first module in the group, and ensure that the currently inserted module is inserted after it.
			// needs to be altered to insert all modules in the group as suggestions.
			console.log("Inner prerequisite of " + module.code + " is not satisfied!");
			//
			
			if (module.prerequisites[i].length == 1) {
				ensureModuleDetails(getModule(module.prerequisites[i][0]), {
					callback  : addModuleToTree,
					useModule : true
				}); 
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
								if (typeof assignedModule.prereqGroups === 'undefined') assignedModule.prereqGroups = [];
								assignedModule.prereqGroups.push(prereqGroup);
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
		
		
		$('.module').filter(function() {
			return $(this).text() == assignedModule.module.code;
		}).removeClass('added');
		
		delete skillTree.assignedModules[assignedModule.module.code];
	}
	
	semester.splice(semesterIndex, 1);
	if (moduleBox !== null) moduleBox.removeModuleBox();
	trimSemesters();
	repositionModules();
}

// Initialize the page when jQuery is loaded
$(function(){
	// Resize elements to fit the screen
	$(window).resize(function() {
		moduleListHeight = $("body").innerHeight()
			- $("#top_panel").outerHeight()
			- $("#notification_panel").outerHeight()
			- ($("#left_panel").innerHeight() - $("#left_panel").height())
			- $("#module_search").outerHeight() - 50
			- $("#control_panel").outerHeight();
		$("#module_list").css("height", moduleListHeight + "px");
	});
	$(window).resize(); // Trigger the resize event
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
	$('#module_search').on('input',function(){
		searchText = $('#module_search').val().replace('_', '').toLowerCase();
		
		if (searchText){
			$('.module').addClass('hidden');
			var divs = [];
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
			for (var i = 0; i < divs.length; i++) {
				$('#' + divs[i]).removeClass('hidden');
			}
		} else {
			$('.module').removeClass('hidden');
		}
	});
	$('#module_list').on('dblclick','div',function(){
		var module = getModule($(this).text());
		// Retrieve the complete module from the server, and then add it to the tree.
		ensureModuleDetails(module, {
			callback : addModuleToTree,
			useModule : true
		});
		// If the modules were being filtered via a prerequisite group, clear the filter.
		$('.module').removeClass('not_prerequisite');
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
		for (var i = 0; i < modules.length; i++) {
			if (i == 0) {
				url = url.concat(modules[i],"=");
			} else {
				url = url.concat("&", modules[i],"=");
			}
		}
		window.open(url);
	})
	// Click handler for the skillTree itself.
	.on('click', function(event) {
		$('.module').removeClass('not_prerequisite');
	});
	// Load the modules from json.
	$.getJSON("/data/GetModuleList", function(json) {
		skillTree.modules = json;
		for (i in skillTree.modules) {
			if (skillTree.modules.hasOwnProperty(i)) {
				var div_id = skillTree.modules[i].code.replace(/\s*\/\s*/g, '_');
				$("<div id=\"" + div_id + "\" class=\"module\">" + skillTree.modules[i].code + "</div>").appendTo("#module_list");
			}	
		}
		console.log("Modules added!");
	});
});
