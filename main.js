//
//  main.js
//

(function($){
  var Renderer = function(canvas){
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var particleSystem;

    var that = {
      init:function(system){
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system;

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        particleSystem.screenSize(canvas.width, canvas.height);
        particleSystem.screenPadding(80); // leave an extra 80px of whitespace per side
        
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling();
      },
      
      redraw:function(){
        //
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        //
        ctx.fillStyle = "white";
        ctx.fillRect(0,0, canvas.width, canvas.height);
        
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1: {x:#, y:#} source position in screen coords
          // pt2: {x:#, y:#} target position in screen coords

          // draw a line from pt1 to pt2
          ctx.strokeStyle = "rgba(0,0,0, .333)";
          ctx.fillStyle = "rgba(0,0,0, .333)"; //(color) ? color : "#cccccc"
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();

          var head = pt2, tail = pt1;
          var wt = 1; // !isNaN(weight) ? parseFloat(weight) : 1
          var arrowLength = 12 + wt
          var arrowWidth = 2 + wt

          // Begin to draw the arrowhead
          ctx.save();
            // shift context to the head
            ctx.translate(head.x, head.y);
            // rotate such that arrow is pointing strait up
            ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

            // delete some of the edge that's already there (so the point isn't hidden)
            ctx.clearRect(-arrowLength/2,-wt/2, arrowLength/2,wt)

            // draw the chevron
              ctx.beginPath();
              ctx.moveTo(-arrowLength, arrowWidth);
              ctx.lineTo(0, 0);
              ctx.lineTo(-arrowLength, -arrowWidth);
              ctx.lineTo(-arrowLength * 0.8, -0);
              ctx.closePath();
              ctx.fill();
            ctx.restore()

        });
        
        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt: {x:#, y:#} node position in screen coords

          // draw a rectangle centered at pt
          var w = 4;
          ctx.fillStyle = (node.color) ? node.color : $("#file_list").html().indexOf(node.name) !== -1 ? "blue" : "black";
          ctx.fillRect(pt.x-w/2, pt.y-w/2, w,w)
        })
      },
      
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;

        var last_mouse_position = {x : NaN, y : -1};

        var _move_nearest = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            dragged = particleSystem.nearest(_mouseP);

            if (dragged && dragged.node !== null){
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true
            }

            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            console.log("clicked",dragged.node.name);

            return false
          },
          dragged:function(e){
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          },
          
          moved:function(e) {
            var pos = $(canvas).offset();
            var m_pos = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            var near_pt = particleSystem.nearest(m_pos);
            if (typeof near_pt === "undefined" || near_pt == null || near_pt.distance > 20) {
                return;
            }
            
            if (_move_nearest != null) {
                delete _move_nearest.color;
            }
            
            _move_nearest = near_pt.node;
            _move_nearest.color = "red";
            $("#nearest").html(near_pt.node.name);
          },
          
          key:function(e) {
//              console.log('doc.key',e,last_mouse_position.x,last_mouse_position.y);
            if (last_mouse_position.x == NaN) return;
            var pos = $(canvas).offset();
            var m_pos = arbor.Point(last_mouse_position.x-pos.left, last_mouse_position.y-pos.top)
            var near_pt = particleSystem.nearest(m_pos);
            if (typeof near_pt === "undefined" || near_pt == null || near_pt.distance > 20) {
                return;
            }
            
            switch (e.charCode) {
                case 115: // s - save node
                    //avoid duplicates
                    var list = $("ul#selected_list")[0];
                    if ($(list).html().indexOf(near_pt.node.name) == -1) {
                        $(list).append("<li>" + near_pt.node.name + "</li>");
                    }
                    break;
                    
            }
            }
          
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);
        $(canvas).mousemove(handler.moved);
        $(document).mousemove(function(e){last_mouse_position = {x:e.pageX, y:e.pageY}; return true;});
        $(document).keypress(handler.key);
      },
      
    }
    return that
  }

  $(document).ready(function(){
    sys = arbor.ParticleSystem(100, 200, 0.5) // create the system with sensible repulsion/stiffness/friction
    sys.parameters({gravity:true}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

    // get papers
    $.get("all_papers", function(data) {

        console.log('data', typeof data, data);
        for (x in data) {
            $($("#file_list").append("<li> <input type='checkbox' data-nodename='" + x + "' /> " + x + "</li>"));
            if (stop-- == 0) break;
        }

        var _lock = false;

        $("#file_list input").change(function(e) {
            var box = $(e.target);

            // it's been locked by another check - switch state and return
            if (_lock == true) {
                $(box).prop("checked", !$(box).is(':checked') );
                return;
            }
            
            // lock to not be interrupted
            _lock = true;

            // get the name of the node stored in the element
            var x = $(box).data('nodename');
                            var i = 0;

            // if we have just checked it - add the file to the graph
            if ($(box).is(':checked')) {
                console.log("Adding file : ", x, "to the graph.");
                for (i = 0; i < data[x].length; i++) {
                    sys.addEdge(x, data[x][i]);
                }
            } else {
                // uncheck - remove node
                var lost_edges = sys.getEdgesFrom(x);
                sys.pruneNode(x);
                for (i = 0; i < lost_edges.length; i++) {
                    var next = lost_edges[i].target;
                    if (sys.getEdgesTo(next).length === 0 && sys.getEdgesFrom(next).length === 0) {
                        sys.pruneNode(next);
                    }
//                    if (sys.getEdges
                }
            }
            
            // hurray - done with this action, unlock
            _lock = false;
         });
    }, 'json');

    // Don't do anything else
    return;
    // add some nodes to the graph and watch it go...
    sys.addEdge('a','b')
    sys.addEdge('a','c')
    sys.addEdge('a','d')
    sys.addEdge('a','e')
    sys.addEdge('e', 'c')
    sys.addNode('f', {alone:true, mass:.25})

    // or, equivalently:
    //
    // sys.graft({
    // nodes:{
    // f:{alone:true, mass:.25}
    // },
    // edges:{
    // a:{ b:{},
    // c:{},
    // d:{},
    // e:{}
    // }
    // }
    // })
    
  })

})(this.jQuery);


$(function(){
    $(".minimizer").click(function(e){
    
     console.log($(e.target).closest("ul").children("li").toggle({speed:'fast'}));}
     );
});
var sys;
