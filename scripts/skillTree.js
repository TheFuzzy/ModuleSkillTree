jsPlumb.ready(function() {
	jsPlumb.importDefaults({
		// default to blue at one end and green at the other
		/*EndpointStyles : [{ fillStyle:'#225588' }, { fillStyle:'#558822' }],
		// blue endpoints 7 px; green endpoints 11.
		Endpoints : [ [ "Dot", {radius:7} ], [ "Dot", { radius:11 } ]],*/
		// the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
		// case it returns the 'labelText' member that we set on each connection in the 'init' method below.
		/*ConnectionOverlays : [
			[ "Arrow", { location:0.5, id:"arrow" } ],
			/*[ "Label", { 
				location:0.1,
				id:"label",
				cssClass:"aLabel"
			}]
		],*/
		ConnectionsDetachable : false
	});			

	// this is the paint style for the connecting lines..
	var connectorPaintStyle = {
		lineWidth:2,
		strokeStyle:"#000",
		joinstyle:"round",
		dashstyle: "dash"/*
		outlineColor:"#EAEDEF",
		outlineWidth:7*/
	},
	// .. and this is the hover style. 
	connectorHoverStyle = {
		lineWidth:2,
		strokeStyle:"#2e2aF8",
		dashstyle: "dash"
	},
	//endpointHoverStyle = {fillStyle:"#2e2aF8"},
	// the definition of source endpoints (the small blue ones)
	sourceEndpoint = {
		endpoint:"Blank",
		/*paintStyle:{ fillStyle:"#225588",radius:7 },*/
		isSource:true,
		connector:[ "Straight", { stub:10, gap:0, cornerRadius:5 } ],
		maxConnections:-1,					/*
		hoverPaintStyle:endpointHoverStyle,*/
		connectorStyle:connectorPaintStyle,
		connectorHoverStyle:connectorHoverStyle,
		dragOptions:{},
	},
	// a source endpoint that sits at BottomCenter
	//	bottomSource = jsPlumb.extend( { anchor:"BottomCenter" }, sourceEndpoint),
	// the definition of target endpoints (will appear when the user drags a connection) 
	targetEndpoint = {
		endpoint:"Blank",					
		/*paintStyle:{ fillStyle:"#558822",radius:11 },
		hoverPaintStyle:endpointHoverStyle,*/
		maxConnections:-1,
		dropOptions:{ hoverClass:"hover", activeClass:"active" },
		isTarget:true,			
		
	},
	// An alternative source paintstyle and endpoint for a prereq group DIV
	groupConnectorPaintStyle = {
		lineWidth:2,
		strokeStyle:"#d70",
		joinstyle:"round",
		dashstyle: "dash"
	},
	groupSourceEndpoint = {
		endpoint:"Blank",
		/*paintStyle:{ fillStyle:"#225588",radius:7 },*/
		isSource:true,
		connector:[ "Straight", { stub:10, gap:0, cornerRadius:5 } ],
		maxConnections:-1,					/*
		hoverPaintStyle:endpointHoverStyle,*/
		connectorStyle:groupConnectorPaintStyle,
		connectorHoverStyle:connectorHoverStyle,
		dragOptions:{},
	}
	// Defines a module box div. Can support many divs at once.
	$.fn.moduleBox = function(module, isDraggable) {
		isDraggable = typeof isDraggable !== 'undefined' ? isDraggable : true;
		if (!$.isArray(this)) {
			this.addClass("moduleBox");
			if (isDraggable) {
				jsPlumb.draggable(this,
				{
					distance: 15,
					scroll: true,
					scrollSensitivity: 50,
					stack: ".moduleBox",
					containment: "#skillTreeView"
				});
			}
			$(this).droppable(
			{
				accept: ".moduleBox",
				tolerance: "pointer",
				greedy: true
			});
			//this.each(function() {
			id = $(this).attr('id');
			sourceUUID = id + "BottomCenter";
			targetUUID = id + "TopCenter";
			jsPlumb.addEndpoint(id, sourceEndpoint, { anchor:"BottomCenter", uuid:sourceUUID });
			jsPlumb.addEndpoint(id, targetEndpoint, { anchor:"TopCenter", uuid:targetUUID });
			
			// $(this).find('.checkbox_exception').button({ label : 'Test' });
			
			if (typeof module !== 'undefined' && module != null) {
				var workload = '-';
				if (typeof module.workload !== 'undefined' && module.workload != null) workload = module.workload;
				$(this).data({
					moduleCode: module.code,
					moduleName: module.name,
					moduleDesc: module.description,
					moduleMc: module.mc,
					modulePrecludes: module.preclusions_string,
					modulePrereqs: module.prerequisites_string,
					moduleFaculty: module.faculty,
					moduleWorkload: workload
				});
			}
			//});
		}
		return this;
	}
	// Defines a prerequisite group box div. Can only support one DIV at a time.
	$.fn.prereqGroupBox = function() {
		//if (!$.isArray(this)) {
			this.addClass("moduleBox");
			this.addClass("prereqGroup");
			jsPlumb.draggable(this,
			{
				distance: 15,
				scroll: true,
				scrollSensitivity: 50,
				stack: ".moduleBox",
				containment: "parent"
			});
			this.each(function() {
				id = $(this).attr('id');
				sourceUUID = id + "BottomCenter";
				targetUUID = id + "TopCenter";
				jsPlumb.addEndpoint(id, groupSourceEndpoint, { anchor:"BottomCenter", uuid:sourceUUID });
				jsPlumb.addEndpoint(id, targetEndpoint, { anchor:"TopCenter", uuid:targetUUID });
			});
		//}
		return this;
	}
	// Removes the module box from existence safely.
	$.fn.removeModuleBox = function() {
		if (this.hasClass("moduleBox")) {
			jsPlumb.remove(this);
		}
	}
	// Selects a module box
	$.fn.selectModuleBox = function() {
		if (this.hasClass("moduleBox")) {
			var moduleBox = this;
			
			$(".moduleBox").removeClass("selected").removeClass("highlighted");
			moduleBox.addClass("selected");
			
			var skillTreeBox = $("#skillTreeView");
			var moduleInfoBox = $("#moduleInfo");
			var moduleCode = moduleBox.data("moduleCode");
			var moduleName = moduleBox.data("moduleName");
			var moduleDesc = moduleBox.data("moduleDesc");
			var moduleMc = moduleBox.data("moduleMc");
			var moduleFaculty = moduleBox.data("moduleFaculty");
			var moduleWorkload = moduleBox.data("moduleWorkload");
			var modulePrecludes = moduleBox.data("modulePrecludes");
			var modulePrereqs = moduleBox.data("modulePrereqs");
			
			var skillTreeLeft = skillTreeBox.offset().left;
			var skillTreeTop = skillTreeBox.offset().top;
			var skillTreeBoxWidth = skillTreeBox.outerWidth();
			var skillTreeRight = $(window).width() - skillTreeLeft - skillTreeBoxWidth;
			//console.log("Skill tree left: " + skillTreeLeft);
			//console.log("Skill tree width: " + skillTreeBoxWidth);
			//console.log("Skill tree right: " + skillTreeRight);
			//var moduleInfoBoxWidth = moduleInfoBox.css("width");
			//moduleInfoBoxWidth = parseInt(moduleInfoBoxWidth.substring(0, moduleInfoBoxWidth.length-2));
			/*
			var moduleBoxLeft = moduleBox.offset().left;
			var moduleBoxTop = moduleBox.offset().top;
			var moduleBoxWidth = moduleBox.css("width");
			var moduleBoxHeight = moduleBox.css("height");
			moduleBoxWidth = parseInt(moduleBoxWidth.substring(0, moduleBoxWidth.length-2));
			moduleBoxHeight = parseInt(moduleBoxHeight.substring(0, moduleBoxHeight.length-2));
			*/
			
			var leftHalf = skillTreeLeft + skillTreeBoxWidth/2;
			//var isRight = event.pageX < leftHalf;
			var isRight = true;
			//console.log("Left half: " + leftHalf);
			//console.log("Is mouse in left half: " + isRight);
			
			var moduleInfoBoxTop = skillTreeTop + 10;
			var leftBound = skillTreeLeft + 10;
			var rightBound =  skillTreeRight + 20;
			
			
			if (isRight) {
				moduleInfoBox.css({
					top :   moduleInfoBoxTop + "px",
					left :  "",
					right : rightBound + "px"
				});
			} else {
				moduleInfoBox.css({
					top :   moduleInfoBoxTop + "px",
					left :  leftBound + "px",
					right : ""
				});
			}
			moduleInfoBox.find(".moduleCode").text(moduleCode);
			moduleInfoBox.find(".moduleName").text(moduleName);
			moduleInfoBox.find(".moduleDesc").text(moduleDesc);
			moduleInfoBox.find(".moduleMc").text(moduleMc);
			moduleInfoBox.find(".moduleWorkload").text(moduleWorkload);
			moduleInfoBox.find(".moduleFaculty").text(moduleFaculty);
			moduleInfoBox.find(".modulePrecludes").text(modulePrecludes);
			moduleInfoBox.find(".modulePrereqs").text(modulePrereqs);
			
			// TODO: positioning
			
			$("#moduleInfo").stop().fadeIn(200);
			
			$("#skillTree").addClass("highlight-mode");
			
			var connections = jsPlumb.getAllConnections()[jsPlumb.getDefaultScope()];
			if (typeof connections !== 'undefined'){
				for (var i = 0; i < connections.length; i++) {
					connections[i].setVisible(false);
				}
			}
			
			var sourceConnections = jsPlumb.getConnections({ source: this.attr('id'), flat: true });
			if (typeof sourceConnections !== 'undefined'){
				for (var i = 0; i < sourceConnections.length; i++) {
					sourceConnections[i].setVisible(true);
					sourceConnections[i].target.addClass("highlighted");
				}
			}
			
			var targetConnections = jsPlumb.getConnections({ target: this.attr('id'), flat: true });
			if (typeof targetConnections !== 'undefined'){
				for (var i = 0; i < targetConnections.length; i++) {
					targetConnections[i].setVisible(true);
					targetConnections[i].source.addClass("highlighted");
				}
			}
			
			this.addClass("highlighted");
			
			//jsPlumb.show(this.attr('id'));
		}
	}
	// Defines a .semester div
	$.fn.semester = function() {
		this.addClass("semester");
		this.droppable({
			accept : ".moduleBox, .module",
			tolerance : "pointer",
			hoverClass: "drop-hover",
			greedy: true
		});
	}
	// Connects the bottom of the current div to the top of the div with the given id.
	$.fn.connectBottomTo = function(id) {
		if ($("#" + id).hasClass("moduleBox")) {
			this.filter('.moduleBox').each(function() {
				sourceUUID = $(this).attr('id') + "BottomCenter";
				targetUUID = id + "TopCenter";
				jsPlumb.connect({uuids:[sourceUUID, targetUUID]});
			});
		}
		return this;
	}
	// Connects the top of the current div to the bottom of the div with the given id.
	$.fn.connectTopTo = function(id) {
		if ($("#" + id).hasClass("moduleBox")) {
			this.filter('.moduleBox').each(function() {
				sourceUUID = id + "BottomCenter";
				targetUUID = $(this).attr('id') + "TopCenter";
				jsPlumb.connect({uuids:[sourceUUID, targetUUID]});
			});
		}
		return this;
	}
	
	$.extend($.fn.disableSelection = function() {
		return this.attr('unselectable', 'on').css('user-select', 'none').on('selectstart', false);
	});
});
function deselectAllModuleBoxes() {
	$(".moduleBox").removeClass("selected").removeClass("highlighted");
	$("#moduleInfo").stop().fadeOut(200);
	
	var connections = jsPlumb.getAllConnections()[jsPlumb.getDefaultScope()];
	if (typeof connections !== 'undefined'){
		for (var i = 0; i < connections.length; i++) {
			connections[i].setVisible(true);
		}
	}
	
	$("#skillTree").removeClass("highlight-mode");
}
// Once enabled, it cannot be disabled.
function enableEditMode() {
	jsPlumb.draggable($('.moduleBox'),
	{
		distance: 15,
		scroll: true,
		scrollSensitivity: 50,
		stack: ".moduleBox",
		containment: "parent"
	});
	$("#skillTreeView").addClass("editMode");
}
function repaintSkillTree() {
	var skillTreeBox = $("#skillTree");
	var skillTreeViewBox = $("#skillTreeView");
	var semestersBox = $("#semesters");
	if (skillTreeBox[0].scrollWidth >= semestersBox[0].scrollWidth) {
		$(".semester").css('min-width', skillTreeBox[0].scrollWidth + 'px');
	} else {
		$(".semester").css('min-width', '');
	}
	$("#skillTreeView").perfectScrollbar("update");
}
$(function() {
	// Show information in the moduleInfo div when a moduleBox is clicked.
	$("#skillTreeView").on("click", ".moduleBox", function(e) {
		$(this).selectModuleBox();
		/*
		properties = [".moduleCode", ".moduleTitle"];
		for (i in properties) {
			$("#moduleInfo").find(properties[i]).text($(this).find(properties[i]).text());
		}
		$("#moduleInfo").fadeIn("slow");
		*/
		
		e.stopPropagation();
	})
	.on("click", ".moduleBox .remove", function(e) {
		deselectAllModuleBoxes();
		e.stopPropagation();
	})
	// Show the module description when mouse is over
	//.on('mouseenter', '.moduleBox:not(.prereqGroup,.ui-draggable-dragging)', function(event) {
		
	//})
	// Scroll the tooltip description according to the mouse position in the module box.
	/*.on("mousemove", ".moduleBox", function(event) {
		//$("#moduleInfo").fadeOut({ queue: false });
		
		var scrollBox = $("#moduleInfo .moduleDesc");
		var scrollBoxDom = scrollBox[0];
		var contentHeight = scrollBoxDom.scrollHeight;
		var visibleHeight = scrollBoxDom.clientHeight;
		if (contentHeight > visibleHeight) {
			var moduleBox = $(this);
			var skillTreeBox = $("#skillTreeView");
			var scrollBox = $("#moduleInfo .moduleDesc");
			var scrollBoxDom = scrollBox[0];
			
			//var moduleBoxLeft = moduleBox.offset().left;
			var moduleBoxTop = moduleBox.offset().top;
			//var moduleBoxWidth = moduleBox.outerWidth();
			var moduleBoxHeight = moduleBox.outerHeight();
			
			var innerMargin = 20;
			
			var relativeMouseY = event.pageY - moduleBoxTop - innerMargin;
			var relativeScrollPercent = relativeMouseY / (moduleBoxHeight - innerMargin*2);
			
			if (relativeScrollPercent < 0) relativeScrollPercent = 0;
			else if (relativeScrollPercent > 1) relativeScrollPercent = 1;
			
			//console.log("relativeMouseY " + relativeMouseY);
			//console.log("Scroll to " + relativeScrollPercent);
			
			var contentHeight = scrollBoxDom.scrollHeight;
			var visibleHeight = scrollBoxDom.clientHeight;
			scrollBox.scrollTop(relativeScrollPercent * (contentHeight-visibleHeight));
		}
		
	})*/
	// Hide arrow when mouse is out
	//.on("mouseleave", ".moduleBox", function(event) {
		/*
		jsPlumb.select({ source: $(this).attr("id") }).hideOverlays();
		jsPlumb.select({ target: $(this).attr("id") }).hideOverlays();
		*/
	//	$("#moduleInfo").stop().fadeOut(200);
	//})
	// Hide the moduleInfo box when a .moduleBox is being dragged, or when a click is registered outside of one.
	.on("dragstart", ".moduleBox", function(e) {
		$(this).stop(false);
		//$("#moduleInfo").fadeOut("slow");
		jsPlumb.hide($(this).attr('id'));
		deselectAllModuleBoxes();
	})
	// Hide the moduleInfo box when a .moduleBox is being dragged, or when a click is registered outside of one.
	.on("dragstop", ".moduleBox", function(e) {
		jsPlumb.show($(this).attr('id'));
		/*
		jsPlumb.select({ source: $(this).attr("id") }).hideOverlays();
		jsPlumb.select({ target: $(this).attr("id") }).hideOverlays();
		*/
	})
	.on("click", function(e) {
		deselectAllModuleBoxes();
		//$("#moduleInfo").fadeOut("slow");
	})
	// Make the skillTree accept .moduleBox divs as drops
	.droppable({
			accept : ".moduleBox, .module",
			tolerance : "pointer"
	});
	/*
	$(document).bind('mousemove.perfect-scroll', function (e) {
		var scrollbarX = $(".ps-scrollbar-x");
		if (scrollbarX.hasClass('in-scrolling')) {
			$(".semester").css('left', $("#skillTreeView").scrollLeft());
		}
	});*/
	// Initialize the accordion within the #moduleInfo panel
	
	$('#descContainer').slimScroll({
        height: '100px'
    });
	
	$('#precludeContainer').slimScroll({
        height: '100px'
    });
	
	$('#prereqContainer').slimScroll({
        height: '100px'
    });
	
	$("#moduleAccordion").accordion({
		header: "h5",
		heightStyle: "content"
	});

	
	// Scroll!
	$("#skillTreeView").perfectScrollbar();
	// Initialise any .semester divs on the page as semesters.
	$(".semester").semester();
	// Resize elements to fit page.
	$(window).resize(function() {
		skillTreeHeight=$("body").innerHeight()
			- $("#top_panel").outerHeight()
			- $("#notification_panel").outerHeight()
			- ($("#right_panel").innerHeight() - $("#right_panel").height());
		$("#skillTreeView").css("height", skillTreeHeight + "px");
		$("#skillTreeView").perfectScrollbar("update");
		//$("#skillTreeView").css("height", skillTreeHeight + "px");
	});
	$(window).resize();
	/*
	$("#skillTreeView").scroll(function() {
		jsPlumb.repaintEverything();
	});
	*/
});