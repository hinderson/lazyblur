(function (window, document, undefined) {
    'use strict';

    var utils = {};

    utils = {
        requestAnimFrame: (
    		window.requestAnimationFrame        ||
    		window.webkitRequestAnimationFrame  ||
    		window.mozRequestAnimationFrame     ||
    		window.oRequestAnimationFrame       ||
    		window.msRequestAnimationFrame      ||
    		function (callback) {
    			window.setTimeout(callback, 1000 / 60);
    		}
    	),

        once: function (element, type, listener, useCapture) {
            function getSelfRemovingHandler (element, type, listener, useCapture) {
                return function selfRemoving ( ) {
                	element.removeEventListener(type, listener, useCapture);
                	element.removeEventListener(type, selfRemoving, useCapture);
                };
            }

            var selfRemoving = getSelfRemovingHandler.apply(null, arguments);
            element.addEventListener(type, listener, useCapture);
            element.addEventListener(type, selfRemoving, useCapture);
            return listener;
        },

        forEach: function (array, callback, scope) {
    		for (var i = 0, len = array.length; i < len; i++) {
    			callback.call(scope, i, array[i]);
    		}
    	},

        isObject: function (value) {
            var type = typeof value;
            return !!value && (type == 'object' || type == 'function');
        },

        debounce: function (func, wait, options) {
            var now = Date.now;

            var args,
                maxTimeoutId,
                result,
                stamp,
                thisArg,
                timeoutId,
                trailingCall,
                lastCalled = 0,
                leading = false,
                maxWait = false,
                trailing = true;

            wait = wait || 0;

            if (utils.isObject(options)) {
                leading = !!options.leading;
                maxWait = 'maxWait' in options && (options.maxWait || 0, wait);
                trailing = 'trailing' in options ? !!options.trailing : trailing;
            }

            function cancel ( ) {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                if (maxTimeoutId) {
                    clearTimeout(maxTimeoutId);
                }
                lastCalled = 0;
                args = maxTimeoutId = thisArg = timeoutId = trailingCall = undefined;
            }

            function complete (isCalled, id) {
                if (id) {
                    clearTimeout(id);
                }
                maxTimeoutId = timeoutId = trailingCall = undefined;
                if (isCalled) {
                    lastCalled = now();
                    result = func.apply(thisArg, args);

                    if (!timeoutId && !maxTimeoutId) {
                        args = thisArg = undefined;
                    }
                }
            }

            function delayed ( ) {
                var remaining = wait - (now() - stamp);
                if (remaining <= 0 || remaining > wait) {
                    complete(trailingCall, maxTimeoutId);
                } else {
                    timeoutId = setTimeout(delayed, remaining);
                }
            }

            function flush ( ) {
                if ((timeoutId && trailingCall) || (maxTimeoutId && trailing)) {
                    result = func.apply(thisArg, args);
                }
                cancel();
                return result;
            }

            function maxDelayed ( ) {
                complete(trailing, timeoutId);
            }

            function debounced ( ) {
                args = arguments;
                stamp = now();
                thisArg = this; // jshint ignore:line
                trailingCall = trailing && (timeoutId || !leading);

                if (maxWait === false) {
                    var leadingCall = leading && !timeoutId;
                } else {
                    if (!maxTimeoutId && !leading) {
                        lastCalled = stamp;
                    }
                    var remaining = maxWait - (stamp - lastCalled),
                    isCalled = remaining <= 0 || remaining > maxWait;

                    if (isCalled) {
                        if (maxTimeoutId) {
                            maxTimeoutId = clearTimeout(maxTimeoutId);
                        }
                        lastCalled = stamp;
                        result = func.apply(thisArg, args);
                    } else if (!maxTimeoutId) {
                        maxTimeoutId = setTimeout(maxDelayed, remaining);
                    }
                }

                if (isCalled && timeoutId) { // jshint ignore:line
                    timeoutId = clearTimeout(timeoutId);
                } else if (!timeoutId && wait !== maxWait) {
                    timeoutId = setTimeout(delayed, wait);
                }

                if (leadingCall) { // jshint ignore:line
                    isCalled = true; // jshint ignore:line
                    result = func.apply(thisArg, args);
                }
                if (isCalled && !timeoutId && !maxTimeoutId) { // jshint ignore:line
                    args = thisArg = undefined;
                }
                return result;
            }

            debounced.cancel = cancel;
            debounced.flush = flush;

            return debounced;
    	},

        throttle: function (func, wait, options) {
            var leading = true;
            var trailing = true;

            if (utils.isObject(options)) {
                leading = 'leading' in options ? !!options.leading : leading;
                trailing = 'trailing' in options ? !!options.trailing : trailing;
            }

            return utils.debounce(func, wait, {
                'leading': leading,
                'maxWait': wait,
                'trailing': trailing
            });
        },

        delegate: function (criteria, listener) {
    		return function (e) {
    			var el = e.target;
    			do {
    				if (!criteria(el)) continue;
    				e.delegateTarget = el;
    				listener.apply(this, arguments);
    				return;
    			} while( (el = el.parentNode) );
    		};
    	},

    	partialDelegate: function (criteria) {
    		return function (handler) {
    			return utils.delegate(criteria, handler);
    		};
    	},

    	criteria: {
    		isAnElement: function (e) {
    			return e instanceof HTMLElement;
    		},
    		hasClass: function (cls) {
    			return function (e) {
    				return utils.criteria.isAnElement(e) && e.classList.contains(cls);
    			};
    		},
    		hasTagName: function (tag) {
    			return function (e) {
    				return utils.criteria.isAnElement(e) && e.nodeName === tag.toUpperCase();
    			};
    		},
    		hasTagNames: function (tags) {
    			if (tags.length > 0) {
    				return function (e) {
    					for (var i = 0, len = tags.length; i < len; i++) {
    						if (utils.criteria.isAnElement(e) && e.nodeName === tags[i].toUpperCase()) {
    							return utils.criteria.isAnElement(e) && e.nodeName === tags[i].toUpperCase();
    						}
    					}
    				};
    			}
    		}
    	},

        whichTransitionEvent: function ( ) {
            var t, el = document.createElement('fakeelement');

            var transitions = {
                'transition'      : 'transitionend',
                'OTransition'     : 'oTransitionEnd',
                'MozTransition'   : 'transitionend',
                'WebkitTransition': 'webkitTransitionEnd'
            };

            for (t in transitions){
                if (el.style[t] !== undefined){
                  return transitions[t];
                }
            }
        },

        extend: function (a, b) {
            for (var prop in b) {
                a[prop] = b[prop];
            }
            return a;
        },

        isInViewport: function (element, offset) {
        	var winTop = utils.getDocumentScrollTop();
            var winWidth = document.documentElement.clientWidth;
        	var winHeight = document.documentElement.clientHeight;
        	var winBottom = winTop + winHeight;
        	offset = offset || 0;

        	var rect = element.getBoundingClientRect();
        	var elTop = rect.top + winTop - offset;
        	var elBottom = rect.bottom + winTop + offset;

        	return elBottom > winTop && rect.right > 0 && rect.left < winWidth && elTop < winBottom;
        },

        getDocumentScrollTop: function ( ) {
        	if (window.pageYOffset === undefined) {
        		return (document.documentElement || document.body.parentNode || document.body).scrollTop;
        	}
        	return window.pageYOffset;
        },

        isLocalStorageNameSupported: function ( ) {
            var testKey = 'test', storage = window.sessionStorage;
            try {
                storage.setItem(testKey, '1');
                storage.removeItem(testKey);
                return true;
            } catch (error) {
                return false;
            }
        },

        isAutoplaySupported: function (callback) {
            function dispose (video) {
                video.pause();
                video.src = '';
                video.load();
            }

            function check (sessionStorageSupported) {
                if (sessionStorageSupported && sessionStorage.autoplaySupported === 'true') {
                    return callback(true);
                }

                // Create video element to test autoplay
                var video = document.createElement('video');
                video.autoplay = true;
                video.src = 'data:video/mp4;base64,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';
                video.load();
                video.style.display = 'none';
                video.playing = false;
                video.play();

                video.onplay = function ( ) {
                    this.playing = true;
                };

                video.oncanplay = function ( ) {
                    if (video.playing) {
                        if (sessionStorageSupported) {
                            sessionStorage.autoplaySupported = 'true';
                        }
                        dispose(video);
                        callback(true);
                    } else {
                        if (sessionStorageSupported) {
                            sessionStorage.autoplaySupported = 'false';
                        }
                        dispose(video);
                        callback(false);
                    }
                };
            }

            if (utils.isLocalStorageNameSupported()) {
                check(true);
            } else {
                check(false);
            }
        },
    };

    // Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = utils;
	} else if (typeof define === 'function' && define.amd) {
        define('utils', function ( ) { return utils; } );
	}

})(window, document);
