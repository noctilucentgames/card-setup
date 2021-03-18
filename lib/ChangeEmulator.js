const Config = require("./Config");

class ChangeEmulator {
    __config;

    constructor(mod, config) {
        this.__config = config;
        this.useSetup = this.useSetup.bind(this, mod);
        this.__changePreset = this.__changePreset.bind(this, mod);
        this.__removeCollectionEffect = this.__removeCollectionEffect.bind(this, mod);
        this.__addCollectionEffect = this.__addCollectionEffect.bind(this, mod);
        this.__failsaveHook = this.__failsaveHook.bind(this, mod);
    }

    useSetup = async (mod, setup, currentSetup) => {
        let promises = []

        if (setup.preset !== currentSetup.preset) {
            let preset = setup.preset; // make a copy now, so value doesnt change before promise is executed
            promises.push(() => { return this.__changePreset(preset) });
        }

        if (this.__config.debug) mod.log(`effects: ${currentSetup.collectionEffects} vs ${setup.collectionEffects}`);

        for (let i = 0; i < currentSetup.collectionEffects.length; ++i) {
            if (setup.collectionEffects.indexOf(currentSetup.collectionEffects[i]) < 0) {
                if (this.__config.debug) mod.log("remove effect " + currentSetup.collectionEffects[i]);
                let cfx = currentSetup.collectionEffects[i]; // make a copy now, so value doesnt change before promise is executed
                promises.push(() => { return this.__removeCollectionEffect(cfx) })
            }
        }
        for (let i = 0; i < setup.collectionEffects.length; ++i) {
            if (currentSetup.collectionEffects.indexOf(setup.collectionEffects[i]) < 0) {
                if (this.__config.debug) mod.log("add effect " + setup.collectionEffects[i]);
                let cfx = setup.collectionEffects[i]; // make a copy now, so value doesnt change before promise is executed
                promises.push(() => { return this.__addCollectionEffect(cfx) });
            }
        }

        if (promises.length === 0) return false;

        for (let i = 0; i < promises.length; i++) {
            await promises[i]().catch(mod.error);
        }
        return true;
    }
    
    __changePreset = (mod, preset) => {
        return new Promise((resolve, reject) => {
            this.__failsaveHook('S_CARD_PRESET', 1, resolve, (e) => e.preset === preset, reject)
            mod.send('C_CARD_PRESET', 1, { preset });
        })
    }

    __removeCollectionEffect = (mod, id) => {
        return new Promise((resolve, reject) => {
            this.__failsaveHook('S_REMOVE_CARD_COLLECTION_EFFECT', 1, resolve, (e) => e.id === id, reject)
            mod.send('C_REMOVE_CARD_COLLECTION_EFFECT', 1, { id });
        })
    }

    __addCollectionEffect = (mod, id) => {
        return new Promise((resolve, reject) => {
            this.__failsaveHook('S_ADD_CARD_COLLECTION_EFFECT', 1, resolve, (e) => e.id === id, reject)
            mod.send('C_ADD_CARD_COLLECTION_EFFECT', 1, { id });
        })
    }

    __failsaveHook = (mod, packet, version, callback, callbackCondition, onTimeout, ms = 2000) => {
        console.log(this.__config);
        if (this.__config.debug) mod.log('> hooking ' + packet);
        let timeout = mod.setTimeout(() => {
            if (hook != null) mod.unhook(hook);
            onTimeout("Something went wrong... Timeout met.");
        }, ms);
        let hook = mod.hook(packet, version, event => {
            if (this.__config.debug) mod.log('< hooked ' + packet)
            if (callbackCondition(event)) {
                mod.unhook(hook);
                mod.clearTimeout(timeout);
                callback();
            }
        });
    }
}

module.exports = ChangeEmulator;