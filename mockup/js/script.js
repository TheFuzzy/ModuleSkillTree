// Global variable to store all global variables
var skillTree = {
	MODULE_SPACING : 100,
	num_semesters : 1,
	modules : [],
	assignedModules : []
};
$(function(){
	function getModule(code) {
		for (i in skillTree.modules) {
			if (skillTree.modules[i].code === code) return skillTree.modules[i];
		};
		return null;
	}
	function addModuleToTree(module) {
		var assignedModule = skillTree.assignedModules[skillTree.assignedModules.length] = {
			module : module
		}
		var newDivId = module.code + 'box';
		var moduleBox = $('<div id="'+newDivId+'"><table cellspacing="0" cellpadding="0"><tr><th class="moduleCode">'+module.code+'</th></tr><tr><td class="moduleTitle text-center">'+module.name.toUpperCase()+'</td></tr></table></div>');
		moduleBox.appendTo('#skillTree').moduleBox();
		var missingModules = [];
		for (i in module.prerequisites) {
			var isInnerPrereqSatisfied = false;
			for (j in skillTree.assignedModules) {
				var assMod = skillTree.assignedModules[j];
				if (assMod.module.code != module.code) {
					var modIndex = module.prerequisites[i].indexOf(assMod.module.code);
					if (modIndex > -1) {
						isInnerPrereqSatisfied = true;
						console.log("Prerequisite satisfied for " + module.code + ": " + assMod.module.code);
						$('#' + newDivId).connectTopTo(module.prerequisites[i][modIndex] + 'box');
					}
				}
			}
			if (!isInnerPrereqSatisfied) {
				addModuleToTree(getModule(module.prerequisites[i][0]));
			}
			
			/*if (!isInnerPrereqSatisfied) {
				
			}*/
		}
		for (i in skillTree.assignedModules) {
			var assMod = skillTree.assignedModules[i];
			for (j in assMod.module.prerequisites[i]) {
				var modIndex = assMod.module.prerequisites[j].indexOf(module.code);
				if ((assMod.module.code != module.code) && (modIndex > -1)) {
					console.log("Joining " + module.code + " to " + assMod.module.code);
					$('#' + newDivId).connectBottomTo(assMod.module.code + 'box');
				}
			}
		}
	}
	$(window).resize(function() {
		moduleListHeight = $("body").innerHeight()
			- $("#top_panel").outerHeight()
			- ($("#left_panel").innerHeight() - $("#left_panel").height())
			- $("#module_search").outerHeight();
		$("#module_list").css("height", moduleListHeight + "px");
	});
	$(window).resize();
	$.getJSON("js/modules.json", function(json) {
		skillTree.modules = json;
		for (i in skillTree.modules) {
			$("<div class=\"module\">" + skillTree.modules[i].code + "</div>").appendTo("#module_list");
		}
		console.log("Modules added!");
	});
	$('#module_search').on('input',function(){
		$.each($('#module_list').children(),function(){
			//if ($.text() == $('#module_search').text
			//Search Substring to toggle show and hide.
		});
	});
	$('#module_list').on('dblclick','div',function(){
		//alert($(this).text());
		var module = getModule($(this).text());
		addModuleToTree(module);
		$(this).hide();
	});
});
