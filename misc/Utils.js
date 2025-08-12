'use strict';

/**
 * Utility functions for string normalization and track code generation.
 * @namespace Utils
 */
const Utils = {
    /**
     * Normalize and unify a track title for comparison.
     * @param {string} title - The track title.
     * @returns {string} Normalized track title.
     */
    unifyTrackName(title) {
        let replacements = [
            [/["]|\u00c3\u00c2\u0083|\u00e3\u0083\u00e2|!|\\|/g, ''],
            [/[,.()\-\/\\?]/g, ' '],
            ["`", "'"],
            ["in'( |$)", 'ing '], [/'t /g, "t "], [/'s /g, " is "],
            [/'re /g, " are "], [/'m /g, " am "], [/'ll /g, " will "],
            [/ +/g, ' ']
        ];
        let result = title.trim().toLowerCase();
        replacements.forEach(r => {
            result = result.replaceAll(r[0], ((r.length==2)?r[1]:" "));
        });
        return result.trim();
    },
    /**
     * Normalize and unify an artist or name for comparison.
     * @param {string} name - The name to normalize.
     * @returns {string} Normalized name.
     */
    unifyName(name) {
        return (
            name
                .toLowerCase()
                .replaceAll(/[\u00c3\u00c2\u0083\u00e3\u0083\u00e2\u00b6]+/g,'')
                .replaceAll('&',' and ')
                .replaceAll(", the"," ")
                .replaceAll("the "," ")
                .replaceAll(/ +/g,' ')
        ).trim();
    },
    /**
     * Generate a track code for matching, based on artist, title, and matching type.
     * @param {string} trackArtist - The track artist.
     * @param {string} trackTitle - The track title.
     * @param {string} matchingType - Matching type ("author_and_title" or "title_only").
     * @returns {string} Track code for matching.
     */
    getTrackCode(trackArtist, trackTitle, matchingType) {
        let code = Utils.unifyTrackName(trackTitle).toLowerCase();
        if (matchingType === "author_and_title") {
            code = `${Utils.unifyTrackName(trackArtist).toLowerCase()}:${code}`;
        }
        return code;
    },
    /**
     * Extract list value from context using a path.
     * @param {object} context - Context object.
     * @param {string|function} path - Path or function to extract value.
     * @param {object} row - Row data.
     * @returns {any} Extracted value.
     */
    extractListValue(context, path, row) {
        if (path === undefined) 
            return undefined;

        if (typeof(path) === 'function')
            return path(row, context);

        if (typeof(path) === 'string')
            path = path.split('.').reverse();

        let key = path.pop();
        let value = context[key];
        if ((value === undefined) || (path.length === 0))
            return value;
        else
            return this.extractListValue(value, path);
    },

    durationDiff : function(duration1, duration2) {
        if ((duration1=="") || (duration2=="") || (duration1===undefined) || (duration2===undefined))
            return 1/0;
        let time_this = duration1.split(":").reverse().reduce((p,c,i)=>{return p+c*(60**i)},0);
        let time_that = duration2.split(":").reverse().reduce((p,c,i)=>{return p+c*(60**i)},0);
        return Math.abs(time_this-time_that);
    },
};

export { Utils };
