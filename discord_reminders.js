const { EmbedBuilder } = require("discord.js");

const cron = require('node-cron');

const DISCORD_ANNOUNCEMENTS_CHANNEL_ID = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
const GoogleAppScriptManager = require('./google_app_script');
const googleAppScriptManager = new GoogleAppScriptManager();

function setupCronJobs(client) {   
    scheduleWeeklyReminders(client);
    scheduleMonthlyReminders(client);
}

function scheduleWeeklyReminders(client) {
    // Weekly message every Monday at 5:00 PM
    cron.schedule('0 17 * * 1', async () => {
        const channel = client.channels.cache.get(DISCORD_ANNOUNCEMENTS_CHANNEL_ID);
        if (channel) {
            events = await googleAppScriptManager.getWeeklyReminders();
            await channel.send('📅 Weekly planning time! Here are this week\'s events.');
        }
    });
}

function scheduleMonthlyReminders(client) {
    // Monthly reminders every 1st day of the month at 5:00pm
    cron.schedule('0 17 1 * *', async () => {
        const channel = client.channels.cache.get(DISCORD_ANNOUNCEMENTS_CHANNEL_ID);
        if (channel) {
            events = await googleAppScriptManager.getMonthlyReminders();
            await channel.send('📅 Monthly planning time! Here are this month\'s events.');
        }
    });
}

async function formatEventReminders(events, type) {
    const embed = new EmbedBuilder()
        .setTitle(`📅 ${type} Event Reminder`)
        .setColor(0x4285F4)
        .setTimestamp();
    
    events.forEach((event, index) => {
        const startTime = moment(event.start).tz("America/Vancouver");
        const endTime = moment(event.end).tz("America/Vancouver");

        embed.addFields({
            name: `${index + 1}. ${event.title}`,
            value: `📅 ${startTime.format("MMMM D, YYYY")}\n${startTime.format("h:mm A")} - ${endTime.format("h:mm A")}`,
            inline: false
        }, {
            name: '🔗 Event Link',
            value: `[View in Google Calendar](${event.htmlLink})`,
            inline: false
        });
    });
    
    return embed;
}

module.exports = { setupCronJobs }