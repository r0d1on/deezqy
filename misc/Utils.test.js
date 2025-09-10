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
assertEqual(Utils.getTrackCode('Artist', 'Song', 'title only'), 'song', 'getTrackCode title only');
assertEqual(Utils.getTrackCode('Artist', 'Song', 'author & title'), 'artist:song', 'getTrackCode author & title');

console.log('All Utils tests passed!');
