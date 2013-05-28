var myGlobal = {
	MODULE_SPACING : 100,
	modules : [],
	assignedModules : []
};
$(function(){
	function getModule(code) {
		for (i in myGlobal.modules) {
			if (myGlobal.modules[i].code === code) return myGlobal.modules[i];
		};
		return null;
	}
	$(window).resize(function() {
		$("#module_list").css("height", 
			$("body").innerHeight()
			- $("#top_panel").outerHeight()
			- ($("#left_panel").innerHeight() - $("#left_panel").height())
			- $("#module_search").outerHeight()
			+ "px");
	});
	$(window).resize();
	$.getJSON("js/modules.json", function(json) {
		myGlobal.modules = json;
		for (i in myGlobal.modules) {
			$("<div class=\"module\">" + myGlobal.modules[i].code + "</div>").appendTo("#module_list");
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
		var div_id = $(this).text()+'box';
		var module = getModule($(this).text());
		assignedModule = myGlobal.assignedModules[myGlobal.assignedModules.length] = {
			module : module
		}
		var moduleBox = $('<div id="'+div_id+'"><table cellspacing="0" cellpadding="0"><tr><th class="moduleCode">'+$(this).text()+'</th></tr><tr><td class="moduleTitle text-center">'+module.name.toUpperCase()+'</td></tr></table></div>').appendTo('#skillTree').moduleBox();
		$(this).hide();
		for (i in module.prerequisites) {
			for (j in module.prerequisites[i]) {
				$('#' + module.prerequisites[i][j] + 'box').connectBottomTo(div_id);
			}
		}
	});
});
