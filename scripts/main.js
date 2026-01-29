import { RerollManager } from "./reroll.js";
import { BonusManager } from "./bonus.js";

const MODULE_ID = "ready-set-roll-5e-addon";

Hooks.once("init", () => {
    console.log(`${MODULE_ID} | Initializing`);
    
    // Register Settings
    registerSettings();

    RerollManager.registerGlobalListener();
});

function registerSettings() {
    game.settings.register(MODULE_ID, "rerollEveryone", {
        name: "Enable Rerolling (Global)",
        hint: "Master switch. If disabled, no one can reroll dice using this module.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "rerollPlayers", {
        name: "Enable Rerolling for Players",
        hint: "If enabled, players can reroll their own dice (Left-Click).",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });

    game.settings.register(MODULE_ID, "fudgeGM", {
        name: "Enable Fudging for GM",
        hint: "If enabled, the GM can Right-Click a die to manually set its result.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });

    game.settings.register(MODULE_ID, "fudgePlayers", {
        name: "Enable Fudging for Players",
        hint: "If enabled, players can Right-Click a die to manually set its result.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
}

Hooks.on("renderChatMessage", (message, html) => {
    const $html = html instanceof HTMLElement ? $(html) : html;

    // 1. Immediate Attempt 
    BonusManager.init(message, $html);

    // 2. Observer Strategy
    if (html instanceof HTMLElement || html[0] instanceof HTMLElement) {
        const element = html instanceof HTMLElement ? html : html[0];
        
        const observer = new MutationObserver((mutations, obs) => {
            const $updatedHtml = $(element);
            
            // If we see RSR sections, try to inject buttons.
            if ($updatedHtml.find('.rsr-section-attack, .rsr-section-damage').length > 0) {
                BonusManager.init(message, $updatedHtml);
            }
        });

        observer.observe(element, {
            childList: true,
            subtree: true
        });
        
        // Safety timeout
        setTimeout(() => observer.disconnect(), 3000);
    }

    if ($html.find('.dice-tooltip .dice-rolls .roll.die').length > 0) {
        $html.find('.dice-tooltip .dice-rolls .roll.die').addClass('rsr-ready');
    }
});