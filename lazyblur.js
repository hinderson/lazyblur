/*! Image Zoom - v1
 *  Copyright (c) 2016 Mattias Hinderson
 *  License: MIT
 */

(function (window, factory) {
    'use strict';

    if (typeof define == 'function' && define.amd) {
        // AMD
        define([
            './utils',
            './pubsub',
            './vendor/stackblur'
        ], function(utils, pubsub, stackblur) {
            return factory(window, utils, pubsub, stackblur);
        });
    } else if (typeof exports == 'object') {
        // CommonJS
        module.exports = factory(
            window,
            require('./utils'),
            require('./pubsub'),
            require('./vendor/stackblur')
        );
    }

}(window, function factory (window, utils, pubsub, stackblur) {
    'use strict';

    // Constants
    var BLUR_AMOUNT = 40;

    // Unloaded items
    var unloadedItems = [];

    // Cached values
    var cache = {
        ticking: false,
        lastScrollY: window.pageYOffset,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    };

    // Window events
    var resizeEvent = utils.debounce(function ( ) {
    	cache.viewportWidth = window.innerWidth;
    	cache.viewportHeight = window.innerHeight;
        cache.lastScrollY = window.pageYOffset;

        checkImageVisibility();
    }, 250);

    var scrollEvent = utils.throttle(function ( ) {
    	checkImageVisibility();
    }, 500);

    window.addEventListener('resize', resizeEvent);
    window.addEventListener('scroll', scrollEvent);

    // Transition event helper
    var transitionEvent = utils.whichTransitionEvent();

    // Performance helpers
    var hintBrowser = function ( ) {
        this.style.willChange = 'opacity, visibility';
    };

    var removeHint = function ( ) {
        this.removeEventListener(transitionEvent, removeHint);
        this.style.willChange = 'auto';
    };

    function checkImageVisibility ( ) {
        if (!Object.keys(unloadedItems).length) {
            // We've loaded all images in the document
            return destroy();
        }

        utils.forEach(unloadedItems, function (index, item) {
    		if (!item) { return; }

    		if (utils.isInViewport(item)) {
                loadMedia(item);
    		}
	   });
    }

    function loadMedia (item) {
        var attributes = JSON.parse(item.getAttribute('data-attributes'));
        var type = item.getAttribute('data-type') || 'image';

        // Construct media element
        var mediaElem = type === 'video' ? document.createElement('VIDEO') : new Image();

        // Add loading class
        item.classList.add('loading-media');

        // Construct attributes
        for (var prop in attributes) {
            mediaElem.setAttribute(prop, attributes[prop]);
        }

        function appendElem ( ) {
            mediaElem.classList.add('media');

            hintBrowser.bind(mediaElem)();
            mediaElem.addEventListener(transitionEvent, removeHint);

            setTimeout(function ( ) {
                item.classList.remove('loading-media');
                item.classList.add('media-loaded');
            }, 100);

            item.appendChild(mediaElem);
            pubsub.publish('mediaLoaded', item);
        }

        if (type === 'video') {
            mediaElem.load();
            mediaElem.addEventListener('canplay', appendElem);
        } else {
            mediaElem.onload = appendElem;
        }

        // Remove item from unloaded items array
        delete unloadedItems[unloadedItems.indexOf(item)];
    }

    function createBlurryPlaceholder (item) {
        var thumb = item.getElementsByTagName('img')[0] || item.getElementsByTagName('video')[0];
        var canvas = item.getElementsByTagName('canvas')[0];

        var applyBlur = function ( ) {
            canvas.getContext('2d').drawImage(thumb, 0, 0, canvas.width, canvas.height);
            stackblur.canvasRGB(canvas, 0, 0, canvas.width, canvas.height, BLUR_AMOUNT);
            pubsub.publish('placeholderCreated', item);
        };

        // Wait for thumb to load completely
        if (thumb.complete || thumb.width + thumb.height > 0) {
            applyBlur();
        } else {
            thumb.onload = applyBlur;
        }

        // Add item to unloaded items array
        unloadedItems.push(item);
    }

    function destroy ( ) {
        window.removeEventListener('resize', resizeEvent);
        window.removeEventListener('scroll', scrollEvent);
    }

    var lazyBlur = function (elems, options) {
        if (!elems) return;

        if (options) {
            BLUR_AMOUNT = options.blur;
        }

        // Export event emitter
        this.on = pubsub.subscribe;

        // Export functions
        this.check = checkImageVisibility;

        // Accepts both a single node and a NodeList
        if (elems.length) {
            utils.forEach(elems, function (index, elem) {
                createBlurryPlaceholder(elem);
            });
        } else {
            createBlurryPlaceholder(elems);
        }

        // Do an initial check of image visibility
        checkImageVisibility();
    };

	// Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
		// CommonJS, just export
		module.exports = lazyBlur;
	} else if (typeof define === 'function' && define.amd) {
		// AMD support
		define('lazyBlur', function ( ) { return lazyBlur; } );
	}
}));
