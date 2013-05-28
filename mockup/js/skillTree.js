jsPlumb.ready(function() {
	jsPlumb.importDefaults({
		// default to blue at one end and green at the other
		EndpointStyles : [{ fillStyle:'#225588' }, { fillStyle:'#558822' }],/*
		// blue endpoints 7 px; green endpoints 11.
		Endpoints : [ [ "Dot", {radius:7} ], [ "Dot", { radius:11 } ]],*/
		// the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
		// case it returns the 'labelText' member that we set on each connection in the 'init' method below.
		ConnectionOverlays : [
			[ "Arrow", { location:0.5 } ],
			/*[ "Label", { 
				location:0.1,
				id:"label",
				cssClass:"aLabel"
			}]*/
		],
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
	endpointHoverStyle = {fillStyle:"#2e2aF8"},
	// the definition of source endpoints (the small blue ones)
	sourceEndpoint = {
		endpoint:"Blank",
		/*paintStyle:{ fillStyle:"#225588",radius:7 },*/
		isSource:true,
		connector:[ "Flowchart", { stub:10, gap:0, cornerRadius:5 } ],
		maxConnections:-1,								                
		connectorStyle:connectorPaintStyle,/*
		hoverPaintStyle:endpointHoverStyle,
		connectorHoverStyle:connectorHoverStyle,*/
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
		
	}/*,			
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
	$.fn.moduleBox = function() {
		this.addClass("moduleBox");
		jsPlumb.draggable(this,
		{
			containment: "parent"
		});
		this.each(function() {
			id = $(this).attr('id');
			sourceUUID = id + "BottomCenter";
			targetUUID = id + "TopCenter";
			jsPlumb.addEndpoint(id, sourceEndpoint, { anchor:"BottomCenter", uuid:sourceUUID });
			jsPlumb.addEndpoint(id, targetEndpoint, { anchor:"TopCenter", uuid:targetUUID });
		});
		return this;
	}
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
	$(".moduleBox").click(function(e) {
		$(".moduleBox").removeClass("selected");
		$(this).addClass("selected");
		properties = [".moduleCode", ".moduleTitle"];
		for (i in properties) {
			$("#moduleInfo").find(properties[i]).text($(this).find(properties[i]).text());
		}
		/*var moduleCode = $(this).find(".moduleCode").text(),
			moduleTitle = $(this).find(".moduleTitle").text(),
			moduleCode = $(this).find(".moduleDesc").text();
		$("#moduleInfo").find(".moduleCode).text(*/
		$("#moduleInfo").fadeIn("slow");
	});
	$(window).resize(function() {
		$("#skillTree").css("min-height", 
			$("body").innerHeight()
			- $("#top_panel").outerHeight()
			- ($("#right_panel").innerHeight() - $("#right_panel").height())
			+ "px");
	});
	$(window).resize();
	$("#skillTreeView").scroll(function() {
		jsPlumb.repaintEverything();
	});
});