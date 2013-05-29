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
	function repositionModules(animate=true) {
		var numSemesters = skillTree.semesters.length;
		for (var i = 0; i < numSemesters; i++) {
			var semester = skillTree.semesters[i];
			var numModules = semester.length;
			for (var j = 0; j < numModules; j++) {
				var assignedModule = getAssignedModule(semester[j]);
				var moduleBox = $('#' + assignedModule.module.code + 'box');
				// Check if a position was already set programmatically.
				var topOffset = new Number(i);
				var leftOffset = new Number(j);
				
				topOffset = ((topOffset+1) * skillTree.MODULE_VERT_SPACING) + (topOffset * skillTree.MODULE_HEIGHT);
				leftOffset = ((leftOffset+1) * skillTree.MODULE_HORIZ_SPACING) + (leftOffset * skillTree.MODULE_WIDTH);
				console.log(assignedModule.module.code + ": left=" + leftOffset + ",top=" + topOffset);
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
							}
						}
					);
				}
				console.log(moduleBox.css('top'));
			}
		}
		jsPlumb.repaintEverything();
		
	}
	function getModule(code) {
		for (i in skillTree.modules) {
			if (skillTree.modules[i].code === code) return skillTree.modules[i];
		};
		return null;
	}
	function getAssignedModule(code) {
		for (i in skillTree.assignedModules) {
			if (skillTree.assignedModules[i].module.code === code) return skillTree.assignedModules[i];
		};
		return null;
	}
	
	function ensureSemester(semesterNum) {
		if (!skillTree.semesters[semesterNum-1]) {
			skillTree.semesters[semesterNum-1] = [];
			var semesterDiv = $('<div id="semester' + semesterNum + '"><div class="semester_meta"><span>Semester ' + semesterNum + '</span><input class="btn btn-small btn-link pull-right" type="button" value="NUSMods"/></div></div>');
			semesterDiv.appendTo("#skillTree").semester();
		}
	}
	// Recursively shift modules. Returns false if invalid.
	function assignSemester(assignedModule, semesterNum) {
		if (semesterNum === assignedModule.semester) return true;
		//process prerequisites if module is being shifted backwards
		if (semesterNum < assignedModule.semester) {
			for (i in assignedModule.module.prerequisites) {
				for (j in assignedModule.module.prerequisites[i]) {
					var prereqAssMod = getAssignedModule(assignedModule.module.prerequisites[i][j]);
					if ((prereqAssMod !== null) && (prereqAssMod.semester >= semesterNum)) {
						if (!assignSemester(prereqAssMod, semesterNum-1)) return false;
					}
				}
			}
		//Otherwise, process other modules that have it as a prerequisite.
		} else {
			for (i in skillTree.assignedModules) {
				var postreqMod = skillTree.assignedModules[i];
				if (postreqMod !== assignedModule) {
					for (j in postreqMod.module.prerequisites) {
						if ((postreqMod.module.prerequisites[j].indexOf(assignedModule.module.code) > -1) && (postreqMod.semester <= semesterNum)) {
							if (!assignSemester(prereqAssMod, semesterNum+1)) return false;
						}
					}
				}
			}
		}
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
		var assignedModule = skillTree.assignedModules[skillTree.assignedModules.length] = {
			module : module
		}
		// Always try for first semester.
		var targetSemester = 1;
		var newDivId = module.code + 'box';
		var moduleBox = $('<div id="'+newDivId+'"><table cellspacing="0" cellpadding="0"><tr><th class="moduleCode">'+module.code+'</th></tr><tr><td class="moduleTitle text-center">'+module.name.toUpperCase()+'</td></tr></table></div>');
		moduleBox.appendTo('#skillTree').moduleBox();
		$('.module').filter(function() {
			return $(this).text() == module.code;
		}).hide();
		var missingModules = [];
		for (i in module.prerequisites) {
			var isInnerPrereqSatisfied = false;
			for (j in skillTree.assignedModules) {
				var assMod = skillTree.assignedModules[j];
				if (assMod.module.code != module.code) {
				console.log("Checking whether " + assMod.module.code + " is a prerequisite of " + module.code);
					var modIndex = module.prerequisites[i].indexOf(assMod.module.code);
					if (modIndex > -1) {
						isInnerPrereqSatisfied = true;
						console.log("Prerequisite satisfied for " + module.code + ": " + assMod.module.code);
						$('#' + newDivId).connectTopTo(module.prerequisites[i][modIndex] + 'box');
						targetSemester = assMod.semester+1;
					}
				}
			}
			if (!isInnerPrereqSatisfied) {
				var altTargetSemester = addModuleToTree(getModule(module.prerequisites[i][0])) + 1;
				if (targetSemester < altTargetSemester) targetSemester = altTargetSemester;
			}
			
			/*if (!isInnerPrereqSatisfied) {
				
			}*/
		}
		console.log("Checking whether " + module.code + " is a prerequisite of any module already in the tree.");
		for (i in skillTree.assignedModules) {
			var assMod = skillTree.assignedModules[i];
			console.log("Checking whether " + module.code + " is a prerequisite of " + assMod.module.code);
			for (j in assMod.module.prerequisites) {
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
		if (!assignSemester(assignedModule, targetSemester)) {
			console.error("Warning, " + assignedModule.module.code + " could not be assigned a semester!");
		}
		repositionModules();
		return assignedModule.semester;
	}
	$(window).resize(function() {
		moduleListHeight = $("body").innerHeight()
			- $("#top_panel").outerHeight()
			- ($("#left_panel").innerHeight() - $("#left_panel").height())
			- $("#module_search").outerHeight() - 50;
		$("#module_list").css("height", moduleListHeight + "px");
	});
	$(window).resize(); // Trigger the resize event
	$.getJSON("js/modules.json", function(json) {
		skillTree.modules = json;
		for (i in skillTree.modules) {
			$("<div class=\"module\">" + skillTree.modules[i].code + "</div>").appendTo("#module_list");
		}
		console.log("Modules added!");
	});
	$('#module_search').on('input',function(){
		$.each($('.module'),function(){	
			if($(this).text().indexOf($('#module_search').val()) !== -1) 
			{ 
				$(this).show(); 
			}
			else 
			{
				$(this).hide(); 
			}
		});
	});
	$('#module_list').on('dblclick','div',function(){
		var module = getModule($(this).text());
		addModuleToTree(module);
	});
	// TODO: what happens when a .moduleBox is dropped on a .semester?
	$("#skillTree").on('drop', '.semester', function(event, ui)  {
		var div_id = ui.draggable.attr('id');
		var module_code = div_id.substring(0, div_id.length-3);
		alert(module_code + " dropped into " + $(this).attr('id'));
	});
});
