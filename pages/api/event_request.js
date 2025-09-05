export default function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { link } = req.body;

    if (!link) {
      return res.status(400).json({ error: 'Missing link in payload' });
    }

    // You can process the link here
    console.log('SEND_REQUEST_MESSAGE: Received link');

    // Send a message to the Discord channel
    sendEventRequestMessage(link)
      .then(() => {
        // Return a success response
        res.status(200).json({ status: 'ok', message: 'Event request sent successfully to Discord' });
      })
      .catch((error) => {
        console.error('Error sending Discord message:', error);
        res.status(500).json({ error: 'Failed to send Discord message' });
      });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


async function sendEventRequestMessage(link) {
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

require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

// Make sure DISCORD_TOKEN is in your .env file
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);