const axios = require("axios");
const moment = require('moment');

class GoogleAppScriptManager {
    constructor() {}

    async createEvent(details) {
        const formattedEvent = this.parseEventText(details);
		try {
			const response = await axios.post(process.env.GOOGLE_APP_SCRIPT_URL, { event: formattedEvent });
			return response.data;
		} catch (error) {
			console.error("Error creating event:", error);
			throw error;
		}
    }

    async getEventDetails(eventName) {
		try{
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { name: eventName } });
			return response.data;
		} catch (error) {
			console.error("Error getting event details:", error);
			throw error;
		}
    }

	parseEventText(details) {
		const regex = /Event Name:\s*(.+)\s*Date:\s*(.+)\s*Start Time:\s*(\d{1,2}(?::\d{2})?\s*[ap]m?).*\sEnd Time:\s*(\d{1,2}(?::\d{2})?\s*[ap]m?).*\sDescription:\s*([\s\S]*?)\s*Location:\s*(.+)/i;

		const match = details.match(regex);

		if (!match) {
			console.log("CREATE_CALENDAR_EVENT: No matches found!")
			return null;
		}

		const eventName = match[1].trim();
		const date = match[2].trim();
		const startTime = match[3].trim();
		const endTime = match[4].trim();
		const description = match[5].trim();
		const location = match[6].trim();
		
		// Convert times to ISO datetime strings
		const startDateTime = this.formatToISODateTime(date, startTime);
		const endDateTime = this.formatToISODateTime(date, endTime);
		
		if (!startDateTime || !endDateTime) {
			console.log("FORMAT_DATE_TIME: Invalid date/time format");
			return null;
		}
		
		return {
			title: eventName,
			startDateTime: startDateTime,
			endDateTime: endDateTime,
			description: description,
			location: location
		};
	}

	formatToISODateTime(dateStr, timeStr, timezone = 'America/Vancouver') {
		try {
			const dateTimeStr = `${dateStr} ${timeStr}`;
			
			const formats = [
				'MM/DD/YYYY h:mma',
				'MM/DD/YYYY ha',
				'YYYY-MM-DD h:mma', 
				'YYYY-MM-DD ha'
			];
			
			const dateTime = moment(dateTimeStr, formats, timezone);
			return dateTime.isValid() ? dateTime.toISOString() : null;
			
		} catch (error) {
			console.error('Error formatting datetime:', error);
			return null;
		}
	}
}

module.exports = GoogleAppScriptManager