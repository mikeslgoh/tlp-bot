require("dotenv").config();
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let clientReady = false;
const loginPromise = client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log(`Logged in as ${client.user.tag}`);
    clientReady = true;
  })
  .catch(err => {
    console.error("Failed to login Discord client:", err);
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { link } = req.body;
    if (!link) {
      return res.status(400).json({ error: 'Missing link in payload' });
    }

    console.log('SEND_REQUEST_MESSAGE: Received link');

    await loginPromise; // ensure client is logged in

    await sendEventRequestMessage(link);

    return res.status(200).json({ status: 'ok', message: 'Event request sent successfully to Discord' });

  } catch (error) {
    console.error('Error sending Discord message:', error);
    return res.status(500).json({ error: 'Failed to send Discord message' });
  }
}

async function sendEventRequestMessage(link) {
  if (!clientReady) throw new Error("Discord client not ready");

  const channel = await client.channels.fetch(process.env.DISCORD_EVENT_REQUEST_CHANNEL_ID);
  if (!channel) throw new Error('Channel not found');

  const embed = new EmbedBuilder()
    .setTitle('New Event Request Pending Review')
    .setColor(0x4285F4)
    .addFields({
      name: '🔗 Details',
      value: `[View in Google Docs](${link})`,
      inline: true,
    });

  await channel.send({ embeds: [embed] });
}