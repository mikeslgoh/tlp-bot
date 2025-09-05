import { sendEventRequestMessage } from "../..";

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