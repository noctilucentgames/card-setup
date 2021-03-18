const fs = require('fs');
const path = require('path');

// ### object utility ###
exports.isObject = (obj) => {
    return typeof obj === 'object' && obj !== null;
}
exports.deepClone = (obj) => {
    if (!exports.isObject(obj)) return obj;

    if (obj instanceof Date) { return new Date(obj); }
    if (obj instanceof String) { return new String(obj); }
    if (obj instanceof Number) { return new Number(obj); }
    if (obj instanceof Boolean) { return new Boolean(obj); }
    if (obj instanceof RegExp) { return new RegExp(obj); }

    var clone = {};
    if (obj instanceof Array) clone = new Array(obj.length);
    for (var key in obj) {
        clone[key] = exports.deepClone(obj[key]);
    }
    return clone;
}
exports.deepEqual = (obj1, obj2) => {
    if (!exports.isObject(obj1) || !exports.isObject(obj2)) return obj1 === obj2;
    let keys = Object.keys(obj1).concat(Object.keys(obj2)); // get all keys
    keys = keys.filter((v, i) => { return keys.indexOf(v) == i }); // remove duplicates
    for (let i = 0; i < keys.length; ++i) {
        let k = keys[i];
        if (obj1[k] === undefined ||
            obj2[k] === undefined ||
            !exports.deepEqual(obj1[k], obj2[k])
        ) return false;
    }
    return true;
}

// ### read write data files ###
exports.readJson = (file) => {
    return fs.existsSync(path.join(__dirname, '../data/', file)) ? require(`../data/${file}`) : null;
}

exports.writeJson = (file, obj) => {
    fs.writeFile(path.join(__dirname, '../data/', file), JSON.stringify(obj, null, 2), err => {
        if (err) console.error(err);
    })
}
var timeouts = {};
exports.timeoutWriteJson = (file, obj, ms = 5000) => {
    if (timeouts[file] != null) clearTimeout(timeouts[file]);
    // make sure we make a deep clone now, so any changes 
    // during the timeout wont alter this object before writing
    let clone = exports.deepClone(obj);
    timeouts[file] = setTimeout(() => { exports.writeJson(file, clone) }, ms);
}

// ### output formatting ###
exports.color = (str, color) => {
    return `<font color="${color}">${str}</font>`
}
exports.colors = (strArray, colorArray) => {
    if (strArray.length !== colorArray.length || strArray.length < 1) throw "Invalid string coloring parameters";
    let out = exports.color(strArray[0], colorArray[0]);
    for (let i = 1; i < strArray.length; ++i) {
        out += ` ${exports.color(strArray[i], colorArray[i])}`;
    }
    return out;
}