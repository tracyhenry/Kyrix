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
            var imagerect = [],
                text = [],
                newtextxy = [],
                newxy = [],
                line = [],
                newline = [],
                circle = [],
                newcircle = [];

            function newcoor(d) {
                var dx = d.x - focus[0],
                    dy = d.y - focus[1],
                    dd = Math.sqrt(dx * dx + dy * dy);
                if (!dd || dd >= radius) return {x: d.x, y: d.y, z: 1};
                var k = k0 * (1 - Math.exp(-dd * k1)) / dd * .75 + .25;
                var z = Math.min(k, 10);
                return {x: focus[0] + dx * k, y: focus[1] + dy * k, z: z};
            }

            function fisheye(svg) {
                // create x y w h for images and rects
                svg.select("g")
                    .selectAll("image,rect")
                    .data(imagerect)
                    .exit()
                    .each(function(d){imagerect.push({x:this.getBBox().x,y:this.getBBox().y,
                    w: this.getBBox().width, h: this.getBBox().height});});
                // create cx cy for circle
                svg.select("g")
                    .selectAll("circle")
                    .data(circle)
                    .exit()
                    .each(function(d){imagerect.push({x:d3.select(this).attr("cx"),y:d3.select(this).attr("cy"),
                        r: d3.select(this).attr("r")})});
                //create x y for texts
                svg.select("g")
                    .selectAll("text")
                    .data(text)
                    .exit()
                    .each(function(d){text.push({x:d3.select(this).attr("x"),y:d3.select(this).attr("y")});});
                // create x1, y1, x2, y2 for line
                svg.select("g")
                    .selectAll("line")
                    .data(line)
                    .exit()
                    .each(function(d){line.push({x:d3.select(this).attr("x1"),y:d3.select(this).attr("y1")});
                                    line.push({x:d3.select(this).attr("x2"), y:d3.select(this).attr("y2")})});

                svg.on("mousemove", function() {
                    newcoor.focus(d3.mouse(this));
                    svg.select("g")
                        .selectAll("image,rect")
                        .each(function(d,i){ newxy[i] = newcoor(imagerect[i]);})
                        .attr("x", function(d,i) { return newxy[i].x; })
                        .attr("y", function(d,i) { return newxy[i].y; })
                        .attr("width", function(d,i) { return imagerect[i].w * newxy[i].z; })
                        .attr("height", function(d,i) { return imagerect[i].h * newxy[i].z; });

                    svg.select("g")
                        .selectAll("circle")
                        .each(function(d,i){ newcircle[i] = newcoor(circle[i]);})
                        .attr("cx", function(d,i) { return newcircle[i].x; })
                        .attr("cy", function(d,i) { return newcircle[i].y; })
                        .attr("r", function(d,i) { return circle[i].r * newcircle[i].z; });

                    svg.select("g")
                        .selectAll("text")
                        .each(function(d,i){ newtextxy[i] = newcoor(text[i]);})
                        .attr("x", function(d,i) { return newtextxy[i].x; })
                        .attr("y", function(d,i) { return newtextxy[i].y; });

                    svg.select("g")
                        .selectAll("line")
                        .each(function(d,i){ newline[i*2] = newcoor(line[i*2]);newline[i*2+1] = newcoor(line[i*2+1]);})
                 //       .attr("x1", function(d,i) { return newline[i * 2].x; })
                  //      .attr("y1", function(d,i) { return newline[i * 2].y; })
                        .attr("x2", function (d,i) { return newline[i * 2 + 1].x;})
                        .attr("y2", function (d,i) { return newline[i * 2 + 1].y;});
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