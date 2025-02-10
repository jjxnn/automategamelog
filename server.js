require("dotenv").config();
const { Client } = require("@notionhq/client");
const express = require("express");
const axios = require('axios');


const app = express();
const notion = new Client({ auth: process.env.NOTION_KEY });

const db_id = process.env.NOTION_DB_ID;
let lastChecked = new Date().toISOString();

async function checkNewEntries() {
    try {
        const response = await notion.databases.query({
            database_id: db_id,
            filter: {property: "Added", date: {after: lastChecked}}
        })

        const newEntry = response.results

        newEntry.forEach((entry) => {
            //console.log(`New Entry ID: ${entry.id}`);
            //console.log(entry.properties.Name.title)
            triggerIntegration(entry);
        });

        lastChecked = new Date().toISOString()
    } catch (error) {
        console.log("Error message:", error)
    }
}

// Function to trigger integration (Modify this for your needs)
async function triggerIntegration(entry) {
    console.log(`🚀 Triggering integration for: ${entry.id}`);
    getSteamGame(entry.propperties.Name.title)
    try {
        const response = await notion.pages.update({
            page_id: entry.id,
            properties: {
                "Link": {"url": "https://store.steampowered.com/app/3042190/Nomad_Idle/"},
                "Release Date ": {
                    "type": "date",
                    "date": {"start": "2025-02-28","end": null,"time_zone": null}
                },
                "Co-op": {"checkbox": false},
                "Name": {
                    "type": "title",
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": "Nomad Idle"
                            }
                        }
                    ]
                }
            }
        })
    } catch (error) {
        console.log("Error message:", error)
    }
}

async function getSteamGame(appID) {

    const parseInt = appID.parseInt()
    try {
        const response = await axios.get('http://store.steampowered.com/api/appdetails/', {
            params: {
                appids: parseInt
            }
        });

        // Check if the API response contains the expected data
        if (response.data[0].success) {
            console.log(response.data[0].data); // Game details
        } else {
            console.log("Failed to fetch app details.");
        }
    } catch (error) {
        console.error("Error fetching Steam app details:", error);
    }
}
// Express Route to Manually Trigger Check
app.get("/check-notion", async (req, res) => {
    await checkNewEntries();
    res.send("Checked for new Notion entries!");
});

// Start polling every 30 seconds
setInterval(checkNewEntries, 10 * 1000);

// Start Express server
app.listen(3000, () => {
    console.log(`✅ Server running on http://localhost:3000`);
    console.log("📡 Watching for new Notion database entries...");
});