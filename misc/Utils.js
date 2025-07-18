'use strict';

const Utils = {
    unify_track_name: function(title) {
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
    unify_name: function(name) {
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
        let code = Utils.unify_track_name(track_title).toLowerCase();
        if (matching_type === "author_and_title") {
            code = `${Utils.unify_track_name(track_artist).toLowerCase()}:${code}`;
        }
        return code;
    }
};

export { Utils };
