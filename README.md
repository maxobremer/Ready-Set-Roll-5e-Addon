# Ready Set Roll 5e Addon

**Ready Set Roll 5e Addon** is an extension for the wonderfull [Ready Set Roll 5e](https://github.com/MangoFVTT/fvtt-ready-set-roll-5e) module. It adds interactive dice manipulation, allowing you to reroll dice by clicking them, manually "fudge" results, and apply retroactive bonuses (like *Sneak Attack* or *Bardic Inspiration*) directly from the chat card.

![Foundry v13](https://img.shields.io/badge/Foundry-v13-orange)

##  Features

### 1. Click-to-Reroll
Accidentally rolled with the wrong modifier? Need to use a Hero Point?
* **Left-Click** any die in a chat card to reroll it immediately.
* Preserves the die type (d20, d6, etc.).
* Automatically updates the total and any derived values (like Initiative or damage).

### 2. Manual "Fudge" (Set Die Value)
Perfect for GMs who need to adjust a roll behind the scenes, or for handling mechanics like *Portent*.
* **Right-Click** any die to open a dialog and manually set the face value (e.g., force a d20 to be a "20").
* This feature handles Advantage/Disadvantage correctly (re-calculating the drop/keep logic).

### 3. Retroactive Bonuses
Forget to add *Bless*? Did the Bard use *Cutting Words* late?
* Adds a **(+)** button to Attack, Damage, Save, and Ability Check headers in chat.
* Opens a menu to select available bonuses from the actor (e.g., active effects) or enter a **Custom Bonus** (e.g., `+1d4` or `+5`).
* Automatically calculates the new total and updates the card.

---

## Configuration

You can customize who is allowed to manipulate dice in the **Module Settings**:

* **Enable Rerolling (Global):** Master switch for the reroll feature.
* **Enable Rerolling for Players:** Allow players to left-click reroll their own dice (Default: `false`).
* **Enable Fudging for GM:** Allow GM to right-click set values (Default: `true`).
* **Enable Fudging for Players:** Allow players to right-click set values (Default: `false`).

---

## Advanced: Creating Bonus Effects

You can set up abilities that are meant to be decided **after the roll** (like *Sneak Attack* or *Divine Strike*) so they appear in the Bonus Menu when needed.

To do this, create an **Active Effect** on an Actor or Item with the following Change:

* **Attribute Key:** `flags.rsr5e-addon.bonus`
* **Change Mode:** `Add` (or `Custom`)
* **Effect Value:** `Formula; type:Type; once`

### Format Breakdown:
1.  **Formula:** The dice formula (e.g., `1d6`, `@scale.rogue.sneak-attack`).
2.  **Type (Optional):** Restricts the bonus to specific rolls.
    * `type:attack` (Attack Rolls)
    * `type:damage` (Damage Rolls)
    * `type:save` (Saving Throws, Concentration, Death Saves)
    * `type:check` (Ability Checks, Skills, Tools, Initiative)
3.  **Once (Optional):** If you include `once`, the Effect deletes itself after use (great for consumable resources).

### Examples (Retroactive Abilities):

| Ability | Value String | Description |
| :--- | :--- | :--- |
| **Sneak Attack** | `@scale.rogue.sneak-attack; type:damage` | Adds Sneak Attack damage to a damage roll. |
| **Bardic Inspiration** | `1d6; type:attack,check,save; once` | Adds a die to a d20 roll, then removes the inspiration. |
| **Divine Strike** | `1d8[radiant]; type:damage` | Adds radiant damage to a weapon attack. |
| **Precision Attack** | `1d8; type:attack` | (Battle Master) Add a superiority die to a missed attack. |

---

## 📦 Installation

1.  Open Foundry VTT.
2.  Go to **Add-on Modules** -> **Install Module**.
3.  Paste the following Manifest URL:
    ```
    [https://github.com/maxobremer/-fvtt-ready-set-roll-5e-addon/releases/latest/download/module.json](https://github.com/maxobremer/-fvtt-ready-set-roll-5e-addon/releases/latest/download/module.json)
    ```
4.  Click **Install**.

## Dependencies
* **[Ready Set Roll 5e](https://github.com/MangoFVTT/fvtt-ready-set-roll-5e)** (Required)
* **dnd5e System** (v4.0+)

---

**License:** MIT
