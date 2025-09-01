const { EmbedBuilder } = require("discord.js");

const cron = require('node-cron');
const moment = require('moment');

const DISCORD_ANNOUNCEMENTS_CHANNEL_ID = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
const GoogleAppScriptManager = require('./google_app_script');
const googleAppScriptManager = new GoogleAppScriptManager();

function setupCronJobs(client) {
    scheduleWeeklyReminders(client);
    scheduleMonthlyReminders(client);
}

function scheduleWeeklyReminders(client) {
    console.log("DISCORD_REMINDERS: SCHEDULING WEEKLY REMINDERS")
    // Weekly message every Monday at 5:00 PM
    cron.schedule('0 17 * * 1', async () => {
        console.log("DISCORD_REMINDERS: RUNNING WEEKLY REMINDERS")
        const channel = client.channels.cache.get(DISCORD_ANNOUNCEMENTS_CHANNEL_ID);
        if (channel) {
            await createWeeklyReminders(channel);
        }
    });
}

function scheduleMonthlyReminders(client) {
    console.log("DISCORD_REMINDERS: SCHEDULING MONTHLY REMINDERS")
    // Monthly reminders every 1st day of the month at 5:00pm
    cron.schedule('0 17 1 * *', async () => {
        console.log("DISCORD_REMINDERS: RUNNING MONTHLY REMINDERS")
        const channel = client.channels.cache.get(DISCORD_ANNOUNCEMENTS_CHANNEL_ID);
        if (channel) {
            await createMonthlyReminders(channel);
        }
    });
}

async function createWeeklyReminders(channel) {
    const events = await googleAppScriptManager.getWeeklyReminders();
    if (events.count > 0) {
        const embed = await formatEventReminders(events.events, "Weekly");
        console.log("DISCORD_REMINDERS: SENDING WEEKLY REMINDERS")
        await channel.send({ content: "@everyone Please react once you've seen this message!", embeds: [embed] });
    }
}

async function createMonthlyReminders(channel) {
    const events = await googleAppScriptManager.getMonthlyReminders();
    if (events.count > 0) {
        const embed = await formatEventReminders(events.events, "Monthly");
        console.log("DISCORD_REMINDERS: SENDING MONTHLY REMINDERS")
        await channel.send({ content: "@everyone Please react once you've seen this message!", embeds: [embed] });
    }
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
            value: `🕒 ${startTime.format("MMMM D, YYYY")}\n${startTime.format("h:mm A")} - ${endTime.format("h:mm A")}`,
            inline: true
        }, {
            name: '🔗 Event Link',
            value: `[View in Google Calendar](${event.htmlLink})\n\n\n`,
            inline: true
        }, {
            name: '\u200B', // Invisible character
            value: '\u200B',
            inline: false
        });
    });

    return embed;
}

module.exports = { setupCronJobs, createWeeklyReminders, createMonthlyReminders };