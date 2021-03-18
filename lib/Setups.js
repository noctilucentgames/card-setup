const { timeoutWriteJson, readJson, deepEqual, deepClone, colors } = require('./utils.js');
const FILE_NAME = 'setups.json'

class Setups {
    current; setups; __config;

    constructor(mod, config) {
        mod.game.initialize("me");

        this.current = { collectionEffects: null, preset: -1 };
        this.setups = readJson(FILE_NAME) || {};
        this.__config = config;

        this.__trackCollectionEffects(mod);
        this.__trackPreset(mod);
    }

    __trackCollectionEffects = (mod) => {
        mod.hook('S_CARD_COLLECTION_EFFECTS', 1, event => {
            if (mod.game.me.is(event.gameId)) {
                this.current.collectionEffects = [];
                for (let i = 0; i < event.effects.length; ++i) {
                    this.current.collectionEffects.push(event.effects[i].id);
                }
            }
        });
        mod.hook('S_REMOVE_CARD_COLLECTION_EFFECT', 1, event => {
            if (this.__config.debug) mod.log(`S_REMOVE_CARD_COLLECTION_EFFECT ${event.id}`);
            let i = this.current.collectionEffects.indexOf(event.id);
            if (i > -1) this.current.collectionEffects.splice(i, 1);
            else mod.error("something went wrong... S_REMOVE_CARD_COLLECTION_EFFECT");
        });
        mod.hook('S_ADD_CARD_COLLECTION_EFFECT', 1, event => {
            if (this.__config.debug) mod.log(`S_ADD_CARD_COLLECTION_EFFECT ${event.id}`);
            if (this.current.collectionEffects.length > 1) mod.error("something went wrong... S_ADD_CARD_COLLECTION_EFFECT");
            this.current.collectionEffects.push(event.id);
        });
    }

    __trackPreset = (mod) => {
        mod.hook('S_CARD_PRESET', 1, event => { this.current.preset = event.preset; });
        mod.hook('S_RETURN_TO_LOBBY', 'event', () => { this.current.preset = -1; }); // invalidate preset, since it is not shared across chars
    }

    valid = () => {
        return this.current.collectionEffects !== null && this.current.preset >= 0;
    }

    
    set = (serverId, playerId, zone) => {
        if (!this.valid()) return console.log("something went wrong: current setup invalid when saving")
        if (!this.setups.hasOwnProperty(serverId)) this.setups[serverId] = {};
        if (!this.setups[serverId].hasOwnProperty(playerId)) this.setups[serverId][playerId] = {};
        
        if (!deepEqual(this.setups[serverId][playerId][zone], this.current)) {
            this.setups[serverId][playerId][zone] = deepClone(this.current);
            timeoutWriteJson(FILE_NAME, this.setups);
        }
    }
    
    get = (serverId, playerId, zone) => {
        if (!this.setups.hasOwnProperty(serverId) || 
        !this.setups[serverId].hasOwnProperty(playerId) || 
        !this.setups[serverId][playerId].hasOwnProperty(zone)) return null;
        return this.setups[serverId][playerId][zone];
    }
    
    del = (serverId, playerId, zone) => {
        if (!this.setups.hasOwnProperty(serverId) || 
        !this.setups[serverId].hasOwnProperty(playerId) || 
        !this.setups[serverId][playerId].hasOwnProperty(zone)) return false;

        delete this.setups[serverId][playerId][zone];
        timeoutWriteJson(FILE_NAME, this.setups);
        return true;
    }

    copy = (serverId, fromId, toId) => {
        if (!this.setups.hasOwnProperty(serverId) || 
            !this.setups[serverId].hasOwnProperty(fromId) ||
            Object.keys(this.setups[serverId][fromId]).length === 0) return false;

        if (!this.setups[serverId].hasOwnProperty(toId)) this.setups[serverId][toId] = {};
        let newSetup = deepClone(this.setups[serverId][toId]);
        for (const [k, v] of Object.entries(this.setups[serverId][fromId])) {
            newSetup[k] = v;
        }
        if (!deepEqual(this.setups[serverId][toId], newSetup)) {
            this.setups[serverId][toId] = newSetup;
            timeoutWriteJson(FILE_NAME, this.setups);
        }
        return true;
    }

    empty = (serverId, playerId) => {
        if (!this.setups.hasOwnProperty(serverId) || 
            !this.setups[serverId].hasOwnProperty(playerId) ||
            Object.keys(this.setups[serverId][playerId]).length === 0) return false;
        this.setups[serverId][playerId] = {}
        timeoutWriteJson(FILE_NAME, this.setups);
        return true;
    }

    list = (serverId, playerId) => {
        if (!this.setups.hasOwnProperty(serverId) || 
            !this.setups[serverId].hasOwnProperty(playerId) ||
            Object.keys(this.setups[serverId][playerId]).length === 0) return null;
        return this.setups[serverId][playerId];
    }

    setSetup = (serverId, playerId, zone, setup) => {
        if (!this.setups.hasOwnProperty(serverId)) this.setups[serverId] = {};
        if (!this.setups[serverId].hasOwnProperty(playerId)) this.setups[serverId][playerId] = {};
        
        if (!deepEqual(this.setups[serverId][playerId][zone], setup)) {
            this.setups[serverId][playerId][zone] = deepClone(setup);
            timeoutWriteJson(FILE_NAME, this.setups);
        }
    }
}

module.exports = Setups;