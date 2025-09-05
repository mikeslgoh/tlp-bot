import axios from "axios";

class GoogleAppScriptManager {
	constructor() { }

	async createEvent(event) {
		try {
			const response = await axios.post(process.env.GOOGLE_APP_SCRIPT_URL, { action: "createEvent", event: event });
			return response.data;
		} catch (error) {
			console.error("Error creating event:", error);
			throw error;
		}
	}

	async getEventDetails(eventName) {
		try {
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { action: "calendarRequest",type: "single", name: eventName } });
			return response.data;
		} catch (error) {
			console.error("Error getting event details:", error);
			throw error;
		}
	}

	async getWeeklyReminders() {
		try {
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { action: "calendarRequest", type: "weekly" } });
			return response.data;
		} catch (error) {
			console.error("Error getting weekly reminders:", error);
			throw error;
		}
	}

	async getMonthlyReminders() {
		try {
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { action: "calendarRequest",type: "monthly" } });
			return response.data;
		} catch (error) {
			console.error("Error getting monthly reminders:", error);
			throw error;
		}
	}

	async getPendingRequestDocNames() {
		try {
			const response = await axios.get(process.env.GOOGLE_APP_SCRIPT_URL, { params: { action: "pendingRequest" } });
			return response.data;
		} catch (error) {
			console.error("Error getting pending request document names:", error);
			throw error;
		}
	}

	async approveEventRequest(docName) {
		try {
			const response = await axios.post(process.env.GOOGLE_APP_SCRIPT_URL, { action: "approveEventRequest", documentName: docName });
			return response.data;
		} catch (error) {
			console.error("Error approving event request:", error);
			throw error;
		}
	}
}

export default GoogleAppScriptManager;