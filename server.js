require("dotenv").config();
const { Client } = require("@notionhq/client");
const express = require("express");
const axios = require('axios');


const app = express();
const notion = new Client({ auth: process.env.NOTION_KEY });

const db_id = process.env.NOTION_DB_ID;
let lastChecked = new Date().toISOString();
async function checkNewEntries() {
        const response = await notion.databases.query({
            database_id: db_id,
            "filter": {property: "Added", date: {on_or_after: lastChecked }}
        })

        const newEntry = response.results

        if(newEntry.length > 0) {
           newEntry.forEach((entry) => {
            triggerIntegration(entry);
        }); 
        lastChecked = new Date().toISOString()
        console.log("Next update interval:" + lastChecked)
        } else {
            console.log('Nothing to update')
        }
}


async function triggerIntegration(entry) {
    console.log(`🚀 Triggering integration for: ${entry.id}`);

   
        const steamID = entry.properties.Name.title[0].plain_text  
        const stringSteamID = String(steamID)
        await axios.get(`http://store.steampowered.com/api/appdetails/?appids=${steamID}`, {
            params: {
                appids: steamID
            }
        }).then( async res => {
           const gameDetail = res.data[stringSteamID].data

           await notion.pages.update({
                page_id: entry.id,
                properties: {
                    "Link": {"url": `https://store.steampowered.com/app/${gameDetail.steam_appid}`},
                    "Release Date ": {
                    "type": "date",
                    "date": {"start": `${convertDate(gameDetail.release_date.date)}`,"end": null,"time_zone": null}
                    },
                    "Co-op": {"checkbox": false},
                    "Name": {
                    "type": "title",
                    "title": [
                    {
                        "type": "text",
                        "text": {
                            "content": `${gameDetail.name}`
                        }
                    }
                    ]
                    }
                }
            })

            // await notion.blocks.children.append({
            //     block_id: entry.id,

            // })
        })
        console.log('Entry updated successfully!')
    
        
    
    //console.log(entry.properties.Name.title[0].plain_text)
       
}


function convertDate(date) {
    let dateObject = new Date(date)

    return dateObject.toISOString().split("T")[0]
}

// Start polling every 30 seconds
setInterval(checkNewEntries, 15 * 1000);

// Start Express server
app.listen(3000, () => {
    console.log(`✅ Server running on http://localhost:3000`);
    console.log("📡 Watching for new Notion database entries...");
    console.log("Currently checking for entries after" + lastChecked)
});