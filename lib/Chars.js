class Chars {
    __chars = {}

    constructor(mod) {
        this.__trackCharList(mod);
    }

    __trackCharList(mod) {
        mod.hook('S_GET_USER_LIST', 21, event => {
            event.characters.forEach((c) => {
                this.__chars[c.id] = c.name;
            })
        })
    }

    name(playerId) {
        return this.__chars[playerId];
    }

    id(name) {
        for (const [k, v] of Object.entries(this.__chars)) {
            if (v.toLowerCase() === name.toLowerCase()) return k;
        }
        return null;
    }
}

module.exports = Chars;
