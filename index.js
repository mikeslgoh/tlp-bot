const { Client, GatewayIntentBits, SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require("discord.js");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const moment = require('moment-timezone');

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

const GoogleAppScriptManager = require("./google_app_script");
const NotionManager = require("./notion_script")
const Utils = require("./utils");
const { setupCronJobs } = require("./discord_reminders");

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
            let errorMsg = `❌ Event creation failed: ${resp}`;

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, ephemeral: true });
            }
            return;
        }

        console.log("CREATE_CALENDAR_EVENT: Event created on Google Calendar!")

        const notionManager = new NotionManager();
        await notionManager.syncCalendarEvent(formattedEvent, resp);

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

        let errorMsg = `❌ Failed to create event`;
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMsg });
        } else {
            await interaction.reply({ content: errorMsg, ephemeral: true });
        }
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
            let errorMsg = `❌ Event retrieval failed: ${resp.error}`;
            await interaction.editReply({ content: errorMsg });
            return;
        } else if (resp.count === 0) {
            console.log("GET_EVENT_DETAILS: No events found!");
            await interaction.editReply({ content: "❌ No events found.", ephemeral: true });
            return;
        } else if (resp.count > 1) {
            console.log("GET_EVENT_DETAILS: More than 1 event found!");
            await interaction.editReply({ content: "❌ Multiple events found. Please be more specific.", ephemeral: true });
            return;
        }

        console.log("GET_EVENT_DETAILS: Event details retrieved from Google Calendar!")

        const eventEmbed = formatEventDetails(resp);

        const button = new ButtonBuilder()
            .setCustomId('send_to_channel')
            .setLabel('Send to channel')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📤');

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.editReply({
            embeds: [eventEmbed], // Use embeds instead of content
            components: [row]
        });
    } catch (error) {
        console.error("Error creating event:", error);

        let errorMsg = `❌ Failed to retrieve event`;

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMsg });
        } else {
            await interaction.reply({ content: errorMsg, ephemeral: true });
        }
    }
}

function formatEventDetails(resp) {
    let event = resp.events[0];

    const startTime = moment(event.start).tz("America/Vancouver");
    const endTime = moment(event.end).tz("America/Vancouver");

    const embed = new EmbedBuilder()
        .setTitle(`📅 ${event.title} 📅`)
        .setColor(0x4285F4)
        .addFields(
            {
                name: '🕒 Date & Time',
                value: `${startTime.format("MMMM D, YYYY")}\n${startTime.format("h:mm A")} - ${endTime.format("h:mm A")}`,
                inline: true
            },
            {
                name: '📍 Location',
                value: event.location || 'No location specified',
                inline: true
            },
            {
                name: '\u200B', // Invisible character
                value: '\u200B',
                inline: true
            }).addFields(
                {
                    name: '📝 Description',
                    value: event.description || 'No description provided',
                    inline: true
                },
                {
                    name: '🔗 Event Link',
                    value: `[View in Google Calendar](${event.htmlLink})`,
                    inline: true
                },

                {
                    name: '\u200B', // Invisible character
                    value: '\u200B',
                    inline: true
                }
            );

    return embed;
}

async function handleSlashCommand(interaction) {
    try {
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
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: "Unknown command" });
            } else {
                await interaction.reply({ content: "Unknown command", ephemeral: true });
            }
        }
    } catch (error) {
        console.error("Error handling slash command:", error);
    }
}

// --- handler for button interaction ---
async function handleButton(interaction) {
    if (interaction.customId === 'send_to_channel') {
        await interaction.channel.send({ embeds: interaction.message.embeds });

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

    setupCronJobs(client);

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