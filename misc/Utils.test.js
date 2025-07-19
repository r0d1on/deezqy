/**
 * Basic unit tests for Utils module.
 * Run with: node misc/Utils.test.js
 */
import { Utils } from './Utils.js';

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual:   ${actual}`);
    }
}

// Test unifyTrackName
assertEqual(Utils.unifyTrackName('Test Track!'), 'test track', 'unifyTrackName removes punctuation and lowercases');
assertEqual(Utils.unifyTrackName('In the End'), 'in the end', 'unifyTrackName normalizes spaces');

// Test unifyName
assertEqual(Utils.unifyName('The Beatles'), 'beatles', 'unifyName removes "the"');
assertEqual(Utils.unifyName('AC/DC'), 'ac/dc', 'unifyName lowercases and keeps slash');

// Test getTrackCode
assertEqual(Utils.getTrackCode('Artist', 'Song', 'title_only'), 'song', 'getTrackCode title_only');
assertEqual(Utils.getTrackCode('Artist', 'Song', 'author_and_title'), 'artist:song', 'getTrackCode author_and_title');

console.log('All Utils tests passed!');
