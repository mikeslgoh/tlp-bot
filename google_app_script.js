const axios = require("axios");

class GoogleAppScriptManager {
	constructor() { }

	async createEvent(event) {
		try {
			const response = await axios.post(process.env.GOOGLE_APP_SCRIPT_URL, { event: event });
			return response.data;
		} catch (error) {
			console.error("Error creating event:", error);
			throw error;
		}
	}

	async getEventDetails(eventName) {
		try {
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { name: eventName } });
			return response.data;
		} catch (error) {
			console.error("Error getting event details:", error);
			throw error;
		}
	}

	async getWeeklyReminders() {

	}

	async getMonthlyReminders() {
	}
}

module.exports = GoogleAppScriptManager