const { Client, GatewayIntentBits, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
const axios = require("axios");

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
      .setDescription('Create a new event')
      .addStringOption(option =>
        option.setName('details')
          .setDescription('Event details')
          .setRequired(true))
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
   const webhookUrl = process.env.WEBHOOK_URL;

   const payload = {
        details: interaction.options.getString("details"), 
   }

   try {
    const response = await axios.post(webhookUrl, payload);
    console.log('Webhook response:', response);
    await interaction.reply({ content: `✅ Event created successfully`, ephemeral: true });
  } catch (err) {
    console.error('Error sending to webhook:', err);
  }
}

// Handle interaction events
function setupInteractionHandler() {
    client.on("interactionCreate", async (interaction) => {
            const { commandName, options } = interaction;
            if (commandName === "event") {
                handleNewEventCommand(interaction);
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

    // setInterval(async () => {
    //     try {
    //         const response = await fetch(`${process.env.RENDER_URL}/api/health`);
    //         console.log(`Health check successful: ${response.status}`);
    //     } catch (error) {
    //         console.error('Health check failed:', error.message);
    //     }
    // }, PING_INTERVAL);

    client.login(process.env.DISCORD_BOT_TOKEN);
}

startBot();