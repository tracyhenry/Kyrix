(function() {
    d3.fisheye = {
        scale: function(scaleType) {
            return d3_fisheye_scale(scaleType(), 3, 0);
        },
        circular: function() {
            var radius = 200,
                distortion = 2,
                k0,
                k1,
                focus = [0, 0];

            function newcoor(d) {
                var dx = d.x - focus[0],
                    dy = d.y - focus[1],
                    dd = Math.sqrt(dx * dx + dy * dy);
                if (!dd || dd >= radius) return {x: d.x, y: d.y, z: 1};
                var k = k0 * (1 - Math.exp(-dd * k1)) / dd * .75 + .25;
                var z = Math.min(k, 10);
                return {x: focus[0] + dx * k, y: focus[1] + dy * k, z: z};
            }

            function oldcoor(ele) {
                return {x:d3.select(ele).attr("x"), y: d3.select(ele).attr("y"),
                    w: d3.select(ele).attr("width"), h: d3.select(ele).attr("height") }
            }
            function fisheye(svg) {
                svg.select("g")
                    .selectAll("*")
                    .each(function(d){d.old = oldcoor(this);});

                svg.on("mousemove", function() {
                    newcoor.focus(d3.mouse(this));
                    svg.select("g")
                        .selectAll("*")
                        .each(function(d){d.fisheye = newcoor(d.old);})
                        .attr("x", function(d) { return d.fisheye.x; })
                        .attr("y", function(d) { return d.fisheye.y; })
                        .attr("width", function(d) { return d.old.w * d.fisheye.z; })
                        .attr("height", function(d) { return d.old.h * d.fisheye.z; });
                });
            }
            function rescale() {
                k0 = Math.exp(distortion);
                k0 = k0 / (k0 - 1) * radius;
                k1 = distortion / radius;
                return fisheye;
            }

            fisheye.radius = function(_) {
                if (!arguments.length) return radius;
                radius = +_;
                return rescale();
            };

            fisheye.distortion = function(_) {
                if (!arguments.length) return distortion;
                distortion = +_;
                return rescale();
            };

            newcoor.focus = function(_) {
                if (!arguments.length) return focus;
                focus = _;
                return newcoor;
            };

            return rescale();
        }
    };

    function d3_fisheye_scale(scale, d, a) {

        function fisheye(_) {
            var x = scale(_),
                left = x < a,
                range = d3.extent(scale.range()),
                min = range[0],
                max = range[1],
                m = left ? a - min : max - a;
            if (m == 0) m = max - min;
            return (left ? -1 : 1) * m * (d + 1) / (d + (m / Math.abs(x - a))) + a;
        }

        fisheye.distortion = function(_) {
            if (!arguments.length) return d;
            d = +_;
            return fisheye;
        };

        fisheye.focus = function(_) {
            if (!arguments.length) return a;
            a = +_;
            return fisheye;
        };

        fisheye.copy = function() {
            return d3_fisheye_scale(scale.copy(), d, a);
        };

        fisheye.nice = scale.nice;
        fisheye.ticks = scale.ticks;
        fisheye.tickFormat = scale.tickFormat;
        return d3.rebind(fisheye, scale, "domain", "range");
    }
})();