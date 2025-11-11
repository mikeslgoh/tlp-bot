import moment from 'moment';

class Utils {
	constructor() { }

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

	parseEventFormText(details) {
		const eventName = `${details.name} ${details.event_type}`;
		const location = details.location;

		const dateSplit = details.date.split(" ");
		const date = dateSplit[0];
		const startTime = dateSplit[1];

		const startDateTime = this.formatToISODateTime(date, startTime);
		const description = `Set List\n${details.set_list || ''}\n`+
							`Dress Code\n${details.dress_code || ''}\n`+
							`Number of Singers\n${details.number_of_singers || ''}\n`

		return {
			title: eventName,
			startDateTime: startDateTime,
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

			const dateTime = moment.tz(dateTimeStr, formats, timezone);

			console.log('Formatted datetime:', dateTime.toLocaleString());

			return dateTime.isValid() ? dateTime.toISOString() : null;

		} catch (error) {
			console.error('Error formatting datetime:', error);
			return null;
		}
	}
}

export default Utils;