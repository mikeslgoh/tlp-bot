import { Client as NotionClient } from '@notionhq/client';
const notion = new NotionClient({ auth: process.env.NOTION_INTEGRATION_TOKEN });

const NOTION_EVENT_PROJECT_ID = process.env.NOTION_EVENT_PROJECT_ID;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

class NotionManager {
	constructor() { }

	async syncCalendarEvent(event, calendarLink) {
		try {
			const response = await notion.pages.create({
				parent: { database_id: NOTION_DATABASE_ID },
				properties: {
					"Name": { title: [{ text: { content: event.title } }] },
					"Dates": {
						date: {
							start: event.startDateTime, // ISO string
							end: event.endDateTime      // ISO string
						}
					},
					"TLP Projects": {
						relation: [{ id: NOTION_EVENT_PROJECT_ID }]
					}
				},
				children: [
					{
						object: "block",
						type: "paragraph",
						paragraph: {
							rich_text: [
								{
									type: "text",
									text: {
										content: `${calendarLink}`,
										link: { url: calendarLink }
									}
								},
								{
									type: "text", text: {
										content: `Location: ${event.location}\n` +
											`Description: ${event.description}\n`
									}
								}

							]
						}
					}
				]
			});

			return response;
		} catch (error) {
			console.error("Error creating Notion page:", error);
			throw error;
		}
	}
}

export default NotionManager;