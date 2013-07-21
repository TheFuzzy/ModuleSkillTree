$().ready(function(){
	$(".sign_in_button").attr('onclick','').unbind('click')
	.click(function(event) {
		var redirectURL = $(this).attr('href');
		if (typeof redirectURL === 'undefined' || redirectURL == null) {
			redirectURL = window.location;
		}
		var redirectURL = encodeURIComponent(redirectURL);
		$('#loginModal').modal({
			remote : "/login?embed=1&continue=" + redirectURL,
			show : true
		});
		event.preventDefault();
		event.stopPropagation();
	});
});