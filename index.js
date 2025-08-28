const { Client, GatewayIntentBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const moment = require('moment');

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
const axios = require("axios");

const GoogleAppScriptManager = require("./google_app_script");
const NotionManager = require("./notion_script")
const Utils = require("./utils");

// Initialize the bot client
function initializeClient() {
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
        ],
    });
}

const client = initializeClient();

function getCommands() {
    return [
        new SlashCommandBuilder()
            .setName('hello')
            .setDescription('Say hello to our TLP Bot!'),
        new SlashCommandBuilder()
            .setName('event')
            .setDescription('Manage calendar events')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('create')
                    .setDescription('Create a new calendar event')
                    .addStringOption(option =>
                        option.setName('details')
                            .setDescription('Event details')
                            .setRequired(true)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('get-details')
                    .setDescription('Get details of a calendar event (within the next 3 months)')
                    .addStringOption(option =>
                        option.setName('event-name')
                            .setDescription('Name of the event to retrieve')
                            .setRequired(true)))
    ];
}

// Register slash commands with Discord API
async function registerCommands() {
    const commands = getCommands();

    try {
        console.log("🔄 Registering slash commands...");
        await rest.put(Routes.applicationCommands(process.env.DISCORD_BOT_CLIENT_ID), { body: commands.map(cmd => cmd.toJSON()) });
        console.log("✅ Slash commands registered!");
    } catch (error) {
        console.error("❌ Failed to register commands:", error);
    }
}

async function handleHelloCommand(interaction) {
    await interaction.reply(`👋 Hello!`);
}

async function handleNewEventCommand(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const details = interaction.options.getString("details");

        const googleAppScriptManager = new GoogleAppScriptManager();
        const utils = new Utils();

        const formattedEvent = utils.parseEventText(details);
        const resp = await googleAppScriptManager.createEvent(formattedEvent);

        // Check for error in response
        if (resp.toLowerCase().includes("error")) {
            await interaction.editReply({
                content: `❌ Event creation failed: ${resp}`
            });
            return;
        }

        console.log("CREATE_CALENDAR_EVENT: Event created on Google Calendar!")

        const notionManager = new NotionManager();
        // await notionManager.syncCalendarEvent(formattedEvent, resp);
        console.log(await notionManager.syncCalendarEvent(formattedEvent, resp));

        console.log("CREATE_CALENDAR_EVENT: Event synced to Notion!")

        const button = new ButtonBuilder()
            .setCustomId('send_to_channel')
            .setLabel('Send to channel')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.editReply({
            content: `✅ Event created successfully: ${resp}`,
            components: [row]
        });
    } catch (error) {
        console.error("Error creating event:", error);
        await interaction.editReply({ content: "❌ Failed to create event", ephemeral: true });
    }
}

async function handleGetEventDetailsCommand(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const details = interaction.options.getString("event-name");

        const googleAppScriptManager = new GoogleAppScriptManager();
        const resp = await googleAppScriptManager.getEventDetails(details);

        // Check for error in response
        if (resp.error) {
            await interaction.editReply({
                content: `❌ Event retrieval failed: ${resp.error}`
            });
            return;
        }

        console.log("GET_EVENT_DETAILS: Event details retrieved from Google Calendar!")

        const button = new ButtonBuilder()
            .setCustomId('send_to_channel')
            .setLabel('Send to channel')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.editReply({
            content: formatEventDetails(resp),
            components: [row]
        });

    } catch (error) {
        console.error("Error creating event:", error);
        await interaction.editReply({ content: "❌ Failed to retrieve event.", ephemeral: true });
    }
}

function formatEventDetails(resp) {
    if (resp.count > 1) {
        return "Multiple events were found. Please be more specific.";
    }

    let event = resp.events[0];

    return `📅 **${event.title}** 📅 \n` +
        `Date: ${moment(event.start).format("MMMM D, YYYY h:mm A")} - ${moment(event.end).format("h:mm A")}\n` +
        `Description: ${event.description}\n` +
        `Location: ${event.location}\n` +
        `Link: ${event.htmlLink}`;
}

async function handleSlashCommand(interaction) {
    const { commandName, options } = interaction;
    if (commandName === "event") {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "create") {
            await handleNewEventCommand(interaction);
        } else if (subcommand === "get-details") {
            await handleGetEventDetailsCommand(interaction);
        }
    } else if (commandName === "hello") {
        await handleHelloCommand(interaction);
    } else {
        await interaction.reply({ content: "Unknown command", ephemeral: true });
    }
}

// --- handler for button interaction ---
async function handleButton(interaction) {
    if (interaction.customId === 'send_to_channel') {
        await interaction.channel.send(interaction.message.content);

        await interaction.deferUpdate();
        await interaction.deleteReply();
    }
}

// Handle interaction events
function setupInteractionHandler() {
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        }
    });
}

// Start the bot
async function startBot() {
    await registerCommands();
    setupInteractionHandler();

    client.once("ready", () => {
        console.log(`✅ Logged in as ${client.user.tag}`);
    });

    const PING_INTERVAL = 14 * 60 * 1000; // Every 14 minutes

    setInterval(async () => {
        try {
            const response = await fetch(`${process.env.RENDER_URL}/api/health`);
            console.log(`Health check successful: ${response.status}`);
        } catch (error) {
            console.error('Health check failed:', error.message);
        }
    }, PING_INTERVAL);

    client.login(process.env.DISCORD_BOT_TOKEN);
}

startBot();