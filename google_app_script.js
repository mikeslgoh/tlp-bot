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
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { type: "single", name: eventName } });
			return response.data;
		} catch (error) {
			console.error("Error getting event details:", error);
			throw error;
		}
	}

	async getWeeklyReminders() {
		try {
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { type: "weekly" } });
			return response.data;
		} catch (error) {
			console.error("Error getting weekly reminders:", error);
			throw error;
		}
	}

	async getMonthlyReminders() {
		try {
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { type: "monthly" } });
			return response.data;
		} catch (error) {
			console.error("Error getting monthly reminders:", error);
			throw error;
		}
	}
}

module.exports = GoogleAppScriptManager