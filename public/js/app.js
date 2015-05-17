jQuery(function(){

    var socket = io();

	socket.on('result', function (data) {
		strava.hideLoader();
		$("#friends").append(data.html);
	});

	socket.on('update', function (data) {
		$("#totals").html(data.html);
	});

	socket.on('error', function (data) {
		strava.hideLoader();
		$("#error").append(data.html);
	});

	// Start foundation
 	$(document).foundation();

	var strava = {

		// @TODO change to hosted IP
		host: "http://localhost:8088",

		init: function () {
			this.setupFormHandler();
			this.setDefaultFocus();
		},

		setDefaultFocus: function  () {
			$( "#athleteId" ).focus();
		},

		setupFormHandler: function () {
			$('#find').on("click", function (event) {
				event.preventDefault();

				this.prepareSearch();
				var athleteId = $("#athleteId").val() || null;

				if (!athleteId) {
					console.log("no athleteId present");
				} else {
					this.showLoader();
					this.getRoutes(athleteId);
					this.scrollToResults();
				}
			}.bind(this));
		},

		prepareSearch: function () {
			$("#error").empty();
			$("#totals").empty();
			$("#friends").empty();

			this.hideLoader();
		},

		showLoader: function () {
			$('#results').css({'minHeight': '500px'});
			$("#loading").show();
		},

		hideLoader: function () {
			$("#loading").hide();
		},

		scrollToResults: function () {
			var target_offset = $("#athletes").offset();
			var target_top = target_offset.top;

			$('html, body').animate({scrollTop:target_top}, 'fast');
		},

		getRoutes: function (athleteId) {
			socket.emit('athlete', athleteId);
		}
	};

	// In the words of Mario, let's a go!!
	strava.init();
});
