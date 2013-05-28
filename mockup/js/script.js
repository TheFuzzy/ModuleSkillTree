var myGlobal = {
	MODULE_SPACING : 100,
	num_semesters : 1,
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
		moduleListHeight = $("body").innerHeight()
			- $("#top_panel").outerHeight()
			- ($("#left_panel").innerHeight() - $("#left_panel").height())
			- $("#module_search").outerHeight();
		$("#module_list").css("height", moduleListHeight + "px");
	});
	$(window).resize(); // Trigger the resize event
	$.getJSON("js/modules.json", function(json) {
		myGlobal.modules = json;
		for (i in myGlobal.modules) {
			$("<div class=\"module\">" + myGlobal.modules[i].code + "</div>").appendTo("#module_list");
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
