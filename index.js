import {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
    StringSelectMenuBuilder
} from "discord.js";

import dotenv from "dotenv";
dotenv.config();

import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import moment from "moment-timezone";

import GoogleAppScriptManager from "./google_app_script.js";
import NotionManager from "./notion_script.js";
import Utils from "./utils.js";
import { setupCronJobs, createWeeklyReminders, createMonthlyReminders } from "./discord_reminders.js";

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
const userDocNames = new Map();

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
            .addSubcommand(subcommand =>
                subcommand
                    .setName('approve')
                    .setDescription('Approve a pending event request'))
        // new SlashCommandBuilder()
        //     .setName('preview')
        //     .setDescription('Preview commands')
        //     .addSubcommand(subcommand =>
        //         subcommand
        //             .setName("reminders")
        //             .setDescription("Preview reminder commands")
        //             .addStringOption(option =>
        //                 option.setName("type")
        //                     .setDescription("Type of reminder")
        //                     .setRequired(true)
        //             )
        //     )

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

        // const notionManager = new NotionManager();
        // await notionManager.syncCalendarEvent(formattedEvent, resp);

        // console.log("CREATE_CALENDAR_EVENT: Event synced to Notion!")

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


async function createDocDropdown(docNames) {
    const limitedDocs = docNames.slice(0, 25);

    const options = limitedDocs.map((docName, index) => ({
        label: docName.length > 100 ? docName.substring(0, 97) + '...' : docName,
        description: `Select ${docName}`,
        value: `doc_${index}`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('doc_select')
        .setPlaceholder('Choose an event...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(selectMenu);
}


async function handleDocSelection(interaction) {
    const userId = interaction.user.id;

    try {
        const docNames = userDocNames.get(userId);

        if (!docNames) {
            return await interaction.reply({
                content: 'Session expired. Please run the command again.',
                ephemeral: true
            });
        }

        const selectedIndex = parseInt(interaction.values[0].replace('doc_', ''));
        const selectedDocName = docNames[selectedIndex];

        // Update the message to show loading
        await interaction.update({
            content: `Processing document: **${selectedDocName}**... ⏳`,
            components: [] // Remove dropdown
        });

        const googleAppScriptManager = new GoogleAppScriptManager();
        const result = await googleAppScriptManager.approveEventRequest(selectedDocName);

        if (result.error) {
            console.log("HANDLE_EVENT_APPROVAL: Error approving event -", result.error);
            return await interaction.editReply({
                content: `❌ Failed to approve event request`
            });
        }

        // Update with success message
        await interaction.editReply({
            content: `✅ Event request approved. Posting event to announcements ...`
        });

        const utils = new Utils();
        const approvedEvent = await utils.parseEventFormText(result.eventDetails);

        const eventLink = await googleAppScriptManager.createEvent(approvedEvent);

        await sendApprovedEventMessage(result.eventDetails, eventLink);

        await interaction.deleteReply();
    } catch (error) {
        console.error('HANDLE_EVENT_APPROVAL: Error occurred -', error);

        // Update with error message
        await interaction.editReply({
            content: `❌ Failed to process event approval`
        });
    } finally {
        // Clean up stored data
        userDocNames.delete(userId);
    }
}

async function executeSelectDoc(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const googleAppScriptManager = new GoogleAppScriptManager();
        const response = await googleAppScriptManager.getPendingRequestDocNames();

        if (response.error) {
            console.log("HANDLE_EVENT_APPROVAL: Error fetching documents -", response.error);
            return await interaction.editReply(`❌ Error fetching document names`);
        }

        const { docNames } = response;

        if (docNames.length === 0) {
            return await interaction.editReply('❌ No documents found in the folder.');
        }

        // Store doc names for this user
        userDocNames.set(interaction.user.id, docNames);

        const dropdown = await createDocDropdown(docNames);

        await interaction.editReply({
            content: 'Select an event to approve:',
            components: [dropdown],
            ephemeral: true
        });

    } catch (error) {
        console.error('HANDLE_EVENT_APPROVAL: Error fetching documents -', error);
        await interaction.editReply('❌ Error fetching event requests from Google Drive.');
    }
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
            } else if (subcommand === "approve") {
                await executeSelectDoc(interaction);
            }
        } else if (commandName === "hello") {
            await handleHelloCommand(interaction);
        }
        // else if (commandName === "preview") {
        //     const subcommand = interaction.options.getSubcommand();
        //     if (subcommand === "reminders") {
        //         if (interaction.options.getString("type") === "monthly") {
        //             await createMonthlyReminders(interaction.channel);
        //             await interaction.editReply({ content: "Monthly reminders previewed!" });
        //         } else if (interaction.options.getString("type") === "weekly") {
        //             await createWeeklyReminders(interaction.channel);
        //             await interaction.editReply({ content: "Weekly reminders previewed!" });
        //         }
        //     }
        // } 
        else {
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
        } else if (interaction.isStringSelectMenu() && interaction.customId === 'doc_select') {
            await handleDocSelection(interaction);
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

async function sendApprovedEventMessage(eventDetails, link) {
    const channel = await client.channels.fetch(process.env.DISCORD_EVENT_REQUEST_CHANNEL_ID);
    if (!channel) throw new Error('Channel not found');

    const embed = new EmbedBuilder()
        .setTitle(`Upcoming Event`)
        .setColor(0x4285F4)
        .addFields(
            {
                name: '🕒 Date & Time',
                value: eventDetails.date,
                inline: true
            },
            {
                name: '📍 Location',
                value: eventDetails.location || 'No location specified',
                inline: true
            },
            {
                name: '📅 Event Type',
                value: eventDetails.event_type,
                inline: true
            },
            // {
            //     name: '🎤 Number of Singers',
            //     value: eventDetails.number_of_singers,
            //     inline: true
            // },
            // {
            //     name: '💵 Pay Rate',
            //     value: eventDetails.pay_rate,
            //     inline: true
            // },
            {
                name: '🔗 Event Link',
                value: `[View in Google Calendar](${link})`,
                inline: true
            },
        );

    const message = await channel.send({ message: "Please react if you are available and want to sing",embeds: [embed] });
    message.react("✅");
}

export async function sendEventRequestMessage(link) {
    const channel = await client.channels.fetch(process.env.DISCORD_EVENT_REQUEST_CHANNEL_ID);
    if (!channel) throw new Error('Channel not found');

    const embed = new EmbedBuilder()
        .setTitle(`New Event Request Pending Review`)
        .setColor(0x4285F4)
        .addFields(
            {
                name: '🔗 Details',
                value: `[View in Google Docs](${link})`,
                inline: true
            }
        );

    await channel.send({ embeds: [embed] });
}

startBot();