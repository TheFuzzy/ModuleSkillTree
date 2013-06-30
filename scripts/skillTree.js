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
		connector:[ "Flowchart", { stub:10, gap:0, cornerRadius:5 } ],
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
		connector:[ "Flowchart", { stub:10, gap:0, cornerRadius:5 } ],
		maxConnections:-1,					/*
		hoverPaintStyle:endpointHoverStyle,*/
		connectorStyle:groupConnectorPaintStyle,
		connectorHoverStyle:connectorHoverStyle,
		dragOptions:{},
	}
	/*,			
	init = function(connection) {
		connection.getOverlay("label").setLabel(connection.sourceId.substring(6) + "-" + connection.targetId.substring(6));
		connection.bind("editCompleted", function(o) {
			if (typeof console != "undefined")
				console.log("connection edited. path is now ", o.path);
		});
	};*/			

	/*var allSourceEndpoints = [], allTargetEndpoints = [];
	_addEndpoints = function(toId, sourceAnchors, targetAnchors) {
		for (var i = 0; i < sourceAnchors.length; i++) {
			var sourceUUID = toId + sourceAnchors[i];
			allSourceEndpoints.push(jsPlumb.addEndpoint(toId, sourceEndpoint, { anchor:sourceAnchors[i], uuid:sourceUUID }));						
		}
		for (var j = 0; j < targetAnchors.length; j++) {
			var targetUUID = toId + targetAnchors[j];
			allTargetEndpoints.push(jsPlumb.addEndpoint(toId, targetEndpoint, { anchor:targetAnchors[j], uuid:targetUUID }));						
		}
	};

	_addEndpoints("CS1010box", ["BottomCenter"], ["TopCenter"]);
	_addEndpoints("CS1101Sbox", ["BottomCenter"], ["TopCenter"]);
	_addEndpoints("CS1020box", ["BottomCenter"], ["TopCenter"]);
	_addEndpoints("CS2010box", ["BottomCenter"], ["TopCenter"]);*/
	//_addEndpoints("box4", ["LeftMiddle", "RightMiddle"], ["TopCenter", "BottomCenter"]);
				
	// listen for new connections; initialise them the same way we initialise the connections at startup.
	/*jsPlumb.bind("jsPlumbConnection", function(connInfo, originalEvent) { 
		init(connInfo.connection);
	});*/		
				
	// make all the window divs draggable
	/*	
	jsPlumb.draggable($(".moduleBox"),
		{
			containment: "parent"
		}
	);
	*/
	// THIS DEMO ONLY USES getSelector FOR CONVENIENCE. Use your library's appropriate selector method!
	//jsPlumb.draggable(jsPlumb.getSelector(".window"));


	// connect a few up
	/*jsPlumb.connect({uuids:["CS1010boxBottomCenter", "CS1020boxTopCenter"]});
	jsPlumb.connect({uuids:["CS1101SboxBottomCenter", "CS1020boxTopCenter"]});
	jsPlumb.connect({uuids:["CS1020boxBottomCenter", "CS2010boxTopCenter"]});
	/*jsPlumb.connect({uuids:["window2LeftMiddle", "window4LeftMiddle"], editable:true});
	jsPlumb.connect({uuids:["window4TopCenter", "window4RightMiddle"], editable:true});
	jsPlumb.connect({uuids:["window3RightMiddle", "window2RightMiddle"], editable:true});
	jsPlumb.connect({uuids:["window4BottomCenter", "window1TopCenter"], editable:true});
	jsPlumb.connect({uuids:["window3BottomCenter", "window1BottomCenter"], editable:true});*/
	//
	// Defines a module box div. Can support many divs at once.
	$.fn.moduleBox = function(module) {
		if (!$.isArray(this)) {
			this.addClass("moduleBox");
			jsPlumb.draggable(this,
			{
				distance: 15,
				scroll: true,
				scrollSensitivity: 50,
				stack: ".moduleBox",
				containment: "parent"
			});
			//this.each(function() {
			id = $(this).attr('id');
			sourceUUID = id + "BottomCenter";
			targetUUID = id + "TopCenter";
			jsPlumb.addEndpoint(id, sourceEndpoint, { anchor:"BottomCenter", uuid:sourceUUID });
			jsPlumb.addEndpoint(id, targetEndpoint, { anchor:"TopCenter", uuid:targetUUID });
			
			if (typeof module !== 'undefined' && module != null) {
				$(this).data({
					moduleCode: module.code,
					moduleName: module.name,
					moduleDesc: module.description,
					moduleMc: module.mc
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
	// Defines a .semester div
	$.fn.semester = function() {
		this.addClass("semester");
		this.droppable({
			accept : ".moduleBox",
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
});
$(function() {
	// Show information in the moduleInfo div when a moduleBox is clicked.
	$("#skillTree").on("click", ".moduleBox", function(e) {
		$(".moduleBox").removeClass("selected");
		$(this).addClass("selected");
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
		$("#moduleInfo").stop().fadeOut(200);
	})
	// Show the module description when mouse is over
	.on('mouseenter', '.moduleBox:not(.prereqGroup,.ui-draggable-dragging)', function(event) {
		var moduleBox = $(this);
		var skillTreeBox = $("#skillTreeView");
		var moduleInfoBox = $("#moduleInfo");
		var moduleCode = moduleBox.data("moduleCode");
		var moduleName = moduleBox.data("moduleName");
		var moduleDesc = moduleBox.data("moduleDesc");
		//var moduleDesc = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur sit amet nunc sapien. Vestibulum posuere nisl id mi luctus interdum. Etiam sollicitudin aliquet augue sed vulputate. Sed nec nibh sollicitudin, tempor mi nec, rhoncus felis. Nunc tincidunt eget nulla et pharetra. Duis rutrum, odio et blandit vestibulum, velit elit iaculis felis, sit amet dictum enim magna ut lacus. Proin ullamcorper, eros rutrum adipiscing pretium, diam sapien ullamcorper ipsum, sit amet interdum nisi sem nec ipsum. Ut ornare, lacus mattis elementum molestie, eros odio placerat nisi, sed malesuada risus neque non nulla. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam. ";
		var moduleMc = moduleBox.data("moduleMc");
		
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
		var isRight = event.pageX < leftHalf;
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
		
		// TODO: positioning
		
		$("#moduleInfo").stop().fadeIn(200);
	})
	// Scroll the tooltip description according to the mouse position in the module box.
	.on("mousemove", ".moduleBox", function(event) {
		/*
		jsPlumb.select({ source: $(this).attr("id") }).hideOverlays();
		jsPlumb.select({ target: $(this).attr("id") }).hideOverlays();
		*/
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
	})
	// Hide arrow when mouse is out
	.on("mouseleave", ".moduleBox", function(event) {
		/*
		jsPlumb.select({ source: $(this).attr("id") }).hideOverlays();
		jsPlumb.select({ target: $(this).attr("id") }).hideOverlays();
		*/
		$("#moduleInfo").stop().fadeOut(200);
	})
	// Hide the moduleInfo box when a .moduleBox is being dragged, or when a click is registered outside of one.
	.on("dragstart", ".moduleBox", function(e) {
		$(this).stop(false)
		$(".moduleBox").removeClass("selected");
		//$("#moduleInfo").fadeOut("slow");
		jsPlumb.hide($(this).attr('id'));
		$("#moduleInfo").stop().fadeOut(200);
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
		$(".moduleBox").removeClass("selected");
		$("#moduleInfo").stop().fadeOut(200);
		//$("#moduleInfo").fadeOut("slow");
	})
	// Make the skillTree accept .moduleBox divs as drops
	.droppable({
			accept : ".moduleBox",
			tolerance : "pointer"
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