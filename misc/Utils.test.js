/**
 * Basic unit tests for utility modules.
 * Run with: node --input-type=module misc/Utils.test.js
 */
import { Utils } from './Utils.js';
import { ListRenderer } from './listRenderer.js';

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

// Test ListRenderer clear-filter behavior
const renderer = new ListRenderer({
    data: [],
    columns: [{ name: 'title', filter: '<>'],
              { name: 'is_new', filter: '0' },
              { name: 'artist', filter: '' }],
    onFiltersChange: () => {}
});

assertEqual(renderer.clearFilterValue('str'), '', 'clearFilterValue resets string filters to empty string');
assertEqual(renderer.clearFilterValue('tri'), '', 'clearFilterValue resets tri-state filters to empty string');
assertEqual(renderer.clearFilterValue('sel'), '<>', 'clearFilterValue resets select filters to empty placeholder');
renderer.clearFilter('title');
assertEqual(renderer.filters.title.value, '<>', 'clearFilter resets select filter value');
renderer.clearFilter('is_new');
assertEqual(renderer.filters.is_new.value, '', 'clearFilter resets tri-state filter value');

console.log('All Utils tests passed!');
