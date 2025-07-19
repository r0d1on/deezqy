'use strict';

const Utils = {
    unifyTrackName: function(title) {
        let replacements = [
            [/["]|ÃÂ|ãâ|!|\|/g, ''],
            [/[,.()\-\/\\?]/g],
            ["`", "'"],
            ["in'( |$)", 'ing '], [/'t /g, "t "], [/'s /g, " is "],
            [/'re /g, " are "], [/'m /g, " am "], [/'ll /g, " will "],
            [/ +/g]
        ];
        let result = title.trim().toLowerCase();
        replacements.forEach(r => {
            result = result.replaceAll(r[0], ((r.length==2)?r[1]:" "));
        });
        return result.trim();
    },
    unifyName: function(name) {
        return (
            name
                .toLowerCase()
                .replaceAll(/[ÃÂãâ¶]+/g,'')
                .replaceAll('&',' and ')
                .replaceAll(", the"," ")
                .replaceAll("the "," ")
                .replaceAll(/ +/g,' ')
        ).trim();
    },
    getTrackCode: function(track_artist, track_title, matching_type) {
        let code = Utils.unifyTrackName(track_title).toLowerCase();
        if (matching_type === "author_and_title") {
            code = `${Utils.unifyTrackName(track_artist).toLowerCase()}:${code}`;
        }
        return code;
    }
};

export { Utils };
