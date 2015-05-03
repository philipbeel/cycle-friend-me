jQuery(function(){

	var strava = {

		host: "http://localhost:3000",

		init: function () {
			this.setupFormHandler();
		},

		setupFormHandler: function () {
			$('#find').on("click", function (event) {
				event.preventDefault();

				var athleteId = $("#athleteId").val() || null;

				if (!athleteId) {
					console.log("no athleteId present");
				} else {
					this.getRoutes(athleteId);
				}
			}.bind(this));
		},

		getRoutes: function (athleteId) {
			jQuery.ajax({
				url: this.host + "?athlete="+athleteId,
			}).done(function(data) {
				console.log("response::", data);
			}.bind());
		}
	}
	
	// In the words of Mario, let's a go!!
	strava.init();
});