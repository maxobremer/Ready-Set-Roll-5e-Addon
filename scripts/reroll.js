const MODULE_ID = "ready-set-roll-5e-addon";
const { ApplicationV2 } = foundry.applications.api;

export class RerollManager {
    static registerGlobalListener() {
        // 1. LEFT CLICK (REROLL)
        document.addEventListener('click', async (ev) => {
            const target = ev.target;
            
            // Check Global Reroll Setting first
            if (!game.settings.get(MODULE_ID, "rerollEveryone")) return;

            const rollDie = target.closest('.dice-rolls .roll.die');
            if (rollDie) {
                const messageElement = rollDie.closest('[data-message-id]');
                if (!messageElement) return;

                const messageId = messageElement.dataset.messageId;
                const message = game.messages.get(messageId);
                
                if (!message) return;

                // --- PERMISSION CHECKS ---
                // 1. Must be Author or GM
                if (!message.isAuthor && !game.user.isGM) return;

                // 2. If Player, check Player Reroll Setting
                if (!game.user.isGM && !game.settings.get(MODULE_ID, "rerollPlayers")) return;

                // 3. Flags Check
                const isRSR = !!message.flags["rsr5e"];
                const isDnd5e = !!message.flags.dnd5e;
                const isInitiative = !!message.flags.core?.initiativeRoll;

                if (!isRSR && !isDnd5e && !isInitiative) return;

                // Stop propagation
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();

                const rollContainer = rollDie.closest('.dice-roll');
                const $messageElement = $(messageElement);
                const $rollContainer = $(rollContainer);
                const $rollDie = $(rollDie);

                const visualRollIndex = $messageElement.find('.dice-roll').index($rollContainer);
                const displayableRolls = message.rolls.filter(r => r.dice.length > 0);
                const targetRoll = displayableRolls[visualRollIndex];
                
                if (!targetRoll) return;

                const messageRollIndex = message.rolls.findIndex(r => r === targetRoll);
                const flatDieIndex = $rollContainer.find('.dice-rolls .roll.die').index($rollDie);

                if (messageRollIndex > -1 && flatDieIndex > -1) {
                    ui.notifications.info("Rerolling die...");
                    await this.rerollDie(message, messageRollIndex, visualRollIndex, flatDieIndex);
                }
                return;
            }
            
        }, true);

        // 2. RIGHT CLICK (FUDGE / SET VALUE)
        document.addEventListener('contextmenu', async (ev) => {
            const target = ev.target;
            const rollDie = target.closest('.dice-rolls .roll.die');
            
            if (rollDie && target.closest('[data-message-id]')) {
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();

                // Check Settings for Fudging
                const isGM = game.user.isGM;
                const allowGM = game.settings.get(MODULE_ID, "fudgeGM");
                const allowPlayer = game.settings.get(MODULE_ID, "fudgePlayers");

                if (isGM && !allowGM) return;
                if (!isGM && !allowPlayer) return;

                // Get Message Data
                const messageElement = rollDie.closest('[data-message-id]');
                const message = game.messages.get(messageElement.dataset.messageId);
                if (!message) return;
                
                if (!message.isAuthor && !isGM) return;

                // Identify the specific die
                const rollContainer = rollDie.closest('.dice-roll');
                const $messageElement = $(messageElement);
                const $rollContainer = $(rollContainer);
                const $rollDie = $(rollDie);

                const visualRollIndex = $messageElement.find('.dice-roll').index($rollContainer);
                const displayableRolls = message.rolls.filter(r => r.dice.length > 0);
                const targetRoll = displayableRolls[visualRollIndex];
                if (!targetRoll) return;

                const messageRollIndex = message.rolls.findIndex(r => r === targetRoll);
                const flatDieIndex = $rollContainer.find('.dice-rolls .roll.die').index($rollDie);

                if (messageRollIndex > -1 && flatDieIndex > -1) {
                    // Determine Max Faces
                    const roll = message.rolls[messageRollIndex];
                    let currentFlatIndex = 0;
                    let faces = 20; 

                    for (let term of roll.terms) {
                        if (!term.results || term.results.length === 0) continue;
                        if (flatDieIndex >= currentFlatIndex && flatDieIndex < currentFlatIndex + term.results.length) {
                            faces = term.faces;
                            break;
                        }
                        currentFlatIndex += term.results.length;
                    }

                    // Open ApplicationV2 Window
                    new FudgeSelector({
                        faces: faces,
                        onSubmit: async (val) => {
                            await this.fudgeDie(message, messageRollIndex, flatDieIndex, val);
                        }
                    }).render(true);
                }
            }
        }, true);
    }

    static async rerollDie(message, messageRollIndex, visualRollIndex, flatDieIndex) {
        const roll = message.rolls[messageRollIndex];
        if (!roll) return;

        const newTerms = roll.terms.map(t => foundry.utils.deepClone(t));
        
        let currentFlatIndex = 0;
        let found = false;

        for (let term of newTerms) {
            if (!term.results || term.results.length === 0) continue;
            
            if (flatDieIndex >= currentFlatIndex && flatDieIndex < currentFlatIndex + term.results.length) {
                const resultIndex = flatDieIndex - currentFlatIndex;
                
                const newResultRoll = await new Roll(`1d${term.faces}`).evaluate();
                const newValue = newResultRoll.total;
                
                term.results[resultIndex].result = newValue;
                found = true;
                break;
            }
            currentFlatIndex += term.results.length;
        }

        if (found) await this._updateMessageRolls(message, messageRollIndex, newTerms, roll);
    }

    static async fudgeDie(message, messageRollIndex, flatDieIndex, forcedValue) {
        const roll = message.rolls[messageRollIndex];
        if (!roll) return;

        const newTerms = roll.terms.map(t => foundry.utils.deepClone(t));
        
        let currentFlatIndex = 0;
        let found = false;

        for (let term of newTerms) {
            if (!term.results || term.results.length === 0) continue;
            
            if (flatDieIndex >= currentFlatIndex && flatDieIndex < currentFlatIndex + term.results.length) {
                const resultIndex = flatDieIndex - currentFlatIndex;
                
                term.results[resultIndex].result = forcedValue;
                found = true;
                break;
            }
            currentFlatIndex += term.results.length;
        }

        if (found) await this._updateMessageRolls(message, messageRollIndex, newTerms, roll);
    }

    static async _updateMessageRolls(message, messageRollIndex, newTerms, originalRoll) {
        const RollClass = CONFIG.Dice.rolls.find(cls => cls.name === originalRoll.constructor.name) || Roll;
        const newRoll = RollClass.fromTerms(newTerms);
        newRoll.options = foundry.utils.deepClone(originalRoll.options);
        
        // --- FIX: Re-evaluate Advantage/Disadvantage/Keep Modifiers ---
        // Iterate over the dice terms. If they have modifiers (like "kh1"),
        // we must reset their active state and re-run the logic.
        for (const term of newRoll.terms) {
            if (term instanceof foundry.dice.terms.DiceTerm && term.modifiers && term.modifiers.length > 0) {
                // 1. Reset all results in this term to be active
                term.results.forEach(r => {
                    r.active = true;
                    if (r.discarded !== undefined) delete r.discarded; // Safety cleanup
                });
                
                // 2. Re-run the modifier evaluation (e.g., re-calculate which one is dropped)
                if (typeof term._evaluateModifiers === 'function') {
                    await term._evaluateModifiers();
                }
            }
        }
        // -------------------------------------------------------------

        newRoll._total = newRoll._evaluateTotal();
        
        const rolls = [...message.rolls];
        rolls[messageRollIndex] = newRoll;

        const isRSR = !!message.flags["rsr5e"];

        if (isRSR) {
            await message.update({ rolls: rolls });
        } else {
            const newContent = await newRoll.render();
            await message.update({ 
                rolls: rolls,
                content: newContent
            });
        }
        
        if (message.flags.core?.initiativeRoll && game.combat) {
            const combatant = game.combat.combatants.find(c => 
                (c.tokenId && c.tokenId === message.speaker.token) || 
                (c.actorId && c.actorId === message.speaker.actor)
            );
            if (combatant) {
                await game.combat.setInitiative(combatant.id, newRoll.total);
            }
        }
    }
}

// ==========================================================
//  APPLICATION V2 CLASS: FUDGE SELECTOR
// ==========================================================
class FudgeSelector extends ApplicationV2 {
    constructor(options) {
        super(options);
        this.faces = options.faces;
        this.onSubmitCallback = options.onSubmit;
    }

    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "rsr-fudge-selector",
        classes: ["rsr-bonus-window"], 
        window: {
            title: "Set Die Result",
            icon: "fas fa-dice",
            resizable: false,
            width: 300
        },
        position: {
            width: 300,
            height: "auto"
        },
        form: {
            handler: FudgeSelector.prototype._handleSubmit,
            closeOnSubmit: true
        }
    };

    async _renderHTML(context, options) {
        const html = `
        <div class="rsr-bonus-content" style="padding: 10px; display: flex; flex-direction: column; gap: 10px;">
            <div class="form-group" style="display:flex; flex-direction: column;">
                <label style="font-weight:bold; color: var(--color-text-primary); margin-bottom: 5px;">
                    New Value (1-${this.faces}):
                </label>
                <input type="number" name="fudgeValue" value="${this.faces}" min="1" max="${this.faces}" autofocus 
                       style="width: 100%; box-sizing: border-box; background: var(--color-bg-light); color: var(--color-text-primary); border: 1px solid var(--color-border-dark);">
            </div>
            
            <div class="form-footer" style="margin-top: 10px; display: flex; justify-content: flex-end;">
                <button type="submit" class="save" style="width: auto;">
                    <i class="fas fa-check"></i> Set Value
                </button>
            </div>
        </div>
        `;
        const div = document.createElement("div");
        div.innerHTML = html;
        return div;
    }

    _replaceHTML(result, content, options) {
        content.replaceChildren(result);
    }

    async _handleSubmit(event, form, formData) {
        const val = parseInt(formData.object.fudgeValue);
        
        if (isNaN(val) || val < 1 || val > this.faces) {
            ui.notifications.warn(`Invalid value. Must be between 1 and ${this.faces}.`);
            return;
        }

        if (this.onSubmitCallback) {
            await this.onSubmitCallback(val);
        }
    }
}