// Copyright (C) 2013, GoodData(R) Corporation. All rights reserved.

var AIT = require('./ait.js');

/**
 * mocha it() wrap() method
 *
 * Allows the user to write tests as follows:
 *
 * it('click button', wrap(function() { $('button').click(); }));
*/
var Fiber = require('fibers');

function aitWrap(fn) {
    var f = fn;

    function runFn(done) {
        var that = this;

        Fiber(function() {
            // inject out browser instance into the wrap() method functor
            Fiber.current.browser = AIT.browser;
            f.apply(that, [done]);
        }).run();
    }

    if (fn.toString().match(/^\s*function\s*\(\s*done\s*\)/)) {
        return function(done) { runFn(done); };
    } else {
        // wrap the sync code into an async method
        f = function(done) {
            fn.call(this);
            done();
        };
        return function(done) { runFn(done); };
    }
}

AIT.wrap = aitWrap;

AIT.before = function aitBefore(callback) {
    AIT._ait_beforeCalled = true;

    AIT.init(callback);
};


AIT.after = function aitAfter(callback) {
    Fiber(function() {
        AIT.destroy(callback);
    }).run();
};

var originalBeforeEach = global.beforeEach;
var wrappedBeforeEach = function(fn) {
    originalBeforeEach.call(this, AIT.wrap(fn));
};

/**
 *  Wrap the mocha it() calls automatically.
 */
var originalIt = global.it;
var wrappedIt = function(desc, fn) {
    originalIt.call(this, desc, AIT.wrap(function () {
        if (!AIT._ait_beforeCalled) {
            throw new Error('AIT: Be sure to issue before(AIT.before); after(AIT.after); calls in your describe().');
        }

        fn.apply(this, arguments);
    }));
};

global.beforeEach = wrappedBeforeEach;
global.it = wrappedIt;

/**
 * Reverts to original mocha it(). Useful for testing ait-mocha in mocha.
 */
AIT.unWrapMochaMethods = function() {
    global.beforeEach = originalBeforeEach;
    global.it = originalIt;
};

module.exports = AIT;
