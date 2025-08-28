const { Client, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const moment = require('moment');

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
const axios = require("axios");

const GoogleAppScriptManager = require("./google_app_script");

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
    try{
        await interaction.deferReply({ ephemeral: true });

        const details = interaction.options.getString("details");

        const googleAppScriptManager = new GoogleAppScriptManager();
        const resp = await googleAppScriptManager.createEvent(details);

         // Check for error in response
        if (resp.toLowerCase().includes("error")) {
            await interaction.editReply({ 
                content: `❌ Event creation failed: ${resp}` 
            });
            return;
        }

        await interaction.editReply({ content: `✅ Event created successfully: ${resp}`, ephemeral: true });
    }catch(error){
        console.error("Error creating event:", error);
        await interaction.editReply({ content: "❌ Failed to create event", ephemeral: true });
    }
}

async function handleGetEventDetailsCommand(interaction) {
try{
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

        await interaction.editReply({ content: formatEventDetails(resp), ephemeral: true });
    }catch(error){
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

// Handle interaction events
function setupInteractionHandler() {
    client.on("interactionCreate", async (interaction) => {
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