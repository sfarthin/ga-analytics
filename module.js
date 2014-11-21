var googleapis 	= require('googleapis'),
	OAuth2 		= googleapis.auth.OAuth2,
	fs			= require("fs"),
	moment 		= require("moment");

module.exports = function(settings, final_callback) {
	
	var GOOGLEAPI_CLIENTID = (settings.clientId ? settings.clientId : process.env.GOOGLEAPI_CLIENTID),
		GOOGLEAPI_EMAIL = (settings.serviceEmail ? settings.serviceEmail : process.env.GOOGLEAPI_EMAIL),
		GOOGLEAPI_KEY = (settings.key ? settings.key : process.env.GOOGLEAPI_KEY),
		GOOGLEAPI_ANALYTICS_TABLE = (settings.ids ? settings.ids : process.env.GOOGLEAPI_ANALYTICS_TABLE);

	var sessionFile = process.env.TMPDIR + "ga-analytics-" + GOOGLEAPI_EMAIL.replace(/[^a-zA-Z\-]/gi, "_");

	if(!settings.startDate)
		settings.startDate = moment().subtract(moment.duration(1, 'M')).format('YYYY-MM-DD');
	
	if(!settings.endDate)
		settings.endDate = moment(settings.startDate).add(moment.duration(1, 'M')).format('YYYY-MM-DD')


	var oauth2Client = new OAuth2(GOOGLEAPI_CLIENTID, null, 'postmessage'),
		jwt 		 = new googleapis.auth.JWT(GOOGLEAPI_EMAIL, GOOGLEAPI_KEY, null, ['https://www.googleapis.com/auth/analytics.readonly']);

	var authorize = function(callback) {
		fs.exists(sessionFile, function(exists) {
			if(exists) {
				fs.readFile(sessionFile, function(err, res) {
					if(err) {
						jwt.authorize(callback);
						return;
					}
					
					var json = JSON.parse(res);
					
					if(new Date(json.expiry_date) > Date.now()) {
						callback(null, json);
					} else {
						jwt.authorize(callback);
					}
					
				});
			} else {
				jwt.authorize(callback);
			}
			
		});
	}
	

	authorize(function(err, result) {
		if(err) {
			final_callback(err);
			return;
		}
		
		fs.writeFile(sessionFile, JSON.stringify(result));

		oauth2Client.setCredentials({
			access_token: result.access_token,
			refresh_token: result.refresh_token
		});
	
		// https://developers.google.com/analytics/devguides/reporting/core/dimsmets
		// https://developers.google.com/analytics/devguides/reporting/core/v3/coreDevguide
		googleapis.analytics('v3').data.ga.get({
		    "ids": GOOGLEAPI_ANALYTICS_TABLE,
		    "start-date": settings.startDate,
		    "end-date": settings.endDate,
		    "metrics": settings.metrics,
			auth: oauth2Client
		}, function(err, r) {
			
			if(err) {
				final_callback(err);
				return;
			}
			
			final_callback(null, r);
		});	
		
	});
	
}