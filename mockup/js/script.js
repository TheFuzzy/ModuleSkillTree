// Global variable to store all global variables
var skillTree = {
	MODULE_HORIZ_SPACING : 20,
	MODULE_VERT_SPACING : 50,
	MODULE_WIDTH : 200,
	MODULE_HEIGHT : 150,
	semesters : [[]],
	modules : [],
	assignedModules : []
};
$(function(){
	// Helper class to reposition all .moduleBox divs to proper positions, based only on the values in the global variable.
	// animate=false will prevent any animations from running.
	function repositionModules(animate=true) {
		var numSemesters = skillTree.semesters.length;
		for (var i = 0; i < numSemesters; i++) {
			var semester = skillTree.semesters[i];
			var numModules = semester.length;
			for (var j = 0; j < numModules; j++) {
				var assignedModule = getAssignedModule(semester[j]);
				var moduleBox = $('#' + assignedModule.module.code + 'box');
				
				var topOffset = new Number(i);
				var leftOffset = new Number(j);
				
				topOffset = ((topOffset+1) * skillTree.MODULE_VERT_SPACING) + (topOffset * skillTree.MODULE_HEIGHT);
				leftOffset = ((leftOffset+1) * skillTree.MODULE_HORIZ_SPACING) + (leftOffset * skillTree.MODULE_WIDTH);
				//console.log(assignedModule.module.code + ": left=" + leftOffset + ",top=" + topOffset);
				// Check if a position was already set programmatically. If not, set a position outside the viewport.
				if (animate && moduleBox[0].style.left == "") {
					moduleBox.css('left', -500 + 'px');
					moduleBox.css('top', 50 + 'px');
				}
				if (!animate) {
					moduleBox.css('left', leftOffset + 'px');
					moduleBox.css('top', topOffset + 'px');
				} else {
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
								jsPlumb.repaintEverything();
							},
							queue: false
						}
					);
				}
			}
		}
		// Repaint the flowchart lines, in case the whole process wasn't animated.
		jsPlumb.repaintEverything();
		
	}
	// Gets the module instance from the global variable, given the module code
	// code - String
	function getModule(code) {
		for (i in skillTree.modules) {
			if (skillTree.modules[i].code === code) return skillTree.modules[i];
		};
		return null;
	}
	// Gets the assigned module instance from the global variable, given the module code
	// code - String
	function getAssignedModule(code) {
		for (i in skillTree.assignedModules) {
			if (skillTree.assignedModules[i].module.code === code) return skillTree.assignedModules[i];
		};
		return null;
	}
	// Ensures that the .semester div representing the given number exists.
	// semesterNum - int
	function ensureSemester(semesterNum) {
		if (!skillTree.semesters[semesterNum-1]) {
			skillTree.semesters[semesterNum-1] = [];
			var semesterDiv = $('<div id="semester' + semesterNum + '"><div class="semester_meta"><span>Semester ' + semesterNum + '</span>' + '<input class="btn btn-small btn-link pull-right" type="button" value="NUSMods"/>' + '</div></div>');
			semesterDiv.appendTo("#skillTree").semester();
		}
	}
	// Recursively shift modules. Returns false if invalid.
	function assignSemester(assignedModule, semesterNum) {
		if (semesterNum === assignedModule.semester) return true;
		if (semesterNum < 1) return false;
		//process prerequisites if module is being shifted backwards
		if (semesterNum < assignedModule.semester) {
			// Iterate through all the prerequisites
			for (var i = 0; i < assignedModule.module.prerequisites.length; i++) {
				for (var j = 0; j < assignedModule.module.prerequisites[i].length; j++) {
					var prereqAssMod = getAssignedModule(assignedModule.module.prerequisites[i][j]);
					// If the prerequisite mod exists and is on a greater or same semester as the target, reassign it.
					if ((prereqAssMod !== null) && (prereqAssMod.semester >= semesterNum)) {
						if (!assignSemester(prereqAssMod, semesterNum-1)) return false;
					}
				}
			}
		//Otherwise, process other modules that have it as a prerequisite.
		} else {
			// Iterate through all the assigned modules
			for (var i = 0; i < skillTree.assignedModules.length; i++) {
				var postreqMod = skillTree.assignedModules[i];
				// If the assigned module is different than the one we're assigning a semester to,
				// iterate through its prerequisites.
				if (postreqMod !== assignedModule) {
					for (var j = 0; j < postreqMod.module.prerequisites.length; j++) {
						// If the assigned mod requires our current module and is on a lesser or same semester as the target, reassign it.
						if ((postreqMod.module.prerequisites[j].indexOf(assignedModule.module.code) > -1) && (postreqMod.semester <= semesterNum)) {
							if (!assignSemester(postreqMod, semesterNum+1)) return false;
						}
					}
				}
			}
		}
		// Ensure that the semester exists before trying to assign to it.
		ensureSemester(semesterNum);
		if (assignedModule.semester && skillTree.semesters[assignedModule.semester-1]) {
			var assignedModuleIndex = skillTree.semesters[assignedModule.semester-1].indexOf(assignedModule.module.code);
			if (assignedModuleIndex !== -1) skillTree.semesters[assignedModule.semester-1].splice(assignedModuleIndex, 1);
		}
		skillTree.semesters[semesterNum-1].push(assignedModule.module.code);
		
		assignedModule.semester = semesterNum;
		return true;
	}
	// Returns the semester the module will be in.
	function addModuleToTree(module) {
		// Initialise an assigned module with no semester.
		var assignedModule = skillTree.assignedModules[skillTree.assignedModules.length] = {
			module : module
		}
		// Always try for first semester.
		var targetSemester = 1;
		// Generate and insert a .moduleBox for the module.
		var newDivId = module.code + 'box';
		var moduleBox = $('<div id="'+newDivId+'"><table cellspacing="0" cellpadding="0"><tr><th class="moduleCode">'+module.code+'</th></tr><tr><td class="moduleTitle text-center">'+module.name.toUpperCase()+'</td></tr></table></div>');
		moduleBox.appendTo('#skillTree').moduleBox();
		// Hide the module code in the search list.
		$('.module').filter(function() {
			return $(this).text() == module.code;
		}).addClass('added');
		// Iterate through all the prerequisites of the inserted module
		for (var i = 0; i < module.prerequisites.length; i++) {
			var isInnerPrereqSatisfied = false;
			for (var j = 0; j < skillTree.assignedModules.length; j++) {
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
						$('#' + newDivId).connectTopTo(module.prerequisites[i][modIndex] + 'box');
						// Ensure the module is inserted after its prerequisite.
						targetSemester = assMod.semester+1;
					}
				}
			}
			// If the prerequisite isn't satisfied for a prerequisite group
			if (!isInnerPrereqSatisfied) {
				// insert the first module in the group, and ensure that the currently inserted module is inserted after it.
				// needs to be altered to insert all modules in the group as suggestions.
				var altTargetSemester = addModuleToTree(getModule(module.prerequisites[i][0])) + 1;
				if (targetSemester < altTargetSemester) targetSemester = altTargetSemester;
			}
		}
		// Connect the inserted module to any modules in the tree that requires it.
		// Only occurs during recursive addition of modules.
		console.log("Checking whether " + module.code + " is a prerequisite of any module already in the tree.");
		for (var i = 0; i < skillTree.assignedModules.length; i++) {
			var assMod = skillTree.assignedModules[i];
			console.log("Checking whether " + module.code + " is a prerequisite of " + assMod.module.code);
			for (var j = 0; j < assMod.module.prerequisites.length; j++) {
				var modIndex = assMod.module.prerequisites[j].indexOf(module.code);
				if ((assMod.module.code != module.code) && (modIndex > -1)) {
					console.log("Joining " + module.code + " to " + assMod.module.code);
					$('#' + newDivId).connectBottomTo(assMod.module.code + 'box');
					if (assMod.semester <= targetSemester) {
						assignSemester(assMod, targetSemester+1);
					}
				}
			}
		}
		// If an exception happens, log it.
		if (!assignSemester(assignedModule, targetSemester)) {
			console.error("Warning, " + assignedModule.module.code + " could not be assigned a semester!");
		}
		// Reposition the modules after successful addition, and return the semester in which the module was inserted into.
		repositionModules();
		return assignedModule.semester;
	}
	// Resize elements to fit the screen
	$(window).resize(function() {
		moduleListHeight = $("body").innerHeight()
			- $("#top_panel").outerHeight()
			- ($("#left_panel").innerHeight() - $("#left_panel").height())
			- $("#module_search").outerHeight() - 50;
		$("#module_list").css("height", moduleListHeight + "px");
	});
	$(window).resize(); // Trigger the resize event
	// Load the modules from json.
	$.getJSON("js/modules.json", function(json) {
		skillTree.modules = json;
		for (i in skillTree.modules) {
			$("<div class=\"module\">" + skillTree.modules[i].code + "</div>").appendTo("#module_list");
		}
		console.log("Modules added!");
	});
	// Filters the module list based on the input of the search box
	$('#module_search').on('input',function(){
		$.each($('.module'),function(){	
			if($(this).text().indexOf($('#module_search').val()) !== -1) 
			{ 
				$(this).removeClass('hidden'); 
			}
			else 
			{
				$(this).addClass('hidden'); 
			}
		});
	});
	$('#module_list').on('dblclick','div',function(){
		var module = getModule($(this).text());
		addModuleToTree(module);
	});
	// Assign modules a different semester if a .moduleBox is dropped onto a different semester.
	$("#skillTree").on('drop', '.semester', function(event, ui)  {
		var div_id = ui.draggable.attr('id');
		var module_code = div_id.substring(0, div_id.length-3);
		var semester_num = $(this).attr('id');
		// Forced cast from string to Number.
		semester_num = new Number(semester_num.substr(semester_num.length-1));
		console.log(module_code + " assigned to " + semester_num);
		var assignedModule = getAssignedModule(module_code);
		assignSemester(assignedModule, semester_num);
		//alert(module_code + " dropped into " + $(this).attr('id'));
	})
	// Reposition modules if a .moduleBox is dropped anywhere within the skillTree, including outside of a semester.
	.on('drop', function(event, ui) {
		repositionModules();
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
	});
});
