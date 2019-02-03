/**
 * LPF
 * Low Pass Filter for JavaScript
 *
 * @author Lukasz Krawczyk <contact@lukaszkrawczyk.eu>
 * @copyright MIT
 */
var LPF = function(smoothing) {
    this.smoothing = smoothing || 0.5; // must be smaller than 1
    this.buffer = []; // FIFO queue
    this.bufferMaxSize = 10;
};

LPF.prototype = {

    /**
     * Init buffer with array of values
     *
     * @param {array} values
     * @returns {array}
     * @access public
     */
    init: function(values) {
        for (var i = 0; i < values.length; i++) {
            this.__push(values[i]);
        }
        return this.buffer;
    },

    /**
     * Add new value to buffer (FIFO queue)
     *
     * @param {integer|float} value
     * @returns {integer|float}
     * @access private
     */
    __push: function(value) {
        var removed = (this.buffer.length === this.bufferMaxSize)
            ? this.buffer.shift()
            : 0;

        this.buffer.push(value);
        return removed;
    },

    /**
     * Smooth value from stream
     *
     * @param {integer|float} nextValue
     * @returns {integer|float}
     * @access public
     */
    next: function (nextValue) {
        var self = this;
        // push new value to the end, and remove oldest one
        var removed = this.__push(nextValue);
        // smooth value using all values from buffer
        var result = this.buffer.reduce(function(last, current) {
            return self.smoothing * current + (1 - self.smoothing) * last;
        }, removed);
        // replace smoothed value
        this.buffer[this.buffer.length - 1] = result;
        return result;
    },

    /**
     * Smooth array of values
     *
     * @param {array} values
     * @returns {undefined}
     * @access public
     */
    smoothArray: function (values){
        var value = values[0];
        for (var i = 1; i < values.length; i++){
            var currentValue = values[i];
            value += (currentValue - value) * this.smoothing;
            values[i] = Math.round(value);
        }
        return values;
    }
};
