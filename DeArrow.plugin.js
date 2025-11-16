/**
 * @name DeArrow
 * @author rc_05
 * @description Integrates DeArrow into Discord for less clickbait headlines.
 * @version 20251116
 * @url https://github.com/rc-05/DeArrow-BetterDiscord
 */

/*
 * Copyright © 2025 rc_05 <contact@rc-05.com>
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See the COPYING file for more details.
 */

const fs = require("fs");
const PLUGIN_NAME = "DeArrow";

let configPanel = {
    settings: [
        {
            type: "text",
            id: "api-url",
            name: "API Endpoint",
            note: "URL of the instance where the endpoint for the DeArrow API resides. If you are unsure what to enter, you can leave this setting unchanged.",
            value: "https://sponsor.ajay.app/api/branding",
        },
    ]
}

module.exports = class DeArrow {
    /**
     * Called when the plugin is started.
     */
    start() {
        this.loadSettingsFile();
        this.patchEmbed();
    }

    /**
     * Called when the plugin is stopped.
     */
    stop() {
        BdApi.Patcher.unpatchAll(PLUGIN_NAME);
        BdApi.Data.save(PLUGIN_NAME, "settings", configPanel.settings);
    }

    /**
     * Called when the settings panel gets created.
     */
    getSettingsPanel() {
        return BdApi.UI.buildSettingsPanel({
            settings: configPanel.settings,
            onChange: (category, id, value) => {
                configPanel.settings.forEach((element, index) => {
                    if (element.id == id) {
                        element.value = value;
                    }
                });
            }
        });
    }

    getSetting(id) {
        let result = null;

        configPanel.settings.forEach((element) => {
            if (element.id == id) {
                result = element.value;
            }
        });

        return result;
    }

    loadSettingsFile() {
        let pluginSettingsFilePath = `${BdApi.Plugins.folder}/DeArrow.config.json`;
        if (fs.existsSync(pluginSettingsFilePath)) {
            configPanel.settings = BdApi.Data.load(PLUGIN_NAME, "settings");
            console.log("Loaded settings from JSON file");
        } else {
            console.log("JSON file does not exist");
        }
    }

    patchEmbed() {
        let erComponent = BdApi.Webpack.getAllByStrings("renderTitle")
            .find(module => module.name === "er");

        BdApi.Patcher.after(PLUGIN_NAME, erComponent.prototype, "render", (thisObject, args, returnValue) => {
            let embed = thisObject.props.embed;

            if ("provider" in embed) {
                let provider = embed.provider;
                if (provider.name === "YouTube") {
                    let videoId = URL.parse(embed.url).searchParams.get("v");
                    let dearrowApiUrl = this.getSetting("api-url") + `?videoID=${videoId}`;

                    BdApi.Net.fetch(dearrowApiUrl)
                        .then((response) => response.json())
                        .then((json) => {
                            // Usually the very first title is the best voted one, however make sure
                            // that either the title is locked or that it has enough votes
                            let bestTitle;
                            json.titles.forEach((title) => {
                                if (title.locked === true || title.votes >= 0) {
                                    bestTitle = title;
                                }
                            });

                            if (bestTitle !== null) {
                                embed.rawTitle = bestTitle.title;
                                console.log(`Used better title \"${bestTitle.title}\" for video with id ${videoId}`);
                            } else {
                                console.log(`Kept original title for video with id ${videoId}`);
                            }
                        })
                        .catch((error) => console.log(error));
                }
            }
        });
    }
}
