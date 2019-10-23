// this file has all rendering templates
// in the future if it grows to be too large, we can consider splitting it into multiple files

/**
 * this function wraps a @text svg element into a box with @width pixels wide
 * useful for displaying long text, used in both NBA and Flare
 * modified from https://bl.ocks.org/mbostock/7555321
 * @param text
 * @param width
 */
function textwrap(text, width) {
    text.each(function() {
        var text = d3.select(this),
            words = text
                .text()
                .split(/(?=[A-Z])/)
                .reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.3, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = null;

        text.text(null);
        while ((word = words.pop())) {
            if (line.length == 0)
                tspan = text
                    .append("tspan")
                    .attr("x", x)
                    .attr("y", y);
            line.push(word);
            tspan.text(line.join(""));
            if (tspan.node().getComputedTextLength() > width) {
                var popped = false;
                if (line.length > 1) {
                    line.pop();
                    popped = true;
                }
                tspan.text(line.join(""));
                if (popped) {
                    line = [word];
                    tspan = text
                        .append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .text(word);
                } else line = [];
            }
        }
        var tspans = text.selectAll("tspan"),
            num_tspans = tspans.size();
        var firstY;
        if (num_tspans % 2 == 0) firstY = -(num_tspans / 2 - 0.5) * lineHeight;
        else firstY = -Math.floor(num_tspans / 2) * lineHeight;
        tspans.attr("dy", function(d, i) {
            return firstY + lineHeight * i + 0.3 + "em";
        });
    });
}

/**
 * serialize the body of a function into a string
 * @param func
 * @returns {string}
 */
function getBodyStringOfFunction(func) {
    var funcStr = func.toString();
    const bodyStart = funcStr.indexOf("{") + 1;
    const bodyEnd = funcStr.lastIndexOf("}");
    return "\n" + funcStr.substring(bodyStart, bodyEnd) + "\n";
}

/**
 * setting the values of a dictionary if they don't exist yet
 * @param dict
 * @param properties
 */
function setPropertiesIfNotExists(dict, properties) {
    var keys = Object.keys(properties);
    for (var i = 0; i < keys.length; i++)
        if (!(keys[i] in dict)) dict[keys[i]] = properties[keys[i]];
}

module.exports = {
    textwrap,
    getBodyStringOfFunction,
    setPropertiesIfNotExists
};
