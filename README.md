# TLP Bot

This is a README for a discord bot created for [The Lyre Project](https://thelyreproject.ca/) to automate and simplify workflows such as event request approvals, event reminders, etc.

The bot uses [Google App Script](https://developers.google.com/apps-script) as its backend to retrieve data such as Calendar events, filled in Google Forms, etc.

## Features
* Weekly and monthly reminders from Google Calendar
* Get details about a specific calendar event sent to Discord
* Send notifications when a new Google request form has been submitted
* Approve a pending event which will:
  * Move the pending event doc into the approved folder
  * Create a calendar event for the respective event
  * Notify on Discord about the approved event

##  Prerequisites

- **Node.js** v18 or higher (Discord.js v14+ requires this)
- **npm** (comes bundled with Node.js)

---

##  Clone & Install

```bash
git clone https://github.com/mikeslgoh/tlp-bot.git
cd tlp-bot
npm install
```
## .env file
There are a number of variables that need to be set in .env file in order for the bot to run. These include the following:
```
DISCORD_BOT_TOKEN="<INSERT HERE>"
DISCORD_BOT_CLIENT_ID="<INSERT HERE>"
GOOGLE_APP_SCRIPT_URL="<INSERT HERE>"
NOTION_INTEGRATION_TOKEN="<INSERT HERE>"
NOTION_EVENT_PROJECT_ID="<INSERT HERE>"
NOTION_DATABASE_ID="<INSERT HERE>"
DISCORD_ANNOUNCEMENTS_CHANNEL_ID="<INSERT HERE>"
DISCORD_EVENT_REQUEST_CHANNEL_ID="<INSERT HERE>"
```

##  Dicord Bot Token
- Visit the Discord Developer Portal.
- Create a new application if you haven’t already.
- Navigate to the Bot tab.
- Click "Add Bot" (if needed), then "Click to Reveal Token" or Reset Token.
- Copy the token and store it in the .env file

## Run locally
```bash
node index.js
```

## Deploy to server
- For the bot to work, you will need to deploy it to a server so that it stays online 24/7
- Currently this is living on [render.com](https://render.com)
