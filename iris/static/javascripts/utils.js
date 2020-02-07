function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function createUint8Array(length) {
    var arr = new Uint8Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Uint8Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createUint8Array.apply(this, args);
    }

    return arr;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// function selectArray(array, indices){
//     let new_array
// }

function fill2DArray(array, value){
    for (var y = 0; y < array.length; y++) {
        for (var x = 0; x < array[y].length; x++) {
            array[y][x] = value;
        }
    }
}

function to_1d(array_2d, array_1d){
    for (var y = 0; y < array_2d.length; y++) {
        for (var x = 0; x < array_2d[y].length; x++) {
            array_1d[y*array_2d.length+x] = array_2d[y][x];
        }
    }
}

function to_2d(array_1d, array_2d){
    for (var y = 0; y < array_2d.length; y++) {
        for (var x = 0; x < array_2d[y].length; x++) {
             array_2d[y][x] = array_1d[y*array_2d.length+x];
        }
    }
}

function nice_number(number){
    var suffix = "";
    if (number > 1000000000){
        number /= 1000000000;
        suffix = "g";
    } else if (number > 1000000){
        number /= 1000000;
        suffix = "m";
    } else if (number > 1000){
        number /= 1000;
        suffix = "k";
    } else {
        // Do not do anything
        return number;
    }
    return number.toFixed(1) + suffix;
}

function round_number(x){
    return (x + .5) | 0;
}

// Adds ctx.getTransform() - returns an SVGMatrix
// Adds ctx.transformedPoint(x,y) - returns an SVGPoint
function trackTransforms(ctx){
    var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
    var xform = svg.createSVGMatrix();
    ctx.getTransform = function(){ return xform; };

    var savedTransforms = [];
    var save = ctx.save;
    ctx.save = function(){
      savedTransforms.push(xform.translate(0,0));
      return save.call(ctx);
    };

    var restore = ctx.restore;
    ctx.restore = function(){
        xform = savedTransforms.pop();
        return restore.call(ctx);
    };

    var scale = ctx.scale;
    ctx.scale = function(sx,sy){
        xform = xform.scaleNonUniform(sx,sy);
        return scale.call(ctx,sx,sy);
    };

    var rotate = ctx.rotate;
    ctx.rotate = function(radians){
      xform = xform.rotate(radians*180/Math.PI);
      return rotate.call(ctx,radians);
    };

    var translate = ctx.translate;
    ctx.translate = function(dx,dy){
      xform = xform.translate(dx,dy);
      return translate.call(ctx,dx,dy);
    };

    var transform = ctx.transform;
    ctx.transform = function(a,b,c,d,e,f){
      var m2 = svg.createSVGMatrix();
      m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
      xform = xform.multiply(m2);
      return transform.call(ctx,a,b,c,d,e,f);
    };

    var setTransform = ctx.setTransform;
    ctx.setTransform = function(a,b,c,d,e,f){
      xform.a = a;
      xform.b = b;
      xform.c = c;
      xform.d = d;
      xform.e = e;
      xform.f = f;
      return setTransform.call(ctx,a,b,c,d,e,f);
    };

    var pt  = svg.createSVGPoint();
    ctx.getWorldCoords = function(x,y){
        // x,y are canvas coordinates
        pt.x=x; pt.y=y;
        return pt.matrixTransform(xform.inverse());
    }

    ctx.getCanvasCoords = function(x,y){
        // x,y are world coordinates
        pt.x=x; pt.y=y;
        return pt.matrixTransform(xform);
    }
}

function get_ctx(canvas_id){
    return document.getElementById(canvas_id).getContext("2d");
}

function get_object(canvas_id){
    return document.getElementById(canvas_id);
}

function rgba2css(colour){
    return "rgba("+colour[0]+","+colour[1]+","+colour[2]+","+colour[3]/255+")"
}

function open_tab(tab_button, tabs_class, tab_id) {
    var tabs = document.getElementsByClassName('iris-tabs-'+tabs_class);
    for (let tab of tabs) {
        tab.style.display = "none";
    }
    for (let button of tab_button.parentElement.children){
        button.classList.remove("checked");
    }
    get_object(tab_id).style.display = "block";
    tab_button.classList.add("checked");
}
