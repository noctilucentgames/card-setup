const { timeoutWriteJson, readJson, deepEqual, colors } = require('./utils.js');
const { CLR } = require('./enums.js');
const FILE_NAME = 'cardPresets.json'

class CardPresets {
    __mod;
    __cardPresets;
    __lastData = {};
    
    constructor(mod) {
        this.__mod = mod;
        this.__mod.game.initialize("me");

        this.__cardPresets = readJson(FILE_NAME) || {};

        this.show = this.show.bind(this);

        this.__trackCardPresets();
    }

    __trackCardPresets = () => {
        this.__mod.hook('S_CARD_DATA', 2, event => {
            if (!this.__mod.game.me.is(event.gameId)) return;
            const { playerId, serverId } = this.__mod.game.me;
            this.__lastData = event;
            if (this.__cardPresets[serverId] == null) this.__cardPresets[serverId] = {};
            if (!deepEqual(this.__cardPresets[serverId][playerId], event.presets)) {
                this.__cardPresets[serverId][playerId] = event.presets;
                timeoutWriteJson(FILE_NAME, this.__cardPresets);
            }
        })

        this.__mod.hook('S_ADD_CARD_TO_PRESET', 1, event => {
            const { playerId, serverId } = this.__mod.game.me;
            this.__cardPresets[serverId][playerId][event.preset].presetCards.push({ cardId: event.cardId });
            timeoutWriteJson(FILE_NAME, this.__cardPresets);
        })

        this.__mod.hook('S_REMOVE_CARD_FROM_PRESET', 1, event => {
            const { playerId, serverId } = this.__mod.game.me;
            let cards = this.__cardPresets[serverId][playerId][event.preset].presetCards;
            for (let i = 0; i < cards.length; ++i) {
                if (cards[i].cardId === event.cardId) {
                    cards.splice(i, 1);
                    timeoutWriteJson(FILE_NAME, this.__cardPresets);
                    return;
                }
            }
            this.__mod.error("something went wrong... S_REMOVE_CARD_FROM_PRESET");
        })
    }

    show = (serverId, playerId, name, index) => {
        let { cards, collectionLevel } = this.__lastData;

        if (this.__cardPresets[serverId][playerId] == null)
            return this.__mod.command.message(colors(['No data found for character', name], [CLR.RED, CLR.TEAL]));
        if (index - 1 >= this.__cardPresets[serverId][playerId].length || index - 1 < 0)
            return this.__mod.command.message(colors(['Invalid parameter: preset number', index], [CLR.RED, CLR.PURPLE]));

        this.__mod.command.message(colors(['Showing card preset', index, 'of', name], [CLR.BLUE, CLR.PURPLE, CLR.BLUE, CLR.TEAL]));
        
        this.__mod.send('S_CARD_DATA', 2, {
            currentPreset: 0,
            unk: 38,
            cards,
            presets: [{ index: 0, presetCards: this.__cardPresets[serverId][playerId][index - 1].presetCards }],
            name,
            collectionLevel,
        });
    }
}

module.exports = CardPresets