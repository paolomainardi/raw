(function(){

  var nodes = raw.model();

  var cluster = nodes.dimension()
    .title("Clusters");

  var size = nodes.dimension()
    .title("Size")
    .types(Number)

  var color = nodes.dimension()
    .title("Color")

  nodes.map(function (data){

    var nodeClusters = d3.nest()
      .key(function (d) { return cluster(d); })
      .rollup(function (d){ return { 
        type: 'cluster',
        cluster: cluster(d[0]),
        size: 0,
      } })
      .map(data);

    var nodeElements = data.map(function (d) {
      return { 
        type : 'node',
        cluster: cluster(d),
        clusterObject : nodeClusters[cluster(d)],
        size: size() ? +size(d) : 1,
        color: color(d)
      };
    });

    return nodeElements.concat(d3.values(nodeClusters));

  })


  var chart = raw.chart()
    .title('Cluster Force Layout')
    .thumbnail("/imgs/clusterForce.png")
    .model(nodes)

  var width = chart.option()
    .title("Width")
    .defaultValue(1000)
    .fitToWidth(true)

  var height = chart.option()
    .title("Height")
    .defaultValue(500)

  var nodePadding = chart.option()
    .title("node padding")
    .defaultValue(2)

  var clusterPadding = chart.option()
    .title("cluster padding")
    .defaultValue(10)

  var colorScale = chart.option()
     .title("Color scale")
     .type("color")

  chart.draw(function (selection, data){

    d3.layout.pack()
      .sort(null)
      .size([+width(), +height()])
      .children(function (d) { return d.values; })
      .value(function (d) { return +d.size; })
    //  .padding(+clusterPadding())
      .nodes({ values: d3.nest()
        .key(function (d) { return d.cluster; })
        .entries(data)});

    var force = d3.layout.force()
      .nodes(data)
      .size([+width(), +height()])
      .gravity(.01)
      .charge(0)
      .on("tick", tick)
      .start();

    var g = selection
      .attr("width", width)
      .attr("height", height);

    colorScale.data(data);

    var node = g.selectAll("circle")
        .data(data.filter(function (d){ return d.type == "node"; }))
      .enter().append("circle")
        .style("fill", function(d) { return d.color ? colorScale()(d.color) : colorScale()(null); })
        .call(force.drag);

    node.transition()
      .attrTween("r", function(d) {
        var i = d3.interpolate(0, +d.r);
        return function(t) { return d.radius = i(t); };
      });

    function tick(e) {
      node
          .each(cluster(10 * e.alpha * e.alpha))
          .each(collide(.5))
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    }

    function cluster(alpha) {
      return function(d) {
        if (d.type != "node") return;
        var cluster = d.clusterObject;
        var x = d.x - cluster.x,
            y = d.y - cluster.y,
            l = Math.sqrt(x * x + y * y),
            r = d.r + cluster.r;
        if (l != r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          cluster.x += x;
          cluster.y += y;
        }
      };
    }

    function collide(alpha) {
      var quadtree = d3.geom.quadtree(data);
      return function(d) {
        var r = d.r + Math.max(+nodePadding(), +clusterPadding()),
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = d.r + quad.point.radius + (d.cluster === quad.point.cluster ? +nodePadding() : +clusterPadding());
            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      };
    }
  
  })

})();