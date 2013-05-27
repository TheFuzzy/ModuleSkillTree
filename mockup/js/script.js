var myGlobal = {
	modules : []
};
$(function(){
	function getModule(code) {
		for (i in myGlobal.modules) {
			if (myGlobal.modules[i].code === code) return myGlobal.modules[i];
		};
		return null;
	}
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
		$('<div id="'+div_id+'" class="moduleBox"><table cellspacing="0" cellpadding="0"><tr><th class="moduleCode">'+$(this).text()+'</th></tr><tr><td class="moduleTitle text-center">'+getModule($(this).text()).name.toUpperCase()+'</td></tr></table></div>').appendTo('#skillTree');
		$(this).hide();
		jsPlumb.draggable($(".moduleBox"),
			{
				containment: "parent"
			}
		);
	});
});
